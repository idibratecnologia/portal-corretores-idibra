/**
 * Storage PRIVADO de treinamentos (vídeos e documentos).
 *
 * Fica FORA de /uploads (que o Nginx/@fastify-static servem publicamente).
 * O acesso é sempre via rotas protegidas (auth + permissão + Range).
 *
 * Os caminhos guardados no banco são RELATIVOS à raiz do storage, ex.:
 *   treinamentos/{id}/video/720p.mp4
 *   treinamentos/{id}/documentos/{uuid}.pdf
 */
import { createWriteStream } from 'fs'
import { mkdir, rm, stat } from 'fs/promises'
import { join, resolve, dirname } from 'path'
import { pipeline } from 'stream/promises'
import type { Readable } from 'stream'
import { config } from '@/config'

const ROOT = resolve(config.storage.dir)

/** Caminho absoluto a partir de um caminho relativo (guardado no banco). */
export function caminhoAbsoluto(rel: string): string {
  return join(ROOT, rel)
}

export function pastaTreinamento(id: string): string {
  return join(ROOT, 'treinamentos', id)
}

/** Salva um stream em disco (uso: vídeo grande, sem carregar na memória). Retorna o tamanho. */
export async function salvarStream(stream: Readable, destAbs: string): Promise<number> {
  await mkdir(dirname(destAbs), { recursive: true })
  await pipeline(stream, createWriteStream(destAbs))
  const s = await stat(destAbs)
  return s.size
}

export async function existeArquivo(rel: string): Promise<boolean> {
  try { await stat(caminhoAbsoluto(rel)); return true } catch { return false }
}

export async function tamanhoArquivo(rel: string): Promise<number> {
  try { return (await stat(caminhoAbsoluto(rel))).size } catch { return 0 }
}

export async function removerArquivo(rel: string | null | undefined): Promise<void> {
  if (!rel) return
  try { await rm(caminhoAbsoluto(rel), { force: true }) } catch { /* já não existe */ }
}

/** Remove toda a pasta de um treinamento (aulas, vídeos, documentos). */
export async function removerPastaTreinamento(id: string): Promise<void> {
  try { await rm(pastaTreinamento(id), { recursive: true, force: true }) } catch { /* ignora */ }
}

/** Remove uma pasta (caminho relativo) recursivamente do storage privado. */
export async function removerPastaRel(rel: string): Promise<void> {
  try { await rm(caminhoAbsoluto(rel), { recursive: true, force: true }) } catch { /* ignora */ }
}
