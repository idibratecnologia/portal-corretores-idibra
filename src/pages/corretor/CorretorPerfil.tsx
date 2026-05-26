import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Mail, Phone, MessageCircle, Instagram, MapPin, Building2, Save, Camera, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useAuth } from '@/contexts/AuthContext'
import { mockImobiliarias } from '@/data/mockData'
import { useToast } from '@/hooks/use-toast'

function maskCPF(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
}

const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']

const schema = z.object({
  nome: z.string().min(1, 'Nome obrigatório'),
  cpf: z.string().min(14, 'CPF inválido'),
  creci: z.string().min(1, 'CRECI obrigatório'),
  telefone: z.string().min(14, 'Telefone inválido'),
  whatsapp: z.string().min(14, 'WhatsApp inválido'),
  imobiliaria_id: z.string().optional(),
  cidade: z.string().min(1, 'Cidade obrigatória'),
  uf: z.string().min(2, 'UF obrigatória'),
  instagram: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function CorretorPerfil() {
  const { corretor } = useAuth()
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: corretor?.nome || '',
      cpf: maskCPF(corretor?.cpf || ''),
      creci: corretor?.creci || '',
      telefone: maskPhone(corretor?.telefone || ''),
      whatsapp: maskPhone(corretor?.whatsapp || ''),
      imobiliaria_id: corretor?.imobiliaria_id || '',
      cidade: corretor?.cidade || '',
      uf: corretor?.uf || 'SP',
      instagram: corretor?.instagram || '',
    },
  })

  function maskedField(field: 'cpf' | 'telefone' | 'whatsapp', mask: (v: string) => string) {
    const { onChange, ...rest } = register(field)
    return {
      ...rest,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        e.target.value = mask(e.target.value)
        return onChange(e)
      },
    }
  }

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError]   = useState('')

  const onSubmit = async (_data: FormData) => {
    setIsSubmitting(true)
    setSubmitError('')
    try {
      // Swap with: await supabase.from('corretores').update({ ... }).eq('id', corretor?.id)
      await new Promise((r) => setTimeout(r, 600))
      toast({ title: 'Perfil atualizado!', description: 'Suas informações foram salvas com sucesso.' })
      setEditing(false)
    } catch {
      setSubmitError('Erro ao salvar. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const imobiliaria = mockImobiliarias.find((i) => i.id === corretor?.imobiliaria_id)

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie suas informações profissionais</p>
        </div>
        {!editing && (
          <Button
            onClick={() => setEditing(true)}
            variant="outline"
            className="border-green-200 text-green-700 hover:bg-green-50"
          >
            Editar perfil
          </Button>
        )}
      </div>

      {/* Avatar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-3xl font-bold">
              {corretor?.nome?.charAt(0) || 'C'}
            </div>
            {editing && (
              <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-700 rounded-full flex items-center justify-center text-white shadow-md hover:bg-green-800">
                <Camera className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{corretor?.nome}</h2>
            <p className="text-gray-500 text-sm">{corretor?.creci}</p>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={corretor?.status || 'pendente'} />
            </div>
          </div>
        </div>
      </div>

      {/* Form / Info */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        {editing ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <Input {...register('creci')} className="mt-1" />
                {errors.creci && <p className="text-xs text-red-500 mt-1">{errors.creci.message}</p>}
              </div>

              <div>
                <Label>Telefone *</Label>
                <Input {...maskedField('telefone', maskPhone)} placeholder="(00) 00000-0000" className="mt-1" />
                {errors.telefone && <p className="text-xs text-red-500 mt-1">{errors.telefone.message}</p>}
              </div>

              <div>
                <Label>WhatsApp *</Label>
                <Input {...maskedField('whatsapp', maskPhone)} placeholder="(00) 00000-0000" className="mt-1" />
                {errors.whatsapp && <p className="text-xs text-red-500 mt-1">{errors.whatsapp.message}</p>}
              </div>

              <div className="sm:col-span-2">
                <Label>Imobiliária</Label>
                <select
                  {...register('imobiliaria_id')}
                  className="mt-1 flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 text-gray-700"
                >
                  <option value="">Selecione...</option>
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
                  className="mt-1 flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 text-gray-700"
                >
                  {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>

              <div className="sm:col-span-2">
                <Label>Instagram</Label>
                <Input {...register('instagram')} placeholder="@usuario" className="mt-1" />
              </div>
            </div>

            {submitError && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-xs text-red-600 font-medium flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                {submitError}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditing(false)} className="flex-1" disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1 bg-green-700 hover:bg-green-800 disabled:opacity-60">
                {isSubmitting
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><Save className="w-4 h-4 mr-2" /> Salvar</>
                }
              </Button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { icon: User, label: 'Nome', value: corretor?.nome },
              { icon: User, label: 'CPF', value: corretor?.cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') },
              { icon: User, label: 'CRECI', value: corretor?.creci },
              { icon: Mail, label: 'E-mail', value: corretor?.email },
              { icon: Phone, label: 'Telefone', value: corretor?.telefone },
              { icon: MessageCircle, label: 'WhatsApp', value: corretor?.whatsapp },
              { icon: Instagram, label: 'Instagram', value: corretor?.instagram || '—' },
              { icon: Building2, label: 'Imobiliária', value: imobiliaria?.nome || '—' },
              { icon: MapPin, label: 'Cidade/UF', value: `${corretor?.cidade}/${corretor?.uf}` },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <item.icon className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 font-medium">{item.label}</p>
                  <p className="text-sm text-gray-900 mt-0.5">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
