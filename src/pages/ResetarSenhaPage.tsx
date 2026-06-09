import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, Eye, EyeOff, CheckCircle, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { resetarSenha } from '@/services/auth'
import { getErrorMessage } from '@/lib/errors'

const inputCls = 'w-full h-11 px-3 pr-10 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 focus:bg-white transition-all'

export function ResetarSenhaPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''

  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({ nova: '', confirma: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.nova.length < 6) { setError('A senha deve ter no mínimo 6 caracteres'); return }
    if (form.nova !== form.confirma) { setError('As senhas não conferem'); return }

    setLoading(true)
    try {
      await resetarSenha(token, form.nova)
      setDone(true)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  // Token ausente
  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Link inválido</h2>
          <p className="text-sm text-gray-500 mb-6">O link de redefinição é inválido ou está incompleto.</p>
          <Button onClick={() => navigate('/esqueci-senha')} className="w-full bg-green-700 hover:bg-green-800 rounded-xl">
            Solicitar novo link
          </Button>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Senha redefinida!</h2>
          <p className="text-sm text-gray-500 mb-6">Você já pode entrar com a nova senha.</p>
          <Button onClick={() => navigate('/login')} className="w-full bg-green-700 hover:bg-green-800 rounded-xl">
            Ir para o login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-green-600 via-emerald-400 to-green-500" />
          <div className="p-7">
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-green-700" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">Criar nova senha</h1>
            <p className="text-sm text-gray-500 mt-1 mb-5">Defina sua nova senha de acesso.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  required
                  value={form.nova}
                  onChange={(e) => setForm((f) => ({ ...f, nova: e.target.value }))}
                  placeholder="Nova senha"
                  className={inputCls}
                  autoFocus
                />
                <button type="button" onClick={() => setShow((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <input
                type={show ? 'text' : 'password'}
                required
                value={form.confirma}
                onChange={(e) => setForm((f) => ({ ...f, confirma: e.target.value }))}
                placeholder="Confirmar nova senha"
                className={inputCls.replace(' pr-10', '')}
              />

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-xs text-red-600 font-medium">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full bg-green-700 hover:bg-green-800 rounded-xl h-11">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Redefinir senha'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
