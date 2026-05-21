import { useNavigate } from 'react-router-dom'
import { Calendar, ClipboardList, CheckCircle, ArrowRight, MapPin, Clock, Sparkles, TrendingUp } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { mockEventos, mockInscricoesCorretorLogado } from '@/data/mockData'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

const statItems = [
  { label: 'Participações', icon: CheckCircle,  color: 'from-green-400 to-emerald-600',   bg: 'bg-green-50', text: 'text-green-700' },
  { label: 'Inscrições Ativas', icon: ClipboardList, color: 'from-blue-400 to-blue-600', bg: 'bg-blue-50',  text: 'text-blue-700'  },
  { label: 'Próx. Evento', icon: Calendar,      color: 'from-amber-400 to-amber-600',     bg: 'bg-amber-50', text: 'text-amber-700' },
  { label: 'Pontuação',    icon: TrendingUp,    color: 'from-violet-400 to-violet-600',   bg: 'bg-violet-50',text: 'text-violet-700'},
]

export function CorretorHome() {
  const { corretor } = useAuth()
  const navigate = useNavigate()

  const proximosEventos = mockEventos
    .filter((e) => e.status === 'publicado' && e.inscricoes_abertas)
    .slice(0, 3)

  const inscricoesRecentes = mockInscricoesCorretorLogado.slice(0, 4)
  const totalParticipacoes = mockInscricoesCorretorLogado.filter((i) => i.status === 'presente').length
  const inscricoesAtivas   = mockInscricoesCorretorLogado.filter((i) => i.status === 'inscrito').length
  const proximoEvento      = inscricoesRecentes.find((i) => i.status === 'inscrito')

  const statValues = [
    totalParticipacoes,
    inscricoesAtivas,
    proximoEvento?.evento?.titulo?.split(' ').slice(0, 2).join(' ') || '—',
    `${totalParticipacoes * 10} pts`,
  ]

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div className="space-y-6 pb-8">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-green-950 to-slate-900 px-6 py-8 text-white">
        {/* Decorative */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-72 h-72 bg-green-500/10 rounded-full -translate-y-24 translate-x-16 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full translate-y-16 -translate-x-8 blur-2xl" />
        </div>
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-sm font-medium">{greeting}!</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
              {corretor?.nome.split(' ')[0]}, seja bem-vindo!
            </h1>
            <p className="text-slate-400 text-sm mt-2 max-w-sm">
              Confira os próximos eventos e acompanhe seu histórico de participações.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <span className={cn(
                'inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full',
                corretor?.status === 'ativo' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              )}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                {corretor?.status === 'ativo' ? 'Perfil Ativo' : 'Perfil Pendente'}
              </span>
              <span className="text-xs text-slate-500">{corretor?.creci}</span>
            </div>
          </div>
          <Button
            onClick={() => navigate('/portal/eventos')}
            className="bg-green-500 hover:bg-green-400 text-white font-semibold rounded-xl px-5 h-10 text-sm flex-shrink-0 shadow-lg shadow-green-500/20"
          >
            Ver eventos <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statItems.map((item, i) => (
          <div key={i} className={cn('bg-white rounded-2xl border border-gray-100 p-4 shadow-sm card-hover')}>
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', item.bg)}>
              <item.icon className={cn('w-[18px] h-[18px]', item.text)} />
            </div>
            <p className="text-xl font-bold text-gray-900 leading-tight">{statValues[i]}</p>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Próximos eventos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Próximos Eventos</h2>
            <p className="text-xs text-gray-400 mt-0.5">Inscreva-se e garanta sua vaga</p>
          </div>
          <button
            onClick={() => navigate('/portal/eventos')}
            className="flex items-center gap-1 text-xs font-semibold text-green-700 hover:text-green-600 transition-colors"
          >
            Ver todos <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {proximosEventos.map((evento) => {
            const isInscrito = mockInscricoesCorretorLogado.some((i) => i.evento_id === evento.id && i.status !== 'cancelado')
            const vagas = evento.capacidade - (evento.total_inscritos ?? 0)
            return (
              <div
                key={evento.id}
                className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer card-hover"
                onClick={() => navigate(`/portal/eventos/${evento.id}`)}
              >
                {/* Image */}
                <div className="relative h-40 overflow-hidden">
                  {evento.banner_url ? (
                    <img
                      src={evento.banner_url}
                      alt={evento.titulo}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-green-100 via-emerald-50 to-green-200 flex items-center justify-center">
                      <Calendar className="w-10 h-10 text-green-400" />
                    </div>
                  )}
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  {/* Top badge */}
                  <div className="absolute top-3 left-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-white/90 backdrop-blur-sm text-green-700 px-2.5 py-1 rounded-full shadow-sm">
                      {evento.tipo}
                    </span>
                  </div>
                  {isInscrito && (
                    <div className="absolute top-3 right-3">
                      <span className="text-[10px] font-bold bg-blue-500 text-white px-2.5 py-1 rounded-full shadow-sm">
                        Inscrito
                      </span>
                    </div>
                  )}
                  {/* Bottom info */}
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-white font-bold text-sm leading-tight drop-shadow line-clamp-2">
                      {evento.titulo}
                    </p>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-green-500" />
                      {formatDate(evento.data_evento)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-green-500" />
                      {evento.hora_inicio}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <MapPin className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    <span className="line-clamp-1">{evento.local}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-gray-400">
                      <strong className="text-gray-700">{vagas}</strong> vagas
                    </span>
                    <button
                      className="text-xs font-semibold text-green-700 hover:text-green-600 flex items-center gap-0.5 transition-colors"
                      onClick={(e) => { e.stopPropagation(); navigate(`/portal/eventos/${evento.id}`) }}
                    >
                      Detalhes <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Minhas inscrições recentes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Minhas Inscrições</h2>
            <p className="text-xs text-gray-400 mt-0.5">Acompanhe suas participações</p>
          </div>
          <button
            onClick={() => navigate('/portal/inscricoes')}
            className="flex items-center gap-1 text-xs font-semibold text-green-700 hover:text-green-600 transition-colors"
          >
            Ver todas <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {inscricoesRecentes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <ClipboardList className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-500">Nenhuma inscrição ainda</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">Inscreva-se em um evento para começar</p>
            <Button onClick={() => navigate('/portal/eventos')} size="sm" className="bg-green-700 hover:bg-green-800 rounded-xl">
              Explorar eventos
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {inscricoesRecentes.map((inscricao, i) => (
              <div
                key={inscricao.id}
                className={cn(
                  'flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer',
                  i < inscricoesRecentes.length - 1 && 'border-b border-gray-50'
                )}
                onClick={() => navigate(`/portal/eventos/${inscricao.evento_id}`)}
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-[18px] h-[18px] text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{inscricao.evento?.titulo || '—'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {inscricao.evento ? formatDate(inscricao.evento.data_evento) : '—'}
                    {inscricao.evento?.local && ` · ${inscricao.evento.local}`}
                  </p>
                </div>
                <StatusBadge status={inscricao.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
