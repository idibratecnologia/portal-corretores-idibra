/**
 * Geração do certificado de participação em PDF (pdfkit, sem dependência de
 * Chromium). Layout em A4 paisagem com a identidade IDIBRA.
 */
import PDFDocument from 'pdfkit'

export interface CertificadoData {
  nome:         string
  creci?:       string | null
  eventoTitulo: string
  dataEvento:   Date
  local?:       string | null
}

const VERDE = '#15803d'
const CINZA = '#374151'

function dataPorExtenso(d: Date): string {
  return d.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'long', year: 'numeric',
  })
}

export function gerarCertificadoPdf(data: CertificadoData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const W = doc.page.width
    const H = doc.page.height

    // Moldura dupla
    doc.lineWidth(3).strokeColor(VERDE).roundedRect(28, 28, W - 56, H - 56, 12).stroke()
    doc.lineWidth(1).strokeColor('#86efac').roundedRect(38, 38, W - 76, H - 76, 10).stroke()

    // Cabeçalho
    doc.font('Helvetica-Bold').fontSize(30).fillColor(VERDE)
      .text('IDIBRA', 0, 72, { align: 'center', characterSpacing: 6 })
    doc.font('Helvetica').fontSize(11).fillColor('#6b7280')
      .text('Portal de Corretores Parceiros', { align: 'center' })

    // Título
    doc.moveDown(1.3)
    doc.font('Helvetica-Bold').fontSize(23).fillColor(CINZA)
      .text('CERTIFICADO DE PARTICIPAÇÃO', { align: 'center', characterSpacing: 2 })

    // Corpo
    doc.moveDown(1.1)
    doc.font('Helvetica').fontSize(13).fillColor(CINZA).text('Certificamos que', { align: 'center' })

    doc.moveDown(0.5)
    doc.font('Helvetica-Bold').fontSize(28).fillColor('#111827').text(data.nome, { align: 'center' })

    if (data.creci) {
      doc.font('Helvetica').fontSize(12).fillColor('#6b7280').text(`CRECI: ${data.creci}`, { align: 'center' })
    }

    doc.moveDown(0.8)
    doc.font('Helvetica').fontSize(13).fillColor(CINZA).text('participou do evento', { align: 'center' })

    doc.moveDown(0.4)
    doc.font('Helvetica-Bold').fontSize(16).fillColor(VERDE).text(data.eventoTitulo, { align: 'center' })

    doc.moveDown(0.4)
    const localTxt = data.local ? ` · ${data.local}` : ''
    doc.font('Helvetica').fontSize(12).fillColor('#6b7280')
      .text(`Realizado em ${dataPorExtenso(data.dataEvento)}${localTxt}.`, { align: 'center' })

    // Selo de rodapé
    doc.font('Helvetica-Bold').fontSize(11).fillColor(VERDE)
      .text('PRESENÇA CONFIRMADA', 0, H - 96, { align: 'center', characterSpacing: 2 })

    doc.end()
  })
}
