import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { esqueciSenha } from '@/services/auth'

const inputCls = 'w-full h-11 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 focus:bg-white transition-all'

export function EsqueciSenhaPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await esqueciSenha(email)
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Verifique seu WhatsApp</h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.
            O link é válido por 1 hora.
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
      <div className="w-full max-w-sm">
        <button onClick={() => navigate('/login')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Voltar ao login
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-green-600 via-emerald-400 to-green-500" />
          <div className="p-7">
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-green-700" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">Esqueceu a senha?</h1>
            <p className="text-sm text-gray-500 mt-1 mb-5">
              Informe seu e-mail e enviaremos um link para redefinir sua senha.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className={inputCls}
                autoFocus
              />
              <Button type="submit" disabled={loading} className="w-full bg-green-700 hover:bg-green-800 rounded-xl h-11">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar link de redefinição'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
