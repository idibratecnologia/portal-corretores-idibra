import { useState, useEffect, useCallback } from 'react'
import { GraduationCap, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'
import { getErrorMessage } from '@/lib/errors'
import { TreinamentoCorretorCard } from '@/components/corretor/TreinamentoCorretorCard'
import { fetchTreinamentosEventoCorretor, type TreinamentoResumo } from '@/services/treinamentos'

export function EventoTreinamentosCorretor({ eventoId }: { eventoId: string }) {
  const { toast } = useToast()
  const [itens, setItens] = useState<TreinamentoResumo[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setItens(await fetchTreinamentosEventoCorretor(eventoId))
    } catch (err) {
      toast({ title: 'Erro ao carregar treinamentos', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [eventoId, toast])

  useEffect(() => { load() }, [load])
  useRealtimeRefresh(load)

  if (loading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 text-green-600 animate-spin" /></div>
  }
  if (itens.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        <GraduationCap className="w-4 h-4 text-green-600" />
        <h2 className="font-semibold text-gray-900">Treinamentos do evento</h2>
      </div>
      <div className="p-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {itens.map((t) => <TreinamentoCorretorCard key={t.id} t={t} />)}
      </div>
    </div>
  )
}
