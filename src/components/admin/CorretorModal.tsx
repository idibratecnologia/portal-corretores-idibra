import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Camera, X } from 'lucide-react'
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
import { fetchImobiliarias } from '@/services/imobiliarias'
import type { Corretor, Imobiliaria } from '@/types'

const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']

function maskCPF(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10)
    return d
      .replace(/(\d{2})(\d{0,4})/, '($1) $2')
      .replace(/(\(\d{2}\) \d{4})(\d+)/, '$1-$2')
  return d
    .replace(/(\d{2})(\d{5})/, '($1) $2')
    .replace(/(\(\d{2}\) \d{5})(\d+)/, '$1-$2')
}

const schema = z.object({
  nome: z.string().min(1, 'Nome obrigatório'),
  cpf: z.string().min(14, 'CPF inválido'),
  creci: z.string().min(1, 'CRECI obrigatório'),
  email: z.string().email('E-mail inválido'),
  whatsapp: z.string().min(14, 'WhatsApp inválido'),
  imobiliaria_id: z.string().optional(),
  autonomo: z.boolean().optional(),
  cidade: z.string().min(1, 'Cidade obrigatória'),
  uf: z.string().min(2, 'UF obrigatória'),
  instagram: z.string().optional(),
  data_nascimento: z.string().optional(),
  observacoes_admin: z.string().optional(),
  whatsapp_opt_in: z.boolean().optional(),
}).refine((d) => d.autonomo || !!d.imobiliaria_id, {
  message: 'Selecione uma imobiliária (ou marque Autônomo)',
  path: ['imobiliaria_id'],
})

type FormData = z.infer<typeof schema>

interface CorretorModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: Partial<Corretor>, foto?: File) => void
  corretor: Corretor | null
}

