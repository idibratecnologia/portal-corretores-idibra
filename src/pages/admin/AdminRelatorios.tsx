import { useState, useEffect, useCallback } from 'react'
import { BarChart3, FileText, Users, Calendar, TrendingUp } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { SkeletonTable } from '@/components/shared/Skeleton'
import { ExportMenu, type ExportFormat } from '@/components/shared/ExportMenu'
import { exportCsv, exportExcel, exportTablePdf } from '@/lib/export'
import {
  fetchRelatorioEventos, fetchRelatorioCorretores, fetchRelatorioParticipacoes,
} from '@/services/relatorios'
import type {
  RelatorioEvento, RelatorioCorretor, RelatorioParticipacao, Periodo,
} from '@/services/relatorios'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'
import { RelatorioIndividualModal } from '@/components/admin/RelatorioIndividualModal'

type Tab = 'eventos' | 'corretores' | 'participacoes'
type Alvo =
  | { tipo: 'corretor'; dados: RelatorioCorretor }
  | { tipo: 'evento'; dados: RelatorioEvento }

const PERIODOS: { key: Periodo; label: string }[] = [
  { key: '7d',   label: '7 dias'   },
  { key: '30d',  label: '30 dias'  },
  { key: '90d',  label: '3 meses'  },
  { key: '365d', label: 'Este ano' },
  { key: 'all',  label: 'Tudo'     },
]

