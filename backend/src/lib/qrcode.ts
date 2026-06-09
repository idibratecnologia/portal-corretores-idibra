/**
 * Geração de QR Code para envio via WhatsApp.
 *
 * O QR codifica exatamente o `qr_code_token` da inscrição — o mesmo valor lido
 * pelo scanner do admin no check-in. Geramos em WebP (base64) para casar com o
 * mimetype padrão do envio de mídia da Evolution.
 */
import QRCode from 'qrcode'
import sharp from 'sharp'

/**
 * Gera o QR Code do token e retorna a imagem em base64 (WebP, sem prefixo data:).
 * O nível de correção 'M' acompanha o usado no frontend (QrCodeCard).
 */
export async function gerarQrCheckinBase64(token: string): Promise<string> {
  const png = await QRCode.toBuffer(token, {
    type: 'png',
    width: 512,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#FFFFFF' },
  })

  const webp = await sharp(png).webp({ quality: 92 }).toBuffer()
  return webp.toString('base64')
}
