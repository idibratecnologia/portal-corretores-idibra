import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Loader2, Palette, Edit2, Copy, Trash2, CheckCircle2, XCircle,
  CreditCard, Award, BadgeCheck, RotateCw, PencilRuler,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'
import { getErrorMessage } from '@/lib/errors'
import {
  fetchModelos, createModelo, updateModelo, duplicarModelo, deleteModelo,
  TIPO_MODELO_LABEL, type ModeloVisual, type TipoModelo,
} from '@/services/modelos'

const PRESETS: Record<TipoModelo, { largura: number; altura: number }> = {
  credenciamento: { largura: 800, altura: 600 },   // A5 horizontal aprox.
  cracha:         { largura: 600, altura: 900 },    // crachá retrato
  certificado:    { largura: 1123, altura: 794 },   // A4 paisagem (96dpi)
}

const TIPO_ICON: Record<TipoModelo, typeof CreditCard> = {
  credenciamento: BadgeCheck,
  cracha: CreditCard,
  certificado: Award,
}

interface FormState {
  nome: string; descricao: string; tipo: TipoModelo; largura: number; altura: number; ativo: boolean
}
const emptyForm: FormState = { nome: '', descricao: '', tipo: 'credenciamento', largura: 800, altura: 600, ativo: true }

export function AdminModelos() {
  const navigate = useNavigate()
  const { adminUser } = useAuth()
  const { toast } = useToast()
  const isSuper = adminUser?.nivel === 'super'

  const [lista, setLista] = useState<ModeloVisual[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState<TipoModelo | ''>('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ModeloVisual | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<ModeloVisual | null>(null)

  const load = useCallback(async () => {
    try {
      setLista(await fetchModelos(filtroTipo ? { tipo: filtroTipo } : undefined))
    } catch (err) {
      toast({ title: 'Erro ao carregar modelos', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [filtroTipo, toast])

  useEffect(() => { load() }, [load])
  useRealtimeRefresh(load)

  const abrirNovo = () => { setEditing(null); setForm(emptyForm); setModalOpen(true) }
  const abrirEdicao = (m: ModeloVisual) => {
    setEditing(m)
    setForm({ nome: m.nome, descricao: m.descricao, tipo: m.tipo, largura: m.largura, altura: m.altura, ativo: m.ativo })
    setModalOpen(true)
  }

  const onTipoChange = (tipo: TipoModelo) => {
    // Ao trocar o tipo num modelo novo, aplica o preset de dimensão
    setForm((f) => ({ ...f, tipo, ...(editing ? {} : PRESETS[tipo]) }))
  }
  const girarOrientacao = () => setForm((f) => ({ ...f, largura: f.altura, altura: f.largura }))

  const salvar = async () => {
    if (form.nome.trim().length < 2) { toast({ title: 'Informe um nome', variant: 'destructive' }); return }
    setSaving(true)
    try {
      if (editing) {
        await updateModelo(editing.id, { nome: form.nome, descricao: form.descricao, tipo: form.tipo, largura: form.largura, altura: form.altura, ativo: form.ativo })
        toast({ title: 'Modelo atualizado', description: form.nome })
        setModalOpen(false); setEditing(null); await load()
      } else {
        const novo = await createModelo({ nome: form.nome, descricao: form.descricao, tipo: form.tipo, largura: form.largura, altura: form.altura })
        toast({ title: 'Modelo criado', description: 'Abrindo o editor…' })
        setModalOpen(false)
        navigate(`/admin/modelos/${novo.id}`)
      }
    } catch (err) {
      toast({ title: 'Erro ao salvar', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const duplicar = async (m: ModeloVisual) => {
    try {
      const novo = await duplicarModelo(m.id)
      toast({ title: 'Modelo duplicado', description: novo.nome })
      await load()
    } catch (err) {
      toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' })
    }
  }

  const toggleAtivo = async (m: ModeloVisual) => {
    try {
      await updateModelo(m.id, { ativo: !m.ativo })
      setLista((prev) => prev.map((x) => (x.id === m.id ? { ...x, ativo: !m.ativo } : x)))
    } catch (err) {
      toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' })
    }
  }

  const handleDelete = async (m: ModeloVisual) => {
    try {
      await deleteModelo(m.id)
      setLista((prev) => prev.filter((x) => x.id !== m.id))
      toast({ title: 'Modelo excluído', description: m.nome })
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
          <h1 className="text-2xl font-bold text-gray-900">Modelos Visuais</h1>
          <p className="text-gray-500 text-sm mt-1">Artes de credenciamento, crachá e certificado — editor visual com variáveis dinâmicas</p>
        </div>
        <Button onClick={abrirNovo} className="bg-green-700 hover:bg-green-800 self-start sm:self-auto">
          <Plus className="w-4 h-4 mr-2" /> Novo Modelo
        </Button>
      </div>

      {/* Filtro por tipo */}
      <div className="flex flex-wrap gap-2">
        {([['', 'Todos'], ['credenciamento', 'Credenciamento'], ['cracha', 'Crachá'], ['certificado', 'Certificado']] as const).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFiltroTipo(val as TipoModelo | '')}
            className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${filtroTipo === val ? 'bg-green-700 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-green-600 animate-spin" /></div>
      ) : lista.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <Palette className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhum modelo criado ainda.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((m) => {
            const Icon = TIPO_ICON[m.tipo]
            return (
              <div key={m.id} className="group bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all flex flex-col">
                <button
                  onClick={() => navigate(`/admin/modelos/${m.id}`)}
                  className="relative bg-slate-50 border-b border-gray-100 flex items-center justify-center h-36 w-full"
                  title="Abrir editor"
                >
                  <Icon className="w-10 h-10 text-slate-300 group-hover:text-green-500 transition-colors" />
                  <span className="absolute bottom-2 right-2 text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/90 text-gray-500 border border-gray-100">
                    {m.largura}×{m.altura}
                  </span>
                  {!m.ativo && <span className="absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-800/80 text-white">Inativo</span>}
                </button>
                <div className="p-4 flex-1 flex flex-col">
                  <span className="text-[10px] font-semibold text-green-700 uppercase tracking-wide">{TIPO_MODELO_LABEL[m.tipo]}</span>
                  <h3 className="font-semibold text-gray-900 leading-tight mt-0.5">{m.nome}</h3>
                  {m.descricao && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{m.descricao}</p>}
                  <p className="text-[11px] text-gray-400 mt-2">{m._count?.eventos ?? 0} evento(s) vinculado(s)</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                    <button onClick={() => toggleAtivo(m)} className={`text-[11px] font-medium inline-flex items-center gap-1 ${m.ativo ? 'text-green-600' : 'text-gray-400'}`}>
                      {m.ativo ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {m.ativo ? 'Ativo' : 'Inativo'}
                    </button>
                    <div className="flex items-center gap-1">
                      <button onClick={() => navigate(`/admin/modelos/${m.id}`)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg" title="Abrir editor"><PencilRuler className="w-4 h-4" /></button>
                      <button onClick={() => abrirEdicao(m)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar dados"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => duplicar(m)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg" title="Duplicar"><Copy className="w-4 h-4" /></button>
                      {isSuper && <button onClick={() => setConfirmDelete(m)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Excluir"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal metadados */}
      <Dialog open={modalOpen} onOpenChange={(o) => { setModalOpen(o); if (!o) setEditing(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar dados do modelo' : 'Novo modelo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="mt-1" placeholder="ex.: Credenciamento padrão IDIBRA" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="mt-1" rows={2} />
            </div>
            <div>
              <Label>Tipo *</Label>
              <select
                value={form.tipo}
                onChange={(e) => onTipoChange(e.target.value as TipoModelo)}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="credenciamento">Credenciamento</option>
                <option value="cracha">Crachá</option>
                <option value="certificado">Certificado</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <Label>Largura (px)</Label>
                <Input type="number" min={1} value={form.largura} onChange={(e) => setForm({ ...form, largura: Number(e.target.value) })} className="mt-1" />
              </div>
              <div>
                <Label>Altura (px)</Label>
                <Input type="number" min={1} value={form.altura} onChange={(e) => setForm({ ...form, altura: Number(e.target.value) })} className="mt-1" />
              </div>
            </div>
            <button type="button" onClick={girarOrientacao} className="text-xs text-green-700 hover:underline inline-flex items-center gap-1">
              <RotateCw className="w-3.5 h-3.5" /> Girar orientação ({form.largura > form.altura ? 'paisagem' : 'retrato'})
            </button>
            {editing && (
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} className="rounded border-gray-300" />
                Ativo
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setModalOpen(false); setEditing(null) }}>Cancelar</Button>
            <Button onClick={salvar} className="bg-green-700 hover:bg-green-800" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editing ? 'Salvar' : 'Criar e abrir editor')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null) }}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-1"><Trash2 className="w-6 h-6 text-red-500" /></div>
            <AlertDialogTitle className="text-base">Excluir modelo?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              <strong>"{confirmDelete?.nome}"</strong> será removido e desvinculado dos eventos. Esta ação não pode ser desfeita.
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
