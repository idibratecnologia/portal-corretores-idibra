import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, User, Phone, CreditCard, ArrowLeft, CheckCircle, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { mockImobiliarias } from '@/data/mockData'

const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']

const inputCls = 'w-full h-11 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 focus:bg-white transition-all placeholder:text-gray-400'
const iconInputCls = 'w-full pl-10 pr-4 h-11 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 focus:bg-white transition-all placeholder:text-gray-400'

function Field({ icon: Icon, ...props }: any) {
  return (
    <div className="relative">
      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input {...props} className={iconInputCls} />
    </div>
  )
}

export function CadastroPage() {
  const navigate = useNavigate()
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    nome: '', cpf: '', creci: '', email: '', telefone: '', whatsapp: '',
    imobiliaria_id: '', cidade: '', uf: 'SP', password: '', confirmPassword: '',
  })

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) {
      setError('As senhas não conferem.')
      return
    }
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Cadastro enviado!</h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Seu cadastro foi recebido. A equipe IDIBRA irá analisar suas informações e você receberá um e-mail com o resultado.
          </p>
          <Button onClick={() => navigate('/login')} className="w-full bg-green-700 hover:bg-green-800 rounded-xl">
            Voltar ao login
          </Button>
        </div>
      </div>
    )
  }

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

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-sm">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Solicitar cadastro</h1>
              <p className="text-xs text-gray-400">Preencha seus dados de corretor</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <Field icon={User} placeholder="Nome completo *" value={form.nome} onChange={set('nome')} required />

            <div className="grid grid-cols-2 gap-2">
              <input placeholder="CPF *" value={form.cpf} onChange={set('cpf')} required className={inputCls} />
              <Field icon={CreditCard} placeholder="CRECI *" value={form.creci} onChange={set('creci')} required />
            </div>

            <Field icon={Mail} type="email" placeholder="E-mail *" value={form.email} onChange={set('email')} required />

            <div className="grid grid-cols-2 gap-2">
              <Field icon={Phone} placeholder="Telefone *" value={form.telefone} onChange={set('telefone')} required />
              <input placeholder="WhatsApp *" value={form.whatsapp} onChange={set('whatsapp')} required className={inputCls} />
            </div>

            <select value={form.imobiliaria_id} onChange={set('imobiliaria_id')} className={`${inputCls} text-gray-600`}>
              <option value="">Selecione a imobiliária</option>
              {mockImobiliarias.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
            </select>

            <div className="grid grid-cols-3 gap-2">
              <input placeholder="Cidade *" value={form.cidade} onChange={set('cidade')} required className={`col-span-2 ${inputCls}`} />
              <select value={form.uf} onChange={set('uf')} className={inputCls}>
                {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Senha *"
                  value={form.password}
                  onChange={set('password')}
                  required
                  className={iconInputCls}
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Confirmar *"
                  value={form.confirmPassword}
                  onChange={set('confirmPassword')}
                  required
                  className={iconInputCls}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showPwd ? 'Ocultar senhas' : 'Mostrar senhas'}
            </button>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-xs text-red-600 font-medium">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-11 bg-green-700 hover:bg-green-800 rounded-xl font-semibold text-sm mt-1">
              Enviar cadastro
            </Button>
          </form>
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
