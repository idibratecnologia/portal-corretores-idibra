import { useState, useCallback, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, XCircle, Users, Maximize2, Minimize2, Clock } from 'lucide-react'
import { QrScanner } from '@/components/shared/QrScanner'
import { mockEventos, mockInscricoes, mockCorretoresComImobiliaria } from '@/data/mockData'
import { useAuth } from '@/contexts/AuthContext'
import type { EventoInscricao } from '@/types'

interface RecentCheckin {
  key: string
  nome: string
  imobiliaria: string
  at: string
}

interface Feedback {
  ok: boolean
  title: string
  subtitle: string
}

export function AdminCheckinKiosk() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { role } = useAuth()

  const evento = mockEventos.find((e) => e.id === id)

  const [inscricoes, setInscricoes] = useState<EventoInscricao[]>(() =>
    mockInscricoes
      .filter((i) => i.evento_id === id)
      .map((i) => ({
        ...i,
        corretor: mockCorretoresComImobiliaria.find((c) => c.id === i.corretor_id),
      })) as EventoInscricao[]
  )

  const [recentCheckins, setRecentCheckins] = useState<RecentCheckin[]>([])
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (role !== 'admin') navigate('/login', { replace: true })
  }, [role, navigate])

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const presentes = inscricoes.filter((i) => i.status === 'presente').length
  const total = inscricoes.length
  const taxa = total > 0 ? Math.round((presentes / total) * 100) : 0

  const showFeedback = (fb: Feedback) => {
    setFeedback(fb)
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
    feedbackTimer.current = setTimeout(() => setFeedback(null), 3000)
  }

  const handleScan = useCallback((token: string) => {
    setInscricoes((prev) => {
      const inscricao = prev.find((i) => i.qr_code_token === token)

      if (!inscricao) {
        showFeedback({ ok: false, title: 'QR Code inválido', subtitle: 'Token não encontrado neste evento.' })
        return prev
      }
      if (inscricao.status === 'presente') {
        const nome = inscricao.corretor?.nome ?? 'Corretor'
        showFeedback({ ok: false, title: 'Já registrado', subtitle: `${nome} já realizou o check-in.` })
        return prev
      }
      if (inscricao.status === 'cancelado') {
        showFeedback({ ok: false, title: 'Inscrição cancelada', subtitle: 'Check-in não permitido.' })
        return prev
      }

      const nome = inscricao.corretor?.nome ?? 'Corretor'
      const imobiliaria = inscricao.corretor?.imobiliaria?.nome ?? ''

      setRecentCheckins((rc) => [
        { key: `${inscricao.id}-${Date.now()}`, nome, imobiliaria, at: new Date().toISOString() },
        ...rc.slice(0, 19),
      ])
      showFeedback({ ok: true, title: nome, subtitle: imobiliaria || 'Check-in confirmado!' })

      return prev.map((i) =>
        i.qr_code_token === token
          ? { ...i, status: 'presente' as const, checkin_at: new Date().toISOString() }
          : i
      )
    })
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }

  if (!evento) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Evento não encontrado.</p>
          <button onClick={() => navigate('/admin/eventos')} className="text-green-400 hover:underline text-sm">
            Voltar aos eventos
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white overflow-hidden">

      {/* ── Header ── */}
      <header className="flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <button
          onClick={() => navigate(`/admin/eventos/${id}`)}
          className="p-2 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          title="Voltar ao evento"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Modo Quiosque</p>
          <h1 className="text-sm font-bold text-white truncate leading-tight">{evento.titulo}</h1>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-2 bg-green-950 border border-green-800 rounded-xl px-3 py-1.5">
            <Users className="w-4 h-4 text-green-400" />
            <span className="text-sm font-bold text-green-300">{presentes}</span>
            <span className="text-xs text-green-700">/ {total}</span>
            <span className="text-xs font-bold text-green-500 ml-1">{taxa}%</span>
          </div>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

        {/* Camera panel */}
        <div className="relative flex-1 flex flex-col bg-black overflow-hidden">

          {/* Feedback overlay */}
          {feedback && (
            <div
              className={`absolute inset-0 z-20 flex flex-col items-center justify-center gap-5
                animate-in fade-in duration-150
                ${feedback.ok ? 'bg-green-950/97' : 'bg-red-950/97'}`}
            >
              <div className={`w-28 h-28 rounded-full flex items-center justify-center shadow-2xl
                ${feedback.ok ? 'bg-green-500 shadow-green-500/40' : 'bg-red-500 shadow-red-500/40'}`}>
                {feedback.ok
                  ? <CheckCircle2 className="w-16 h-16 text-white" strokeWidth={1.5} />
                  : <XCircle className="w-16 h-16 text-white" strokeWidth={1.5} />
                }
              </div>
              <div className="text-center px-8">
                <p className="text-3xl sm:text-4xl font-black text-white leading-tight">{feedback.title}</p>
                <p className={`text-base sm:text-lg mt-2 font-medium
                  ${feedback.ok ? 'text-green-300' : 'text-red-300'}`}>
                  {feedback.subtitle}
                </p>
              </div>
              {feedback.ok && (
                <div className="flex items-center gap-2 bg-green-900/60 border border-green-700 rounded-full px-4 py-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-xs font-semibold text-green-300">Presença confirmada</span>
                </div>
              )}
            </div>
          )}

          {/* Scanner */}
          <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
            <div className="w-full max-w-md">
              <QrScanner onScan={handleScan} />
            </div>
          </div>

          {/* Mobile: progress bar + counter */}
          <div className="lg:hidden px-4 pb-4 flex-shrink-0">
            <div className="bg-gray-900/80 rounded-2xl p-4 border border-gray-800">
              <div className="flex items-end justify-between mb-3">
                <div>
                  <span className="text-4xl font-black text-white">{presentes}</span>
                  <span className="text-xl text-gray-500"> / {total}</span>
                  <p className="text-xs text-gray-500 mt-0.5">presenças confirmadas</p>
                </div>
                <span className="text-2xl font-black text-green-400">{taxa}%</span>
              </div>
              <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-700"
                  style={{ width: `${taxa}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Sidebar (desktop) ── */}
        <aside className="hidden lg:flex flex-col w-72 xl:w-80 bg-gray-900 border-l border-gray-800 overflow-hidden flex-shrink-0">

          {/* Stats */}
          <div className="p-6 border-b border-gray-800 flex-shrink-0">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-4">Presenças</p>
            <div className="text-center mb-4">
              <div>
                <span className="text-7xl font-black text-white tabular-nums">{presentes}</span>
              </div>
              <p className="text-gray-500 text-sm mt-1">de {total} inscritos</p>
            </div>
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-700"
                style={{ width: `${taxa}%` }}
              />
            </div>
            <p className="text-center text-sm font-bold text-green-400 mt-2">{taxa}% de presença</p>
          </div>

          {/* Recent check-ins */}
          <div className="flex-1 overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                Últimos check-ins
              </p>
              {recentCheckins.length > 0 && (
                <span className="text-[10px] text-gray-600">{recentCheckins.length}</span>
              )}
            </div>

            {recentCheckins.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 mt-12 text-center">
                <div className="w-12 h-12 bg-gray-800 rounded-2xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-gray-600" />
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Aguardando o<br />primeiro check-in.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentCheckins.map((c, i) => (
                  <div
                    key={c.key}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors
                      ${i === 0
                        ? 'bg-green-950 border-green-800'
                        : 'bg-gray-800 border-gray-700'
                      }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                      ${i === 0 ? 'bg-green-800' : 'bg-gray-700'}`}>
                      <CheckCircle2 className={`w-4 h-4 ${i === 0 ? 'text-green-400' : 'text-gray-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate leading-tight">{c.nome}</p>
                      {c.imobiliaria && (
                        <p className="text-[11px] text-gray-500 truncate">{c.imobiliaria}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-600 flex-shrink-0 font-mono">
                      {new Date(c.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
