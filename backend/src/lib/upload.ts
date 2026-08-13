/**
 * Helper para ler e validar uploads multipart (imagens).
 */
import type { FastifyRequest } from 'fastify'
import { BadRequestError } from '@/lib/errors'
import { config } from '@/config'

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Lê o primeiro arquivo enviado, valida tipo e tamanho, e retorna o buffer.
 * Requer @fastify/multipart registrado.
 */
export async function readImageUpload(
  req: FastifyRequest,
  opts: { maxSizeMB?: number } = {},
): Promise<Buffer> {
  const maxSizeMB = opts.maxSizeMB ?? config.upload.maxSizeMB
  const maxBytes = maxSizeMB * 1024 * 1024

  // Limite por chamada (permite banners maiores que o limite global padrão)
  const data = await req.file({ limits: { fileSize: maxBytes } })

  if (!data) {
    throw new BadRequestError('Nenhum arquivo enviado')
  }

  if (!ALLOWED_MIME.includes(data.mimetype)) {
    throw new BadRequestError('Formato inválido. Envie uma imagem JPG, PNG ou WebP.')
  }

  const buffer = await data.toBuffer()

  // Validação extra (o @fastify/multipart já aborta acima do limite via truncated)
  if ((data.file as { truncated?: boolean }).truncated || buffer.length > maxBytes) {
    throw new BadRequestError(`Arquivo muito grande. Máximo ${maxSizeMB} MB.`)
  }

  return buffer
}
