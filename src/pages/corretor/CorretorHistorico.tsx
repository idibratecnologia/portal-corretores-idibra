import { useState } from 'react'
import { History, Calendar, MapPin, CheckCircle } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { mockInscricoes, mockEventos } from '@/data/mockData'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

const statusBarColor: Record<string, string> = {
  presente:  '#4ade80',
  ausente:   '#f87171',
  cancelado: '#e5e7eb',
}

export function CorretorHistorico() {
  const [filter, setFilter] = useState('todos')

  const historico = mockInscricoes
    .filter((i) => i.corretor_id === '1' && (i.status === 'presente' || i.status === 'ausente' || i.status === 'cancelado'))
    .map((i) => ({ ...i, evento: mockEventos.find((e) => e.id === i.evento_id) }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const totalPresentes = historico.filter((i) => i.status === 'presente').length
  const totalAusentes  = historico.filter((i) => i.status === 'ausente').length
  const taxa = historico.length > 0 ? Math.round((totalPresentes / historico.length) * 100) : 0

  const filtered = filter === 'todos' ? historico : historico.filter((i) => i.status === filter)

  return (
    <div className="space-y-5 pb-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Meu Histórico</h1>
        <p className="text-sm text-gray-500 mt-0.5">Registro completo de participações em eventos</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center stat-border-gray">
          <p className="text-2xl font-bold text-gray-900">{historico.length}</p>
          <p className="text-xs text-gray-500 mt-0.5 font-medium">Total</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center stat-border-green">
          <p className="text-2xl font-bold text-green-700">{totalPresentes}</p>
          <p className="text-xs text-gray-500 mt-0.5 font-medium">Presente</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center stat-border-purple">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <p className="text-2xl font-bold text-gray-900">{taxa}%</p>
          </div>
          <p className="text-xs text-gray-500 font-medium">Presença</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'todos',    label: 'Todos',    count: historico.length },
          { key: 'presente', label: 'Presente', count: totalPresentes },
          { key: 'ausente',  label: 'Ausente',  count: totalAusentes },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all',
              filter === tab.key
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            )}
          >
            {tab.label}
            <span className={cn(
              'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
              filter === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={History}
          title="Sem histórico aqui"
          description="Seu histórico de participações aparecerá aqui após os eventos encerrados."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex">
              <div
                className="w-1 sm:w-1.5 flex-shrink-0 self-stretch"
                style={{ background: statusBarColor[item.status] ?? '#e5e7eb' }}
              />
              <div className="flex-1 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <StatusBadge status={item.status} />
                      {item.evento?.tipo && (
                        <span className="text-[10px] text-gray-400 capitalize">{item.evento.tipo}</span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 line-clamp-1 leading-tight">
                      {item.evento?.titulo || '—'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-500">
                      {item.evento && (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-green-500" />
                          {formatDate(item.evento.data_evento)}
                        </span>
                      )}
                      {item.evento?.local && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-green-500" />
                          <span className="line-clamp-1 max-w-[160px]">{item.evento.local}</span>
                        </span>
                      )}
                    </div>
                    {item.checkin_at && (
                      <p className="text-[11px] text-green-600 font-medium mt-1.5 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Check-in: {new Date(item.checkin_at).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
