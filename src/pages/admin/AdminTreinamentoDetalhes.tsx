import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Loader2, Edit2, FileText, Trash2, Plus, Calendar, Star, Users,
  CheckCircle2, BarChart3, Video, ListVideo, ListOrdered,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { TreinamentoFormModal } from '@/components/admin/TreinamentoFormModal'
import { AulaFormModal } from '@/components/admin/AulaFormModal'
import { AulaAdmin } from '@/components/admin/AulaAdmin'
import { useToast } from '@/hooks/use-toast'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'
import { getErrorMessage } from '@/lib/errors'
import { videoEmProcessamento, statusProgressoInfo } from '@/lib/treinamentos-ui'
import {
  fetchTreinamento, deleteAula, reordenarAulas, uploadDocumentoTreinamento,
  deleteDocumentoTreinamento, fetchRelatorioTreinamento, documentoTreinamentoUrl,
  type TreinamentoDetalhe, type RelatorioTreinamento, type Aula,
} from '@/services/treinamentos'

function formatDataHora(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export function AdminTreinamentoDetalhes() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [t, setT] = useState<TreinamentoDetalhe | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [aulaModalOpen, setAulaModalOpen] = useState(false)
  const [aulaEdit, setAulaEdit] = useState<Aula | null>(null)
  const [confirmDelAula, setConfirmDelAula] = useState<Aula | null>(null)
  const [docUploading, setDocUploading] = useState(false)
  const [relatorio, setRelatorio] = useState<RelatorioTreinamento | null>(null)
  const docInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      setT(await fetchTreinamento(id))
    } catch (err) {
      toast({ title: 'Erro ao carregar', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  const loadRelatorio = useCallback(async () => {
    try { setRelatorio(await fetchRelatorioTreinamento(id)) } catch { /* silencioso */ }
  }, [id])

  useEffect(() => { load(); loadRelatorio() }, [load, loadRelatorio])
  useRealtimeRefresh(load)

  // Poll enquanto houver aula processando
  useEffect(() => {
    if (!t || !t.aulas.some((a) => videoEmProcessamento(a.status_video))) return
    const timer = setInterval(load, 5000)
    return () => clearInterval(timer)
  }, [t, load])

  const abrirNovaAula = () => { setAulaEdit(null); setAulaModalOpen(true) }
  const abrirEditarAula = (a: Aula) => { setAulaEdit(a); setAulaModalOpen(true) }

  const onMoveAula = async (index: number, dir: -1 | 1) => {
    if (!t) return
    const novo = [...t.aulas]
    const alvo = index + dir
    if (alvo < 0 || alvo >= novo.length) return
    ;[novo[index], novo[alvo]] = [novo[alvo], novo[index]]
    setT({ ...t, aulas: novo })
    try { await reordenarAulas(id, novo.map((a) => a.id)) } catch (err) {
      toast({ title: 'Erro ao reordenar', description: getErrorMessage(err), variant: 'destructive' }); load()
    }
  }

  const handleDeleteAula = async (a: Aula) => {
    try {
      await deleteAula(a.id)
      setT((prev) => (prev ? { ...prev, aulas: prev.aulas.filter((x) => x.id !== a.id) } : prev))
      toast({ title: 'Aula excluída', description: a.titulo })
    } catch (err) {
      toast({ title: 'Erro ao excluir', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setConfirmDelAula(null)
    }
  }

  const onDocSelected = async (file: File) => {
    setDocUploading(true)
    try {
      await uploadDocumentoTreinamento(id, file)
      toast({ title: 'Documento adicionado', description: file.name })
      await load()
    } catch (err) {
      toast({ title: 'Erro ao enviar documento', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setDocUploading(false)
      if (docInputRef.current) docInputRef.current.value = ''
    }
  }

  const removerDoc = async (docId: string) => {
    try {
      await deleteDocumentoTreinamento(docId)
      setT((prev) => (prev ? { ...prev, documentos: prev.documentos.filter((d) => d.id !== docId) } : prev))
    } catch (err) {
      toast({ title: 'Erro ao remover', description: getErrorMessage(err), variant: 'destructive' })
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-green-600 animate-spin" /></div>
  if (!t) return <div className="p-8 text-center text-gray-500">Treinamento não encontrado.</div>

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <button onClick={() => navigate('/admin/treinamentos')} className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 mb-2">
            <ArrowLeft className="w-4 h-4" /> Treinamentos
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{t.titulo}</h1>
            {t.obrigatorio && <Star className="w-5 h-5 text-amber-500 fill-amber-500" />}
            {t.liberacao_sequencial && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 inline-flex items-center gap-1"><ListOrdered className="w-3 h-3" /> Sequencial</span>}
            {!t.ativo && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">Inativo</span>}
          </div>
          {t.descricao && <p className="text-gray-500 text-sm mt-1">{t.descricao}</p>}
        </div>
        <Button variant="outline" onClick={() => setEditOpen(true)} className="flex-shrink-0">
          <Edit2 className="w-4 h-4 mr-2" /> Editar
        </Button>
      </div>

      {/* Aulas */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2"><ListVideo className="w-5 h-5 text-green-600" /> Aulas ({t.aulas.length})</h2>
          <Button size="sm" onClick={abrirNovaAula} className="bg-green-700 hover:bg-green-800"><Plus className="w-4 h-4 mr-1" /> Nova aula</Button>
        </div>
        {t.aulas.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Video className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Nenhuma aula ainda. Adicione a primeira e faça o upload do vídeo.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {t.aulas.map((a, idx) => (
              <AulaAdmin
                key={a.id}
                aula={a}
                sequencial={t.liberacao_sequencial}
                index={idx}
                total={t.aulas.length}
                onChanged={load}
                onEdit={abrirEditarAula}
                onDelete={setConfirmDelAula}
                onMove={onMoveAula}
              />
            ))}
          </div>
        )}
      </section>

      {/* Documentos de apoio */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2"><FileText className="w-5 h-5 text-green-600" /> Documentos de apoio</h2>
          <input ref={docInputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onDocSelected(f) }} />
          <Button size="sm" variant="outline" onClick={() => docInputRef.current?.click()} disabled={docUploading}>
            {docUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> Adicionar</>}
          </Button>
        </div>
        {t.documentos.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum documento.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {t.documentos.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2.5">
                <a href={documentoTreinamentoUrl(d.id)} target="_blank" rel="noreferrer" className="text-sm text-gray-700 hover:text-green-700 inline-flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" /> {d.titulo}
                </a>
                <button onClick={() => removerDoc(d.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Eventos vinculados */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4"><Calendar className="w-5 h-5 text-green-600" /> Eventos vinculados</h2>
        {t.eventos.length === 0 ? (
          <p className="text-sm text-gray-400">Este treinamento ainda não está vinculado a nenhum evento. Vincule pela tela do evento.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {t.eventos.map((v) => (
              <Link key={v.id} to={`/admin/eventos/${v.evento.id}`} className="text-sm px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400" /> {v.evento.titulo}
              </Link>
            ))}
          </ul>
        )}
      </section>

      {/* Relatório */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4"><BarChart3 className="w-5 h-5 text-green-600" /> Progresso dos corretores</h2>
        {!relatorio ? (
          <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 text-green-600 animate-spin" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <Indicador icon={Users} label="Com acesso" valor={relatorio.indicadores.total} />
              <Indicador icon={Video} label="Iniciaram" valor={relatorio.indicadores.iniciou} />
              <Indicador icon={CheckCircle2} label="Concluíram" valor={relatorio.indicadores.concluiu} cor="text-green-600" />
              <Indicador icon={BarChart3} label="Conclusão" valor={`${relatorio.indicadores.percentualConclusao}%`} cor="text-green-600" />
            </div>
            {relatorio.linhas.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhum corretor com acesso ainda (vincule a um evento com inscritos).</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-600">
                      <th className="text-left px-3 py-2 font-semibold">Corretor</th>
                      <th className="text-left px-3 py-2 font-semibold hidden sm:table-cell">Evento</th>
                      <th className="text-left px-3 py-2 font-semibold">Status</th>
                      <th className="text-left px-3 py-2 font-semibold">Aulas</th>
                      <th className="text-left px-3 py-2 font-semibold">%</th>
                      <th className="text-left px-3 py-2 font-semibold hidden md:table-cell">Último acesso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {relatorio.linhas.map((l) => {
                      const sp = statusProgressoInfo(l.status)
                      return (
                        <tr key={l.corretor_id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-800">{l.nome}</td>
                          <td className="px-3 py-2 text-gray-500 hidden sm:table-cell">{l.evento ?? '—'}</td>
                          <td className="px-3 py-2"><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${sp.className}`}>{sp.label}</span></td>
                          <td className="px-3 py-2 text-gray-700">{l.aulas_concluidas}/{l.total_aulas}</td>
                          <td className="px-3 py-2 text-gray-700">{l.percentual}%</td>
                          <td className="px-3 py-2 text-gray-500 hidden md:table-cell">{formatDataHora(l.ultimo_acesso)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      <TreinamentoFormModal open={editOpen} onOpenChange={setEditOpen} treinamento={t} onSaved={() => load()} />
      <AulaFormModal
        open={aulaModalOpen}
        onOpenChange={(o) => { setAulaModalOpen(o); if (!o) setAulaEdit(null) }}
        treinamentoId={id}
        aula={aulaEdit}
        sequencial={t.liberacao_sequencial}
        onSaved={() => load()}
      />

      <AlertDialog open={!!confirmDelAula} onOpenChange={(o) => { if (!o) setConfirmDelAula(null) }}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-1"><Trash2 className="w-6 h-6 text-red-500" /></div>
            <AlertDialogTitle className="text-base">Excluir aula?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              <strong>"{confirmDelAula?.titulo}"</strong> será removida junto com o vídeo e o progresso dos corretores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelAula && handleDeleteAula(confirmDelAula)} className="rounded-xl bg-red-600 hover:bg-red-700">Sim, excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function Indicador({ icon: Icon, label, valor, cor = 'text-gray-900' }: { icon: typeof Users; label: string; valor: number | string; cor?: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1"><Icon className="w-3.5 h-3.5" /> {label}</div>
      <p className={`text-xl font-bold ${cor}`}>{valor}</p>
    </div>
  )
}
