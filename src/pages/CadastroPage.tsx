import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Eye, EyeOff, Lock, Mail, User, Phone, CreditCard,
  ArrowLeft, CheckCircle, Building2, Instagram, MapPin,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fetchImobiliariasPublicas } from '@/services/imobiliarias'
import { cadastrarCorretor } from '@/services/corretores'
import { getErrorMessage } from '@/lib/errors'

const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']

const inputCls     = 'w-full h-11 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 focus:bg-white transition-all placeholder:text-gray-400'
const iconInputCls = 'w-full pl-10 pr-4 h-11 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 focus:bg-white transition-all placeholder:text-gray-400'

// ── Masks ──────────────────────────────────────────────────────────────────
function maskCPF(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10)
    return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
}

function maskCRECI(v: string) {
  // keep alphanumeric, max 15 chars
  return v.replace(/[^a-zA-Z0-9-/]/g, '').slice(0, 15).toUpperCase()
}

/** Idade completa (anos) a partir de uma data "YYYY-MM-DD". */
function calcularIdade(iso: string): number {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return 0
  const hoje = new Date()
  let idade = hoje.getFullYear() - d.getFullYear()
  const m = hoje.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < d.getDate())) idade--
  return idade
}

// ── Field helpers ──────────────────────────────────────────────────────────
function Field({ icon: Icon, error, ...props }: any) {
  return (
    <div>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input {...props} className={`${iconInputCls} ${error ? 'border-red-300 focus:border-red-400 focus:ring-red-500/20' : ''}`} />
      </div>
      {error && <p className="text-xs text-red-500 mt-1 pl-1">{error}</p>}
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────
export function CadastroPage() {
  const navigate = useNavigate()
  const [showPwd, setShowPwd]     = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [success, setSuccess]     = useState(false)

  const [imobiliarias, setImobiliarias] = useState<{ id: string; nome: string }[]>([])

  useEffect(() => {
    fetchImobiliariasPublicas().then(setImobiliarias).catch(() => {})
  }, [])

  const [form, setForm] = useState({
    nome: '', cpf: '', creci: '', email: '',
    whatsapp: '', instagram: '',
    imobiliaria_id: '', autonomo: false, cidade: '', uf: 'CE',
    data_nascimento: '',
    password: '', confirmPassword: '',
    whatsapp_opt_in: true,   // consentimento LGPD para receber notificações
    aceite_idade: false,     // declaração de maioridade
  })

  const set = (key: keyof typeof form, mask?: (v: string) => string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const val = mask ? mask(e.target.value) : e.target.value
      setForm((prev) => ({ ...prev, [key]: val }))
      if (fieldErrors[key]) setFieldErrors((prev) => { const n = { ...prev }; delete n[key]; return n })
    }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!form.nome.trim())                     errs.nome      = 'Nome obrigatório'
    if (form.cpf.replace(/\D/g,'').length < 11) errs.cpf      = 'CPF inválido'
    if (!form.creci.trim())                     errs.creci     = 'CRECI obrigatório'
    if (!form.email.includes('@'))              errs.email     = 'E-mail inválido'
    if (form.whatsapp.replace(/\D/g,'').length < 10) errs.whatsapp = 'WhatsApp inválido'
    if (!form.cidade.trim())                    errs.cidade    = 'Cidade obrigatória'
    if (!form.data_nascimento) {
      errs.data_nascimento = 'Data de nascimento obrigatória'
    } else if (calcularIdade(form.data_nascimento) < 18) {
      errs.data_nascimento = 'É necessário ter 18 anos ou mais'
    }
    if (form.password.length < 8)               errs.password  = 'Mínimo 8 caracteres'
    if (form.password !== form.confirmPassword)  errs.confirmPassword = 'Senhas não conferem'
    if (!form.aceite_idade)                      errs.aceite_idade = 'Confirme a declaração para continuar'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!validate()) return

    setIsLoading(true)
    try {
      await cadastrarCorretor({
        nome:     form.nome,
        cpf:      form.cpf,
        creci:    form.creci,
        email:    form.email,
        senha:    form.password,
        whatsapp: form.whatsapp,
        instagram: form.instagram || undefined,
        imobiliaria_id: form.imobiliaria_id || undefined,
        cidade:   form.cidade,
        uf:       form.uf,
        data_nascimento: form.data_nascimento,
        whatsapp_opt_in: form.whatsapp_opt_in,
      })
      setSuccess(true)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Cadastro concluído!</h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Sua conta já está ativa. Faça login com seu e-mail e senha para acessar
            os eventos e lançamentos da IDIBRA.
          </p>
          <Button onClick={() => navigate('/')} className="w-full bg-green-700 hover:bg-green-800 rounded-xl">
            Entrar agora
          </Button>
        </div>
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/login')}
            className="p-2 rounded-xl hover:bg-gray-200 transition-colors text-gray-500"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white font-black text-xs">ID</span>
            </div>
            <span className="font-bold text-gray-900">IDIBRA</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-green-600 via-emerald-400 to-green-500" />
          <div className="p-7">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-sm">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">Realize seu cadastro</h1>
                <p className="text-xs text-gray-400">Preencha seus dados de corretor</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3" noValidate>

              {/* Nome */}
              <Field
                icon={User}
                placeholder="Nome completo *"
                value={form.nome}
                onChange={set('nome')}
                error={fieldErrors.nome}
              />

              {/* CPF + CRECI */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="relative">
                    <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      placeholder="CPF *"
                      value={form.cpf}
                      onChange={set('cpf', maskCPF)}
                      className={`${iconInputCls} ${fieldErrors.cpf ? 'border-red-300' : ''}`}
                    />
                  </div>
                  {fieldErrors.cpf && <p className="text-xs text-red-500 mt-1 pl-1">{fieldErrors.cpf}</p>}
                </div>
                <div>
                  <input
                    placeholder="CRECI *"
                    value={form.creci}
                    onChange={set('creci', maskCRECI)}
                    className={`${inputCls} ${fieldErrors.creci ? 'border-red-300' : ''}`}
                  />
                  {fieldErrors.creci && <p className="text-xs text-red-500 mt-1 pl-1">{fieldErrors.creci}</p>}
                </div>
              </div>

              {/* E-mail */}
              <Field
                icon={Mail}
                type="email"
                placeholder="E-mail *"
                value={form.email}
                onChange={set('email')}
                error={fieldErrors.email}
              />

              {/* WhatsApp */}
              <div>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    placeholder="WhatsApp *"
                    value={form.whatsapp}
                    onChange={set('whatsapp', maskPhone)}
                    className={`${iconInputCls} ${fieldErrors.whatsapp ? 'border-red-300' : ''}`}
                  />
                </div>
                {fieldErrors.whatsapp && <p className="text-xs text-red-500 mt-1 pl-1">{fieldErrors.whatsapp}</p>}
              </div>

              {/* Instagram (opcional) */}
              <Field
                icon={Instagram}
                placeholder="Instagram (opcional)"
                value={form.instagram}
                onChange={set('instagram')}
              />

              {/* Imobiliária + autônomo */}
              <div>
                <select
                  value={form.imobiliaria_id}
                  onChange={set('imobiliaria_id')}
                  disabled={form.autonomo}
                  className={`${inputCls} text-gray-600 disabled:opacity-50`}
                >
                  <option value="">{form.autonomo ? 'Autônomo — sem imobiliária' : 'Imobiliária (opcional)'}</option>
                  {imobiliarias.map((i) => (
                    <option key={i.id} value={i.id}>{i.nome}</option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-xs text-gray-600 mt-2 pl-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.autonomo}
                    onChange={(e) => setForm((prev) => ({ ...prev, autonomo: e.target.checked, imobiliaria_id: e.target.checked ? '' : prev.imobiliaria_id }))}
                    className="w-4 h-4 rounded accent-green-600 flex-shrink-0"
                  />
                  Sou autônomo (sem imobiliária)
                </label>
              </div>

              {/* Cidade + UF */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      placeholder="Cidade *"
                      value={form.cidade}
                      onChange={set('cidade')}
                      className={`${iconInputCls} ${fieldErrors.cidade ? 'border-red-300' : ''}`}
                    />
                  </div>
                  {fieldErrors.cidade && <p className="text-xs text-red-500 mt-1 pl-1">{fieldErrors.cidade}</p>}
                </div>
                <select value={form.uf} onChange={set('uf')} className={inputCls}>
                  {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>

              {/* Data de nascimento */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 pl-1">Data de nascimento *</label>
                <input
                  type="date"
                  value={form.data_nascimento}
                  onChange={set('data_nascimento')}
                  max={new Date().toISOString().slice(0, 10)}
                  className={`${inputCls} ${fieldErrors.data_nascimento ? 'border-red-300' : ''}`}
                />
                {fieldErrors.data_nascimento && <p className="text-xs text-red-500 mt-1 pl-1">{fieldErrors.data_nascimento}</p>}
              </div>

              {/* Senha */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPwd ? 'text' : 'password'}
                      placeholder="Senha *"
                      value={form.password}
                      onChange={set('password')}
                      className={`${iconInputCls} ${fieldErrors.password ? 'border-red-300' : ''}`}
                    />
                  </div>
                  {fieldErrors.password && <p className="text-xs text-red-500 mt-1 pl-1">{fieldErrors.password}</p>}
                </div>
                <div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPwd ? 'text' : 'password'}
                      placeholder="Confirmar *"
                      value={form.confirmPassword}
                      onChange={set('confirmPassword')}
                      className={`${iconInputCls} ${fieldErrors.confirmPassword ? 'border-red-300' : ''}`}
                    />
                  </div>
                  {fieldErrors.confirmPassword && <p className="text-xs text-red-500 mt-1 pl-1">{fieldErrors.confirmPassword}</p>}
                </div>
              </div>

              {/* Password strength hint */}
              {form.password.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        form.password.length >= (i + 1) * 3
                          ? form.password.length < 8 ? 'bg-red-400' : 'bg-green-500'
                          : 'bg-gray-100'
                      }`}
                    />
                  ))}
                  <span className="text-[10px] text-gray-400 ml-1 whitespace-nowrap">
                    {form.password.length < 4 ? 'Fraca' : form.password.length < 8 ? 'Regular' : 'Forte'}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPwd ? 'Ocultar senhas' : 'Mostrar senhas'}
              </button>

              {/* Consentimento LGPD para WhatsApp */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-gray-200 bg-gray-50/60 cursor-pointer hover:bg-gray-100/60 transition-colors">
                <input
                  type="checkbox"
                  checked={form.whatsapp_opt_in}
                  onChange={(e) => setForm((prev) => ({ ...prev, whatsapp_opt_in: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 rounded accent-green-600 flex-shrink-0"
                />
                <span className="text-[11px] text-gray-600 leading-snug">
                  Aceito receber avisos sobre eventos, inscrições e lembretes pelo <strong>WhatsApp</strong>.
                  Você pode revogar o consentimento a qualquer momento no seu perfil.
                </span>
              </label>

              {/* Declaração de maioridade */}
              <div>
                <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${fieldErrors.aceite_idade ? 'border-red-300 bg-red-50/40' : 'border-gray-200 bg-gray-50/60 hover:bg-gray-100/60'}`}>
                  <input
                    type="checkbox"
                    checked={form.aceite_idade}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, aceite_idade: e.target.checked }))
                      if (fieldErrors.aceite_idade) setFieldErrors((prev) => { const n = { ...prev }; delete n.aceite_idade; return n })
                    }}
                    className="mt-0.5 w-4 h-4 rounded accent-green-600 flex-shrink-0"
                  />
                  <span className="text-[11px] text-gray-600 leading-snug">
                    Declaro que informei minha <strong>data de nascimento</strong> corretamente e que tenho <strong>18 anos ou mais</strong>, condição necessária para o cadastro.
                  </span>
                </label>
                {fieldErrors.aceite_idade && <p className="text-xs text-red-500 mt-1 pl-1">{fieldErrors.aceite_idade}</p>}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-xs text-red-600 font-medium flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-gradient-to-r from-green-700 to-emerald-600 hover:from-green-800 hover:to-emerald-700 disabled:opacity-60 rounded-xl font-semibold text-sm shadow-md shadow-green-500/20 mt-1"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Enviar cadastro'
                )}
              </Button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Já tem acesso?{' '}
          <button onClick={() => navigate('/login')} className="text-green-700 font-semibold hover:underline">
            Fazer login
          </button>
        </p>
      </div>
    </div>
  )
}
