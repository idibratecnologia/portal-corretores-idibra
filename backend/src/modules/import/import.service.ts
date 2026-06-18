/**
 * Importação em massa de imobiliárias e corretores (.xlsx / .csv).
 *
 * Fluxo: parse → valida cada linha (Zod) → dedupe (na planilha e no banco)
 * → dry-run (pré-visualização) ou commit. Linha inválida não derruba o lote.
 */
import * as XLSX from 'xlsx'
import type { ZodError } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/hash'
import { BadRequestError } from '@/lib/errors'
import {
  imobiliariaRowSchema, corretorRowSchema, normalizeRow,
  type ImobiliariaRow, type CorretorRow,
} from './import.schema'

const MAX_LINHAS = 2000

export type ImportModo = 'ignorar' | 'atualizar'

export interface ImportOptions {
  dryRun: boolean
  modo:   ImportModo
}

export interface ImportReport {
  total:       number   // linhas de dados na planilha
  validos:     number
  novos:       number   // serão criados
  existentes:  number   // já cadastrados
  criados:     number   // (commit) efetivamente criados
  atualizados: number   // (commit) efetivamente atualizados
  ignorados:   number   // (commit) pulados por já existirem (modo ignorar)
  erros:       { linha: number; mensagem: string }[]
}

function novoReport(total: number): ImportReport {
  return { total, validos: 0, novos: 0, existentes: 0, criados: 0, atualizados: 0, ignorados: 0, erros: [] }
}

function primeiroErro(err: ZodError): string {
  const i = err.issues[0]
  const campo = i?.path?.join('.') || ''
  return campo ? `${campo}: ${i.message}` : i?.message || 'Dados inválidos'
}

/** Lê o buffer (xlsx ou csv) e retorna as linhas com chaves canônicas. */
function parsePlanilha(buffer: Buffer): Record<string, unknown>[] {
  let wb: XLSX.WorkBook
  try {
    wb = XLSX.read(buffer, { type: 'buffer' })
  } catch {
    throw new BadRequestError('Arquivo inválido. Envie uma planilha .xlsx ou .csv.')
  }
  const sheet = wb.Sheets[wb.SheetNames[0]]
  if (!sheet) throw new BadRequestError('A planilha está vazia.')

  const linhas = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false })
  if (linhas.length > MAX_LINHAS) {
    throw new BadRequestError(`A planilha tem ${linhas.length} linhas. Máximo permitido: ${MAX_LINHAS}.`)
  }
  return linhas.map(normalizeRow)
}

// ─── Imobiliárias ────────────────────────────────────────────────

export async function importImobiliarias(buffer: Buffer, opts: ImportOptions): Promise<ImportReport> {
  const linhas = parsePlanilha(buffer)
  const report = novoReport(linhas.length)

  const vistos = new Set<string>()
  const validas: ImobiliariaRow[] = []

  linhas.forEach((raw, idx) => {
    const linha = idx + 2 // +1 cabeçalho, +1 base-1
    const parsed = imobiliariaRowSchema.safeParse(raw)
    if (!parsed.success) { report.erros.push({ linha, mensagem: primeiroErro(parsed.error) }); return }

    if (vistos.has(parsed.data.cnpj)) {
      report.erros.push({ linha, mensagem: `CNPJ duplicado na planilha (${parsed.data.cnpj})` })
      return
    }
    vistos.add(parsed.data.cnpj)
    validas.push(parsed.data)
  })
  report.validos = validas.length

  for (const data of validas) {
    const existente = await prisma.imobiliaria.findUnique({ where: { cnpj: data.cnpj }, select: { id: true } })
    if (existente) {
      report.existentes++
      if (!opts.dryRun) {
        if (opts.modo === 'atualizar') {
          await prisma.imobiliaria.update({
            where: { id: existente.id },
            data:  { nome: data.nome, telefone: data.telefone || null, email: data.email || null, cidade: data.cidade, uf: data.uf },
          })
          report.atualizados++
        } else {
          report.ignorados++
        }
      }
    } else {
      report.novos++
      if (!opts.dryRun) {
        await prisma.imobiliaria.create({
          data: { nome: data.nome, cnpj: data.cnpj, telefone: data.telefone || null, email: data.email || null, cidade: data.cidade, uf: data.uf },
        })
        report.criados++
      }
    }
  }

  return report
}

// ─── Corretores ──────────────────────────────────────────────────

