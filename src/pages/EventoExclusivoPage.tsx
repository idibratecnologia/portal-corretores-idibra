import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { Loader2, AlertCircle, Calendar, Clock, MapPin, Lock, LogIn, CheckCircle2 } from 'lucide-react'
import idibraLogo from '@/assets/idibra_logo_preta.png'
import { useAuth } from '@/contexts/AuthContext'
import { fetchEventoPorLink, entrarEventoPorLink, type EventoLinkInfo } from '@/services/eventos'
import { getErrorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/utils'

export function EventoExclusivoPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const token = params.get('t') ?? ''
  const navigate = useNavigate()
  const location = useLocation()
  const { role } = useAuth()

  const [evento, setEvento] = useState<EventoLinkInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [entrando, setEntrando] = useState(false)

  useEffect(() => {
    if (!id || !token) { setErro('Link inválido.'); setLoading(false); return }
    fetchEventoPorLink(id, token)
      .then(setEvento)
      .catch((e) => setErro(getErrorMessage(e)))
      .finally(() => setLoading(false))
  }, [id, token])

  const participar = async () => {
    if (!id) return
    setEntrando(true)
    try {
      await entrarEventoPorLink(id, token)
      navigate(`/portal/eventos/${id}`)
    } catch (e) {
      setErro(getErrorMessage(e))
      setEntrando(false)
    }
  }

  // O login fica na rota "/" (── /login é redirecionado e descartaria a query).
  const irParaLogin = () =>
    navigate(`/?redirect=${encodeURIComponent(location.pathname + location.search)}`)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-green-50 flex flex-col items-center justify-center p-4">
      <img src={idibraLogo} alt="IDIBRA" className="h-10 w-auto object-contain mb-6" />
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-7 h-7 text-green-600 animate-spin" /></div>
        ) : erro ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="font-semibold text-gray-800">Não foi possível abrir</p>
            <p className="text-gray-400 text-sm mt-1">{erro}</p>
          </div>
        ) : evento ? (
          <>
            {evento.banner_url && (
              <img src={evento.banner_url} alt={evento.titulo} className="w-full h-40 object-cover" />
            )}
            <div className="p-6">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full mb-2">
                <Lock className="w-3 h-3" /> Convite exclusivo
              </span>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">{evento.titulo}</h1>
              {evento.descricao && <p className="text-sm text-gray-500 mt-1 line-clamp-3">{evento.descricao}</p>}

              <div className="mt-4 space-y-2 text-sm text-gray-600">
                <p className="flex items-center gap-2"><Calendar className="w-4 h-4 text-green-600" /> {formatDate(evento.data_evento)}</p>
                <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-green-600" /> {evento.hora_inicio} – {evento.hora_fim}</p>
                <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-green-600" /> {evento.local}</p>
              </div>

              {role === 'corretor' ? (
                <button onClick={participar} disabled={entrando} className="mt-6 w-full py-2.5 rounded-xl bg-green-700 hover:bg-green-800 text-white font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60">
                  {entrando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Participar do evento
                </button>
              ) : (
                <>
                  <button onClick={irParaLogin} className="mt-6 w-full py-2.5 rounded-xl bg-green-700 hover:bg-green-800 text-white font-medium inline-flex items-center justify-center gap-2">
                    <LogIn className="w-4 h-4" /> Entrar para participar
                  </button>
                  <p className="text-[11px] text-gray-400 text-center mt-2">
                    Ainda não tem cadastro?{' '}
                    <button onClick={() => navigate('/cadastro')} className="text-green-700 font-semibold hover:underline">Cadastre-se</button>
                  </p>
                </>
              )}
            </div>
          </>
        ) : null}
      </div>
      <p className="text-slate-400 text-xs mt-6">© {new Date().getFullYear()} IDIBRA — corretoridibra.com.br</p>
    </div>
  )
}