export function CorretorModal({ open, onClose, onSave, corretor }: CorretorModalProps) {
  const [imobiliarias, setImobiliarias] = useState<Imobiliaria[]>([])
  const [foto, setFoto] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)

  useEffect(() => {
    if (open) fetchImobiliarias().then(setImobiliarias).catch(() => {})
  }, [open])

  // reinicia a foto ao abrir/trocar de corretor (mostra a existente na edição)
  useEffect(() => {
    setFoto(null)
    setFotoPreview(corretor?.foto_url ?? null)
  }, [corretor, open])

  const onFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) return   // 5 MB máx.
    setFoto(f)
    setFotoPreview(URL.createObjectURL(f))
  }

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })
  const autonomo = watch('autonomo')

  useEffect(() => {
    if (corretor) {
      reset({
        nome: corretor.nome,
        cpf: maskCPF(corretor.cpf || ''),
        creci: corretor.creci,
        email: corretor.email,
        whatsapp: maskPhone(corretor.whatsapp || ''),
        imobiliaria_id: corretor.imobiliaria_id || '',
        autonomo: !corretor.imobiliaria_id,
        cidade: corretor.cidade,
        uf: corretor.uf,
        instagram: corretor.instagram || '',
        data_nascimento: corretor.data_nascimento ? corretor.data_nascimento.slice(0, 10) : '',
        observacoes_admin: corretor.observacoes_admin || '',
        whatsapp_opt_in: corretor.whatsapp_opt_in ?? false,
      })
    } else {
      reset({ whatsapp_opt_in: true, uf: 'CE', autonomo: false })   // novo corretor já nasce apto a receber (admin pode desmarcar)
    }
  }, [corretor, reset])

  const onSubmit = (data: FormData) => {
    const { autonomo: _autonomo, ...rest } = data
    onSave({
      ...rest,
      imobiliaria_id: data.autonomo ? '' : (data.imobiliaria_id || ''),
      data_nascimento: data.data_nascimento || null,
    }, foto ?? undefined)
  }

  function maskedField(
    field: 'cpf' | 'whatsapp',
    mask: (v: string) => string
  ) {
    const { onChange, ...rest } = register(field)
    return {
      ...rest,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        e.target.value = mask(e.target.value)
        return onChange(e)
      },
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{corretor ? 'Editar Corretor' : 'Novo Corretor'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Foto de perfil */}
            <div className="sm:col-span-2 flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0 border border-gray-200">
                {fotoPreview
                  ? <img src={fotoPreview} alt="Foto do corretor" className="w-full h-full object-cover" />
                  : <Camera className="w-6 h-6 text-gray-300" />}
              </div>
              <div>
                <Label>Foto de perfil</Label>
                <div className="flex items-center gap-2 mt-1">
                  <label className="cursor-pointer text-sm text-green-700 hover:text-green-800 font-medium inline-flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5">
                    <Camera className="w-4 h-4" /> {fotoPreview ? 'Trocar foto' : 'Escolher foto'}
                    <input type="file" accept="image/*" onChange={onFotoChange} className="hidden" />
                  </label>
                  {foto && (
                    <button type="button" onClick={() => { setFoto(null); setFotoPreview(corretor?.foto_url ?? null) }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Remover">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">JPG/PNG até 5 MB (opcional).</p>
              </div>
            </div>

            <div className="sm:col-span-2">
              <Label>Nome completo *</Label>
              <Input {...register('nome')} className="mt-1" />
              {errors.nome && <p className="text-xs text-red-500 mt-1">{errors.nome.message}</p>}
            </div>

            <div>
              <Label>CPF *</Label>
              <Input {...maskedField('cpf', maskCPF)} placeholder="000.000.000-00" className="mt-1" />
              {errors.cpf && <p className="text-xs text-red-500 mt-1">{errors.cpf.message}</p>}
            </div>

            <div>
              <Label>CRECI *</Label>
              <Input {...register('creci')} placeholder="SP-000000" className="mt-1" />
              {errors.creci && <p className="text-xs text-red-500 mt-1">{errors.creci.message}</p>}
            </div>

            <div className="sm:col-span-2">
              <Label>E-mail *</Label>
              <Input type="email" {...register('email')} className="mt-1" />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <Label>WhatsApp *</Label>
              <Input {...maskedField('whatsapp', maskPhone)} placeholder="(00) 00000-0000" className="mt-1" />
              {errors.whatsapp && <p className="text-xs text-red-500 mt-1">{errors.whatsapp.message}</p>}
            </div>

            <div className="sm:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <Label>Imobiliária {autonomo ? '' : '*'}</Label>
                <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                  <input type="checkbox" {...register('autonomo')} className="w-4 h-4 rounded accent-green-600 flex-shrink-0" />
                  Autônomo (sem imobiliária)
                </label>
              </div>
              <select
                {...register('imobiliaria_id')}
                disabled={autonomo}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:bg-gray-50"
              >
                <option value="">{autonomo ? 'Autônomo — sem imobiliária' : 'Selecione a imobiliária...'}</option>
                {imobiliarias.map((i) => (
                  <option key={i.id} value={i.id}>{i.nome}</option>
                ))}
              </select>
              {!autonomo && errors.imobiliaria_id && <p className="text-xs text-red-500 mt-1">{errors.imobiliaria_id.message}</p>}
            </div>

            <div>
              <Label>Cidade *</Label>
              <Input {...register('cidade')} className="mt-1" />
              {errors.cidade && <p className="text-xs text-red-500 mt-1">{errors.cidade.message}</p>}
            </div>

            <div>
              <Label>UF *</Label>
              <select
                {...register('uf')}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">UF</option>
                {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
              </select>
              {errors.uf && <p className="text-xs text-red-500 mt-1">{errors.uf.message}</p>}
            </div>

            <div>
              <Label>Instagram</Label>
              <Input {...register('instagram')} placeholder="@usuario" className="mt-1" />
            </div>

            <div>
              <Label>Data de nascimento</Label>
              <Input type="date" {...register('data_nascimento')} className="mt-1" />
            </div>

            <div className="sm:col-span-2">
              <Label>Observações internas</Label>
              <Textarea {...register('observacoes_admin')} placeholder="Notas internas sobre o corretor..." className="mt-1" rows={2} />
            </div>

            <label className="sm:col-span-2 flex items-start gap-2.5 p-3 rounded-xl border border-gray-100 bg-gray-50/60 cursor-pointer hover:bg-gray-100/60 transition-colors">
              <input type="checkbox" {...register('whatsapp_opt_in')} className="mt-0.5 w-4 h-4 rounded accent-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-800">Receber notificações por WhatsApp</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Consentimento (LGPD) para avisos de eventos, inscrições e lembretes. Sem isso, o corretor não recebe mensagens.
                </p>
              </div>
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="bg-green-700 hover:bg-green-800">
              {corretor ? 'Salvar Alterações' : 'Cadastrar Corretor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
