import { useState, useCallback, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, XCircle, Users, Maximize2, Minimize2, Clock, Search, QrCode, X, Radio, Printer } from 'lucide-react'
import { QrScanner } from '@/components/shared/QrScanner'
import { ComprovantePresenca } from '@/components/admin/ComprovantePresenca'
import { fetchEventoById } from '@/services/eventos'
import { realizarCheckin } from '@/services/inscricoes'
import { useAuth } from '@/contexts/AuthContext'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useCheckinRealtime } from '@/hooks/useCheckinRealtime'
import { cn } from '@/lib/utils'
import type { Evento, EventoInscricao } from '@/types'

type KioskMode = 'qr' | 'busca'

function maskCPF(v: string) {
  return v.replace(/\D/g, '')
    .replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

interface RecentCheckin {
  key: string
  nome: string
  imobiliaria: string
  at: string
  inscricao: EventoInscricao
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

  const [evento, setEvento] = useState<Evento | null>(null)

  const {
    inscricoes,
    presentes,
    total,
    taxa,
    lastUpdated,
    applyCheckin,
  } = useCheckinRealtime(id ?? '', [])

  const [eventoLoading, setEventoLoading] = useState(true)

  // Carrega os dados do evento (o hook já busca as inscrições da API)
  useEffect(() => {
    if (!id) return
    fetchEventoById(id)
      .then(setEvento)
      .catch(() => setEvento(null))
      .finally(() => setEventoLoading(false))
  }, [id])

  const [recentCheckins, setRecentCheckins] = useState<RecentCheckin[]>([])
  const [feedback,     setFeedback]     = useState<Feedback | null>(null)
  const [printTarget,  setPrintTarget]  = useState<EventoInscricao | null>(null)
  const [lastInscricao, setLastInscricao] = useState<EventoInscricao | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [mode,         setMode]         = useState<KioskMode>('qr')
  const [search,       setSearch]       = useState('')
  const debouncedSearch = useDebouncedValue(search, 200)
  const searchRef  = useRef<HTMLInputElement>(null)
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (role !== 'admin') navigate('/login', { replace: true })
  }, [role, navigate])

  // Remove as variáveis de cálculo manual (agora vêm do hook useCheckinRealtime)

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  // presentes, total, taxa vêm do hook useCheckinRealtime

  const showFeedback = (fb: Feedback) => {
    setFeedback(fb)
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
    // sucesso fica um pouco mais (tempo de imprimir o comprovante); erro some rápido
    feedbackTimer.current = setTimeout(() => setFeedback(null), fb.ok ? 6000 : 3000)
  }

  // Imprime o comprovante de presença de uma inscrição
  const handlePrint = useCallback((inscricao: EventoInscricao) => {
    setPrintTarget(inscricao)
    setTimeout(() => window.print(), 60)
  }, [])

  // Check-in via QR token — persiste na API e atualiza o painel
  const handleScan = useCallback(async (token: string) => {
    const result = await realizarCheckin(token)

    if (!result.ok) {
      showFeedback({ ok: false, title: result.erro === 'Check-in já realizado' ? 'Já registrado' : 'QR Code inválido', subtitle: result.erro ?? 'Token não encontrado.' })
      return
    }

    const nome        = result.inscricao?.corretor?.nome ?? 'Corretor'
    const imobiliaria  = result.inscricao?.corretor?.imobiliaria?.nome ?? ''

    applyCheckin(token)
    if (result.inscricao) {
      setLastInscricao(result.inscricao)
      setRecentCheckins((rc) => [
        { key: `${result.inscricao!.id}-${Date.now()}`, nome, imobiliaria, at: new Date().toISOString(), inscricao: result.inscricao! },
        ...rc.slice(0, 19),
      ])
    }
    showFeedback({ ok: true, title: nome, subtitle: imobiliaria || 'Check-in confirmado!' })
  }, [applyCheckin])

  // Check-in pela busca manual (recebe a inscrição da lista)
  const handleManualCheckin = useCallback(async (inscricao: EventoInscricao) => {
    if (inscricao.status === 'presente') {
      showFeedback({ ok: false, title: 'Já registrado', subtitle: `${inscricao.corretor?.nome ?? 'Corretor'} já realizou o check-in.` })
      return
    }
    if (inscricao.status === 'cancelado') {
      showFeedback({ ok: false, title: 'Inscrição cancelada', subtitle: 'Check-in não permitido.' })
      return
    }

    const result = await realizarCheckin(inscricao.qr_code_token)
    if (!result.ok) {
      showFeedback({ ok: false, title: 'Erro', subtitle: result.erro ?? 'Não foi possível registrar.' })
      return
    }

    const nome = inscricao.corretor?.nome ?? 'Corretor'
    const imobiliaria = inscricao.corretor?.imobiliaria?.nome ?? ''
    applyCheckin(inscricao.qr_code_token)
    setLastInscricao(inscricao)
    setRecentCheckins((rc) => [
      { key: `${inscricao.id}-${Date.now()}`, nome, imobiliaria, at: new Date().toISOString(), inscricao },
      ...rc.slice(0, 19),
    ])
    showFeedback({ ok: true, title: nome, subtitle: imobiliaria || 'Check-in confirmado!' })
    setSearch('')
    setTimeout(() => searchRef.current?.focus(), 3100)
  }, [applyCheckin])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }

  if (eventoLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-bounce [animation-delay:-0.3s]" />
          <span className="w-2 h-2 rounded-full bg-green-500 animate-bounce [animation-delay:-0.15s]" />
          <span className="w-2 h-2 rounded-full bg-green-500 animate-bounce" />
        </div>
      </div>
    )
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

      {/* Comprovante de presença (visível só na impressão) */}
      <ComprovantePresenca inscricao={printTarget} evento={evento} />

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
          {/* Mode toggle */}
          <div className="flex bg-gray-800 rounded-xl p-1 border border-gray-700">
            <button
              onClick={() => setMode('qr')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all', mode === 'qr' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white')}
            >
              <QrCode className="w-3.5 h-3.5" /> QR Code
            </button>
            <button
              onClick={() => { setMode('busca'); setTimeout(() => searchRef.current?.focus(), 100) }}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all', mode === 'busca' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white')}
            >
              <Search className="w-3.5 h-3.5" /> Busca manual
            </button>
          </div>

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

        {/* Main panel */}
        <div className="relative flex-1 flex flex-col overflow-hidden" style={{ background: mode === 'qr' ? '#000' : '#030712' }}>

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
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2 bg-green-900/60 border border-green-700 rounded-full px-4 py-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-xs font-semibold text-green-300">Presença confirmada</span>
                  </div>
                  {lastInscricao && (
                    <button
                      onClick={() => handlePrint(lastInscricao)}
                      className="flex items-center gap-2 bg-white text-green-800 hover:bg-green-50 font-bold text-sm px-5 py-2.5 rounded-xl shadow-lg transition-colors"
                    >
                      <Printer className="w-4 h-4" /> Imprimir comprovante
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* QR Scanner mode */}
          {mode === 'qr' && (
            <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
              <div className="w-full max-w-md">
                <QrScanner onScan={handleScan} />
              </div>
            </div>
          )}

          {/* Manual search mode */}
          {mode === 'busca' && (
            <div className="flex-1 flex flex-col p-5 lg:p-8 gap-4 overflow-y-auto">
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome ou CPF…"
                  autoComplete="off"
                  className="w-full h-14 pl-12 pr-10 rounded-2xl bg-gray-800 border border-gray-700 text-white text-lg placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                />
                {search && (
                  <button
                    onClick={() => { setSearch(''); searchRef.current?.focus() }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-gray-700 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Results */}
              {debouncedSearch.trim().length < 2 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-gray-600 text-sm">Digite pelo menos 2 caracteres para buscar</p>
                </div>
              ) : (() => {
                const q = debouncedSearch.trim().toLowerCase()
                const qDigits = q.replace(/\D/g, '')
                const results = inscricoes
                  .filter((i) => i.status !== 'cancelado')
                  .filter((i) => {
                    const nome = i.corretor?.nome?.toLowerCase() ?? ''
                    const cpf = (i.corretor?.cpf ?? '').replace(/\D/g, '')
                    return nome.includes(q) || (qDigits.length > 0 && cpf.includes(qDigits))
                  })

                if (results.length === 0) return (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-gray-500 text-sm">Nenhum inscrito encontrado para "{debouncedSearch.trim()}"</p>
                  </div>
                )

                return (
                  <div className="space-y-2">
                    {results.map((inscricao) => {
                      const jaPresente = inscricao.status === 'presente'
                      return (
                        <button
                          key={inscricao.id}
                          onClick={() => handleManualCheckin(inscricao)}
                          className={cn(
                            'w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all active:scale-[0.99]',
                            jaPresente ? 'bg-green-950 border-green-800 hover:bg-green-900' : 'bg-gray-800 border-gray-700 hover:border-green-600 hover:bg-gray-700'
                          )}
                        >
                          <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0 select-none', jaPresente ? 'bg-green-800 text-green-200' : 'bg-gray-700 text-gray-300')}>
                            {inscricao.corretor?.nome?.charAt(0) ?? '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{inscricao.corretor?.nome ?? '—'}</p>
                            <div className="flex flex-wrap items-center gap-x-3 mt-0.5">
                              {inscricao.corretor?.creci && <span className="text-xs text-gray-400">{inscricao.corretor.creci}</span>}
                              {inscricao.corretor?.cpf && <span className="text-xs text-gray-500">{maskCPF(inscricao.corretor.cpf)}</span>}
                              {inscricao.corretor?.imobiliaria?.nome && <span className="text-xs text-gray-500 truncate">{inscricao.corretor.imobiliaria.nome}</span>}
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            {jaPresente ? (
                              <span className="flex items-center gap-1.5 bg-green-900 text-green-300 text-xs font-bold px-3 py-1.5 rounded-xl border border-green-800">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Presente
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 bg-green-600 text-white text-sm font-bold px-4 py-2 rounded-xl">
                                <CheckCircle2 className="w-4 h-4" /> Check-in
                              </span>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              })()}

            </div>
          )}

          {/* Mobile: progress bar + counter — QR only */}
          {mode === 'qr' && (
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
          )}
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
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-[10px] text-gray-600 font-mono">
                        {new Date(c.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        onClick={() => handlePrint(c.inscricao)}
                        title="Imprimir comprovante"
                        className="flex items-center gap-1 text-[10px] font-semibold text-green-400 hover:text-green-300 transition-colors"
                      >
                        <Printer className="w-3 h-3" /> Imprimir
                      </button>
                    </div>
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
