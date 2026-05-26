import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, Calendar, MapPin, QrCode, X, CheckCircle, XCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/shared/Skeleton'
import { QrCodeCard } from '@/components/shared/QrCodeCard'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { mockInscricoesCorretorLogado } from '@/data/mockData'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { usePageLoader } from '@/hooks/usePageLoader'
import { cn } from '@/lib/utils'

const statusConfig: Record<string, {
  icon: React.ElementType
  label: string
  bg: string
  text: string
  border: string
  bar: string
}> = {
  inscrito:  { icon: Clock,       label: 'Inscrito',  bg: 'bg-blue-50',  text: 'text-blue-700',  border: 'border-blue-200',  bar: '#93c5fd' },
  presente:  { icon: CheckCircle, label: 'Presente',  bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', bar: '#4ade80' },
  ausente:   { icon: XCircle,     label: 'Ausente',   bg: 'bg-red-50',   text: 'text-red-700',   border: 'border-red-200',   bar: '#f87171' },
  cancelado: { icon: X,           label: 'Cancelado', bg: 'bg-gray-50',  text: 'text-gray-500',  border: 'border-gray-200',  bar: '#e5e7eb' },
}

export function CorretorInscricoes() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const isLoading = usePageLoader()
  const [inscricoes, setInscricoes] = useState(mockInscricoesCorretorLogado)
  const [qrModal, setQrModal] = useState<{ token: string; titulo: string } | null>(null)
  const [filter, setFilter] = useState<string>('todos')
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null)

  const filtered = filter === 'todos' ? inscricoes : inscricoes.filter((i) => i.status === filter)

  const handleCancelar = (id: string) => {
    setInscricoes((prev) => prev.map((i) => i.id === id ? { ...i, status: 'cancelado' as const } : i))
    toast({ title: 'Inscrição cancelada', description: 'Sua inscrição foi cancelada.' })
    setConfirmCancel(null)
  }

  const totais = {
    todos:    inscricoes.length,
    inscrito: inscricoes.filter(i => i.status === 'inscrito').length,
    presente: inscricoes.filter(i => i.status === 'presente').length,
    ausente:  inscricoes.filter(i => i.status === 'ausente').length,
  }

  const cancelTarget = inscricoes.find((i) => i.id === confirmCancel)

  return (
    <div className="space-y-5 pb-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Minhas Inscrições</h1>
        <p className="text-sm text-gray-500 mt-0.5">{inscricoes.length} inscrição(ões) no total</p>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'todos',    label: 'Todas',    count: totais.todos    },
          { key: 'inscrito', label: 'Inscritas', count: totais.inscrito },
          { key: 'presente', label: 'Presente',  count: totais.presente },
          { key: 'ausente',  label: 'Ausente',   count: totais.ausente  },
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
            <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', filter === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500')}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Skeleton loading */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex animate-pulse">
              <Skeleton className="w-1.5 self-stretch flex-shrink-0 rounded-none" />
              <div className="flex-1 p-4 space-y-2">
                <Skeleton className="h-3 w-1/5" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex gap-4">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <div className="flex items-center gap-2 pr-4">
                <Skeleton className="w-8 h-8 rounded-xl" />
                <Skeleton className="w-20 h-8 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhuma inscrição aqui"
          description="Explore os eventos disponíveis e garanta sua vaga."
          action={
            <Button onClick={() => navigate('/portal/eventos')} className="bg-green-700 hover:bg-green-800 rounded-xl">
              Ver eventos
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((inscricao) => {
            const st = statusConfig[inscricao.status] ?? statusConfig.cancelado
            const StatusIcon = st.icon
            const podeQr = inscricao.status === 'inscrito' || inscricao.status === 'presente'
            const podeCancelar = inscricao.status === 'inscrito'

            return (
              <div key={inscricao.id} className={cn('bg-white rounded-2xl border shadow-sm overflow-hidden', st.border)}>
                <div className="flex">
                  <div className="w-1 sm:w-1.5 flex-shrink-0 self-stretch" style={{ background: st.bar }} />

                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn('flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border', st.bg, st.text, st.border)}>
                            <StatusIcon className="w-3 h-3" /> {st.label}
                          </span>
                          {inscricao.evento?.tipo && (
                            <span className="text-[10px] text-gray-400 capitalize">{inscricao.evento.tipo}</span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-gray-900 line-clamp-1 leading-tight">
                          {inscricao.evento?.titulo || '—'}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-500">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-green-500" />
                            {inscricao.evento ? formatDate(inscricao.evento.data_evento) : '—'}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-green-500" />
                            <span className="line-clamp-1 max-w-[180px]">{inscricao.evento?.local}</span>
                          </span>
                        </div>
                        {inscricao.checkin_at && (
                          <p className="text-[11px] text-green-600 font-medium mt-1.5">
                            Check-in: {new Date(inscricao.checkin_at).toLocaleString('pt-BR')}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {podeQr && (
                          <button
                            aria-label="Ver QR Code de check-in"
                            onClick={() => setQrModal({ token: inscricao.qr_code_token, titulo: inscricao.evento?.titulo || '' })}
                            className="p-2 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                        )}
                        {podeCancelar && (
                          <button
                            aria-label="Cancelar inscrição"
                            onClick={() => setConfirmCancel(inscricao.id)}
                            className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-8 px-3 rounded-xl border-gray-200"
                          onClick={() => navigate(`/portal/eventos/${inscricao.evento_id}`)}
                        >
                          Ver evento
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* QR Code Modal */}
      {qrModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-green-700" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-gray-900">QR Code de Check-in</p>
                  <p className="text-[11px] text-gray-400">Apresente na entrada do evento</p>
                </div>
              </div>
              <button
                aria-label="Fechar modal"
                onClick={() => setQrModal(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <QrCodeCard token={qrModal.token} eventTitle={qrModal.titulo} size={190} />

            <Button onClick={() => setQrModal(null)} variant="outline" className="w-full mt-4 rounded-xl border-gray-200">
              Fechar
            </Button>
          </div>
        </div>
      )}

      {/* Confirmação de cancelamento */}
      <AlertDialog open={!!confirmCancel} onOpenChange={(open) => { if (!open) setConfirmCancel(null) }}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-1">
              <X className="w-6 h-6 text-red-500" />
            </div>
            <AlertDialogTitle className="text-base">Cancelar inscrição?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {cancelTarget?.evento?.titulo ? (
                <>Sua inscrição em <strong>"{cancelTarget.evento.titulo}"</strong> será cancelada. Esta ação não pode ser desfeita.</>
              ) : (
                'Sua inscrição será cancelada. Esta ação não pode ser desfeita.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmCancel && handleCancelar(confirmCancel)}
              className="rounded-xl bg-red-600 hover:bg-red-700"
            >
              Sim, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
