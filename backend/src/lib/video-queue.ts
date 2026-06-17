/**
 * Fila de processamento de vídeos (treinamento) — robusta.
 *
 *  - Processa UM vídeo por vez (FFmpeg é pesado de CPU). Vários uploads
 *    entram na fila e são convertidos em sequência.
 *  - Persiste o status na aula (upload_recebido → processando → disponivel/erro).
 *  - Recuperação: ao iniciar o servidor, reenfileira aulas que ficaram
 *    "no meio" (status upload_recebido/processando com original ainda em disco).
 */
import { join, resolve } from 'path'
import { prisma } from '@/lib/prisma'
import { config } from '@/config'
import { caminhoAbsoluto, removerArquivo } from '@/lib/treinamento-storage'
import { obterDuracao, converter720p, gerarThumbnail } from '@/lib/video'
import { emitAdminRefresh } from '@/lib/events'

interface Job { aulaId: string; treinamentoId: string; origRel: string }

const fila: Job[] = []
let processando = false

const relVideo = (tid: string, aid: string) => `treinamentos/${tid}/aulas/${aid}/video/720p.mp4`

function thumbPublico(tid: string, aid: string) {
  return {
    abs: join(resolve(config.upload.dir), 'treinamentos', tid, 'aulas', aid, 'thumb.jpg'),
    url: `${config.upload.apiUrl}/uploads/treinamentos/${tid}/aulas/${aid}/thumb.jpg`,
  }
}

function msgErro(err: unknown): string {
  return err instanceof Error ? err.message.slice(0, 500) : String(err)
}

/** Coloca uma aula na fila de conversão (idempotente). */
export function enfileirarProcessamento(job: Job): void {
  if (!fila.some((j) => j.aulaId === job.aulaId)) fila.push(job)
  void processarProximo()
}

/** Status atual da fila (para a UI, se desejado). */
export function statusFila(): { processando: boolean; naFila: number } {
  return { processando, naFila: fila.length }
}

async function processarProximo(): Promise<void> {
  if (processando) return
  const job = fila.shift()
  if (!job) return
  processando = true
  try {
    await processarJob(job)
  } catch (err) {
    await prisma.treinamentoAula
      .update({ where: { id: job.aulaId }, data: { status_video: 'erro_processamento', video_erro: msgErro(err) } })
      .catch(() => {})
    emitAdminRefresh('treinamento-video')
  } finally {
    processando = false
    if (fila.length) void processarProximo()
  }
}

async function processarJob(job: Job): Promise<void> {
  await prisma.treinamentoAula.update({ where: { id: job.aulaId }, data: { status_video: 'processando' } })
  emitAdminRefresh('treinamento-video')

  const origAbs = caminhoAbsoluto(job.origRel)
  const videoRel = relVideo(job.treinamentoId, job.aulaId)
  const videoAbs = caminhoAbsoluto(videoRel)

  await converter720p(origAbs, videoAbs)
  const duracao = await obterDuracao(videoAbs)

  const { abs: thumbAbs, url: thumbUrl } = thumbPublico(job.treinamentoId, job.aulaId)
  let thumbnail_url: string | null = null
  try { await gerarThumbnail(videoAbs, thumbAbs); thumbnail_url = thumbUrl } catch { /* sem thumb */ }

  await prisma.treinamentoAula.update({
    where: { id: job.aulaId },
    data: {
      video_path: videoRel, video_duracao: duracao, thumbnail_url,
      status_video: 'disponivel', video_excluido: false, original_path: null, video_erro: null,
    },
  })
  await removerArquivo(job.origRel) // original não é mais necessário
  emitAdminRefresh('treinamento-video')
}

/** Recuperação no startup: reenfileira (ou marca erro) o que ficou pendente. */
export async function recuperarFilaPendente(): Promise<void> {
  const pendentes = await prisma.treinamentoAula.findMany({
    where: { status_video: { in: ['upload_recebido', 'processando'] }, original_path: { not: null } },
    select: { id: true, treinamento_id: true, original_path: true },
  })
  for (const a of pendentes) {
    if (a.original_path) enfileirarProcessamento({ aulaId: a.id, treinamentoId: a.treinamento_id, origRel: a.original_path })
  }
  const orfas = await prisma.treinamentoAula.updateMany({
    where: { status_video: { in: ['upload_recebido', 'processando'] }, original_path: null },
    data: { status_video: 'erro_processamento', video_erro: 'Processamento interrompido (reinício do servidor). Reenvie o vídeo.' },
  })
  if (pendentes.length || orfas.count) {
    console.log(`[video-queue] recuperação: ${pendentes.length} reenfileirada(s), ${orfas.count} marcada(s) como erro`)
  }
}
