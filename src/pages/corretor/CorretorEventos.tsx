import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Calendar, MapPin, Clock, Users, Filter, Rocket, GraduationCap, ShoppingBag, Wrench } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/shared/Skeleton'
import { mockEventos, mockInscricoesCorretorLogado } from '@/data/mockData'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { usePageLoader } from '@/hooks/usePageLoader'
import { cn } from '@/lib/utils'

const tiposEvento = ['lançamento', 'treinamento', 'reunião', 'feira', 'workshop']

const tipoColors: Record<string, string> = {
  'lançamento': 'bg-purple-100 text-purple-700',
  'treinamento': 'bg-blue-100 text-blue-700',
  'reunião':     'bg-orange-100 text-orange-700',
  'feira':       'bg-pink-100 text-pink-700',
  'workshop':    'bg-teal-100 text-teal-700',
  'outro':       'bg-gray-100 text-gray-600',
}

const tipoBannerConfig: Record<string, { gradient: string; icon: React.ElementType; iconColor: string; dotColor: string }> = {
  'lançamento': { gradient: 'bg-gradient-to-br from-violet-950 via-purple-900 to-indigo-950',  icon: Rocket,       iconColor: 'text-purple-300', dotColor: 'bg-purple-400' },
  'treinamento': { gradient: 'bg-gradient-to-br from-blue-950 via-blue-900 to-cyan-950',        icon: GraduationCap, iconColor: 'text-blue-300',   dotColor: 'bg-blue-400'   },
  'reunião':    { gradient: 'bg-gradient-to-br from-amber-950 via-orange-900 to-yellow-950',    icon: Users,        iconColor: 'text-amber-300',  dotColor: 'bg-amber-400'  },
  'feira':      { gradient: 'bg-gradient-to-br from-pink-950 via-rose-900 to-red-950',          icon: ShoppingBag,  iconColor: 'text-pink-300',   dotColor: 'bg-pink-400'   },
  'workshop':   { gradient: 'bg-gradient-to-br from-teal-950 via-emerald-900 to-green-950',     icon: Wrench,       iconColor: 'text-teal-300',   dotColor: 'bg-teal-400'   },
  'outro':      { gradient: 'bg-gradient-to-br from-slate-800 via-slate-700 to-gray-800',       icon: Calendar,     iconColor: 'text-slate-400',  dotColor: 'bg-slate-400'  },
}

