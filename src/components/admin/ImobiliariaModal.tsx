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
import type { Imobiliaria } from '@/types'

const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']

const schema = z.object({
  nome: z.string().min(1, 'Nome obrigatório'),
  cnpj: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email('E-mail inválido').or(z.literal('')),
  cidade: z.string().min(1, 'Cidade obrigatória'),
  uf: z.string().min(2, 'UF obrigatória'),
})

type FormData = z.infer<typeof schema>

interface ImobiliariaModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: Partial<Imobiliaria>) => void
  imobiliaria: Imobiliaria | null
}

export function ImobiliariaModal({ open, onClose, onSave, imobiliaria }: ImobiliariaModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (imobiliaria) {
      reset({
        nome: imobiliaria.nome,
        cnpj: imobiliaria.cnpj || '',
        telefone: imobiliaria.telefone || '',
        email: imobiliaria.email || '',
        cidade: imobiliaria.cidade,
        uf: imobiliaria.uf,
      })
    } else {
      reset({})
    }
  }, [imobiliaria, reset])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{imobiliaria ? 'Editar Imobiliária' : 'Nova Imobiliária'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input {...register('nome')} className="mt-1" />
            {errors.nome && <p className="text-xs text-red-500 mt-1">{errors.nome.message}</p>}
          </div>
          <div>
            <Label>CNPJ</Label>
            <Input {...register('cnpj')} placeholder="00000000000000" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
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
          </div>
          <div>
            <Label>Telefone</Label>
            <Input {...register('telefone')} className="mt-1" />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input type="email" {...register('email')} className="mt-1" />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="bg-green-700 hover:bg-green-800">
              {imobiliaria ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
