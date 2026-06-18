import { jsPDF } from 'jspdf'
import JSZip from 'jszip'

export function baixarDataURL(dataURL: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataURL
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/** Gera um PDF de uma página com a imagem, respeitando dimensões/orientação. */
export function dataURLparaPDF(dataURL: string, width: number, height: number): jsPDF {
  const pdf = new jsPDF({ orientation: width >= height ? 'landscape' : 'portrait', unit: 'px', format: [width, height] })
  pdf.addImage(dataURL, 'PNG', 0, 0, width, height)
  return pdf
}

export function baixarPDF(dataURL: string, width: number, height: number, filename: string) {
  dataURLparaPDF(dataURL, width, height).save(filename)
}

export function slug(s: string): string {
  return s.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'modelo'
}

function baixarBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  baixarDataURL(url, filename)
  URL.revokeObjectURL(url)
}

/** PDF único com uma página por arte (todas com as mesmas dimensões). */
export function baixarPDFLote(paginas: string[], width: number, height: number, filename: string) {
  const orientation = width >= height ? 'landscape' : 'portrait'
  const pdf = new jsPDF({ orientation, unit: 'px', format: [width, height] })
  paginas.forEach((url, i) => {
    if (i > 0) pdf.addPage([width, height], orientation)
    pdf.addImage(url, 'PNG', 0, 0, width, height)
  })
  pdf.save(filename)
}

/** ZIP com um arquivo por arte. `ext` = 'png' (imagens) ou 'pdf' (um PDF por arte). */
export async function baixarZip(
  artes: Array<{ nome: string; dataURL: string }>,
  width: number, height: number, ext: 'png' | 'pdf', zipName: string,
) {
  const zip = new JSZip()
  const usados = new Map<string, number>()
  for (const a of artes) {
    let base = slug(a.nome)
    const n = (usados.get(base) ?? 0) + 1
    usados.set(base, n)
    if (n > 1) base = `${base}-${n}`
    if (ext === 'png') {
      zip.file(`${base}.png`, a.dataURL.split(',')[1], { base64: true })
    } else {
      const buf = dataURLparaPDF(a.dataURL, width, height).output('arraybuffer')
      zip.file(`${base}.pdf`, buf)
    }
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  baixarBlob(blob, zipName)
}