export async function importCorretores(buffer: Buffer, opts: ImportOptions): Promise<ImportReport> {
  const linhas = parsePlanilha(buffer)
  const report = novoReport(linhas.length)

  // Mapa CNPJ → id das imobiliárias (para vincular)
  const imobiliarias = await prisma.imobiliaria.findMany({ select: { id: true, cnpj: true } })
  const cnpjParaId = new Map(imobiliarias.map((i) => [i.cnpj, i.id]))

  const vistos = new Set<string>()
  const validas: { data: CorretorRow; imobiliariaId: string | null }[] = []

  linhas.forEach((raw, idx) => {
    const linha = idx + 2
    const parsed = corretorRowSchema.safeParse(raw)
    if (!parsed.success) { report.erros.push({ linha, mensagem: primeiroErro(parsed.error) }); return }
    const d = parsed.data

    // Vínculo com imobiliária (se informado)
    let imobiliariaId: string | null = null
    if (d.cnpj_imobiliaria) {
      const id = cnpjParaId.get(d.cnpj_imobiliaria)
      if (!id) {
        report.erros.push({ linha, mensagem: `Imobiliária com CNPJ ${d.cnpj_imobiliaria} não encontrada (importe as imobiliárias antes)` })
        return
      }
      imobiliariaId = id
    }

    // Duplicidade dentro da própria planilha (cpf/creci/email)
    const chave = [d.cpf, d.creci.toLowerCase(), d.email.toLowerCase()]
    const dup = chave.find((c) => vistos.has(c))
    if (dup) {
      report.erros.push({ linha, mensagem: `Registro duplicado na planilha (${dup})` })
      return
    }
    chave.forEach((c) => vistos.add(c))
    validas.push({ data: d, imobiliariaId })
  })
  report.validos = validas.length

  for (const { data, imobiliariaId } of validas) {
    const existente = await prisma.corretor.findFirst({
      where: { OR: [{ cpf: data.cpf }, { creci: data.creci }, { email: data.email }] },
      select: { id: true },
    })

    if (existente) {
      report.existentes++
      if (!opts.dryRun) {
        if (opts.modo === 'atualizar') {
          await prisma.corretor.update({
            where: { id: existente.id },
            data: {
              nome: data.nome, telefone: data.telefone, whatsapp: data.whatsapp,
              whatsapp_opt_in: data.aceita_whatsapp, instagram: data.instagram || null,
              cidade: data.cidade, uf: data.uf,
              ...(imobiliariaId ? { imobiliaria_id: imobiliariaId } : {}),
            },
          })
          report.atualizados++
        } else {
          report.ignorados++
        }
      }
    } else {
      report.novos++
      if (!opts.dryRun) {
        // 1º acesso: senha = CPF (somente números). O corretor é obrigado a
        // trocar a senha no primeiro login (senha_provisoria = true).
        const senhaInicial = data.cpf.replace(/\D/g, '')
        await prisma.corretor.create({
          data: {
            nome: data.nome, cpf: data.cpf, creci: data.creci, email: data.email,
            senha: await hashPassword(senhaInicial),
            senha_provisoria: true,
            telefone: data.telefone || data.whatsapp, whatsapp: data.whatsapp,
            whatsapp_opt_in: data.aceita_whatsapp, instagram: data.instagram || null,
            cidade: data.cidade, uf: data.uf,
            imobiliaria_id: imobiliariaId,
            status: 'ativo',
          },
        })
        report.criados++
      }
    }
  }

  return report
}

// ─── Modelos (planilhas de exemplo) ──────────────────────────────

function gerarXlsx(aba: string, headers: string[], exemplo: string[], instrucoes: string[][]): Buffer {
  const wb = XLSX.utils.book_new()
  const dados = XLSX.utils.aoa_to_sheet([headers, exemplo])
  XLSX.utils.book_append_sheet(wb, dados, aba)
  const instr = XLSX.utils.aoa_to_sheet([['Coluna', 'Obrigatório', 'Observação'], ...instrucoes])
  XLSX.utils.book_append_sheet(wb, instr, 'Instruções')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

export function modeloImobiliarias(): Buffer {
  return gerarXlsx(
    'Imobiliarias',
    ['nome', 'cnpj', 'telefone', 'email', 'cidade', 'uf'],
    ['Imobiliária Exemplo', '12.345.678/0001-90', '(11) 3333-4444', 'contato@exemplo.com', 'São Paulo', 'SP'],
    [
      ['nome', 'Sim', 'Nome da imobiliária'],
      ['cnpj', 'Sim', '14 dígitos (com ou sem máscara). Usado para evitar duplicados.'],
      ['telefone', 'Não', 'Com DDD'],
      ['email', 'Não', 'E-mail de contato'],
      ['cidade', 'Sim', ''],
      ['uf', 'Sim', '2 letras (ex.: SP, CE)'],
    ],
  )
}

export function modeloCorretores(): Buffer {
  return gerarXlsx(
    'Corretores',
    ['nome', 'cpf', 'creci', 'email', 'telefone', 'whatsapp', 'cidade', 'uf', 'instagram', 'cnpj_imobiliaria', 'aceita_whatsapp'],
    ['João da Silva', '123.456.789-00', 'SP-12345', 'joao@exemplo.com', '(11) 91234-5678', '(11) 91234-5678', 'São Paulo', 'SP', '@joao', '12.345.678/0001-90', 'sim'],
    [
      ['nome', 'Sim', 'Nome completo'],
      ['cpf', 'Sim', '11 dígitos (com ou sem máscara)'],
      ['creci', 'Sim', 'Registro CRECI'],
      ['email', 'Sim', 'Usado para login'],
      ['telefone', 'Sim', 'Com DDD'],
      ['whatsapp', 'Sim', 'Com DDD'],
      ['cidade', 'Sim', ''],
      ['uf', 'Sim', '2 letras'],
      ['instagram', 'Não', 'Opcional'],
      ['cnpj_imobiliaria', 'Não', 'CNPJ de uma imobiliária já cadastrada (vincula o corretor)'],
      ['aceita_whatsapp', 'Não', 'sim / não — consentimento para receber notificações'],
    ],
  )
}
