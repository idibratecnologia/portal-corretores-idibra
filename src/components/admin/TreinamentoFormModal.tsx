import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, ListVideo, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'
import { createTreinamento, updateTreinamento, type Treinamento, type TreinamentoPayload } from '@/services/treinamentos'

const schema = z.object({
  titulo: z.string().min(2, 'Título obrigatório'),
  descricao: z.string().optional(),
  obrigatorio: z.boolean().optional(),
  liberacao_sequencial: z.boolean().optional(),
  avulso: z.boolean().optional(),
})
type FormData = z.infer<typeof schema>

function toPayload(d: FormData): TreinamentoPayload {
  return {
    titulo: d.titulo,
    descricao: d.descricao ?? '',
    obrigatorio: d.obrigatorio ?? false,
    liberacao_sequencial: d.liberacao_sequencial ?? false,
    avulso: d.avulso ?? false,
  }
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  treinamento?: Treinamento | null
  onSaved: (t: Treinamento, isNew: boolean) => void
}

export function TreinamentoFormModal({ open, onOpenChange, treinamento, onSaved }: Props) {
  const { toast } = useToast()
  const editing = treinamento ?? null
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })
  const sequencial = watch('liberacao_sequencial')

  useEffect(() => {
    if (!open) return
    reset({
      titulo: editing?.titulo ?? '',
      descricao: editing?.descricao ?? '',
      obrigatorio: editing?.obrigatorio ?? false,
      liberacao_sequencial: editing?.liberacao_sequencial ?? false,
      avulso: editing?.avulso ?? false,
    })
  }, [open, editing, reset])

  const onSubmit = async (data: FormData) => {
    try {
      if (editing) {
        const t = await updateTreinamento(editing.id, toPayload(data))
        toast({ title: 'Treinamento atualizado', description: data.titulo })
        onSaved(t, false)
      } else {
        const t = await createTreinamento(toPayload(data))
        toast({ title: 'Treinamento criado', description: 'Agora adicione as aulas (vídeos).' })
        onSaved(t, true)
      }
      onOpenChange(false)
    } catch (err) {
      toast({ title: 'Erro ao salvar', description: getErrorMessage(err), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar Treinamento' : 'Novo Treinamento'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input {...register('titulo')} className="mt-1" />
            {errors.titulo && <p className="text-xs text-red-500 mt-1">{errors.titulo.message}</p>}
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea {...register('descricao')} className="mt-1" rows={3} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" {...register('obrigatorio')} className="rounded border-gray-300" />
            Treinamento obrigatório
          </label>
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input type="checkbox" {...register('liberacao_sequencial')} className="rounded border-gray-300 mt-0.5" />
            <span>
              <span className="font-medium flex items-center gap-1.5"><ListVideo className="w-3.5 h-3.5" /> Liberação sequencial</span>
              <span className="block text-xs text-gray-400">
                {sequencial
                  ? 'Cada aula só libera após o corretor concluir a anterior.'
                  : 'Cada aula usa a data de liberação definida nela.'}
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-gray-700 p-3 rounded-xl border border-gray-100 bg-gray-50/60">
            <input type="checkbox" {...register('avulso')} className="rounded border-gray-300 mt-0.5 accent-green-600" />
            <span>
              <span className="font-medium flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-green-600" /> Disponível a todos os corretores</span>
              <span className="block text-xs text-gray-400">
                Libera este treinamento para <strong>todos os corretores ativos</strong>, sem precisar vincular a um evento.
              </span>
            </span>
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="bg-green-700 hover:bg-green-800" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editing ? 'Salvar' : 'Criar e adicionar aulas')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
