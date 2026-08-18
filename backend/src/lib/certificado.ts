/**
 * Geração do certificado de participação em PDF (pdfkit, sem dependência de
 * Chromium). Layout em A4 paisagem com a identidade IDIBRA.
 */
import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'

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

/** Formata carga horária (horas decimais) como "4h" / "1h30". */
function fmtCargaHoraria(h?: number | null): string {
  if (!h || h <= 0) return ''
  const H = Math.floor(h)
  const m = Math.round((h - H) * 60)
  return m > 0 ? `${H}h${String(m).padStart(2, '0')}` : `${H}h`
}

/** Embute um PNG (arte de um modelo visual) numa página PDF do tamanho do modelo. */
export function pngParaPdf(png: Buffer, width: number, height: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [width, height], margin: 0 })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    doc.image(png, 0, 0, { width, height })
    doc.end()
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

// ─── Certificado de CONCLUSÃO de curso (treinamento) ─────────────────

export interface CertificadoTreinamentoData {
  nome:           string
  creci?:         string | null
  cursoTitulo:    string
  concluidoEm:    Date
  cargaHoraria?:  number | null
  codigo:         string   // código de validação
  urlValidacao:   string   // ex.: https://portal.../validar/{codigo}
}

/**
 * Certificado de conclusão de treinamento em PDF (A4 paisagem, identidade IDIBRA),
 * com QR Code de validação pública no rodapé.
 */
export async function gerarCertificadoTreinamentoPdf(data: CertificadoTreinamentoData): Promise<Buffer> {
  // QR da URL pública de validação (correção 'M', igual ao restante do sistema)
  const qrPng = await QRCode.toBuffer(data.urlValidacao, {
    type: 'png', width: 220, margin: 1, errorCorrectionLevel: 'M',
    color: { dark: '#111827', light: '#FFFFFF' },
  })

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
      .text('IDIBRA', 0, 68, { align: 'center', characterSpacing: 6 })
    doc.font('Helvetica').fontSize(11).fillColor('#6b7280')
      .text('Portal de Corretores Parceiros', { align: 'center' })

    // Título
    doc.moveDown(1.2)
    doc.font('Helvetica-Bold').fontSize(23).fillColor(CINZA)
      .text('CERTIFICADO DE CONCLUSÃO', { align: 'center', characterSpacing: 2 })

    // Corpo
    doc.moveDown(1.0)
    doc.font('Helvetica').fontSize(13).fillColor(CINZA).text('Certificamos que', { align: 'center' })

    doc.moveDown(0.5)
    doc.font('Helvetica-Bold').fontSize(28).fillColor('#111827').text(data.nome, { align: 'center' })

    if (data.creci) {
      doc.font('Helvetica').fontSize(12).fillColor('#6b7280').text(`CRECI: ${data.creci}`, { align: 'center' })
    }

    doc.moveDown(0.8)
    doc.font('Helvetica').fontSize(13).fillColor(CINZA).text('concluiu o curso', { align: 'center' })

    doc.moveDown(0.4)
    doc.font('Helvetica-Bold').fontSize(16).fillColor(VERDE).text(data.cursoTitulo, { align: 'center' })

    doc.moveDown(0.4)
    const carga = fmtCargaHoraria(data.cargaHoraria)
    const cargaTxt = carga ? ` · Carga horária: ${carga}` : ''
    doc.font('Helvetica').fontSize(12).fillColor('#6b7280')
      .text(`Concluído em ${dataPorExtenso(data.concluidoEm)}${cargaTxt}.`, { align: 'center' })

    // QR Code + código de validação (rodapé, canto direito)
    const qrSize = 84
    const qrX = W - 60 - qrSize
    const qrY = H - 60 - qrSize
    doc.image(qrPng, qrX, qrY, { width: qrSize, height: qrSize })
    doc.font('Helvetica').fontSize(7).fillColor('#9ca3af')
      .text('Validar autenticidade', qrX - 6, qrY + qrSize + 3, { width: qrSize + 12, align: 'center' })

    // Código legível (rodapé, canto esquerdo)
    doc.font('Helvetica').fontSize(8).fillColor('#9ca3af')
      .text(`Código: ${data.codigo}`, 60, H - 72, { align: 'left' })

    // Selo de rodapé
    doc.font('Helvetica-Bold').fontSize(11).fillColor(VERDE)
      .text('CURSO CONCLUÍDO', 0, H - 96, { align: 'center', characterSpacing: 2 })

    doc.end()
  })
}
