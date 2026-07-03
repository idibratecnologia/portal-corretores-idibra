import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  GraduationCap, Plus, Trash2, Loader2, Video, Star, ChevronUp, ChevronDown, Settings2, ListVideo,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TreinamentoFormModal } from '@/components/admin/TreinamentoFormModal'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'
import { videoEmProcessamento } from '@/lib/treinamentos-ui'
import {
  fetchTreinamentosDoEvento, fetchTreinamentos, vincularTreinamento,
  desvincularTreinamento, ordenarTreinamentosEvento,
  type VinculoTreinamento, type Treinamento,
} from '@/services/treinamentos'

export function EventoTreinamentosAdmin({ eventoId, embedded = false }: { eventoId: string; embedded?: boolean }) {
  const { toast } = useToast()
  const [vinculos, setVinculos] = useState<VinculoTreinamento[]>([])
  const [todos, setTodos] = useState<Treinamento[]>([])
  const [loading, setLoading] = useState(true)
  const [selectId, setSelectId] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [formOpen, setFormOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const [v, t] = await Promise.all([fetchTreinamentosDoEvento(eventoId), fetchTreinamentos()])
      setVinculos(v)
      setTodos(t)
    } catch (err) {
      toast({ title: 'Erro ao carregar treinamentos', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [eventoId, toast])

  useEffect(() => { load() }, [load])

  const disponiveis = todos.filter((t) => !vinculos.some((v) => v.treinamento_id === t.id))

  const vincularExistente = async () => {
    if (!selectId) return
    setSalvando(true)
    try {
      await vincularTreinamento(eventoId, selectId)
      setSelectId('')
      await load()
      toast({ title: 'Treinamento vinculado' })
    } catch (err) {
      toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  const onCriado = async (t: Treinamento, isNew: boolean) => {
    if (!isNew) return
    try {
      await vincularTreinamento(eventoId, t.id)
      await load()
      toast({ title: 'Treinamento criado e vinculado', description: 'Faça o upload do vídeo na tela do treinamento.' })
    } catch (err) {
      toast({ title: 'Erro ao vincular', description: getErrorMessage(err), variant: 'destructive' })
    }
  }

  const remover = async (v: VinculoTreinamento) => {
    if (!window.confirm(`Desvincular "${v.treinamento.titulo}" deste evento?`)) return
    try {
      await desvincularTreinamento(v.id)
      setVinculos((prev) => prev.filter((x) => x.id !== v.id))
    } catch (err) {
      toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' })
    }
  }

  const toggleObrigatorio = async (v: VinculoTreinamento) => {
    const novo = !(v.obrigatorio ?? v.treinamento.obrigatorio)
    try {
      await vincularTreinamento(eventoId, v.treinamento_id, novo)
      setVinculos((prev) => prev.map((x) => (x.id === v.id ? { ...x, obrigatorio: novo } : x)))
    } catch (err) {
      toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' })
    }
  }

  const mover = async (idx: number, dir: -1 | 1) => {
    const novo = [...vinculos]
    const alvo = idx + dir
    if (alvo < 0 || alvo >= novo.length) return
    ;[novo[idx], novo[alvo]] = [novo[alvo], novo[idx]]
    setVinculos(novo)
    try {
      await ordenarTreinamentosEvento(eventoId, novo.map((v) => v.id))
    } catch (err) {
      toast({ title: 'Erro ao reordenar', description: getErrorMessage(err), variant: 'destructive' })
      load()
    }
  }

  const body = (
    <>
      <div className="p-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 text-green-600 animate-spin" /></div>
        ) : vinculos.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nenhum treinamento vinculado a este evento.</p>
        ) : (
          <ul className="space-y-2">
            {vinculos.map((v, idx) => {
              const aulas = v.treinamento.aulas ?? []
              const totalAulas = v.treinamento._count?.aulas ?? aulas.length
              const processando = aulas.some((a) => videoEmProcessamento(a.status_video))
              const obrig = v.obrigatorio ?? v.treinamento.obrigatorio
              return (
                <li key={v.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                  <div className="flex flex-col">
                    <button onClick={() => mover(idx, -1)} disabled={idx === 0} className="text-gray-300 hover:text-gray-600 disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
                    <button onClick={() => mover(idx, 1)} disabled={idx === vinculos.length - 1} className="text-gray-300 hover:text-gray-600 disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0"><Video className="w-4 h-4" /></div>
                  <div className="flex-1 min-w-0">
                    <Link to={`/admin/treinamentos/${v.treinamento_id}`} className="text-sm font-medium text-gray-800 hover:text-green-700 truncate inline-flex items-center gap-1.5">
                      {v.treinamento.titulo}
                      {obrig && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 bg-gray-100 text-gray-600">
                        {processando && <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-600" />}
                        <ListVideo className="w-2.5 h-2.5" /> {totalAulas} aula{totalAulas === 1 ? '' : 's'}
                      </span>
                      {!v.treinamento.ativo && <span className="text-[10px] text-gray-400">inativo</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleObrigatorio(v)}
                    title={obrig ? 'Tornar opcional neste evento' : 'Tornar obrigatório neste evento'}
                    className={`text-[11px] font-medium inline-flex items-center gap-1 px-2 py-1 rounded-lg ${obrig ? 'text-amber-600 bg-amber-50' : 'text-gray-400 hover:bg-gray-50'}`}
                  >
                    <Settings2 className="w-3.5 h-3.5" /> {obrig ? 'Obrigatório' : 'Opcional'}
                  </button>
                  <button onClick={() => remover(v)} title="Desvincular" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </li>
              )
            })}
          </ul>
        )}

        {/* Vincular / criar */}
        <div className="pt-2 border-t border-gray-100 space-y-3">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">Vincular treinamento existente</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectId}
                onChange={(e) => setSelectId(e.target.value)}
                className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione um treinamento…</option>
                {disponiveis.map((t) => (
                  <option key={t.id} value={t.id}>{t.titulo}{!t.ativo ? ' (inativo)' : ''}</option>
                ))}
              </select>
              <Button onClick={vincularExistente} disabled={salvando || !selectId} className="bg-gray-900 hover:bg-gray-800 gap-1.5">
                <Plus className="w-4 h-4" /> Vincular
              </Button>
            </div>
            {disponiveis.length === 0 && !loading && <p className="text-xs text-gray-400 mt-1">Todos os treinamentos já estão vinculados.</p>}
          </div>
          <Button variant="outline" onClick={() => setFormOpen(true)} className="gap-1.5 border-gray-200">
            <Plus className="w-4 h-4" /> Criar novo treinamento já vinculado
          </Button>
        </div>
      </div>

      <TreinamentoFormModal open={formOpen} onOpenChange={setFormOpen} treinamento={null} onSaved={onCriado} />
    </>
  )

  if (embedded) return body

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        <GraduationCap className="w-4 h-4 text-green-600" />
        <h2 className="font-semibold text-gray-900">Treinamentos do evento</h2>
      </div>
      {body}
    </div>
  )
}
