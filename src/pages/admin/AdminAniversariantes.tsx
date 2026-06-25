import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Cake, Loader2, Gift, MessageCircle, Mail, PartyPopper, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'
import { fetchAniversariantes, felicitarCorretor, type Aniversariante } from '@/services/aniversariantes'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export function AdminAniversariantes() {
  const { toast } = useToast()
  const hojeMes = new Date().getMonth() + 1
  const hojeDia = new Date().getDate()
  const [mes, setMes] = useState(hojeMes)
  const [itens, setItens] = useState<Aniversariante[]>([])
  const [loading, setLoading] = useState(true)
  const [enviandoId, setEnviandoId] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetchAniversariantes(mes)
      .then(setItens)
      .catch((err) => toast({ title: 'Erro ao carregar', description: getErrorMessage(err), variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [mes, toast])
  useEffect(() => { load() }, [load])

  const felicitar = async (a: Aniversariante) => {
    setEnviandoId(a.id)
    try {
      await felicitarCorretor(a.id)
      toast({ title: 'Felicitação enviada', description: `Parabéns enviados para ${a.nome.split(' ')[0]}.` })
    } catch (err) {
      toast({ title: 'Erro ao enviar', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setEnviandoId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Cake className="w-6 h-6 text-pink-500" /> Aniversariantes</h1>
          <p className="text-gray-500 text-sm mt-1">Felicitação automática às 09:00 do dia (WhatsApp + e-mail, respeitando os opt-ins).</p>
        </div>
        <Link to="/admin/notificacoes" className="text-xs text-gray-500 hover:text-green-700 inline-flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2">
          <Settings2 className="w-3.5 h-3.5" /> Editar mensagem de aniversário
        </Link>
      </div>

      {/* Seletor de mês */}
      <div className="flex flex-wrap gap-1.5">
        {MESES.map((m, i) => (
          <button key={m} onClick={() => setMes(i + 1)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium ${mes === i + 1 ? 'bg-pink-500 text-white' : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
            {m}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-pink-500 animate-spin" /></div>
        ) : itens.length === 0 ? (
          <div className="p-12 text-center text-gray-400"><Gift className="w-10 h-10 mx-auto mb-3 text-gray-300" />Nenhum aniversariante em {MESES[mes - 1]}.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {itens.map((a) => {
              const hoje = a.mes === hojeMes && a.dia === hojeDia
              return (
                <div key={a.id} className={`flex items-center gap-3 px-4 py-3 ${hoje ? 'bg-pink-50/50' : ''}`}>
                  <div className="w-11 h-11 rounded-xl bg-pink-100 text-pink-600 flex flex-col items-center justify-center flex-shrink-0 leading-none">
                    <span className="text-sm font-bold">{String(a.dia).padStart(2, '0')}</span>
                    <span className="text-[9px] uppercase">{MESES[a.mes - 1].slice(0, 3)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 flex items-center gap-2">
                      {a.nome}
                      {hoje && <span className="text-[10px] font-semibold text-pink-600 bg-pink-100 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1"><PartyPopper className="w-3 h-3" /> hoje</span>}
                    </p>
                    <p className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                      {a.idade != null && <span>{a.idade} anos</span>}
                      {(a.cidade || a.uf) && <span>· {a.cidade}{a.uf ? `/${a.uf}` : ''}</span>}
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle className={`w-3 h-3 ${a.whatsapp_opt_in ? 'text-green-600' : 'text-gray-300'}`} />
                        <Mail className={`w-3 h-3 ${a.email && a.email_opt_in ? 'text-blue-500' : 'text-gray-300'}`} />
                      </span>
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => felicitar(a)} disabled={enviandoId === a.id}
                    className="rounded-lg gap-1.5 text-pink-600 border-pink-200 hover:bg-pink-50 hover:text-pink-700">
                    {enviandoId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PartyPopper className="w-3.5 h-3.5" />} Felicitar
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
