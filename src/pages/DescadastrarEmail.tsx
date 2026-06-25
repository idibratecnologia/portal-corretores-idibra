import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Loader2, MailX, MailCheck, AlertCircle } from 'lucide-react'
import idibraLogo from '@/assets/idibra_logo_preta.png'
import { fetchPreferenciaEmail, setPreferenciaEmail, type PreferenciaEmail } from '@/services/comunicacoes'
import { getErrorMessage } from '@/lib/errors'

export function DescadastrarEmail() {
  const [params] = useSearchParams()
  const c = params.get('c') ?? ''
  const t = params.get('t') ?? ''

  const [pref, setPref] = useState<PreferenciaEmail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!c || !t) { setErro('Link inválido.'); setLoading(false); return }
    fetchPreferenciaEmail(c, t)
      .then(setPref)
      .catch((e) => setErro(getErrorMessage(e)))
      .finally(() => setLoading(false))
  }, [c, t])

  const alterar = async (optIn: boolean) => {
    setSaving(true)
    try {
      const r = await setPreferenciaEmail(c, t, optIn)
      setPref((p) => (p ? { ...p, email_opt_in: r.email_opt_in } : p))
    } catch (e) {
      setErro(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-green-50 flex flex-col items-center justify-center p-4">
      <img src={idibraLogo} alt="IDIBRA" className="h-10 w-auto object-contain mb-6" />
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-7 text-center">
        {loading ? (
          <div className="py-10 flex justify-center"><Loader2 className="w-7 h-7 text-green-600 animate-spin" /></div>
        ) : erro ? (
          <>
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="font-semibold text-gray-800">Não foi possível abrir</p>
            <p className="text-gray-400 text-sm mt-1">{erro}</p>
          </>
        ) : pref?.email_opt_in ? (
          <>
            <MailX className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h1 className="text-lg font-bold text-gray-900">Descadastrar e-mails</h1>
            <p className="text-gray-500 text-sm mt-1">Olá, {pref.nome}. Você deixará de receber e-mails de divulgação da IDIBRA em <strong>{pref.email}</strong>.</p>
            <p className="text-gray-400 text-xs mt-2">Comunicações essenciais (ex.: certificado, redefinição de senha) continuam sendo enviadas.</p>
            <button onClick={() => alterar(false)} disabled={saving} className="mt-5 w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium inline-flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <MailX className="w-4 h-4" />} Confirmar descadastro
            </button>
          </>
        ) : (
          <>
            <MailCheck className="w-10 h-10 text-green-600 mx-auto mb-3" />
            <h1 className="text-lg font-bold text-gray-900">Você está descadastrado</h1>
            <p className="text-gray-500 text-sm mt-1">{pref?.nome ? `${pref.nome}, você` : 'Você'} não receberá mais e-mails de divulgação. Mudou de ideia?</p>
            <button onClick={() => alterar(true)} disabled={saving} className="mt-5 w-full py-2.5 rounded-xl bg-green-700 hover:bg-green-800 text-white font-medium inline-flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <MailCheck className="w-4 h-4" />} Voltar a receber e-mails
            </button>
          </>
        )}
      </div>
      <p className="text-slate-400 text-xs mt-6">© {new Date().getFullYear()} IDIBRA — corretoridibra.com.br</p>
    </div>
  )
}
