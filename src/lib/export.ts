/**
 * Helpers de exportação de tabelas: CSV, Excel (.xls SpreadsheetML, sem
 * dependências) e PDF (jsPDF). Usados nos relatórios da plataforma.
 */
import { jsPDF } from 'jspdf'

export type Cell = string | number
type Row = Cell[]

function baixarBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** CSV com BOM (abre certo no Excel em PT-BR). */
export function exportCsv(filename: string, rows: Row[]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  baixarBlob(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }), filename)
}

function escapeXml(v: string) {
  return v.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] as string))
}

/**
 * Excel (.xls) via SpreadsheetML 2003 — abre no Excel sem aviso de formato,
 * sem precisar de biblioteca. A primeira linha é tratada como cabeçalho.
 */
export function exportExcel(filename: string, sheetName: string, rows: Row[]) {
  const linhasXml = rows.map((r, ri) => {
    const cells = r.map((c) => {
      const numero = typeof c === 'number' && Number.isFinite(c)
      const tipo = numero ? 'Number' : 'String'
      const estilo = ri === 0 ? ' ss:StyleID="head"' : ''
      return `<Cell${estilo}><Data ss:Type="${tipo}">${escapeXml(String(c))}</Data></Cell>`
    }).join('')
    return `<Row>${cells}</Row>`
  }).join('')

  const xml =
`<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="head"><Font ss:Bold="1"/><Interior ss:Color="#E8F5E9" ss:Pattern="Solid"/></Style>
 </Styles>
 <Worksheet ss:Name="${escapeXml(sheetName).slice(0, 31)}">
  <Table>${linhasXml}</Table>
 </Worksheet>
</Workbook>`

  baixarBlob(new Blob(['﻿' + xml], { type: 'application/vnd.ms-excel;charset=utf-8;' }), filename)
}

interface PdfTableOptions {
  filename: string
  title: string
  subtitle?: string
  resumo?: Array<[string, string]>
  head: string[]
  body: Row[]
  /** Peso relativo de cada coluna (mesmo tamanho por padrão). */
  colWeights?: number[]
}

/** PDF tabular simples (cabeçalho IDIBRA + resumo opcional + tabela paginada). */
export function exportTablePdf(o: PdfTableOptions) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 40
  let y = 54

  doc.setFontSize(10).setTextColor(120)
  doc.text('IDIBRA — Relatório', M, y); y += 8
  doc.setDrawColor(220).line(M, y, W - M, y); y += 22

  doc.setFontSize(16).setTextColor(20)
  doc.text(o.title, M, y); y += o.subtitle ? 18 : 20
  if (o.subtitle) { doc.setFontSize(11).setTextColor(90); doc.text(o.subtitle, M, y); y += 20 }

  if (o.resumo?.length) {
    doc.setFontSize(10).setTextColor(90)
    o.resumo.forEach(([k, v]) => { doc.text(`${k}: ${v}`, M, y); y += 15 })
    y += 6
  }

  const usable = W - M * 2
  const weights = o.colWeights ?? o.head.map(() => 1)
  const somaPesos = weights.reduce((a, b) => a + b, 0)
  const colW = weights.map((w) => (w / somaPesos) * usable)
  const colX = colW.reduce<number[]>((acc, w, i) => { acc.push(i === 0 ? M : acc[i - 1] + colW[i - 1]); return acc }, [])

  const desenharCabecalho = () => {
    doc.setFontSize(9).setTextColor(130)
    o.head.forEach((h, i) => doc.text(String(h), colX[i], y))
    y += 8
    doc.setDrawColor(225).line(M, y, W - M, y); y += 12
    doc.setTextColor(40)
  }

  const maxChars = (w: number) => Math.max(4, Math.floor(w / 4.9))
  const clip = (v: string, w: number) => (v.length > maxChars(w) ? v.slice(0, maxChars(w) - 1) + '…' : v)

  doc.setFontSize(9)
  desenharCabecalho()
  o.body.forEach((r) => {
    if (y > H - 40) { doc.addPage(); y = 54; desenharCabecalho() }
    r.forEach((c, i) => doc.text(clip(String(c), colW[i]), colX[i], y))
    y += 14
  })

  doc.save(o.filename)
}
