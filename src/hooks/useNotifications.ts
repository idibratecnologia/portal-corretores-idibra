import { useState, useEffect, useMemo, useCallback } from 'react'
import { fetchCorretores } from '@/services/corretores'
import { fetchEventos } from '@/services/eventos'
import { apiBaseUrl, getToken } from '@/lib/api'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

export type NotifIcon = 'users' | 'calendar' | 'clipboard' | 'check' | 'bell'

export interface AppNotification {
  id: string
  icon: NotifIcon
  title: string
  body: string
  time: string
  read: boolean
  href?: string
}

/** Polling de segurança (o tempo real é via SSE; isto é só fallback). */
const POLL_MS = 120_000
const STORAGE_PREFIX = 'idibra:notif-read:'

// ─── Persistência do "lido" (localStorage, por papel) ──────────────

function getReadSet(role: string): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + role)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function saveReadSet(role: string, set: Set<string>) {
  try {
    localStorage.setItem(STORAGE_PREFIX + role, JSON.stringify([...set]))
  } catch {
    /* localStorage indisponível — ignora */
  }
}

function daysFromNow(dateStr: string) {
  return Math.ceil(
    (new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) /
      (1000 * 60 * 60 * 24)
  )
}

/** Dias até o próximo aniversário (0 = hoje). Datas são armazenadas em UTC. */
function daysUntilBirthday(dateStr: string): number {
  const nasc = new Date(dateStr)
  if (isNaN(nasc.getTime())) return -1
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const mes = nasc.getUTCMonth()
  const dia = nasc.getUTCDate()
  let prox = new Date(hoje.getFullYear(), mes, dia)
  prox.setHours(0, 0, 0, 0)
  if (prox.getTime() < hoje.getTime()) prox = new Date(hoje.getFullYear() + 1, mes, dia)
  return Math.round((prox.getTime() - hoje.getTime()) / 86_400_000)
}

/**
 * Monta as notificações do admin a partir de dados reais da API:
 *  - corretores pendentes de aprovação
 *  - eventos publicados nos próximos 7 dias
 *
 * Os ids são "estáveis por conteúdo": mudou o conjunto de pendentes ou a
 * proximidade do evento → vira uma notificação nova (volta a ficar não lida).
 */
async function buildAdminNotifications(): Promise<AppNotification[]> {
  const list: AppNotification[] = []

  const [pendentesRes, eventosRes, ativosRes] = await Promise.all([
    fetchCorretores({ status: 'pendente', limit: 100 }),
    fetchEventos({ status: 'publicado', limit: 100 }),
    fetchCorretores({ status: 'ativo', limit: 1000 }),
  ])

  const pendentes = pendentesRes.data
  if (pendentes.length > 0) {
    const nomes = pendentes.slice(0, 2).map((c) => c.nome.split(' ')[0]).join(', ')
    const extra = pendentes.length > 2 ? ` e mais ${pendentes.length - 2}` : ''
    // id reflete QUEM está pendente — novo cadastro pendente reativa o aviso
    const assinatura = pendentes.map((c) => c.id).sort().join('|')
    list.push({
      id: `pendentes:${assinatura}`,
      icon: 'users',
      title: `${pendentes.length} corretor${pendentes.length > 1 ? 'es' : ''} aguardando aprovação`,
      body: nomes + extra,
      time: 'agora',
      read: false,
      href: '/admin/aprovacoes',
    })
  }

  const upcoming = eventosRes.data
    .map((e) => ({ ...e, diff: daysFromNow(String(e.data_evento)) }))
    .filter((e) => e.diff >= 0 && e.diff <= 7)
    .sort((a, b) => a.diff - b.diff)

  upcoming.slice(0, 3).forEach((e) => {
    const timeStr = e.diff === 0 ? 'hoje' : e.diff === 1 ? 'amanhã' : `em ${e.diff} dias`
    list.push({
      // inclui a proximidade no id: ao mudar (ex.: "em 2 dias" → "amanhã") reavisa
      id: `event:${e.id}:${e.diff}`,
      icon: 'calendar',
      title: e.diff === 0 ? `Evento hoje: ${e.titulo}` : `${e.titulo} — ${timeStr}`,
      body: `${e.local} · ${e.hora_inicio} · ${e.total_inscritos ?? 0} inscrito(s)`,
      time: timeStr,
      read: false,
      href: `/admin/eventos/${e.id}`,
    })
  })

  // Aniversariantes (hoje e próximos 7 dias)
  const aniversariantes = ativosRes.data
    .filter((c) => c.data_nascimento)
    .map((c) => ({ ...c, dias: daysUntilBirthday(c.data_nascimento as string) }))
    .filter((c) => c.dias >= 0 && c.dias <= 7)
    .sort((a, b) => a.dias - b.dias)

  const aniversariantesHoje = aniversariantes.filter((c) => c.dias === 0)
  const aniversariantesProximos = aniversariantes.filter((c) => c.dias > 0)

  if (aniversariantesHoje.length > 0) {
    const nomes = aniversariantesHoje.map((c) => c.nome.split(' ')[0]).join(', ')
    list.push({
      id: `bday:today:${aniversariantesHoje.map((c) => c.id).sort().join('|')}`,
      icon: 'bell',
      title: `🎂 Aniversário hoje: ${aniversariantesHoje.length > 1 ? `${aniversariantesHoje.length} corretores` : aniversariantesHoje[0].nome}`,
      body: nomes,
      time: 'hoje',
      read: false,
      href: '/admin/corretores',
    })
  }

  if (aniversariantesProximos.length > 0) {
    const nomes = aniversariantesProximos.slice(0, 3).map((c) => `${c.nome.split(' ')[0]} (${c.dias}d)`).join(', ')
    const extra = aniversariantesProximos.length > 3 ? ` e mais ${aniversariantesProximos.length - 3}` : ''
    list.push({
      id: `bday:soon:${aniversariantesProximos.map((c) => `${c.id}:${c.dias}`).sort().join('|')}`,
      icon: 'bell',
      title: `${aniversariantesProximos.length} aniversariante(s) nos próximos 7 dias`,
      body: nomes + extra,
      time: 'em breve',
      read: false,
      href: '/admin/corretores',
    })
  }

  return list
}

