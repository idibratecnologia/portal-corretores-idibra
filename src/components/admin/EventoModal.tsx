import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ImageOff, Image } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Evento } from '@/types'

const schema = z.object({
  titulo: z.string().min(1, 'Título obrigatório'),
  descricao: z.string().optional(),
  tipo: z.string().min(1, 'Tipo obrigatório'),
  empreendimento: z.string().optional(),
  local: z.string().min(1, 'Local obrigatório'),
  endereco: z.string().min(1, 'Endereço obrigatório'),
  link_maps: z.string().optional(),
  data_evento: z.string().min(1, 'Data obrigatória'),
  hora_inicio: z.string().min(1, 'Hora de início obrigatória'),
  hora_fim: z.string().min(1, 'Hora de fim obrigatória'),
  capacidade: z.coerce.number().min(1, 'Capacidade obrigatória'),
  banner_url: z.string().optional(),
  inscricoes_abertas: z.boolean(),
})

type FormData = z.infer<typeof schema>

interface EventoModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: Partial<Evento>) => void
  evento: Evento | null
}

function BannerPreview({ url }: { url: string }) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => { setStatus('loading') }, [url])

  if (status === 'error') {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-red-400 px-1">
        <ImageOff className="w-4 h-4 flex-shrink-0" />
        URL inválida ou imagem inacessível
      </div>
    )
  }

  return (
    <div className="mt-2 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 h-36 relative">
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 text-xs text-gray-400">
          <Image className="w-4 h-4" /> Carregando preview...
        </div>
      )}
      <img
        key={url}
        src={url}
        alt="Preview do banner"
        className="w-full h-full object-cover"
        onLoad={() => setStatus('ok')}
        onError={() => setStatus('error')}
      />
    </div>
  )
}

export function EventoModal({ open, onClose, onSave, evento }: EventoModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { inscricoes_abertas: true, capacidade: 50 },
  })

  useEffect(() => {
    if (evento) {
      reset({
        titulo: evento.titulo,
        descricao: evento.descricao,
        tipo: evento.tipo,
        empreendimento: evento.empreendimento || '',
        local: evento.local,
        endereco: evento.endereco,
        link_maps: evento.link_maps || '',
        data_evento: evento.data_evento,
        hora_inicio: evento.hora_inicio,
        hora_fim: evento.hora_fim,
        capacidade: evento.capacidade,
        banner_url: evento.banner_url || '',
        inscricoes_abertas: evento.inscricoes_abertas,
      })
    } else {
      reset({ inscricoes_abertas: true, capacidade: 50 })
    }
  }, [evento, reset])

  const bannerUrl = watch('banner_url') ?? ''
  const showPreview = bannerUrl.startsWith('http')

  const onSubmit = (data: FormData) => {
    onSave(data as any)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{evento ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Título *</Label>
              <Input {...register('titulo')} placeholder="Nome do evento" className="mt-1" />
              {errors.titulo && <p className="text-xs text-red-500 mt-1">{errors.titulo.message}</p>}
            </div>

            <div className="sm:col-span-2">
              <Label>Descrição</Label>
              <Textarea {...register('descricao')} placeholder="Descrição detalhada..." className="mt-1" rows={3} />
            </div>

            <div>
              <Label>Tipo *</Label>
              <select
                {...register('tipo')}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione...</option>
                <option value="lançamento">Lançamento</option>
                <option value="treinamento">Treinamento</option>
                <option value="reunião">Reunião</option>
                <option value="feira">Feira</option>
                <option value="workshop">Workshop</option>
                <option value="outro">Outro</option>
              </select>
              {errors.tipo && <p className="text-xs text-red-500 mt-1">{errors.tipo.message}</p>}
            </div>

            <div>
              <Label>Empreendimento</Label>
              <Input {...register('empreendimento')} placeholder="Nome do empreendimento" className="mt-1" />
            </div>

            <div>
              <Label>Local *</Label>
              <Input {...register('local')} placeholder="Nome do local" className="mt-1" />
              {errors.local && <p className="text-xs text-red-500 mt-1">{errors.local.message}</p>}
            </div>

            <div>
              <Label>Endereço *</Label>
              <Input {...register('endereco')} placeholder="Rua, número, bairro, cidade" className="mt-1" />
              {errors.endereco && <p className="text-xs text-red-500 mt-1">{errors.endereco.message}</p>}
            </div>

            <div className="sm:col-span-2">
              <Label>Link Google Maps</Label>
              <Input {...register('link_maps')} placeholder="https://maps.google.com/..." className="mt-1" />
            </div>

            <div>
              <Label>Data *</Label>
              <Input type="date" {...register('data_evento')} className="mt-1" />
              {errors.data_evento && <p className="text-xs text-red-500 mt-1">{errors.data_evento.message}</p>}
            </div>

            <div>
              <Label>Capacidade *</Label>
              <Input type="number" {...register('capacidade')} placeholder="100" className="mt-1" />
              {errors.capacidade && <p className="text-xs text-red-500 mt-1">{errors.capacidade.message}</p>}
            </div>

            <div>
              <Label>Hora Início *</Label>
              <Input type="time" {...register('hora_inicio')} className="mt-1" />
              {errors.hora_inicio && <p className="text-xs text-red-500 mt-1">{errors.hora_inicio.message}</p>}
            </div>

            <div>
              <Label>Hora Fim *</Label>
              <Input type="time" {...register('hora_fim')} className="mt-1" />
              {errors.hora_fim && <p className="text-xs text-red-500 mt-1">{errors.hora_fim.message}</p>}
            </div>

            <div className="sm:col-span-2">
              <Label>URL do Banner</Label>
              <Input {...register('banner_url')} placeholder="https://..." className="mt-1" />
              {showPreview && <BannerPreview url={bannerUrl} />}
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="inscricoes_abertas" {...register('inscricoes_abertas')} className="rounded" />
              <Label htmlFor="inscricoes_abertas">Inscrições abertas</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-green-700 hover:bg-green-800">
              {evento ? 'Salvar Alterações' : 'Criar Evento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
