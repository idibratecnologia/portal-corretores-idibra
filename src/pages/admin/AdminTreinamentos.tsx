import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Loader2, GraduationCap, Edit2, Trash2, Video, FileText, Calendar,
  CheckCircle2, XCircle, ChevronRight, Star, ListVideo, ListOrdered,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { TreinamentoFormModal } from '@/components/admin/TreinamentoFormModal'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'
import { getErrorMessage } from '@/lib/errors'
import { videoEmProcessamento } from '@/lib/treinamentos-ui'
import {
  fetchTreinamentos, setAtivoTreinamento, deleteTreinamento, type Treinamento,
} from '@/services/treinamentos'

export function AdminTreinamentos() {
  const navigate = useNavigate()
  const { adminUser } = useAuth()
  const { toast } = useToast()
  const isSuper = adminUser?.nivel === 'super'

  const [lista, setLista] = useState<Treinamento[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Treinamento | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Treinamento | null>(null)

  const load = useCallback(async () => {
    try {
      setLista(await fetchTreinamentos())
    } catch (err) {
      toast({ title: 'Erro ao carregar treinamentos', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])
  useRealtimeRefresh(load)

  const abrirNovo = () => { setEditing(null); setModalOpen(true) }
  const abrirEdicao = (t: Treinamento) => { setEditing(t); setModalOpen(true) }

  const onSaved = (t: Treinamento, isNew: boolean) => {
    if (isNew) navigate(`/admin/treinamentos/${t.id}`)
    else { setEditing(null); load() }
  }

  const toggleAtivo = async (t: Treinamento) => {
    try {
      await setAtivoTreinamento(t.id, !t.ativo)
      setLista((prev) => prev.map((x) => (x.id === t.id ? { ...x, ativo: !t.ativo } : x)))
    } catch (err) {
      toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' })
    }
  }

  const handleDelete = async (t: Treinamento) => {
    try {
      await deleteTreinamento(t.id)
      setLista((prev) => prev.filter((x) => x.id !== t.id))
      toast({ title: 'Treinamento excluído', description: t.titulo })
    } catch (err) {
      toast({ title: 'Erro ao excluir', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setConfirmDelete(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Treinamentos</h1>
          <p className="text-gray-500 text-sm mt-1">Trilhas com várias aulas, progresso e conclusão por corretor</p>
        </div>
        <Button onClick={abrirNovo} className="bg-green-700 hover:bg-green-800 self-start sm:self-auto">
          <Plus className="w-4 h-4 mr-2" /> Novo Treinamento
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-green-600 animate-spin" /></div>
      ) : lista.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <GraduationCap className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhum treinamento cadastrado ainda.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((t) => {
            const aulas = t.aulas ?? []
            const thumb = aulas.find((a) => a.thumbnail_url)?.thumbnail_url ?? null
            const processando = aulas.some((a) => videoEmProcessamento(a.status_video))
            const totalAulas = t._count?.aulas ?? aulas.length
            return (
              <div
                key={t.id}
                className="group bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all cursor-pointer flex flex-col"
                onClick={() => navigate(`/admin/treinamentos/${t.id}`)}
              >
                <div className="relative aspect-video bg-slate-100">
                  {thumb ? (
                    <img src={thumb} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300"><Video className="w-10 h-10" /></div>
                  )}
                  <span className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-1 rounded-full inline-flex items-center gap-1 bg-white/90 text-gray-700">
                    {processando && <Loader2 className="w-3 h-3 animate-spin text-amber-600" />}
                    <ListVideo className="w-3 h-3" /> {totalAulas} aula{totalAulas === 1 ? '' : 's'}
                  </span>
                  {!t.ativo && <span className="absolute top-2 right-2 text-[10px] font-semibold px-2 py-1 rounded-full bg-gray-800/80 text-white">Inativo</span>}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-start gap-2">
                    <h3 className="font-semibold text-gray-900 leading-tight flex-1">{t.titulo}</h3>
                    {t.obrigatorio && <Star className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />}
                    {t.liberacao_sequencial && <ListOrdered className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                  </div>
                  {t.descricao && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.descricao}</p>}
                  <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-3">
                    <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> {t._count?.documentos ?? 0}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {t._count?.eventos ?? 0} evento(s)</span>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => toggleAtivo(t)} className={`text-[11px] font-medium inline-flex items-center gap-1 ${t.ativo ? 'text-green-600' : 'text-gray-400'}`}>
                      {t.ativo ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {t.ativo ? 'Ativo' : 'Inativo'}
                    </button>
                    <div className="flex items-center gap-1">
                      <button onClick={() => abrirEdicao(t)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar"><Edit2 className="w-4 h-4" /></button>
                      {isSuper && <button onClick={() => setConfirmDelete(t)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Excluir"><Trash2 className="w-4 h-4" /></button>}
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <TreinamentoFormModal open={modalOpen} onOpenChange={(o) => { setModalOpen(o); if (!o) setEditing(null) }} treinamento={editing} onSaved={onSaved} />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null) }}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-1"><Trash2 className="w-6 h-6 text-red-500" /></div>
            <AlertDialogTitle className="text-base">Excluir treinamento?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              <strong>"{confirmDelete?.titulo}"</strong> será removido junto com todas as aulas, vídeos, documentos e progresso. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && handleDelete(confirmDelete)} className="rounded-xl bg-red-600 hover:bg-red-700">Sim, excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
