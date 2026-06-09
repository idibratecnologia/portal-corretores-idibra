import { useEffect, useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Upload, X } from 'lucide-react'
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
import { useToast } from '@/hooks/use-toast'
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

/** Converte data (ISO ou Date) para o formato yyyy-MM-dd do input type=date. */
function toDateInput(value: string | Date | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

interface EventoModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: Partial<Evento>, bannerFile: File | null) => void | Promise<void>
  evento: Evento | null
}

export function EventoModal({ open, onClose, onSave, evento }: EventoModalProps) {
  const { toast } = useToast()
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const {
    register,
    handleSubmit,
    reset,
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
        data_evento: toDateInput(evento.data_evento),
        hora_inicio: evento.hora_inicio,
        hora_fim: evento.hora_fim,
        capacidade: evento.capacidade,
        banner_url: evento.banner_url || '',
        inscricoes_abertas: evento.inscricoes_abertas,
      })
      setBannerPreview(evento.banner_url || null)
    } else {
      reset({ inscricoes_abertas: true, capacidade: 50 })
      setBannerPreview(null)
    }
    setBannerFile(null)
  }, [evento, reset, open])

  const handleBannerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Formato inválido', description: 'Selecione uma imagem (JPG, PNG ou WebP).', variant: 'destructive' })
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'O banner deve ter no máximo 10 MB.', variant: 'destructive' })
      return
    }
    setBannerFile(file)
    setBannerPreview(URL.createObjectURL(file))
  }

  const removerBanner = () => {
    setBannerFile(null)
    setBannerPreview(null)
    if (bannerInputRef.current) bannerInputRef.current.value = ''
  }

  const onSubmit = async (data: FormData) => {
    setSaving(true)
    try {
      await onSave(data as Partial<Evento>, bannerFile)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{evento ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit, () =>
            toast({ title: 'Verifique os campos', description: 'Há campos obrigatórios não preenchidos.', variant: 'destructive' })
          )}
          className="space-y-4"
        >
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
                <option value="lancamento">Lançamento</option>
                <option value="treinamento">Treinamento</option>
                <option value="reuniao">Reunião</option>
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
              <Label>Banner do evento</Label>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleBannerSelect}
              />
              {bannerPreview ? (
                <div className="mt-1 relative rounded-xl overflow-hidden border border-gray-100 bg-gray-50 aspect-[1200/630] group">
                  <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <Button type="button" size="sm" variant="outline" className="bg-white rounded-lg" onClick={() => bannerInputRef.current?.click()}>
                      <Upload className="w-3.5 h-3.5 mr-1" /> Trocar
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="bg-white rounded-lg text-red-600" onClick={removerBanner}>
                      <X className="w-3.5 h-3.5 mr-1" /> Remover
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  className="mt-1 w-full aspect-[1200/630] rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-green-300 transition-colors flex flex-col items-center justify-center gap-2 text-gray-400"
                >
                  <Upload className="w-7 h-7" />
                  <span className="text-xs font-medium">Clique para enviar o banner</span>
                  <span className="text-[10px]">JPG, PNG ou WebP · será salvo no servidor</span>
                  <span className="text-[10px] font-medium text-gray-500">Proporção recomendada: 1200 × 630 px (1,91:1)</span>
                </button>
              )}
              <p className="text-[11px] text-gray-400 mt-1.5">
                Use uma imagem na proporção <strong>1,91:1</strong> (ex.: 1200 × 630 px). A área acima mostra exatamente como o banner será exibido e enviado no WhatsApp — o que ficar fora dela será cortado.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="inscricoes_abertas" {...register('inscricoes_abertas')} className="rounded" />
              <Label htmlFor="inscricoes_abertas">Inscrições abertas</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-green-700 hover:bg-green-800" disabled={saving}>
              {saving ? 'Salvando...' : evento ? 'Salvar Alterações' : 'Criar Evento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
