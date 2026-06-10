import { api, apiBaseUrl, getToken } from '@/lib/api'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

export type ImportTipo = 'imobiliarias' | 'corretores'
export type ImportModo = 'ignorar' | 'atualizar'

export interface ImportReport {
  total:       number
  validos:     number
  novos:       number
  existentes:  number
  criados:     number
  atualizados: number
  ignorados:   number
  erros:       { linha: number; mensagem: string }[]
}

/** Baixa a planilha modelo (.xlsx) do tipo escolhido. */
export async function baixarModelo(tipo: ImportTipo): Promise<void> {
  if (USE_MOCK) { console.log('[mock] baixarModelo', tipo); return }

  const res = await fetch(`${apiBaseUrl}/import/modelo/${tipo}`, {
    headers: { Authorization: `Bearer ${getToken() ?? ''}` },
  })
  if (!res.ok) throw new Error('Não foi possível baixar o modelo.')

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `modelo-${tipo}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * Envia a planilha para importação.
 * dryRun=true → só valida e devolve a pré-visualização (não grava).
 */
export async function importarPlanilha(
  tipo: ImportTipo,
  file: File,
  opts: { dryRun: boolean; modo: ImportModo },
): Promise<ImportReport> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500))
    return { total: 0, validos: 0, novos: 0, existentes: 0, criados: 0, atualizados: 0, ignorados: 0, erros: [] }
  }

  const form = new FormData()
  form.append('file', file)
  return api.upload<ImportReport>(
    `/import/${tipo}?dryRun=${opts.dryRun}&modo=${opts.modo}`,
    form,
  )
}
