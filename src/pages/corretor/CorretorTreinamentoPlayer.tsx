import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Loader2, FileText, CheckCircle2, Lock, AlertCircle, PlayCircle,
  ListOrdered, ListVideo,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'
import { statusProgressoInfo, formatDuracao } from '@/lib/treinamentos-ui'
import {
  fetchTreinamentoCorretor, salvarProgressoAula, videoAulaUrl, documentoTreinamentoUrl,
  type TreinamentoCorretorDetalhe, type AulaCorretor,
} from '@/services/treinamentos'

const SAVE_INTERVAL_MS = 12_000

export function CorretorTreinamentoPlayer() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [t, setT] = useState<TreinamentoCorretorDetalhe | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [aulaAtualId, setAulaAtualId] = useState<string>('')

  const videoRef = useRef<HTMLVideoElement>(null)
  const lastSaveRef = useRef(0)
  const resumeAppliedRef = useRef(false)
  const aulaIdRef = useRef<string>('')
  aulaIdRef.current = aulaAtualId

  const aulaAtual: AulaCorretor | undefined = t?.aulas.find((a) => a.id === aulaAtualId)

  const carregar = useCallback(async (manterAula?: string) => {
    try {
      const data = await fetchTreinamentoCorretor(id)
      setT(data)
      setErro(null)
      // escolhe a aula atual: mantém a selecionada, senão a 1ª liberada não concluída
      const escolher =
        (manterAula && data.aulas.find((a) => a.id === manterAula)) ||
        data.aulas.find((a) => a.liberada && a.progresso.status !== 'concluido') ||
        data.aulas.find((a) => a.liberada) ||
        data.aulas[0]
      if (escolher) setAulaAtualId((prev) => prev || escolher.id)
    } catch (err) {
      setErro(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { carregar() }, [carregar])

  const persistir = useCallback(async (aulaId: string, segundos: number) => {
    try {
      const res = await salvarProgressoAula(aulaId, Math.floor(segundos))
      setT((prev) => {
        if (!prev) return prev
        const aulas = prev.aulas.map((a) => (a.id === aulaId ? { ...a, progresso: { ...a.progresso, ...res } } : a))
        const concluidas = aulas.filter((a) => a.progresso.status === 'concluido').length
        return { ...prev, aulas, aulas_concluidas: concluidas, percentual: aulas.length ? Math.round((concluidas / aulas.length) * 100) : 0 }
      })
      if (res.status === 'concluido' && res.liberou_proxima) {
        toast({ title: 'Aula concluída! 🎉', description: 'A próxima aula foi liberada.' })
        carregar(aulaId) // refaz para liberar a próxima
      }
    } catch { /* tenta de novo no próximo evento */ }
  }, [carregar, toast])

  // Salva ao sair da página
  useEffect(() => {
    const salvar = () => {
      const v = videoRef.current
      if (v && v.currentTime > 0 && aulaIdRef.current) void persistir(aulaIdRef.current, v.currentTime)
    }
    window.addEventListener('pagehide', salvar)
    const onVis = () => { if (document.visibilityState === 'hidden') salvar() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('pagehide', salvar)
      document.removeEventListener('visibilitychange', onVis)
      salvar()
    }
  }, [persistir])

  const selecionarAula = (a: AulaCorretor) => {
    if (!a.liberada || !a.video_disponivel) return
    // salva a posição da aula atual antes de trocar
    const v = videoRef.current
    if (v && v.currentTime > 0 && aulaIdRef.current && aulaIdRef.current !== a.id) {
      void persistir(aulaIdRef.current, v.currentTime)
    }
    resumeAppliedRef.current = false
    lastSaveRef.current = 0
    setAulaAtualId(a.id)
  }

  const onLoadedMetadata = () => {
    const v = videoRef.current
    if (!v || resumeAppliedRef.current || !aulaAtual) return
    resumeAppliedRef.current = true
    const seg = aulaAtual.progresso.segundos_assistidos
    if (seg > 2 && seg < v.duration - 2) v.currentTime = seg
  }

  const onTimeUpdate = () => {
    const v = videoRef.current
    if (!v || !aulaAtual) return
    const agora = Date.now()
    if (agora - lastSaveRef.current >= SAVE_INTERVAL_MS) {
      lastSaveRef.current = agora
      void persistir(aulaAtual.id, v.currentTime)
    }
  }

  const onPause = () => {
    const v = videoRef.current
    if (v && v.currentTime > 0 && aulaAtual) { lastSaveRef.current = Date.now(); void persistir(aulaAtual.id, v.currentTime) }
  }

  const onEnded = () => {
    const v = videoRef.current
    if (v && aulaAtual) void persistir(aulaAtual.id, v.duration)
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-green-600 animate-spin" /></div>

  if (erro || !t) {
    return (
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">Não foi possível abrir o treinamento</p>
          <p className="text-gray-400 text-sm mt-1">{erro ?? 'Conteúdo indisponível.'}</p>
        </div>
      </div>
    )
  }

  const podeAssistir = !!aulaAtual && aulaAtual.liberada && aulaAtual.video_disponivel

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Player + info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl overflow-hidden bg-black">
            {podeAssistir && aulaAtual ? (
              <video
                key={aulaAtual.id}
                ref={videoRef}
                controls
                playsInline
                poster={aulaAtual.thumbnail_url ?? undefined}
                src={videoAulaUrl(aulaAtual.id)}
                className="w-full aspect-video bg-black"
                onLoadedMetadata={onLoadedMetadata}
                onTimeUpdate={onTimeUpdate}
                onPause={onPause}
                onEnded={onEnded}
              />
            ) : (
              <div className="aspect-video flex flex-col items-center justify-center text-slate-300 text-center px-6">
                {aulaAtual && !aulaAtual.liberada ? <Lock className="w-10 h-10 mb-2" /> : <AlertCircle className="w-10 h-10 mb-2" />}
                <p className="text-sm">{aulaAtual ? (aulaAtual.motivo_bloqueio ?? 'Vídeo indisponível.') : 'Nenhuma aula disponível.'}</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-1">
              {t.liberacao_sequencial && <span className="inline-flex items-center gap-1"><ListOrdered className="w-3 h-3" /> Sequencial</span>}
              <span className="inline-flex items-center gap-1"><ListVideo className="w-3 h-3" /> {t.aulas_concluidas}/{t.total_aulas} concluída(s)</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">{aulaAtual?.titulo ?? t.titulo}</h1>
            {aulaAtual?.descricao && <p className="text-gray-600 text-sm mt-1 whitespace-pre-line">{aulaAtual.descricao}</p>}
            {aulaAtual && (
              <div className="mt-3">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${aulaAtual.progresso.status === 'concluido' ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${aulaAtual.progresso.percentual}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">{aulaAtual.progresso.percentual}% assistido · conclui aos 90%</p>
              </div>
            )}
          </div>

          {/* Documentos */}
          {t.documentos.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-3"><FileText className="w-5 h-5 text-green-600" /> Documentos de apoio</h2>
              <ul className="divide-y divide-gray-50">
                {t.documentos.map((d) => (
                  <li key={d.id} className="py-2.5">
                    <a href={documentoTreinamentoUrl(d.id)} target="_blank" rel="noreferrer" className="text-sm text-gray-700 hover:text-green-700 inline-flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" /> {d.titulo}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Playlist */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden lg:sticky lg:top-4">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm">{t.titulo}</h2>
              <p className="text-xs text-gray-400">{t.total_aulas} aula{t.total_aulas === 1 ? '' : 's'}</p>
            </div>
            <ul className="max-h-[60vh] overflow-y-auto divide-y divide-gray-50">
              {t.aulas.map((a, idx) => {
                const ativa = a.id === aulaAtualId
                const sp = statusProgressoInfo(a.progresso.status)
                const bloqueada = !a.liberada || !a.video_disponivel
                return (
                  <li key={a.id}>
                    <button
                      onClick={() => selecionarAula(a)}
                      disabled={bloqueada}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${ativa ? 'bg-green-50' : 'hover:bg-gray-50'} ${bloqueada ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {a.progresso.status === 'concluido' ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : !a.liberada ? (
                          <Lock className="w-5 h-5 text-gray-300" />
                        ) : (
                          <PlayCircle className={`w-5 h-5 ${ativa ? 'text-green-600' : 'text-gray-400'}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${ativa ? 'text-green-800' : 'text-gray-800'}`}>
                          <span className="text-gray-400">{idx + 1}.</span> {a.titulo}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {a.video_duracao ? <span className="text-[11px] text-gray-400">{formatDuracao(a.video_duracao)}</span> : null}
                          {a.liberada ? (
                            a.progresso.percentual > 0 && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${sp.className}`}>{a.progresso.percentual}%</span>
                          ) : (
                            <span className="text-[10px] text-gray-400">{a.motivo_bloqueio}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
