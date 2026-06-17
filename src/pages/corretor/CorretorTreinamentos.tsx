import { useState, useEffect, useCallback } from 'react'
import { GraduationCap, Loader2, PlayCircle, CheckCircle2, Circle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'
import { getErrorMessage } from '@/lib/errors'
import { TreinamentoCorretorCard } from '@/components/corretor/TreinamentoCorretorCard'
import { fetchMeusTreinamentos, type MeuTreinamento } from '@/services/treinamentos'

export function CorretorTreinamentos() {
  const { toast } = useToast()
  const [itens, setItens] = useState<MeuTreinamento[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setItens(await fetchMeusTreinamentos())
    } catch (err) {
      toast({ title: 'Erro ao carregar treinamentos', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])
  useRealtimeRefresh(load)

  const emAndamento = itens.filter((t) => t.status === 'em_andamento')
  const pendentes = itens.filter((t) => t.status === 'nao_iniciado')
  const concluidos = itens.filter((t) => t.status === 'concluido')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meus Treinamentos</h1>
        <p className="text-gray-500 text-sm mt-1">Capacitações dos eventos em que você está inscrito</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-green-600 animate-spin" /></div>
      ) : itens.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <GraduationCap className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhum treinamento disponível no momento.</p>
          <p className="text-gray-400 text-sm mt-1">Inscreva-se em eventos para acessar os treinamentos vinculados.</p>
        </div>
      ) : (
        <>
          <Secao titulo="Em andamento" icon={PlayCircle} cor="text-amber-500" itens={emAndamento} />
          <Secao titulo="Pendentes" icon={Circle} cor="text-gray-400" itens={pendentes} />
          <Secao titulo="Concluídos" icon={CheckCircle2} cor="text-green-600" itens={concluidos} />
        </>
      )}
    </div>
  )
}

function Secao({ titulo, icon: Icon, cor, itens }: { titulo: string; icon: typeof PlayCircle; cor: string; itens: MeuTreinamento[] }) {
  if (itens.length === 0) return null
  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <Icon className={`w-4 h-4 ${cor}`} /> {titulo} <span className="text-gray-400 font-normal">({itens.length})</span>
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {itens.map((t) => <TreinamentoCorretorCard key={t.id} t={t} eventoTitulo={t.evento.titulo} />)}
      </div>
    </section>
  )
}