export function useNotifications(role: 'admin' | 'corretor') {
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  const load = useCallback(async () => {
    if (role !== 'admin') {
      setNotifications([])
      return
    }
    try {
      const items = await buildAdminNotifications()
      const readSet = getReadSet(role)

      // Aplica o "lido" persistido
      const withRead = items.map((n) => ({ ...n, read: readSet.has(n.id) }))

      // Limpa do storage ids que não existem mais (mantém o conjunto enxuto)
      const idsAtuais = new Set(items.map((n) => n.id))
      const podados = new Set([...readSet].filter((id) => idsAtuais.has(id)))
      if (podados.size !== readSet.size) saveReadSet(role, podados)

      setNotifications(withRead)
    } catch {
      setNotifications([])
    }
  }, [role])

  useEffect(() => {
    load()

    if (role !== 'admin') return

    // Gatilhos sempre ativos: evento interno, foco da aba e polling de segurança
    window.addEventListener('idibra:pending-changed', load)
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', load)
    // Polling é só rede de segurança (o SSE faz o tempo real); intervalo maior
    const interval = setInterval(load, POLL_MS)

    // ── Tempo real via SSE (Server-Sent Events) ──
    // O EventSource reconecta sozinho; além disso, recriamos com token novo
    // caso a conexão caia (ex.: token renovado), garantindo robustez.
    let es: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let encerrado = false

    const conectarSSE = () => {
      if (encerrado || USE_MOCK) return
      const token = getToken()
      if (!token) return
      es = new EventSource(`${apiBaseUrl}/notifications/stream?token=${encodeURIComponent(token)}`)
      es.addEventListener('refresh', (ev) => {
        load()
        // Propaga para as telas (listas) atualizarem em tempo real
        let motivo = ''
        try { motivo = JSON.parse((ev as MessageEvent).data)?.motivo ?? '' } catch { /* ignora */ }
        window.dispatchEvent(new CustomEvent('idibra:realtime', { detail: motivo }))
      })
      es.onerror = () => {
        // Fecha e reagenda a reconexão lendo um token atualizado
        es?.close()
        es = null
        if (!encerrado && !reconnectTimer) {
          reconnectTimer = setTimeout(() => { reconnectTimer = null; conectarSSE() }, 5000)
        }
      }
    }
    conectarSSE()

    return () => {
      encerrado = true
      window.removeEventListener('idibra:pending-changed', load)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', load)
      clearInterval(interval)
      if (reconnectTimer) clearTimeout(reconnectTimer)
      es?.close()
    }
  }, [load, role])

  const unread = useMemo(() => notifications.filter((n) => !n.read).length, [notifications])

  const markRead = (id: string) => {
    const readSet = getReadSet(role)
    readSet.add(id)
    saveReadSet(role, readSet)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const markAllRead = () => {
    const readSet = getReadSet(role)
    notifications.forEach((n) => readSet.add(n.id))
    saveReadSet(role, readSet)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  return { notifications, unread, markRead, markAllRead }
}
