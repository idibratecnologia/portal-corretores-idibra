import { useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, CheckCircle, XCircle, Eye, MapPin, Calendar, Clock, QrCode, X, ScanLine, Tv2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { StatCard } from '@/components/shared/StatCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { QrScanner } from '@/components/shared/QrScanner'
import { mockEventos, mockInscricoes, mockCorretoresComImobiliaria } from '@/data/mockData'
import { formatDate, formatDateTime } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import type { EventoInscricao } from '@/types'

export function AdminEventoDetalhes() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const evento = mockEventos.find((e) => e.id === id)
  const [inscricoes, setInscricoes] = useState<EventoInscricao[]>(
    mockInscricoes
      .filter((i) => i.evento_id === id)
      .map((i) => ({
        ...i,
        corretor: mockCorretoresComImobiliaria.find((c) => c.id === i.corretor_id),
      })) as EventoInscricao[]
  )
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scanResult, setScanResult] = useState<{ ok: boolean; message: string; name?: string } | null>(null)
  const [manualToken, setManualToken] = useState('')
  const scanResultTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  if (!evento) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-gray-500 mb-4">Evento não encontrado.</p>
        <Button onClick={() => navigate('/admin/eventos')} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
      </div>
    )
  }

  const total_inscritos = inscricoes.length
  const total_presentes = inscricoes.filter((i) => i.status === 'presente').length
  const total_ausentes = inscricoes.filter((i) => i.status === 'ausente').length
  const taxa = total_inscritos > 0 ? ((total_presentes / total_inscritos) * 100).toFixed(1) : '0.0'

  const handleStatus = (inscricaoId: string, status: EventoInscricao['status']) => {
    setInscricoes((prev) =>
      prev.map((i) =>
        i.id === inscricaoId
          ? { ...i, status, checkin_at: status === 'presente' ? new Date().toISOString() : undefined }
          : i
      )
    )
    toast({
      title: 'Status atualizado',
      description: status === 'presente' ? 'Presença confirmada.' : status === 'ausente' ? 'Ausência registrada.' : 'Inscrição cancelada.',
    })
  }

  const handleCheckinByToken = useCallback((token: string) => {
    const inscricao = inscricoes.find((i) => i.qr_code_token === token)
    if (!inscricao) {
      setScanResult({ ok: false, message: 'QR Code não encontrado ou inválido.' })
      return
    }
    if (inscricao.status === 'presente') {
      const nome = (inscricao as any).corretor?.nome || 'Corretor'
      setScanResult({ ok: false, message: `${nome} já realizou o check-in.` })
      return
    }
    if (inscricao.status === 'cancelado') {
      setScanResult({ ok: false, message: 'Inscrição cancelada. Check-in não permitido.' })
      return
    }
    const nome = (inscricao as any).corretor?.nome || 'Corretor'
    setInscricoes((prev) =>
      prev.map((i) =>
        i.qr_code_token === token
          ? { ...i, status: 'presente', checkin_at: new Date().toISOString() }
          : i
      )
    )
    setScanResult({ ok: true, message: 'Check-in realizado com sucesso!', name: nome })
    toast({ title: 'Check-in confirmado!', description: `${nome} marcado como presente.` })
    if (scanResultTimer.current) clearTimeout(scanResultTimer.current)
    scanResultTimer.current = setTimeout(() => setScanResult(null), 4000)
  }, [inscricoes])

  const handleManualCheckin = () => {
    if (!manualToken.trim()) return
    handleCheckinByToken(manualToken.trim())
    setManualToken('')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button onClick={() => navigate('/admin/eventos')} variant="outline" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{evento.titulo}</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <StatusBadge status={evento.status} />
            {evento.tipo && (
              <span className="text-sm text-gray-500 capitalize">{evento.tipo}</span>
            )}
          </div>
        </div>
      </div>

      {/* Evento info */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {evento.banner_url && (
          <img
            src={evento.banner_url}
            alt={evento.titulo}
            className="w-full h-48 object-cover"
          />
        )}
        <div className="p-6">
          <p className="text-gray-600 mb-4">{evento.descricao}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4 text-green-600" />
              <span>{formatDate(evento.data_evento)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4 text-green-600" />
              <span>{evento.hora_inicio} – {evento.hora_fim}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="w-4 h-4 text-green-600" />
              <span className="line-clamp-1">{evento.local}</span>
            </div>
          </div>
          {evento.empreendimento && (
            <p className="text-sm text-gray-500 mt-2">
              Empreendimento: <strong>{evento.empreendimento}</strong>
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total de Vagas" value={evento.capacidade} icon={Users} color="gray" />
        <StatCard title="Inscritos" value={total_inscritos} icon={Users} color="blue" />
        <StatCard title="Presentes" value={total_presentes} icon={CheckCircle} color="green" />
        <StatCard title="Taxa de Presença" value={`${taxa}%`} icon={CheckCircle} color="purple" />
      </div>

      {/* Check-in section */}
      <div className="bg-gradient-to-r from-green-700 to-green-600 rounded-2xl p-5 sm:p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <ScanLine className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base">Check-in por QR Code</h2>
              <p className="text-green-100 text-sm mt-0.5">
                {total_presentes} de {total_inscritos} presentes
                {total_inscritos > 0 && (
                  <span className="ml-2 bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {taxa}%
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              onClick={() => { setScannerOpen(true); setScanResult(null) }}
              className="bg-white text-green-700 hover:bg-green-50 font-bold rounded-xl gap-2 shadow-sm"
              size="lg"
            >
              <QrCode className="w-5 h-5" />
              Escanear QR Code
            </Button>
            <Button
              onClick={() => navigate(`/admin/checkin/${id}`)}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold rounded-xl gap-2"
              size="lg"
            >
              <Tv2 className="w-4 h-4" />
              Modo Quiosque
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${total_inscritos > 0 ? (total_presentes / total_inscritos) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Inscritos table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Lista de Inscritos ({total_inscritos})</h2>
        </div>

        {inscricoes.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum inscrito ainda"
            description="Os corretores ainda não se inscreveram neste evento."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Corretor</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">CRECI</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Imobiliária</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Inscrito em</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Check-in</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {inscricoes.map((inscricao) => (
                  <tr key={inscricao.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{(inscricao as any).corretor?.nome || '—'}</p>
                      <p className="text-xs text-gray-400">{(inscricao as any).corretor?.whatsapp}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-gray-600">
                      {(inscricao as any).corretor?.creci || '—'}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                      {(inscricao as any).corretor?.imobiliaria?.nome || '—'}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">
                      {formatDate(inscricao.created_at)}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">
                      {inscricao.checkin_at ? formatDateTime(inscricao.checkin_at) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inscricao.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/admin/corretores/${(inscricao as any).corretor?.id}`)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver perfil"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {inscricao.status !== 'presente' && inscricao.status !== 'cancelado' && (
                          <button
                            onClick={() => handleStatus(inscricao.id, 'presente')}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Confirmar presença"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {inscricao.status !== 'ausente' && inscricao.status !== 'cancelado' && (
                          <button
                            onClick={() => handleStatus(inscricao.id, 'ausente')}
                            className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                            title="Marcar ausência"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        {inscricao.status !== 'cancelado' && (
                          <button
                            onClick={() => handleStatus(inscricao.id, 'cancelado')}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Cancelar inscrição"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Scanner Modal */}
      {scannerOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-green-700" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Check-in por QR Code</p>
                  <p className="text-[11px] text-gray-400">Aponte a câmera para o QR do corretor</p>
                </div>
              </div>
              <button
                onClick={() => { setScannerOpen(false); setScanResult(null) }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scan result */}
            {scanResult && (
              <div className={`flex items-start gap-3 p-3 rounded-xl mb-4 border ${scanResult.ok ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                {scanResult.ok
                  ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                }
                <div>
                  {scanResult.name && (
                    <p className="text-sm font-bold text-green-800">{scanResult.name}</p>
                  )}
                  <p className={`text-xs ${scanResult.ok ? 'text-green-700' : 'text-red-600'}`}>
                    {scanResult.message}
                  </p>
                </div>
              </div>
            )}

            {/* Camera scanner */}
            <div className="mb-4 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
              <QrScanner onScan={handleCheckinByToken} />
            </div>

            {/* Manual input fallback */}
            <div>
              <p className="text-[11px] text-gray-400 text-center mb-2 font-medium uppercase tracking-wide">
                ou insira o token manualmente
              </p>
              <div className="flex gap-2">
                <input
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualCheckin()}
                  placeholder="Cole ou digite o token..."
                  className="flex-1 h-9 px-3 rounded-xl border border-gray-200 bg-gray-50 text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 font-mono"
                />
                <Button
                  onClick={handleManualCheckin}
                  size="sm"
                  className="bg-green-700 hover:bg-green-800 rounded-xl px-4 h-9 text-xs"
                >
                  OK
                </Button>
              </div>
            </div>

            <Button
              onClick={() => { setScannerOpen(false); setScanResult(null) }}
              variant="outline"
              className="w-full mt-4 rounded-xl border-gray-200"
            >
              Fechar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
