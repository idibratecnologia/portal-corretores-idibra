import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Search, CheckCircle2, Printer, Users, Clock,
  Maximize2, Minimize2, X,
} from 'lucide-react'
import { mockEventos, mockInscricoes, mockCorretoresComImobiliaria } from '@/data/mockData'
import { useAuth } from '@/contexts/AuthContext'
import { formatDate } from '@/lib/utils'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { cn } from '@/lib/utils'
import type { EventoInscricao } from '@/types'

interface RecentEntry {
  key: string
  nome: string
  creci: string
  imobiliaria: string
  at: string
}

function maskCPF(v: string) {
  return v.replace(/\D/g, '')
    .replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export function AdminCredenciamento() {
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

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 200)
  const [printTarget, setPrintTarget] = useState<EventoInscricao | null>(null)
  const [recentEntries, setRecentEntries] = useState<RecentEntry[]>([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (role !== 'admin') navigate('/login', { replace: true })
  }, [role, navigate])

  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const presentes = inscricoes.filter((i) => i.status === 'presente').length
  const total = inscricoes.length
  const taxa = total > 0 ? Math.round((presentes / total) * 100) : 0

  const q = debouncedSearch.trim()

  const allActive = inscricoes
    .filter((i) => i.status !== 'cancelado')
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'inscrito' ? -1 : 1
      return (a.corretor?.nome ?? '').localeCompare(b.corretor?.nome ?? '', 'pt-BR')
    })

  const pendentes = allActive.filter((i) => i.status === 'inscrito').length

  const results = q.length >= 2
    ? allActive.filter((i) => {
        const nome = i.corretor?.nome?.toLowerCase() ?? ''
        const cpf = (i.corretor?.cpf ?? '').replace(/\D/g, '')
        const qDigits = q.replace(/\D/g, '')
        return nome.includes(q.toLowerCase()) || (qDigits.length > 0 && cpf.includes(qDigits))
      })
    : allActive

  const handleConfirmar = useCallback((inscricao: EventoInscricao) => {
    let target = inscricao

    if (inscricao.status !== 'presente') {
      target = { ...inscricao, status: 'presente' as const, checkin_at: new Date().toISOString() }
      setInscricoes((prev) => prev.map((i) => (i.id === inscricao.id ? target : i)))
      setRecentEntries((prev) => [
        {
          key: `${inscricao.id}-${Date.now()}`,
          nome: inscricao.corretor?.nome ?? '—',
          creci: inscricao.corretor?.creci ?? '',
          imobiliaria: inscricao.corretor?.imobiliaria?.nome ?? '',
          at: new Date().toISOString(),
        },
        ...prev.slice(0, 19),
      ])
    }

    setPrintTarget(target)
    setSearch('')
    setTimeout(() => {
      window.print()
      setTimeout(() => searchRef.current?.focus(), 400)
    }, 120)
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
          <button
            onClick={() => navigate('/admin/eventos')}
            className="text-green-400 hover:underline text-sm"
          >
            Voltar aos eventos
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* ─── Print-only badge ─── */}
      <style>{`
        @media screen { .crachá-print { display: none !important; } }
        @media print {
          @page { size: A4; margin: 1cm; }
          body * { visibility: hidden; }
          .crachá-print, .crachá-print * { visibility: visible; }
          .crachá-print {
            position: fixed; inset: 0;
            display: flex !important;
            align-items: center;
            justify-content: center;
          }
          .crachá-card {
            width: 9cm;
            padding: 1.1cm 0.9cm;
            border: 1.5px solid #bbb;
            border-radius: 0.35cm;
            text-align: center;
            font-family: Arial, Helvetica, sans-serif;
            background: #fff;
          }
          .crachá-org {
            font-size: 11pt; font-weight: 900;
            letter-spacing: 3px; color: #15803d;
            margin-bottom: 5px;
          }
          .crachá-evento {
            font-size: 8pt; color: #444;
            line-height: 1.3; margin-bottom: 2px;
          }
          .crachá-data { font-size: 8pt; color: #888; margin-bottom: 7px; }
          .crachá-div { border-top: 1px solid #ddd; margin: 7px 0; }
          .crachá-nome {
            font-size: 20pt; font-weight: 900;
            color: #111; line-height: 1.15;
            margin: 9px 0 6px;
          }
          .crachá-creci { font-size: 9pt; color: #555; margin-bottom: 3px; }
          .crachá-imob { font-size: 9pt; color: #666; }
          .crachá-tag {
            margin-top: 9px;
            font-size: 7.5pt; font-weight: 700;
            letter-spacing: 1.5px; color: #15803d;
          }
        }
      `}</style>

      {printTarget && (
        <div className="crachá-print">
          <div className="crachá-card">
            <div className="crachá-org">IDIBRA</div>
            <div className="crachá-evento">{evento.titulo}</div>
            <div className="crachá-data">{formatDate(evento.data_evento)} · {evento.local}</div>
            <div className="crachá-div" />
            <div className="crachá-nome">{printTarget.corretor?.nome}</div>
            <div className="crachá-creci">CRECI: {printTarget.corretor?.creci}</div>
            {printTarget.corretor?.imobiliaria?.nome && (
              <div className="crachá-imob">{printTarget.corretor.imobiliaria.nome}</div>
            )}
            {printTarget.corretor?.cpf && (
              <div className="crachá-creci" style={{ marginTop: 2 }}>
                CPF: {maskCPF(printTarget.corretor.cpf)}
              </div>
            )}
            <div className="crachá-div" />
            <div className="crachá-tag">✓ PRESENÇA CONFIRMADA</div>
          </div>
        </div>
      )}

      {/* ─── Screen UI ─── */}
      <div className="flex flex-col h-screen bg-gray-950 text-white overflow-hidden">

        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
          <button
            onClick={() => navigate(`/admin/eventos/${id}`)}
            className="p-2 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            title="Voltar ao evento"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
              Modo Credenciamento
            </p>
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

        {/* Body */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

          {/* ── Search + results ── */}
          <div className="flex-1 flex flex-col p-5 lg:p-8 gap-5 overflow-y-auto">

            {/* Search box */}
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

            {/* List header */}
            <div className="flex items-center justify-between flex-shrink-0">
              {q.length >= 2 ? (
                <p className="text-sm text-gray-400">
                  <span className="text-white font-semibold">{results.length}</span> resultado{results.length !== 1 ? 's' : ''} para <span className="text-green-400">"{q}"</span>
                </p>
              ) : (
                <p className="text-sm text-gray-400">
                  <span className="text-white font-semibold">{pendentes}</span> aguardando ·{' '}
                  <span className="text-green-400 font-semibold">{presentes}</span> credenciados
                </p>
              )}
              <span className="text-xs text-gray-600">{allActive.length} inscritos no total</span>
            </div>

            {/* No search results */}
            {q.length >= 2 && results.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center">
                  <Search className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-gray-500 text-sm">
                  Nenhum inscrito encontrado para <span className="text-gray-300">"{q}"</span>
                </p>
              </div>
            )}

            {/* Participant list */}
            {results.length > 0 && (
              <div className="space-y-2">
                {results.map((inscricao) => {
                  const jaPresente = inscricao.status === 'presente'
                  return (
                    <button
                      key={inscricao.id}
                      onClick={() => handleConfirmar(inscricao)}
                      className={cn(
                        'w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all active:scale-[0.99]',
                        jaPresente
                          ? 'bg-green-950 border-green-800 hover:bg-green-900'
                          : 'bg-gray-800 border-gray-700 hover:border-green-600 hover:bg-gray-700'
                      )}
                    >
                      {/* Avatar */}
                      <div className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black flex-shrink-0 select-none',
                        jaPresente ? 'bg-green-800 text-green-200' : 'bg-gray-700 text-gray-300'
                      )}>
                        {inscricao.corretor?.nome?.charAt(0) ?? '?'}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-bold text-white leading-tight truncate">
                          {inscricao.corretor?.nome ?? '—'}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                          {inscricao.corretor?.creci && (
                            <span className="text-xs text-gray-400">{inscricao.corretor.creci}</span>
                          )}
                          {inscricao.corretor?.cpf && (
                            <span className="text-xs text-gray-500">
                              {maskCPF(inscricao.corretor.cpf)}
                            </span>
                          )}
                          {inscricao.corretor?.imobiliaria?.nome && (
                            <span className="text-xs text-gray-500 truncate max-w-[160px]">
                              {inscricao.corretor.imobiliaria.nome}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* CTA */}
                      <div className="flex-shrink-0">
                        {jaPresente ? (
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1.5 bg-green-900 text-green-300 text-xs font-bold px-3 py-1.5 rounded-xl border border-green-800">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Presente
                            </span>
                            <span className="flex items-center gap-1.5 border border-gray-600 text-gray-400 text-xs font-semibold px-3 py-1.5 rounded-xl hover:border-gray-500 hover:text-gray-300 transition-colors">
                              <Printer className="w-3.5 h-3.5" /> Reimprimir
                            </span>
                          </div>
                        ) : (
                          <span className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">
                            <Printer className="w-4 h-4" /> Confirmar e Imprimir
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Sidebar (desktop) ── */}
          <aside className="hidden lg:flex flex-col w-72 xl:w-80 bg-gray-900 border-l border-gray-800 overflow-hidden flex-shrink-0">

            {/* Stats */}
            <div className="p-6 border-b border-gray-800 flex-shrink-0">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-4">
                Presenças
              </p>
              <div className="text-center mb-4">
                <span className="text-7xl font-black text-white tabular-nums">{presentes}</span>
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

            {/* Recent credenciamentos */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                  Últimos credenciamentos
                </p>
                {recentEntries.length > 0 && (
                  <span className="text-[10px] text-gray-600">{recentEntries.length}</span>
                )}
              </div>

              {recentEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 mt-12 text-center">
                  <div className="w-12 h-12 bg-gray-800 rounded-2xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-gray-600" />
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Aguardando o<br />primeiro credenciamento.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentEntries.map((c, i) => (
                    <div
                      key={c.key}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border transition-colors',
                        i === 0 ? 'bg-green-950 border-green-800' : 'bg-gray-800 border-gray-700'
                      )}
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                        i === 0 ? 'bg-green-800' : 'bg-gray-700'
                      )}>
                        <CheckCircle2 className={cn(
                          'w-4 h-4',
                          i === 0 ? 'text-green-400' : 'text-gray-500'
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate leading-tight">
                          {c.nome}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate">
                          {c.imobiliaria || c.creci}
                        </p>
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
    </>
  )
}
