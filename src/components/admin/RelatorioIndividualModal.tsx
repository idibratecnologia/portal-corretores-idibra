import { useState, useEffect } from 'react'
import { Loader2, FileText, Users, Calendar, CheckCircle2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'
import { formatDate, formatDateTime } from '@/lib/utils'
import { jsPDF } from 'jspdf'
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
        return [
          ['CRECI', c.creci || '—'],
          ['Imobiliária', c.imobiliaria?.nome || '—'],
          ['Cidade/UF', `${c.cidade}/${c.uf}`],
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

  const exportarPDF = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const W = doc.internal.pageSize.getWidth()
    let y = 54

    doc.setFontSize(10).setTextColor(120)
    doc.text('IDIBRA — Relatório', 40, y); y += 8
    doc.setDrawColor(220).line(40, y, W - 40, y); y += 22

    doc.setFontSize(16).setTextColor(20)
    doc.text(isCorretor ? `Relatório do corretor` : `Relatório do evento`, 40, y); y += 22
    doc.setFontSize(13).setTextColor(40)
    doc.text(titulo, 40, y); y += 20

    doc.setFontSize(10).setTextColor(90)
    resumo.forEach(([k, v]) => { doc.text(`${k}: ${v}`, 40, y); y += 15 })
    y += 8

    doc.setFontSize(11).setTextColor(20)
    doc.text(isCorretor ? 'Eventos' : 'Participantes', 40, y); y += 6
    doc.setDrawColor(220).line(40, y, W - 40, y); y += 16

    doc.setFontSize(9)
    const colNome = 40, colStatus = W - 200, colCheck = W - 110
    doc.setTextColor(130)
    doc.text(isCorretor ? 'Evento' : 'Corretor', colNome, y)
    doc.text('Status', colStatus, y)
    doc.text('Check-in', colCheck, y)
    y += 12
    doc.setTextColor(40)

    linhas.forEach((l) => {
      if (y > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = 54 }
      const nome = isCorretor ? (l.evento?.titulo ?? '—') : (l.corretor?.nome ?? '—')
      doc.text(String(nome).slice(0, 60), colNome, y)
      doc.text(STATUS_LABEL[l.status] ?? l.status, colStatus, y)
      doc.text(l.checkin_at ? formatDateTime(l.checkin_at) : '—', colCheck, y)
      y += 14
    })

    const nomeArq = `relatorio-${isCorretor ? 'corretor' : 'evento'}-${titulo.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`
    doc.save(nomeArq)
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

        {/* Lista */}
        <div className="mt-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">{isCorretor ? 'Eventos' : 'Participantes'} ({linhas.length})</h3>
          {loading ? (
            <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 text-green-600 animate-spin" /></div>
          ) : linhas.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Nenhum registro.</p>
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
                  {linhas.map((l) => (
                    <tr key={l.id} className="hover:bg-gray-50/50">
                      <td className="px-3 py-2 text-gray-800">{isCorretor ? (l.evento?.titulo ?? '—') : (l.corretor?.nome ?? '—')}</td>
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

        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={exportarPDF} disabled={loading} className="bg-green-700 hover:bg-green-800 gap-1.5">
            <FileText className="w-4 h-4" /> Exportar PDF
          </Button>
        </div>
        <p className="text-[11px] text-gray-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Relatório individual gerado a partir dos dados atuais.</p>
      </DialogContent>
    </Dialog>
  )
}
