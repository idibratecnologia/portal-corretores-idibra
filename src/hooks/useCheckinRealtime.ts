import { useState, useEffect, useCallback } from 'react'
import { fetchInscricoesByEvento } from '@/services/inscricoes'
import type { EventoInscricao } from '@/types'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'
const POLL_INTERVAL_MS = 5_000

interface CheckinRealtimeState {
  inscricoes:   EventoInscricao[]
  presentes:    number
  total:        number
  taxa:         number
  lastUpdated:  Date | null
}

interface UseCheckinRealtimeReturn extends CheckinRealtimeState {
  /** Aplica um check-in localmente (atualização otimista) */
  applyCheckin: (token: string) => void
  /** Força um refetch imediato */
  refetch: () => void
}

/**
 * Hook de check-in em tempo real.
 *
 * Em desenvolvimento (VITE_USE_MOCK=true):
 *   - Apenas gerencia o estado local (sem polling)
 *   - Atualizações ocorrem via `applyCheckin`
 *
 * Em produção (VITE_USE_MOCK=false):
 *   - Faz polling a cada 5s em `GET /inscricoes?evento_id=...`
 *   - Permite que múltiplos operadores vejam o contador atualizado
 *   - Atualizações otimistas via `applyCheckin` para resposta imediata
 */
export function useCheckinRealtime(
  eventoId: string,
  initialInscricoes: EventoInscricao[],
): UseCheckinRealtimeReturn {
  const [inscricoes, setInscricoes] = useState<EventoInscricao[]>(initialInscricoes)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Sincroniza quando o prop inicial muda (ex: ao carregar dados do evento)
  useEffect(() => {
    setInscricoes(initialInscricoes)
  }, [initialInscricoes])

  const fetchLatest = useCallback(async () => {
    try {
      const data = await fetchInscricoesByEvento(eventoId)
      setInscricoes(data)
      setLastUpdated(new Date())
    } catch {
      // Silencia erros de polling para não interromper o quiosque
    }
  }, [eventoId])

  // Polling ativo apenas em produção
  useEffect(() => {
    if (USE_MOCK) return

    fetchLatest() // busca imediata ao montar

    const interval = setInterval(fetchLatest, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchLatest])

  /**
   * Atualização otimista: aplica o check-in localmente antes do próximo polling.
   * Garante feedback imediato no quiosque.
   */
  const applyCheckin = useCallback((token: string) => {
    setInscricoes((prev) =>
      prev.map((i) =>
        i.qr_code_token === token
          ? { ...i, status: 'presente' as const, checkin_at: new Date().toISOString() }
          : i
      )
    )
    setLastUpdated(new Date())
  }, [])

  const presentes = inscricoes.filter((i) => i.status === 'presente').length
  const total     = inscricoes.filter((i) => i.status !== 'cancelado').length
  const taxa      = total > 0 ? Math.round((presentes / total) * 100) : 0

  return {
    inscricoes,
    presentes,
    total,
    taxa,
    lastUpdated,
    applyCheckin,
    refetch: fetchLatest,
  }
}
