import type { StatusVideo, StatusProgresso } from '@/services/treinamentos'

/** Formata segundos como mm:ss ou h:mm:ss. */
export function formatDuracao(segundos: number | null | undefined): string {
  if (!segundos || segundos <= 0) return '--:--'
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = Math.floor(segundos % 60)
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

export interface BadgeInfo { label: string; className: string; processando?: boolean }

export function statusVideoInfo(status: StatusVideo): BadgeInfo {
  switch (status) {
    case 'disponivel':         return { label: 'Disponível', className: 'bg-green-100 text-green-700' }
    case 'processando':        return { label: 'Processando…', className: 'bg-amber-100 text-amber-700', processando: true }
    case 'upload_recebido':    return { label: 'Na fila…', className: 'bg-amber-100 text-amber-700', processando: true }
    case 'erro_processamento': return { label: 'Erro no vídeo', className: 'bg-red-100 text-red-700' }
    case 'expirado':
    case 'excluido':           return { label: 'Vídeo removido', className: 'bg-gray-100 text-gray-500' }
    default:                   return { label: 'Sem vídeo', className: 'bg-gray-100 text-gray-500' }
  }
}

export function statusProgressoInfo(status: StatusProgresso): BadgeInfo {
  switch (status) {
    case 'concluido':   return { label: 'Concluído', className: 'bg-green-100 text-green-700' }
    case 'em_andamento': return { label: 'Em andamento', className: 'bg-amber-100 text-amber-700' }
    default:            return { label: 'Não iniciado', className: 'bg-gray-100 text-gray-500' }
  }
}

/** Indica que o vídeo ainda está sendo processado (mostrar spinner / desabilitar play). */
export function videoEmProcessamento(status: StatusVideo): boolean {
  return status === 'processando' || status === 'upload_recebido'
}

/** yyyy-mm-dd a partir de uma data ISO (para inputs date). */
export function isoParaInputDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}
