import { useEffect, useRef } from 'react'

/**
 * Atualiza dados em tempo real sem recarregar a página.
 *
 * Reage a:
 *  - evento global `idibra:realtime` (emitido pelo SSE em useNotifications)
 *  - foco da janela e visibilidade da aba (fallback)
 *
 * Uso: useRealtimeRefresh(loadData)  — passe a função que recarrega os dados.
 */
export function useRealtimeRefresh(callback: () => void, opts: { onFocus?: boolean } = {}) {
  const { onFocus = true } = opts
  const cbRef = useRef(callback)
  cbRef.current = callback

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    // pequeno debounce: evita rajadas quando vários eventos chegam juntos
    const run = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => cbRef.current(), 250)
    }

    const onRealtime = () => run()
    const onVisible = () => { if (document.visibilityState === 'visible') run() }

    window.addEventListener('idibra:realtime', onRealtime)
    if (onFocus) {
      window.addEventListener('focus', run)
      document.addEventListener('visibilitychange', onVisible)
    }

    return () => {
      if (timer) clearTimeout(timer)
      window.removeEventListener('idibra:realtime', onRealtime)
      if (onFocus) {
        window.removeEventListener('focus', run)
        document.removeEventListener('visibilitychange', onVisible)
      }
    }
  }, [onFocus])
}
