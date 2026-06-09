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
export async function readImageUpload(req: FastifyRequest): Promise<Buffer> {
  const data = await req.file()

  if (!data) {
    throw new BadRequestError('Nenhum arquivo enviado')
  }

  if (!ALLOWED_MIME.includes(data.mimetype)) {
    throw new BadRequestError('Formato inválido. Envie uma imagem JPG, PNG ou WebP.')
  }

  const buffer = await data.toBuffer()

  // O @fastify/multipart já aborta acima do limite, mas validamos de novo por segurança
  const maxBytes = config.upload.maxSizeMB * 1024 * 1024
  if (buffer.length > maxBytes) {
    throw new BadRequestError(`Arquivo muito grande. Máximo ${config.upload.maxSizeMB} MB.`)
  }

  return buffer
}
