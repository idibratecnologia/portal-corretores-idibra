import { api, apiBaseUrl, getToken } from '@/lib/api'
import { mockInscricoes, mockInscricoesCorretorLogado } from '@/data/mockData'
import type { EventoInscricao, StatusInscricao } from '@/types'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

// ─── Listagem ────────────────────────────────────────────────────

export async function fetchInscricoesByEvento(
  eventoId: string,
): Promise<EventoInscricao[]> {
  if (USE_MOCK) {
    return mockInscricoes.filter((i) => i.evento_id === eventoId) as EventoInscricao[]
  }

  return api.get<EventoInscricao[]>(`/inscricoes?evento_id=${eventoId}`)
}

export async function fetchInscricoesByCorretor(
  corretorId: string,
): Promise<EventoInscricao[]> {
  if (USE_MOCK) {
    return mockInscricoesCorretorLogado.filter((i) => i.corretor_id === corretorId)
  }

  return api.get<EventoInscricao[]>(`/inscricoes?corretor_id=${corretorId}`)
}

/** Inscrições do corretor logado (usa rota autenticada /inscricoes/me) */
export async function fetchMinhasInscricoes(): Promise<EventoInscricao[]> {
  if (USE_MOCK) {
    return mockInscricoesCorretorLogado
  }

  return api.get<EventoInscricao[]>('/inscricoes/me')
}

// ─── Mutações ────────────────────────────────────────────────────

export async function createInscricao(
  eventoId: string,
): Promise<EventoInscricao> {
  if (USE_MOCK) {
    return {
      id:            String(Date.now()),
      evento_id:     eventoId,
      corretor_id:   '1',
      status:        'inscrito',
      qr_code_token: `TOKEN-${Date.now()}`,
      created_at:    new Date().toISOString(),
    }
  }

  return api.post<EventoInscricao>('/inscricoes', { evento_id: eventoId })
}

export async function cancelarInscricao(inscricaoId: string): Promise<void> {
  if (USE_MOCK) {
    console.log('[mock] cancelarInscricao', inscricaoId)
    return
  }

  await api.patch(`/inscricoes/${inscricaoId}/cancelar`, {})
}

/** Admin marca presença/ausência manualmente. */
export async function setInscricaoStatus(
  inscricaoId: string,
  status: 'presente' | 'ausente' | 'cancelado',
): Promise<EventoInscricao> {
  if (USE_MOCK) {
    console.log('[mock] setInscricaoStatus', inscricaoId, status)
    return { id: inscricaoId, evento_id: '', corretor_id: '', status, qr_code_token: '', created_at: new Date().toISOString() }
  }

  return api.patch<EventoInscricao>(`/inscricoes/${inscricaoId}/status`, { status })
}

/** Admin baixa a lista de presença do evento em CSV (Excel). */
export async function exportarPresencaCsv(eventoId: string, nomeEvento?: string): Promise<void> {
  if (USE_MOCK) {
    console.log('[mock] exportarPresencaCsv', eventoId)
    return
  }

  const res = await fetch(`${apiBaseUrl}/inscricoes/export?evento_id=${eventoId}`, {
    headers: { Authorization: `Bearer ${getToken() ?? ''}` },
  })
  if (!res.ok) throw new Error('Não foi possível exportar a lista de presença.')

  const blob = await res.blob()
  const slug = (nomeEvento || 'evento')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 40) || 'evento'
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `presenca-${slug}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Corretor baixa o certificado de participação (PDF) de uma inscrição presente. */
export async function baixarCertificado(inscricaoId: string, nomeEvento?: string): Promise<void> {
  if (USE_MOCK) { console.log('[mock] baixarCertificado', inscricaoId); return }

  const res = await fetch(`${apiBaseUrl}/inscricoes/${inscricaoId}/certificado`, {
    headers: { Authorization: `Bearer ${getToken() ?? ''}` },
  })
  if (!res.ok) {
    const msg = await res.json().catch(() => null)
    throw new Error(msg?.message || 'Não foi possível gerar o certificado.')
  }
  const blob = await res.blob()
  const slug = (nomeEvento || 'evento').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 40) || 'evento'
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `certificado-${slug}.pdf`
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}

/** Admin envia os certificados por WhatsApp a todos os presentes do evento. */
export async function enviarCertificadosEvento(eventoId: string): Promise<{ total: number; enfileirados: number; semOptIn: number }> {
  if (USE_MOCK) return { total: 0, enfileirados: 0, semOptIn: 0 }
  return api.post(`/inscricoes/certificados/enviar`, { evento_id: eventoId })
}

/** Admin reenvia o QR de check-in pelo WhatsApp do corretor. */
export async function reenviarQrInscricao(inscricaoId: string): Promise<void> {
  if (USE_MOCK) {
    console.log('[mock] reenviarQrInscricao', inscricaoId)
    return
  }

  await api.post(`/inscricoes/${inscricaoId}/reenviar-qr`, {})
}

// ─── Check-in ────────────────────────────────────────────────────

export interface CheckinResult {
  ok:        boolean
  inscricao?: EventoInscricao
  erro?:     string
}

/** Check-in via token do QR Code */
export async function realizarCheckin(token: string): Promise<CheckinResult> {
  if (USE_MOCK) {
    const inscricao = mockInscricoes.find((i) => i.qr_code_token === token)
    if (!inscricao)              return { ok: false, erro: 'Token não encontrado' }
    if (inscricao.status === 'presente')  return { ok: false, erro: 'Já registrado', inscricao: inscricao as EventoInscricao }
    if (inscricao.status === 'cancelado') return { ok: false, erro: 'Inscrição cancelada' }
    return {
      ok: true,
      inscricao: {
        ...inscricao,
        status:     'presente' as StatusInscricao,
        checkin_at: new Date().toISOString(),
      } as EventoInscricao,
    }
  }

  return api.post<CheckinResult>('/inscricoes/checkin', { qr_token: token })
}
