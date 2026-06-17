import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'
import { createAula, updateAula, type Aula, type AulaPayload } from '@/services/treinamentos'

const schema = z.object({
  titulo: z.string().min(2, 'Título obrigatório'),
  descricao: z.string().optional(),
  data_liberacao: z.string().optional(),
  data_encerramento: z.string().optional(),
  excluir_video_automaticamente: z.boolean().optional(),
  dias_para_exclusao: z.string().optional(),
})
type FormData = z.infer<typeof schema>

function toPayload(d: FormData): AulaPayload {
  return {
    titulo: d.titulo,
    descricao: d.descricao ?? '',
    data_liberacao: d.data_liberacao || null,
    data_encerramento: d.data_encerramento || null,
    excluir_video_automaticamente: d.excluir_video_automaticamente ?? false,
    dias_para_exclusao: d.dias_para_exclusao ? Number(d.dias_para_exclusao) : null,
  }
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  treinamentoId: string
  aula?: Aula | null
  /** Quando o treinamento é sequencial, a data de liberação por aula é ignorada. */
  sequencial?: boolean
  onSaved: (aula: Aula, isNew: boolean) => void
}

export function AulaFormModal({ open, onOpenChange, treinamentoId, aula, sequencial, onSaved }: Props) {
  const { toast } = useToast()
  const editing = aula ?? null
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })
  const autoExcluir = watch('excluir_video_automaticamente')

  useEffect(() => {
    if (!open) return
    reset({
      titulo: editing?.titulo ?? '',
      descricao: editing?.descricao ?? '',
      data_liberacao: editing?.data_liberacao?.slice(0, 10) ?? '',
      data_encerramento: editing?.data_encerramento?.slice(0, 10) ?? '',
      excluir_video_automaticamente: editing?.excluir_video_automaticamente ?? false,
      dias_para_exclusao: editing?.dias_para_exclusao != null ? String(editing.dias_para_exclusao) : '',
    })
  }, [open, editing, reset])

  const onSubmit = async (data: FormData) => {
    try {
      if (editing) {
        const a = await updateAula(editing.id, toPayload(data))
        toast({ title: 'Aula atualizada', description: data.titulo })
        onSaved(a, false)
      } else {
        const a = await createAula(treinamentoId, toPayload(data))
        toast({ title: 'Aula criada', description: 'Agora faça o upload do vídeo.' })
        onSaved(a, true)
      }
      onOpenChange(false)
    } catch (err) {
      toast({ title: 'Erro ao salvar', description: getErrorMessage(err), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar Aula' : 'Nova Aula'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input {...register('titulo')} className="mt-1" placeholder="ex.: Módulo 1 — Introdução" />
            {errors.titulo && <p className="text-xs text-red-500 mt-1">{errors.titulo.message}</p>}
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea {...register('descricao')} className="mt-1" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {!sequencial && (
              <div>
                <Label>Liberação</Label>
                <Input type="date" {...register('data_liberacao')} className="mt-1" />
              </div>
            )}
            <div>
              <Label>Encerramento</Label>
              <Input type="date" {...register('data_encerramento')} className="mt-1" />
            </div>
          </div>
          {sequencial && (
            <p className="text-xs text-gray-400 -mt-2">Liberação sequencial ativa: esta aula libera quando a anterior for concluída.</p>
          )}
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" {...register('excluir_video_automaticamente')} className="rounded border-gray-300" />
            Excluir o vídeo automaticamente após o encerramento
          </label>
          {autoExcluir && (
            <div>
              <Label>Dias após o encerramento para exclusão</Label>
              <Input type="number" min={0} {...register('dias_para_exclusao')} className="mt-1" placeholder="ex.: 30" />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="bg-green-700 hover:bg-green-800" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editing ? 'Salvar' : 'Criar aula')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
