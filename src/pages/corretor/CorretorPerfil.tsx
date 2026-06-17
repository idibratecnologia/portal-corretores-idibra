import React, { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Mail, Phone, MessageCircle, Instagram, MapPin, Building2, Save, Camera, Loader2, ImageOff, Lock, Cake } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { TrocarSenhaModal } from '@/components/shared/TrocarSenhaModal'
import { ImageCropModal } from '@/components/shared/ImageCropModal'
import { ImageViewer } from '@/components/shared/ImageViewer'
import { useAuth } from '@/contexts/AuthContext'
import { fetchImobiliarias } from '@/services/imobiliarias'
import type { Imobiliaria } from '@/types'
import { useToast } from '@/hooks/use-toast'
import { atualizarMeuPerfil, uploadFotoCorretor, atualizarMeuOptIn } from '@/services/corretores'
import { getErrorMessage } from '@/lib/errors'

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
  data_nascimento: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function CorretorPerfil() {
  const { corretor } = useAuth()
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [photoUrl, setPhotoUrl]           = useState<string | null>(corretor?.foto_url ?? null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [imobiliarias, setImobiliarias] = useState<Imobiliaria[]>([])
  const [senhaModalOpen, setSenhaModalOpen] = useState(false)
  const [optIn, setOptIn] = useState<boolean>(corretor?.whatsapp_opt_in ?? false)
  const [savingOptIn, setSavingOptIn] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchImobiliarias().then(setImobiliarias).catch(() => {})
  }, [])

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
      data_nascimento: corretor?.data_nascimento ? corretor.data_nascimento.slice(0, 10) : '',
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

  // Seleciona o arquivo → abre o editor de recorte (não envia ainda)
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !corretor?.id) return

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Formato inválido', description: 'Selecione uma imagem (JPG, PNG ou WebP).', variant: 'destructive' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'A foto deve ter no máximo 5 MB.', variant: 'destructive' })
      return
    }

    setCropSrc(URL.createObjectURL(file))
    // Limpa o input para permitir selecionar o mesmo arquivo novamente
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  // Confirma o recorte → envia a imagem já posicionada/zoom aplicada
  const handleCropConfirm = async (blob: Blob) => {
    if (!corretor?.id) return
    const file = new File([blob], 'foto.webp', { type: 'image/webp' })

    setPhotoUrl(URL.createObjectURL(blob)) // preview imediato
    setUploadingPhoto(true)
    try {
      const { foto_url } = await uploadFotoCorretor(corretor.id, file)
      setPhotoUrl(foto_url)
      toast({ title: 'Foto atualizada!', description: 'Sua foto de perfil foi salva.' })
    } catch (err) {
      setPhotoUrl(corretor.foto_url ?? null)
      toast({ title: 'Erro no upload', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setUploadingPhoto(false)
      setCropSrc(null)
    }
  }

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    setSubmitError('')
    try {
      if (corretor?.id) {
        await atualizarMeuPerfil({
          nome:           data.nome,
          cpf:            data.cpf,
          creci:          data.creci,
          telefone:       data.telefone,
          whatsapp:       data.whatsapp,
          imobiliaria_id: data.imobiliaria_id || undefined,
          cidade:         data.cidade,
          uf:             data.uf,
          instagram:      data.instagram,
          data_nascimento: data.data_nascimento || null,
        })
      }
      toast({ title: 'Perfil atualizado!', description: 'Suas informações foram salvas com sucesso.' })
      setEditing(false)
    } catch (err) {
      setSubmitError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleOptIn = async () => {
    const novo = !optIn
    setOptIn(novo)            // otimista
    setSavingOptIn(true)
    try {
      await atualizarMeuOptIn(novo)
      toast({
        title: novo ? 'Notificações ativadas' : 'Notificações desativadas',
        description: novo
          ? 'Você passará a receber avisos de eventos e lembretes no WhatsApp.'
          : 'Você não receberá mais mensagens no WhatsApp.',
      })
    } catch (err) {
      setOptIn(!novo)         // reverte em caso de erro
      toast({ title: 'Erro ao salvar', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setSavingOptIn(false)
    }
  }

  const imobiliaria = corretor?.imobiliaria ?? imobiliarias.find((i) => i.id === corretor?.imobiliaria_id)

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie suas informações profissionais</p>
        </div>
        {!editing && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setSenhaModalOpen(true)}
              variant="outline"
              className="border-gray-200 text-gray-600 hover:bg-gray-50 gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" /> Trocar senha
            </Button>
            <Button
              onClick={() => setEditing(true)}
              variant="outline"
              className="border-green-200 text-green-700 hover:bg-green-50"
            >
              Editar perfil
            </Button>
          </div>
        )}
      </div>

      {/* Avatar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-5">
          <div className="relative flex-shrink-0">
            {/* Foto ou iniciais — enquadrada como logo, preservando a proporção */}
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white border border-gray-100 flex items-center justify-center text-green-700 text-3xl font-bold ring-2 ring-white shadow-sm">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt="Foto de perfil"
                  className="w-full h-full object-contain cursor-zoom-in"
                  onClick={() => setViewerOpen(true)}
                  onError={() => setPhotoUrl(null)}
                />
              ) : (
                <span className="w-full h-full bg-green-100 flex items-center justify-center">
                  {corretor?.nome?.charAt(0) || 'C'}
                </span>
              )}
            </div>

            {/* Spinner durante upload */}
            {uploadingPhoto && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              </div>
            )}

            {/* Botão câmera (modo edição) */}
            {editing && !uploadingPhoto && (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-700 rounded-full flex items-center justify-center text-white shadow-md hover:bg-green-800 transition-colors"
                title="Alterar foto"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Input file oculto */}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoSelect}
            />
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
                  {imobiliarias.map((i) => (
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

              <div>
                <Label>Instagram</Label>
                <Input {...register('instagram')} placeholder="@usuario" className="mt-1" />
              </div>

              <div>
                <Label>Data de nascimento</Label>
                <Input type="date" {...register('data_nascimento')} className="mt-1" />
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
              { icon: User,          label: 'Nome',       value: corretor?.nome },
              { icon: User,          label: 'CPF',        value: corretor?.cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') },
              { icon: User,          label: 'CRECI',      value: corretor?.creci },
              { icon: Mail,          label: 'E-mail',     value: corretor?.email,    href: corretor?.email ? `mailto:${corretor.email}` : undefined },
              { icon: Phone,         label: 'Telefone',   value: corretor?.telefone, href: corretor?.telefone ? `tel:+55${corretor.telefone.replace(/\D/g, '')}` : undefined },
              { icon: MessageCircle, label: 'WhatsApp',   value: corretor?.whatsapp, href: corretor?.whatsapp ? `https://wa.me/55${corretor.whatsapp.replace(/\D/g, '')}` : undefined, external: true },
              { icon: Instagram,     label: 'Instagram',  value: corretor?.instagram || '—' },
              { icon: Cake,          label: 'Aniversário', value: corretor?.data_nascimento ? new Date(corretor.data_nascimento).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit' }) : '—' },
              { icon: Building2,     label: 'Imobiliária',value: imobiliaria?.nome || '—' },
              { icon: MapPin,        label: 'Cidade/UF',  value: `${corretor?.cidade}/${corretor?.uf}` },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <item.icon className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 font-medium">{item.label}</p>
                  {item.href ? (
                    <a
                      href={item.href}
                      target={item.external ? '_blank' : undefined}
                      rel={item.external ? 'noreferrer' : undefined}
                      className="text-sm text-gray-900 mt-0.5 hover:text-green-700 hover:underline transition-colors"
                    >
                      {item.value}
                    </a>
                  ) : (
                    <p className="text-sm text-gray-900 mt-0.5">{item.value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notificações por WhatsApp (consentimento LGPD) */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Notificações por WhatsApp</p>
              <p className="text-xs text-gray-500 mt-0.5 max-w-md">
                Receba avisos de novos eventos, confirmação de inscrição (com QR Code) e
                lembretes. Você pode ativar ou desativar quando quiser.
              </p>
            </div>
          </div>

          {/* Switch */}
          <button
            type="button"
            role="switch"
            aria-checked={optIn}
            onClick={handleToggleOptIn}
            disabled={savingOptIn}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
              optIn ? 'bg-green-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                optIn ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        <p className={`text-xs font-medium mt-3 ${optIn ? 'text-green-600' : 'text-gray-400'}`}>
          {savingOptIn ? 'Salvando…' : optIn ? '✓ Notificações ativadas' : 'Notificações desativadas'}
        </p>
      </div>

      <TrocarSenhaModal open={senhaModalOpen} onClose={() => setSenhaModalOpen(false)} />

      <ImageCropModal
        open={!!cropSrc}
        imageSrc={cropSrc}
        aspect={1}
        cropShape="round"
        title="Ajustar foto de perfil"
        onCancel={() => setCropSrc(null)}
        onConfirm={handleCropConfirm}
      />

      {photoUrl && <ImageViewer src={photoUrl} alt={corretor?.nome} open={viewerOpen} onClose={() => setViewerOpen(false)} />}
    </div>
  )
}
