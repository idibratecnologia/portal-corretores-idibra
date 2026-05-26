import { useState } from 'react'
import { BarChart3, Download, FileText, Users, Calendar, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { SkeletonTable } from '@/components/shared/Skeleton'
import {
  mockEventos, mockInscricoes, mockCorretoresComImobiliaria, mockDashboardStats,
} from '@/data/mockData'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { usePageLoader } from '@/hooks/usePageLoader'

type Tab = 'eventos' | 'corretores' | 'participacoes'

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((cell) => `"${cell}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const taxaBadge = (pct: number) =>
  cn('text-xs font-bold px-2.5 py-0.5 rounded-full',
    pct >= 80 ? 'bg-green-100 text-green-700' : pct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600')

export function AdminRelatorios() {
  const [tab, setTab] = useState<Tab>('eventos')
  const isLoading = usePageLoader()

  const stats = mockDashboardStats
  const totalPresentes = mockInscricoes.filter((i) => i.status === 'presente').length

  const eventStats = mockEventos
    .filter((e) => e.status === 'publicado' || e.status === 'encerrado')
    .map((e) => {
      const insc = mockInscricoes.filter((i) => i.evento_id === e.id)
      const presentes = insc.filter((i) => i.status === 'presente').length
      const ausentes = insc.filter((i) => i.status === 'ausente').length
      const taxa = insc.length > 0 ? Math.round((presentes / insc.length) * 100) : 0
      return { ...e, total: insc.length, presentes, ausentes, taxa }
    })
    .sort((a, b) => new Date(b.data_evento).getTime() - new Date(a.data_evento).getTime())

  const corretorStats = mockCorretoresComImobiliaria
    .map((c) => {
      const insc = mockInscricoes.filter((i) => i.corretor_id === c.id)
      const presentes = insc.filter((i) => i.status === 'presente').length
      const taxa = insc.length > 0 ? Math.round((presentes / insc.length) * 100) : 0
      return { ...c, total: insc.length, presentes, taxa }
    })
    .sort((a, b) => b.presentes - a.presentes)

  const participacoes = mockInscricoes
    .map((i) => ({
      ...i,
      evento: mockEventos.find((e) => e.id === i.evento_id),
      corretor: mockCorretoresComImobiliaria.find((c) => c.id === i.corretor_id),
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const exportEventos = () =>
    downloadCSV('relatorio-eventos.csv', [
      ['Evento', 'Data', 'Tipo', 'Status', 'Inscritos', 'Presentes', 'Ausentes', 'Taxa (%)'],
      ...eventStats.map((e) => [e.titulo, formatDate(e.data_evento), e.tipo, e.status, String(e.total), String(e.presentes), String(e.ausentes), String(e.taxa)]),
    ])

  const exportCorretores = () =>
    downloadCSV('relatorio-corretores.csv', [
      ['Corretor', 'CRECI', 'Imobiliária', 'Cidade/UF', 'Eventos', 'Participações', 'Taxa (%)'],
      ...corretorStats.map((c) => [c.nome, c.creci, c.imobiliaria?.nome || '', `${c.cidade}/${c.uf}`, String(c.total), String(c.presentes), String(c.taxa)]),
    ])

  const exportParticipacoes = () =>
    downloadCSV('relatorio-participacoes.csv', [
      ['Corretor', 'Evento', 'Data Evento', 'Status', 'Check-in'],
      ...participacoes.map((p) => [
        p.corretor?.nome || '',
        p.evento?.titulo || '',
        p.evento ? formatDate(p.evento.data_evento) : '',
        p.status,
        p.checkin_at ? new Date(p.checkin_at).toLocaleString('pt-BR') : '',
      ]),
    ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        <p className="text-gray-500 text-sm mt-1">Análise e exportação de dados da plataforma</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Inscrições', value: mockInscricoes.length, icon: FileText, color: 'green', cls: 'stat-border-green', bg: 'bg-green-50', text: 'text-green-600' },
          { label: 'Participações', value: totalPresentes, icon: Users, color: 'blue', cls: 'stat-border-blue', bg: 'bg-blue-50', text: 'text-blue-600' },
          { label: 'Taxa de Presença', value: `${stats.taxa_media_presenca}%`, icon: TrendingUp, color: 'purple', cls: 'stat-border-purple', bg: 'bg-purple-50', text: 'text-purple-600' },
          { label: 'Eventos', value: mockEventos.length, icon: Calendar, color: 'amber', cls: 'stat-border-yellow', bg: 'bg-amber-50', text: 'text-amber-600' },
        ].map((s) => (
          <div key={s.label} className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 ${s.cls}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide leading-tight">{s.label}</p>
              <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <s.icon className={`w-4 h-4 ${s.text}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tab panel */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100 bg-gray-50/50 overflow-x-auto">
          {([
            { key: 'eventos' as Tab, label: 'Eventos', icon: Calendar },
            { key: 'corretores' as Tab, label: 'Corretores', icon: Users },
            { key: 'participacoes' as Tab, label: 'Participações', icon: BarChart3 },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-2 px-5 py-3.5 text-xs font-semibold whitespace-nowrap transition-all border-b-2 -mb-px',
                tab === t.key
                  ? 'text-green-700 border-green-600 bg-white'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              )}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Eventos */}
        {tab === 'eventos' && (
          <div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <p className="text-xs text-gray-500">{eventStats.length} evento(s)</p>
              <Button onClick={exportEventos} variant="outline" size="sm" className="gap-2 rounded-xl h-8 text-xs">
                <Download className="w-3.5 h-3.5" /> Exportar CSV
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Evento</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden sm:table-cell">Data</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">Tipo</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Inscritos</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 hidden sm:table-cell">Presentes</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">Ausentes</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Taxa</th>
                  </tr>
                </thead>
                {isLoading ? (
                  <SkeletonTable rows={5} cols={7} />
                ) : (
                  <tbody className="divide-y divide-gray-50">
                    {eventStats.map((e) => (
                      <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 line-clamp-1">{e.titulo}</p>
                          <p className="text-xs text-gray-400 sm:hidden">{formatDate(e.data_evento)}</p>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell text-gray-600 text-xs">{formatDate(e.data_evento)}</td>
                        <td className="px-4 py-3 hidden md:table-cell text-gray-600 text-xs capitalize">{e.tipo}</td>
                        <td className="px-4 py-3 text-center font-semibold text-gray-900">{e.total}</td>
                        <td className="px-4 py-3 text-center hidden sm:table-cell font-semibold text-green-700">{e.presentes}</td>
                        <td className="px-4 py-3 text-center hidden md:table-cell font-semibold text-red-500">{e.ausentes}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={taxaBadge(e.taxa)}>{e.taxa}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>
            </div>
          </div>
        )}

        {/* Corretores */}
        {tab === 'corretores' && (
          <div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <p className="text-xs text-gray-500">{corretorStats.length} corretor(es)</p>
              <Button onClick={exportCorretores} variant="outline" size="sm" className="gap-2 rounded-xl h-8 text-xs">
                <Download className="w-3.5 h-3.5" /> Exportar CSV
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Corretor</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">Imobiliária</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Eventos</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Participações</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Taxa</th>
                  </tr>
                </thead>
                {isLoading ? (
                  <SkeletonTable rows={5} cols={5} />
                ) : (
                  <tbody className="divide-y divide-gray-50">
                    {corretorStats.map((c, i) => (
                      <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {i < 3 && <span className="text-base flex-shrink-0">{['🥇', '🥈', '🥉'][i]}</span>}
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xs flex-shrink-0">
                              {c.nome.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">{c.nome}</p>
                              <p className="text-xs text-gray-400">{c.creci}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-gray-600 text-xs">
                          {c.imobiliaria?.nome || '—'}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-gray-900">{c.total}</td>
                        <td className="px-4 py-3 text-center font-semibold text-green-700">{c.presentes}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={taxaBadge(c.taxa)}>{c.taxa}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>
            </div>
          </div>
        )}

        {/* Participações */}
        {tab === 'participacoes' && (
          <div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <p className="text-xs text-gray-500">{participacoes.length} registro(s)</p>
              <Button onClick={exportParticipacoes} variant="outline" size="sm" className="gap-2 rounded-xl h-8 text-xs">
                <Download className="w-3.5 h-3.5" /> Exportar CSV
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Corretor</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden sm:table-cell">Evento</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">Data</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden lg:table-cell">Check-in</th>
                  </tr>
                </thead>
                {isLoading ? (
                  <SkeletonTable rows={5} cols={5} />
                ) : (
                  <tbody className="divide-y divide-gray-50">
                    {participacoes.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{p.corretor?.nome || '—'}</p>
                          <p className="text-xs text-gray-400 sm:hidden line-clamp-1">{p.evento?.titulo || '—'}</p>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <p className="text-gray-700 line-clamp-1">{p.evento?.titulo || '—'}</p>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-gray-600 text-xs">
                          {p.evento ? formatDate(p.evento.data_evento) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">
                          {p.checkin_at ? new Date(p.checkin_at).toLocaleString('pt-BR') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
