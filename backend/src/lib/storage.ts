/**
 * Armazenamento de imagens no filesystem da VPS.
 *
 * - Redimensiona e converte para WebP com sharp (economia de espaço e banda)
 * - Salva em {UPLOAD_DIR}/{kind}/{uuid}.webp
 * - Guarda no banco a URL pública completa (servida pelo Nginx em produção)
 */
import { randomUUID } from 'crypto'
import { mkdir, unlink, readFile, writeFile } from 'fs/promises'
import { join, resolve, extname } from 'path'
import sharp from 'sharp'
import { config } from '@/config'

export type ImageKind = 'fotos' | 'banners' | 'logos'

/**
 * Configuração por tipo de imagem.
 * - cover: corta para preencher exatamente WxH (avatar/banner)
 * - inside: encaixa dentro de WxH preservando a proporção (logo, sem cortar)
 */
const IMAGE_CONFIG: Record<ImageKind, { width: number; height: number; fit: 'cover' | 'inside'; quality: number }> = {
  fotos:   { width: 512,  height: 512, fit: 'inside', quality: 88 },  // foto do corretor: cabe em 512px sem cortar
  banners: { width: 1200, height: 630, fit: 'cover',  quality: 90 },  // banner 1,91:1 — ideal p/ WhatsApp/redes
  logos:   { width: 512,  height: 512, fit: 'inside', quality: 90 },  // logo: cabe em 512px sem cortar
}

/**
 * Processa e salva uma imagem. Retorna a URL pública completa.
 */
export async function saveImage(kind: ImageKind, buffer: Buffer): Promise<string> {
  const dir = join(resolve(config.upload.dir), kind)
  await mkdir(dir, { recursive: true })

  const { width, height, fit, quality } = IMAGE_CONFIG[kind]

  // Banners são usados em e-mail (que não renderiza WebP com alpha — mostra preto).
  // Por isso saem em JPEG achatado sobre branco: compatível com todo cliente + WhatsApp.
  const asJpeg = kind === 'banners'
  const filename = `${randomUUID()}.${asJpeg ? 'jpg' : 'webp'}`

  const base = sharp(buffer).resize(width, height, {
    fit,
    position: 'center',
    withoutEnlargement: fit === 'inside', // logo pequeno não é esticado
  })

  await (asJpeg
    ? base.flatten({ background: '#ffffff' }).jpeg({ quality })
    : base.webp({ quality })
  ).toFile(join(dir, filename))

  // URL pública: https://api.idibra.com.br/uploads/<kind>/uuid.<ext>
  return `${config.upload.apiUrl}/uploads/${kind}/${filename}`
}

/** Extensões permitidas para materiais de evento. */
export const MATERIAL_EXTENSOES = [
  '.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif',
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.zip',
]

/**
 * Salva um arquivo genérico (material de evento) preservando a extensão.
 * Retorna a URL pública completa. Valide a extensão antes de chamar.
 */
export async function saveRawFile(buffer: Buffer, originalName: string): Promise<string> {
  const dir = join(resolve(config.upload.dir), 'materiais')
  await mkdir(dir, { recursive: true })

  const ext = (extname(originalName) || '').toLowerCase().replace(/[^.a-z0-9]/g, '')
  const filename = `${randomUUID()}${ext}`
  await writeFile(join(dir, filename), buffer)

  return `${config.upload.apiUrl}/uploads/materiais/${filename}`
}

/**
 * Resolve uma imagem para envio ao Evolution.
 * URLs do nosso storage (/uploads/) são lidas do disco e retornadas em base64
 * (o container Evolution não alcança o localhost do backend). URLs externas
 * são repassadas como estão.
 */
export async function resolveMediaForSend(url: string): Promise<string> {
  const marker = '/uploads/'
  const idx = url.indexOf(marker)
  if (idx === -1) return url
  const rel = url.slice(idx + marker.length)
  const buf = await readFile(join(resolve(config.upload.dir), rel))
  return buf.toString('base64')
}

/**
 * Remove um arquivo a partir da URL salva no banco.
 * Silencioso se o arquivo não existir (não quebra o fluxo).
 */
export async function deleteImage(url: string | null | undefined): Promise<void> {
  if (!url) return

  const marker = '/uploads/'
  const idx = url.indexOf(marker)
  if (idx === -1) return

  const relativePath = url.slice(idx + marker.length) // ex: fotos/uuid.webp
  try {
    await unlink(join(resolve(config.upload.dir), relativePath))
  } catch {
    // arquivo já não existe — ignora
  }
}
