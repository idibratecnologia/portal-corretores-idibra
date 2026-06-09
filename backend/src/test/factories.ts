/**
 * Fábricas para criar dados de teste com valores padrão sobrescrevíveis.
 */
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/hash'

let seq = 0
const uniq = () => `${seq++}`

/** CPF formatado único e dentro de VarChar(14): 000.000.000-00 */
const cpfUnico = () => {
  const n = String(seq++).padStart(11, '0')
  return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9, 11)}`
}

/** CNPJ formatado único e dentro de VarChar(18): 00.000.000/0001-00 */
const cnpjUnico = () => {
  const n = String(seq++).padStart(14, '0')
  return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8, 12)}-${n.slice(12, 14)}`
}

export async function criarAdmin(over: Partial<{ email: string; senha: string; nome: string }> = {}) {
  const senha = over.senha ?? 'admin123'
  return prisma.admin.create({
    data: {
      nome:  over.nome  ?? 'Admin Teste',
      email: over.email ?? `admin-${uniq()}@idibra.com.br`,
      senha: await hashPassword(senha),
    },
  })
}

export async function criarImobiliaria(over: Partial<{ nome: string; cnpj: string; status: 'ativa' | 'inativa' }> = {}) {
  return prisma.imobiliaria.create({
    data: {
      nome:   over.nome   ?? 'Imobiliária Teste',
      cnpj:   over.cnpj   ?? cnpjUnico(),
      cidade: 'São Paulo',
      uf:     'SP',
      status: over.status ?? 'ativa',
    },
  })
}

export async function criarCorretor(
  over: Partial<{ email: string; cpf: string; creci: string; senha: string; status: 'pendente' | 'ativo' | 'bloqueado'; whatsapp_opt_in: boolean; imobiliaria_id: string }> = {},
) {
  const senha = over.senha ?? 'corretor123'
  return prisma.corretor.create({
    data: {
      nome:            'Corretor Teste',
      cpf:             over.cpf   ?? cpfUnico(),
      creci:           over.creci ?? `CRECI-${uniq()}`,
      email:           over.email ?? `corretor-${uniq()}@email.com`,
      senha:           await hashPassword(senha),
      telefone:        '(11) 91234-5678',
      whatsapp:        '(11) 91234-5678',
      whatsapp_opt_in: over.whatsapp_opt_in ?? false,
      cidade:          'São Paulo',
      uf:              'SP',
      status:          over.status ?? 'ativo',
      imobiliaria_id:  over.imobiliaria_id,
    },
  })
}

export async function criarEvento(
  over: Partial<{ status: 'rascunho' | 'publicado' | 'encerrado' | 'cancelado'; capacidade: number; inscricoes_abertas: boolean; data_evento: Date }> = {},
) {
  return prisma.evento.create({
    data: {
      titulo:      'Evento Teste',
      descricao:   'Descrição do evento de teste',
      tipo:        'lancamento',
      local:       'Local Teste',
      endereco:    'Endereço Teste',
      data_evento: over.data_evento ?? new Date(Date.now() + 7 * 86400000),
      hora_inicio: '19:00',
      hora_fim:    '22:00',
      capacidade:  over.capacidade ?? 100,
      status:      over.status ?? 'publicado',
      inscricoes_abertas: over.inscricoes_abertas ?? true,
    },
  })
}
