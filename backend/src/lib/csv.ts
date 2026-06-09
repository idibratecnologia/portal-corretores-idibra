/**
 * Geração de CSV compatível com Excel (PT-BR).
 *
 * - Separador ';' (padrão do Excel em português)
 * - BOM UTF-8 no início para o Excel reconhecer acentuação
 * - Escapa aspas, separador e quebras de linha
 */
type Cell = string | number | null | undefined

const BOM = String.fromCharCode(0xfeff)

function escape(value: Cell): string {
  const s = value === null || value === undefined ? '' : String(value)
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(headers: string[], rows: Cell[][]): string {
  const sep = ';'
  const linhas = [
    headers.map(escape).join(sep),
    ...rows.map((r) => r.map(escape).join(sep)),
  ]
  return BOM + linhas.join('\r\n')
}