const taxaBadge = (pct: number) =>
  cn('text-xs font-bold px-2.5 py-0.5 rounded-full',
    pct >= 80 ? 'bg-green-100 text-green-700' : pct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600')

export function AdminRelatorios() {
  const { toast } = useToast()
  const [tab, setTab] = useState<Tab>('eventos')
  const [periodo, setPeriodo] = useState<Periodo>('all')
  const [isLoading, setIsLoading] = useState(true)

  const [eventStats, setEventStats]       = useState<RelatorioEvento[]>([])
  const [corretorStats, setCorretorStats] = useState<RelatorioCorretor[]>([])
  const [participacoes, setParticipacoes] = useState<RelatorioParticipacao[]>([])
  const [alvo, setAlvo] = useState<Alvo | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [ev, cor, par] = await Promise.all([
        fetchRelatorioEventos(periodo),
        fetchRelatorioCorretores(periodo),
        fetchRelatorioParticipacoes(periodo),
      ])
      setEventStats(ev)
      setCorretorStats(cor)
      setParticipacoes(par)
    } catch (err) {
      toast({ title: 'Erro ao carregar relatórios', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }, [periodo, toast])

  useEffect(() => { loadData() }, [loadData])

  const totalPresentes = participacoes.filter((p) => p.status === 'presente').length
  const totalAusentes  = participacoes.filter((p) => p.status === 'ausente').length
  const taxaMedia = (totalPresentes + totalAusentes) > 0
    ? Math.round((totalPresentes / (totalPresentes + totalAusentes)) * 100)
    : 0

  const periodoLabel = `Período: ${PERIODOS.find((p) => p.key === periodo)?.label ?? 'Tudo'}`

  const exportEventos = (fmt: ExportFormat) => {
    const head = ['Evento', 'Data', 'Tipo', 'Status', 'Inscritos', 'Presentes', 'Ausentes', 'Taxa (%)']
    const body = eventStats.map((e) => [e.titulo, formatDate(e.data_evento), e.tipo, e.status, e.total, e.presentes, e.ausentes, e.taxa])
    if (fmt === 'pdf') exportTablePdf({ filename: 'relatorio-eventos.pdf', title: 'Relatório de Eventos', subtitle: periodoLabel, head, body, colWeights: [3, 1.3, 1.3, 1.3, 1, 1, 1, 1] })
    else if (fmt === 'excel') exportExcel('relatorio-eventos.xls', 'Eventos', [head, ...body])
    else exportCsv('relatorio-eventos.csv', [head, ...body])
  }

  const exportCorretores = (fmt: ExportFormat) => {
    const head = ['Corretor', 'CRECI', 'Imobiliária', 'Cidade/UF', 'Eventos', 'Participações', 'Taxa (%)']
    const body = corretorStats.map((c) => [c.nome, c.creci, c.imobiliaria?.nome || '', `${c.cidade}/${c.uf}`, c.total, c.presentes, c.taxa])
    if (fmt === 'pdf') exportTablePdf({ filename: 'relatorio-corretores.pdf', title: 'Relatório de Corretores', subtitle: periodoLabel, head, body, colWeights: [2.6, 1, 2, 1.4, 1, 1.2, 1] })
    else if (fmt === 'excel') exportExcel('relatorio-corretores.xls', 'Corretores', [head, ...body])
    else exportCsv('relatorio-corretores.csv', [head, ...body])
  }

  const exportParticipacoes = (fmt: ExportFormat) => {
    const head = ['Corretor', 'Evento', 'Data Evento', 'Status', 'Check-in']
    const body = participacoes.map((p) => [
      p.corretor?.nome || '',
      p.evento?.titulo || '',
      p.evento ? formatDate(p.evento.data_evento) : '',
      p.status,
      p.checkin_at ? new Date(p.checkin_at).toLocaleString('pt-BR') : '',
    ])
    if (fmt === 'pdf') exportTablePdf({ filename: 'relatorio-participacoes.pdf', title: 'Relatório de Participações', subtitle: periodoLabel, head, body, colWeights: [2, 2.4, 1.3, 1.1, 1.8] })
    else if (fmt === 'excel') exportExcel('relatorio-participacoes.xls', 'Participações', [head, ...body])
    else exportCsv('relatorio-participacoes.csv', [head, ...body])
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        <p className="text-gray-500 text-sm mt-1">Análise e exportação de dados da plataforma</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Inscrições', value: participacoes.length, icon: FileText, color: 'green', cls: 'stat-border-green', bg: 'bg-green-50', text: 'text-green-600' },
          { label: 'Participações', value: totalPresentes, icon: Users, color: 'blue', cls: 'stat-border-blue', bg: 'bg-blue-50', text: 'text-blue-600' },
          { label: 'Taxa de Presença', value: `${taxaMedia}%`, icon: TrendingUp, color: 'purple', cls: 'stat-border-purple', bg: 'bg-purple-50', text: 'text-purple-600' },
          { label: 'Eventos', value: eventStats.length, icon: Calendar, color: 'amber', cls: 'stat-border-yellow', bg: 'bg-amber-50', text: 'text-amber-600' },
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

      {/* Period filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide mr-1">Período:</span>
        {PERIODOS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriodo(p.key)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
              periodo === p.key
                ? 'bg-green-700 text-white border-green-700'
                : 'bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-700'
            )}
          >
            {p.label}
          </button>
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
              <ExportMenu onExport={exportEventos} disabled={isLoading || eventStats.length === 0} />
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
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Relatório</th>
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
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => setAlvo({ tipo: 'evento', dados: e })} title="Relatório individual" className="inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:bg-green-50 px-2 py-1 rounded-lg">
                            <FileText className="w-3.5 h-3.5" /> Ver
                          </button>
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
              <ExportMenu onExport={exportCorretores} disabled={isLoading || corretorStats.length === 0} />
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
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Relatório</th>
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
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => setAlvo({ tipo: 'corretor', dados: c })} title="Relatório individual" className="inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:bg-green-50 px-2 py-1 rounded-lg">
                            <FileText className="w-3.5 h-3.5" /> Ver
                          </button>
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
              <ExportMenu onExport={exportParticipacoes} disabled={isLoading || participacoes.length === 0} />
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

      <RelatorioIndividualModal alvo={alvo} onClose={() => setAlvo(null)} />
    </div>
  )
}
