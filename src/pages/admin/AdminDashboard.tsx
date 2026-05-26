import React from 'react'
import { Users, Calendar, ClipboardList, CheckCircle, Clock, TrendingUp } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts'
import type { TooltipProps } from 'recharts'
import { StatCard } from '@/components/shared/StatCard'
import {
  mockDashboardStats, mockParticipacaoEventos, mockInscricoesMes,
  mockCorretoresParticipativos, mockParticipacaoImobiliaria,
} from '@/data/mockData'
import { useAuth } from '@/contexts/AuthContext'

const COLORS = ['#16a34a', '#2563eb', '#d97706', '#7c3aed', '#dc2626']

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs">
        <p className="font-semibold text-gray-700 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="font-medium">
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

export function AdminDashboard() {
  const stats = mockDashboardStats
  const { adminUser } = useAuth()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-green-900 rounded-2xl px-6 py-6 text-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-green-400/10 rounded-full -translate-y-20 translate-x-16 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-400/10 rounded-full translate-y-16 -translate-x-8 blur-2xl" />
        </div>
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-green-400 text-sm font-medium mb-1">{greeting}, {adminUser?.nome?.split(' ')[0]} 👋</p>
            <h1 className="text-xl font-bold text-white leading-tight">Painel de Controle IDIBRA</h1>
            <p className="text-slate-400 text-sm mt-1">Aqui está o resumo de hoje da sua plataforma</p>
          </div>
          <div className="flex-shrink-0 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-center hidden sm:block">
            <p className="text-white/50 text-[10px] font-semibold uppercase tracking-wide">Hoje</p>
            <p className="text-white font-bold text-sm mt-0.5">
              {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard title="Total de Corretores"       value={stats.total_corretores}           icon={Users}        color="green"  trend={12} subtitle="Cadastrados na plataforma" />
        <StatCard title="Eventos Ativos"             value={stats.eventos_ativos}             icon={Calendar}     color="blue"   trend={5}  subtitle="Publicados e abertos" />
        <StatCard title="Inscrições Abertas"         value={stats.inscricoes_abertas}         icon={ClipboardList} color="yellow" trend={8}  subtitle="Em todos os eventos" />
        <StatCard title="Participações Confirmadas"  value={stats.participacoes_confirmadas}  icon={CheckCircle}  color="green"  trend={15} subtitle="Check-ins realizados" />
        <StatCard title="Corretores Pendentes"       value={stats.corretores_pendentes}       icon={Clock}        color="yellow" subtitle="Aguardando aprovação" />
        <StatCard title="Taxa Média de Presença"     value={`${stats.taxa_media_presenca}%`} icon={TrendingUp}   color="purple" trend={3}  subtitle="Nos eventos encerrados" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Inscrições por mês — area chart, spans 3 */}
        <div className="lg:col-span-3">
          <ChartCard title="Inscrições por Mês" subtitle="Evolução mensal de inscrições">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={mockInscricoesMes} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInscrições" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="inscricoes" name="Inscrições" stroke="#16a34a" strokeWidth={2.5} fill="url(#colorInscrições)" dot={{ fill: '#16a34a', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Participação por imobiliária — pie, spans 2 */}
        <div className="lg:col-span-2">
          <ChartCard title="Por Imobiliária" subtitle="Distribuição de participações">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={mockParticipacaoImobiliaria}
                  cx="50%" cy="45%"
                  innerRadius={50} outerRadius={80}
                  dataKey="participacoes" nameKey="imobiliaria"
                  paddingAngle={3}
                >
                  {mockParticipacaoImobiliaria.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`${v} participações`, '']} contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #f0f0f0' }} />
              </PieChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex flex-col gap-1.5 mt-1">
              {mockParticipacaoImobiliaria.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-gray-600 truncate max-w-[120px]">{item.imobiliaria}</span>
                  </div>
                  <span className="font-semibold text-gray-800">{item.participacoes}</span>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Participação por evento */}
        <ChartCard title="Participação por Evento" subtitle="Inscritos vs. presentes">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={mockParticipacaoEventos} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="evento" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="inscritos" name="Inscritos"  fill="#bbf7d0" radius={[4, 4, 0, 0]} />
              <Bar dataKey="presentes" name="Presentes"  fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Top corretores */}
        <ChartCard title="Top Corretores" subtitle="Mais participativos no período">
          <div className="space-y-3 mt-1">
            {mockCorretoresParticipativos.map((c, i) => {
              const pct = Math.round((c.participacoes / mockCorretoresParticipativos[0].participacoes) * 100)
              const medal = ['🥇','🥈','🥉'][i] ?? null
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-base w-5 text-center flex-shrink-0">{medal ?? `${i + 1}.`}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-gray-700 truncate">{c.nome}</p>
                      <p className="text-xs font-bold text-green-700 ml-2">{c.participacoes}</p>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
