/**
 * Processamento de vídeo com FFmpeg (na VPS).
 *  - Converte para MP4 720p (H.264 + AAC), CRF 28, faststart (streaming web)
 *  - Extrai a duração (ffprobe)
 *  - Gera thumbnail
 *
 * Requer ffmpeg/ffprobe instalados no servidor.
 */
import { spawn } from 'child_process'
import { mkdir } from 'fs/promises'
import { dirname } from 'path'

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args)
    let stderr = ''
    proc.stderr.on('data', (d) => { stderr += d.toString() })
    proc.on('error', (e) => reject(new Error(`Falha ao executar ${cmd}: ${e.message}`)))
    proc.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} terminou com código ${code}. ${stderr.slice(-600)}`)),
    )
  })
}

/** Duração do vídeo em segundos (0 se não conseguir ler). */
export function obterDuracao(inputAbs: string): Promise<number> {
  return new Promise((resolve) => {
    const proc = spawn('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1', inputAbs,
    ])
    let out = ''
    proc.stdout.on('data', (d) => { out += d.toString() })
    proc.on('close', () => resolve(Math.round(parseFloat(out.trim()) || 0)))
    proc.on('error', () => resolve(0))
  })
}

/** Converte o vídeo para MP4 720p (CRF 28) no caminho de saída. */
export async function converter720p(inputAbs: string, outputAbs: string): Promise<void> {
  await mkdir(dirname(outputAbs), { recursive: true })
  await run('ffmpeg', [
    '-y', '-i', inputAbs,
    '-vf', 'scale=-2:720',
    '-vcodec', 'libx264', '-crf', '28', '-preset', 'medium',
    '-acodec', 'aac', '-b:a', '128k',
    '-movflags', '+faststart',
    outputAbs,
  ])
}

/** Gera uma thumbnail (JPG) a partir de um frame do vídeo. */
export async function gerarThumbnail(inputAbs: string, outputAbs: string): Promise<void> {
  await mkdir(dirname(outputAbs), { recursive: true })
  await run('ffmpeg', [
    '-y', '-ss', '3', '-i', inputAbs,
    '-frames:v', '1', '-vf', 'scale=-2:360', outputAbs,
  ])
}