export function CorretorEventos() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const isLoading = usePageLoader()
  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState('')
  const [inscricoes, setInscricoes] = useState(mockInscricoesCorretorLogado)

  const eventosPublicados = mockEventos.filter((e) => e.status === 'publicado' && e.inscricoes_abertas)
  const filtered = eventosPublicados.filter((e) => {
    const q = search.toLowerCase()
    return (
      (e.titulo.toLowerCase().includes(q) || e.local.toLowerCase().includes(q)) &&
      (!tipoFilter || e.tipo === tipoFilter)
    )
  })

  const isInscrito = (id: string) => inscricoes.some((i) => i.evento_id === id && i.status !== 'cancelado')

  const handleInscrever = (eventoId: string, titulo: string) => {
    if (isInscrito(eventoId)) return
    setInscricoes((prev) => [...prev, {
      id: String(Date.now()), evento_id: eventoId, corretor_id: '1',
      status: 'inscrito', qr_code_token: `TOKEN-${Date.now()}`,
      created_at: new Date().toISOString(),
      evento: mockEventos.find((e) => e.id === eventoId),
    } as any])
    toast({ title: 'Inscrição confirmada!', description: `Você se inscreveu em "${titulo}".` })
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Eventos Disponíveis</h1>
        <p className="text-sm text-gray-500 mt-0.5">{filtered.length} evento(s) disponíve{filtered.length === 1 ? 'l' : 'is'} para inscrição</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar por título ou local..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 rounded-xl border-gray-200" />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setTipoFilter('')}
            className={cn('flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all', !tipoFilter ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300')}
          >
            <Filter className="w-3 h-3" /> Todos
          </button>
          {tiposEvento.map((tipo) => (
            <button
              key={tipo}
              onClick={() => setTipoFilter(tipoFilter === tipo ? '' : tipo)}
              className={cn('px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border capitalize transition-all', tipoFilter === tipo ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300')}
            >
              {tipo}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
              <Skeleton className="h-40 w-full rounded-none" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-9 w-full rounded-xl mt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Calendar} title="Nenhum evento disponível" description="Tente outros filtros ou volte mais tarde." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((evento) => {
            const inscrito = isInscrito(evento.id)
            const vagas = evento.capacidade - (evento.total_inscritos ?? 0)
            const lotado = vagas <= 0
            const pctOcupado = Math.min(100, Math.round(((evento.total_inscritos ?? 0) / evento.capacidade) * 100))
            const tipoColor = tipoColors[evento.tipo] ?? tipoColors['outro']
            const bannerCfg = tipoBannerConfig[evento.tipo] ?? tipoBannerConfig['outro']
            const BannerIcon = bannerCfg.icon

            return (
              <div key={evento.id} className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden card-hover flex flex-col">
                {/* Banner */}
                <div className="relative h-44 overflow-hidden flex-shrink-0">
                  {evento.banner_url ? (
                    <img src={evento.banner_url} alt={evento.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className={cn('w-full h-full relative overflow-hidden', bannerCfg.gradient)}>
                      {/* dot grid pattern */}
                      <div
                        className="absolute inset-0 opacity-[0.08]"
                        style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                      />
                      {/* glow blob */}
                      <div className={cn('absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl opacity-30', bannerCfg.dotColor)} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5">
                        <BannerIcon className={cn('w-14 h-14', bannerCfg.iconColor)} strokeWidth={1.5} />
                        <span className={cn('text-[10px] font-bold uppercase tracking-[0.25em] opacity-60', bannerCfg.iconColor)}>{evento.tipo}</span>
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
                    <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-sm', tipoColor)}>
                      {evento.tipo}
                    </span>
                    {inscrito && (
                      <span className="text-[10px] font-bold bg-green-500 text-white px-2.5 py-1 rounded-full shadow-sm">
                        ✓ Inscrito
                      </span>
                    )}
                    {lotado && !inscrito && (
                      <span className="text-[10px] font-bold bg-red-500 text-white px-2.5 py-1 rounded-full">
                        Lotado
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-white font-bold text-sm leading-snug drop-shadow line-clamp-2">{evento.titulo}</p>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col flex-1">
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-green-500" />{formatDate(evento.data_evento)}</span>
                      <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-green-500" />{evento.hora_inicio}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <MapPin className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      <span className="line-clamp-1">{evento.local}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-gray-400 flex items-center gap-1">
                        <Users className="w-3 h-3" /> {evento.total_inscritos ?? 0}/{evento.capacidade} inscritos
                      </span>
                      <span className="text-[11px] font-semibold text-gray-600">{pctOcupado}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', pctOcupado >= 80 ? 'bg-red-400' : pctOcupado >= 50 ? 'bg-amber-400' : 'bg-green-500')}
                        style={{ width: `${pctOcupado}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 mt-auto">
                    <Button variant="outline" size="sm" className="flex-1 rounded-xl text-xs h-9 border-gray-200" onClick={() => navigate(`/portal/eventos/${evento.id}`)}>
                      Detalhes
                    </Button>
                    <Button
                      size="sm"
                      className={cn('flex-1 rounded-xl text-xs h-9', inscrito ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100' : 'bg-green-700 hover:bg-green-800 text-white')}
                      onClick={() => handleInscrever(evento.id, evento.titulo)}
                      disabled={lotado && !inscrito}
                    >
                      {inscrito ? '✓ Inscrito' : lotado ? 'Lotado' : 'Inscrever-se'}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
