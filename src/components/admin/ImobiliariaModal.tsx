import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Upload, X, Building2 } from 'lucide-react'
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
import { useToast } from '@/hooks/use-toast'
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
  onSave: (data: Partial<Imobiliaria>, logoFile: File | null, logoRemoved: boolean) => void
  imobiliaria: Imobiliaria | null
}

const MAX_LOGO_MB = 5

export function ImobiliariaModal({ open, onClose, onSave, imobiliaria }: ImobiliariaModalProps) {
  const { toast } = useToast()
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoRemoved, setLogoRemoved] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    setLogoFile(null)
    setLogoRemoved(false)
    if (imobiliaria) {
      reset({
        nome: imobiliaria.nome,
        cnpj: imobiliaria.cnpj || '',
        telefone: imobiliaria.telefone || '',
        email: imobiliaria.email || '',
        cidade: imobiliaria.cidade,
        uf: imobiliaria.uf,
      })
      setLogoPreview(imobiliaria.logo_url || null)
    } else {
      reset({ nome: '', cnpj: '', telefone: '', email: '', cidade: '', uf: '' })
      setLogoPreview(null)
    }
  }, [imobiliaria, reset, open])

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast({ title: 'Formato inválido', description: 'Envie uma imagem JPG, PNG ou WebP.', variant: 'destructive' })
      return
    }
    if (file.size > MAX_LOGO_MB * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: `Máximo ${MAX_LOGO_MB} MB.`, variant: 'destructive' })
      return
    }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    setLogoRemoved(false)
  }

  const removerLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
    setLogoRemoved(true)
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  const submit = (data: FormData) => {
    onSave(data, logoFile, logoRemoved)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{imobiliaria ? 'Editar Imobiliária' : 'Nova Imobiliária'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          {/* Logo */}
          <div>
            <Label>Logo da imobiliária</Label>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleLogoSelect}
            />
            <div className="mt-1 flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <Building2 className="w-8 h-8 text-gray-300" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => logoInputRef.current?.click()}>
                  <Upload className="w-3.5 h-3.5 mr-1.5" /> {logoPreview ? 'Trocar logo' : 'Enviar logo'}
                </Button>
                {logoPreview && (
                  <Button type="button" size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50 justify-start px-2" onClick={removerLogo}>
                    <X className="w-3.5 h-3.5 mr-1.5" /> Remover
                  </Button>
                )}
                <span className="text-[11px] text-gray-400">JPG, PNG ou WebP · até {MAX_LOGO_MB} MB</span>
              </div>
            </div>
          </div>

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
