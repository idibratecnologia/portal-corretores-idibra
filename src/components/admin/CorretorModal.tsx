import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { mockImobiliarias } from '@/data/mockData'
import type { Corretor } from '@/types'

const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']

const schema = z.object({
  nome: z.string().min(1, 'Nome obrigatório'),
  cpf: z.string().min(11, 'CPF inválido'),
  creci: z.string().min(1, 'CRECI obrigatório'),
  email: z.string().email('E-mail inválido'),
  telefone: z.string().min(10, 'Telefone inválido'),
  whatsapp: z.string().min(10, 'WhatsApp inválido'),
  imobiliaria_id: z.string().optional(),
  cidade: z.string().min(1, 'Cidade obrigatória'),
  uf: z.string().min(2, 'UF obrigatória'),
  instagram: z.string().optional(),
  observacoes_admin: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface CorretorModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: Partial<Corretor>) => void
  corretor: Corretor | null
}

export function CorretorModal({ open, onClose, onSave, corretor }: CorretorModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (corretor) {
      reset({
        nome: corretor.nome,
        cpf: corretor.cpf,
        creci: corretor.creci,
        email: corretor.email,
        telefone: corretor.telefone,
        whatsapp: corretor.whatsapp,
        imobiliaria_id: corretor.imobiliaria_id || '',
        cidade: corretor.cidade,
        uf: corretor.uf,
        instagram: corretor.instagram || '',
        observacoes_admin: corretor.observacoes_admin || '',
      })
    } else {
      reset({})
    }
  }, [corretor, reset])

  const onSubmit = (data: FormData) => onSave(data)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{corretor ? 'Editar Corretor' : 'Novo Corretor'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Nome completo *</Label>
              <Input {...register('nome')} className="mt-1" />
              {errors.nome && <p className="text-xs text-red-500 mt-1">{errors.nome.message}</p>}
            </div>

            <div>
              <Label>CPF *</Label>
              <Input {...register('cpf')} placeholder="00000000000" className="mt-1" />
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
              <Label>Telefone *</Label>
              <Input {...register('telefone')} placeholder="11900000000" className="mt-1" />
              {errors.telefone && <p className="text-xs text-red-500 mt-1">{errors.telefone.message}</p>}
            </div>

            <div>
              <Label>WhatsApp *</Label>
              <Input {...register('whatsapp')} placeholder="11900000000" className="mt-1" />
              {errors.whatsapp && <p className="text-xs text-red-500 mt-1">{errors.whatsapp.message}</p>}
            </div>

            <div className="sm:col-span-2">
              <Label>Imobiliária</Label>
              <select
                {...register('imobiliaria_id')}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione a imobiliária...</option>
                {mockImobiliarias.map((i) => (
                  <option key={i.id} value={i.id}>{i.nome}</option>
                ))}
              </select>
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

            <div className="sm:col-span-2">
              <Label>Instagram</Label>
              <Input {...register('instagram')} placeholder="@usuario" className="mt-1" />
            </div>

            <div className="sm:col-span-2">
              <Label>Observações internas</Label>
              <Textarea {...register('observacoes_admin')} placeholder="Notas internas sobre o corretor..." className="mt-1" rows={2} />
            </div>
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
