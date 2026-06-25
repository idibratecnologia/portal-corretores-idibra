import { useEffect, useState } from 'react'
import { FileText, Save, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'
import {
  fetchModelosMensagem, createModeloMensagem, deleteModeloMensagem, type ModeloMensagem,
} from '@/services/modelosMensagem'

interface Props {
  /** Conteúdo atual da mensagem (para salvar como modelo). */
  mensagem: string
  /** Assunto atual (salvo junto quando informado). */
  assunto?: string
  /** Aplica um modelo escolhido aos campos da tela. */
  onApply: (conteudo: string, assunto?: string) => void
}

export function ModelosMensagemBar({ mensagem, assunto, onApply }: Props) {
  const { toast } = useToast()
  const [modelos, setModelos] = useState<ModeloMensagem[]>([])
  const [loading, setLoading] = useState(true)
  const [salvarOpen, setSalvarOpen] = useState(false)
  const [gerenciarOpen, setGerenciarOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carregar = () => {
    fetchModelosMensagem().then(setModelos).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(carregar, [])

  const aplicar = (id: string) => {
    const m = modelos.find((x) => x.id === id)
    if (m) onApply(m.conteudo, m.assunto ?? undefined)
  }

  const salvar = async () => {
    if (!nome.trim()) { toast({ title: 'Dê um nome ao modelo', variant: 'destructive' }); return }
    if (!mensagem.trim()) { toast({ title: 'A mensagem está vazia', variant: 'destructive' }); return }
    setSalvando(true)
    try {
      await createModeloMensagem({ nome: nome.trim(), conteudo: mensagem.trim(), assunto: assunto?.trim() || undefined })
      toast({ title: 'Modelo salvo' })
      setNome(''); setSalvarOpen(false); carregar()
    } catch (err) {
      toast({ title: 'Erro ao salvar modelo', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  const remover = async (m: ModeloMensagem) => {
    try {
      await deleteModeloMensagem(m.id)
      setModelos((prev) => prev.filter((x) => x.id !== m.id))
    } catch (err) {
      toast({ title: 'Erro ao excluir', description: getErrorMessage(err), variant: 'destructive' })
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
      <FileText className="w-4 h-4 text-gray-400" />
      <select
        value=""
        disabled={loading || modelos.length === 0}
        onChange={(e) => { aplicar(e.target.value); e.target.value = '' }}
        className="h-8 rounded-md border border-input bg-background px-2 text-xs flex-1 min-w-[140px] disabled:opacity-60"
      >
        <option value="">{loading ? 'Carregando…' : modelos.length ? 'Usar modelo salvo…' : 'Nenhum modelo salvo'}</option>
        {modelos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
      </select>
      <button type="button" onClick={() => setSalvarOpen(true)} className="text-xs text-gray-600 hover:text-green-700 inline-flex items-center gap-1">
        <Save className="w-3.5 h-3.5" /> Salvar atual
      </button>
      {modelos.length > 0 && (
        <button type="button" onClick={() => setGerenciarOpen(true)} className="text-xs text-gray-400 hover:text-gray-700">
          Gerenciar
        </button>
      )}

      {/* Salvar como modelo */}
      <Dialog open={salvarOpen} onOpenChange={setSalvarOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Salvar modelo</DialogTitle>
            <DialogDescription>Salve a mensagem atual{assunto?.trim() ? ' (com o assunto)' : ''} para reutilizar depois.</DialogDescription>
          </DialogHeader>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do modelo (ex.: Boas-vindas)" autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') salvar() }} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSalvarOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={salvar} disabled={salvando} className="rounded-xl bg-green-700 hover:bg-green-800 gap-2">
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gerenciar modelos */}
      <Dialog open={gerenciarOpen} onOpenChange={setGerenciarOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>Modelos de mensagem</DialogTitle>
            <DialogDescription>Clique para excluir os modelos que não usa mais.</DialogDescription>
          </DialogHeader>
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-50 -mx-2">
            {modelos.map((m) => (
              <div key={m.id} className="flex items-start gap-3 px-2 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{m.nome}</p>
                  <p className="text-[11px] text-gray-400 truncate">{m.conteudo}</p>
                </div>
                <button onClick={() => remover(m)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
