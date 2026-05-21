import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, ArrowRight, CheckCircle, Building2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const benefits = [
  'Acesso exclusivo a lançamentos IDIBRA',
  'Treinamentos e workshops gratuitos',
  'Acompanhe participações e histórico em tempo real',
]

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const role = await login(email, password)
    setLoading(false)

    if (role === 'admin')    navigate('/admin/dashboard', { replace: true })
    else if (role === 'corretor') navigate('/portal/home', { replace: true })
    else setError('E-mail ou senha inválidos.')
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left decorative panel ── */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 bg-gradient-to-br from-slate-900 via-green-950 to-slate-900 flex-col justify-between p-10 relative overflow-hidden">
        {/* blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-green-600/15 rounded-full blur-3xl" />
          <div className="absolute bottom-10 -left-10 w-60 h-60 bg-emerald-700/20 rounded-full blur-2xl" />
        </div>
        {/* grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-black text-sm tracking-tight">ID</span>
          </div>
          <span className="text-white font-bold text-lg tracking-wide">IDIBRA</span>
        </div>

        {/* Copy */}
        <div className="relative space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white leading-tight">
              Portal de<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">
                Corretores Parceiros
              </span>
            </h1>
            <p className="text-slate-400 text-sm mt-3 leading-relaxed max-w-xs">
              Gerencie eventos, inscrições e acompanhe o desempenho dos seus corretores em um só lugar.
            </p>
          </div>
          <div className="space-y-3">
            {benefits.map((b) => (
              <div key={b} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                </div>
                <p className="text-slate-300 text-sm">{b}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-slate-600 text-xs">© 2026 IDIBRA — Todos os direitos reservados</p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-sm">ID</span>
            </div>
            <span className="text-gray-900 font-bold text-xl">IDIBRA</span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-7">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shadow-sm">
                <Building2 className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 leading-tight">Acessar plataforma</h2>
                <p className="text-xs text-gray-400">Entre com suas credenciais</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    autoComplete="email"
                    required
                    className="w-full pl-10 pr-4 h-11 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 focus:bg-white transition-all placeholder:text-gray-400"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="w-full pl-10 pr-11 h-11 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 focus:bg-white transition-all placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-xs text-red-600 font-medium">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Entrar <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            {/* Demo hint */}
            <div className="mt-5 p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1.5">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Contas de demonstração</p>
              <div className="space-y-1">
                <p className="text-[11px] text-gray-500">
                  <span className="font-mono font-semibold text-gray-700">admin@idibra.com.br</span>
                  {' '}→ Administrador
                </p>
                <p className="text-[11px] text-gray-500">
                  <span className="font-mono font-semibold text-gray-700">joao.silva@email.com</span>
                  {' '}→ Corretor
                </p>
                <p className="text-[11px] text-gray-400">Senha: qualquer valor</p>
              </div>
            </div>
          </div>

          {/* Cadastro link */}
          <p className="text-center text-xs text-gray-400 mt-5">
            Corretor sem acesso?{' '}
            <button
              onClick={() => navigate('/cadastro')}
              className="text-green-700 font-semibold hover:underline"
            >
              Solicite seu cadastro
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
