import { useState, useEffect } from 'react'
import { Loader2, Users, Calendar, CheckCircle2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'
import { formatDate, formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { ExportMenu, type ExportFormat } from '@/components/shared/ExportMenu'
import { exportTablePdf, exportExcel, exportCsv, type Cell } from '@/lib/export'
import { fetchInscricoesByCorretor, fetchInscricoesByEvento } from '@/services/inscricoes'
import type { RelatorioEvento, RelatorioCorretor } from '@/services/relatorios'
import type { EventoInscricao } from '@/types'

type Alvo =
  | { tipo: 'corretor'; dados: RelatorioCorretor }
  | { tipo: 'evento'; dados: RelatorioEvento }

const STATUS_LABEL: Record<string, string> = {
  inscrito: 'Inscrito', presente: 'Presente', ausente: 'Ausente', cancelado: 'Cancelado',
}

export function RelatorioIndividualModal({ alvo, onClose }: { alvo: Alvo | null; onClose: () => void }) {
  const { toast } = useToast()
  const [linhas, setLinhas] = useState<EventoInscricao[]>([])
  const [loading, setLoading] = useState(false)
  const [escopo, setEscopo] = useState<'todos' | 'presente' | 'ausente'>('todos')

  useEffect(() => { setEscopo('todos') }, [alvo])

  useEffect(() => {
    if (!alvo) return
    setLoading(true)
    const req = alvo.tipo === 'corretor'
      ? fetchInscricoesByCorretor(alvo.dados.id)
      : fetchInscricoesByEvento(alvo.dados.id)
    req
      .then((r) => setLinhas(r.filter((i) => i.status !== 'cancelado')))
      .catch((err) => toast({ title: 'Erro ao carregar', description: getErrorMessage(err), variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [alvo, toast])

  if (!alvo) return null

  const isCorretor = alvo.tipo === 'corretor'
  const titulo = isCorretor ? (alvo.dados as RelatorioCorretor).nome : (alvo.dados as RelatorioEvento).titulo

  const resumo: Array<[string, string]> = isCorretor
    ? (() => {
        const c = alvo.dados as RelatorioCorretor
        const cor0 = linhas[0]?.corretor
        return [
          ['CPF', cor0?.cpf || '—'],
          ['CRECI', c.creci || '—'],
          ['Imobiliária', c.imobiliaria?.nome || '—'],
          ['Cidade/UF', `${c.cidade}/${c.uf}`],
          ['WhatsApp', cor0?.whatsapp || '—'],
          ['E-mail', cor0?.email || '—'],
          ['Eventos inscritos', String(c.total)],
          ['Participações', String(c.presentes)],
          ['Taxa de presença', `${c.taxa}%`],
        ]
      })()
    : (() => {
        const e = alvo.dados as RelatorioEvento
        return [
          ['Data', formatDate(e.data_evento)],
          ['Tipo', e.tipo],
          ['Inscritos', String(e.total)],
          ['Presentes', String(e.presentes)],
          ['Ausentes', String(e.ausentes)],
          ['Taxa de presença', `${e.taxa}%`],
        ]
      })()

  const ESCOPOS: { valor: typeof escopo; label: string }[] = [
    { valor: 'todos', label: 'Todos' },
    { valor: 'presente', label: 'Presentes' },
    { valor: 'ausente', label: 'Ausentes' },
  ]
  const escopoLabel = ESCOPOS.find((e) => e.valor === escopo)!.label
  const linhasFiltradas = escopo === 'todos' ? linhas : linhas.filter((l) => l.status === escopo)

  const exportar = (fmt: ExportFormat) => {
    const slug = `${titulo.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}${escopo !== 'todos' ? `-${escopo}s` : ''}`
    const base = `relatorio-${isCorretor ? 'corretor' : 'evento'}-${slug}`
    const head = isCorretor
      ? ['Evento', 'Status', 'Check-in']
      : ['Corretor', 'CPF', 'WhatsApp', 'E-mail', 'Status', 'Check-in']
    const body: Cell[][] = linhasFiltradas.map((l) => isCorretor
      ? [
          l.evento?.titulo ?? '—',
          STATUS_LABEL[l.status] ?? l.status,
          l.checkin_at ? formatDateTime(l.checkin_at) : '—',
        ]
      : [
          l.corretor?.nome ?? '—',
          l.corretor?.cpf ?? '—',
          l.corretor?.whatsapp ?? '—',
          l.corretor?.email ?? '—',
          STATUS_LABEL[l.status] ?? l.status,
          l.checkin_at ? formatDateTime(l.checkin_at) : '—',
        ])
    const subtitle = `${titulo}${escopo !== 'todos' ? ` — ${escopoLabel}` : ''}`

    if (fmt === 'pdf') {
      exportTablePdf({
        filename: `${base}.pdf`,
        title: isCorretor ? 'Relatório do corretor' : 'Relatório do evento',
        subtitle,
        resumo,
        head, body, colWeights: isCorretor ? [3, 1.2, 1.6] : [2, 1.5, 1.4, 2.4, 0.9, 1.4],
      })
    } else if (fmt === 'excel') {
      exportExcel(`${base}.xls`, isCorretor ? 'Corretor' : 'Evento', [
        ...resumo.map(([k, v]) => [k, v] as Cell[]),
        [],
        head, ...body,
      ])
    } else {
      exportCsv(`${base}.csv`, [head, ...body])
    }
  }

  return (
    <Dialog open={!!alvo} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isCorretor ? <Users className="w-5 h-5 text-green-600" /> : <Calendar className="w-5 h-5 text-green-600" />}
            {titulo}
          </DialogTitle>
        </DialogHeader>

        {/* Resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {resumo.map(([k, v]) => (
            <div key={k} className="bg-gray-50 rounded-xl p-3">
              <p className="text-[11px] text-gray-500">{k}</p>
              <p className="text-sm font-semibold text-gray-900 capitalize">{v}</p>
            </div>
          ))}
        </div>

        {/* Escopo do relatório */}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs text-gray-400">Mostrar:</span>
          {ESCOPOS.map((e) => (
            <button
              key={e.valor}
              onClick={() => setEscopo(e.valor)}
              className={cn('text-xs font-medium px-3 py-1.5 rounded-lg transition-colors',
                escopo === e.valor ? 'bg-green-700 text-white' : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100')}
            >
              {e.label}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div className="mt-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">{isCorretor ? 'Eventos' : 'Participantes'} ({linhasFiltradas.length})</h3>
          {loading ? (
            <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 text-green-600 animate-spin" /></div>
          ) : linhasFiltradas.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Nenhum registro{escopo !== 'todos' ? ` (${escopoLabel.toLowerCase()})` : ''}.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/60">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">{isCorretor ? 'Evento' : 'Corretor'}</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Status</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 hidden sm:table-cell">Check-in</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {linhasFiltradas.map((l) => (
                    <tr key={l.id} className="hover:bg-gray-50/50">
                      <td className="px-3 py-2 text-gray-800">
                        {isCorretor ? (l.evento?.titulo ?? '—') : (
                          <>
                            {l.corretor?.nome ?? '—'}
                            <span className="block text-[11px] text-gray-400">{[l.corretor?.cpf, l.corretor?.whatsapp, l.corretor?.email].filter(Boolean).join(' · ') || '—'}</span>
                          </>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${l.status === 'presente' ? 'bg-green-100 text-green-700' : l.status === 'ausente' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABEL[l.status] ?? l.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-xs hidden sm:table-cell">{l.checkin_at ? formatDateTime(l.checkin_at) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <p className="text-[11px] text-gray-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {escopo === 'todos' ? 'Todos os registros' : escopoLabel} · gerado dos dados atuais.</p>
          <ExportMenu onExport={exportar} disabled={loading || linhasFiltradas.length === 0} dropUp />
        </div>
      </DialogContent>
    </Dialog>
  )
}
