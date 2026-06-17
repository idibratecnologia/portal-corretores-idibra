import { useState, useCallback, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Users, CheckCircle, XCircle, Eye, MapPin, Calendar, Clock, QrCode, X, ScanLine, Tv2, BadgeCheck, Loader2, Maximize2, Send, Download, Award } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/shared/BackButton'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { StatCard } from '@/components/shared/StatCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { QrScanner } from '@/components/shared/QrScanner'
import { EventoMateriais } from '@/components/shared/EventoMateriais'
import { EventoTreinamentosAdmin } from '@/components/admin/EventoTreinamentosAdmin'
import { ShareEventoButton } from '@/components/shared/ShareEventoButton'
import { fetchEventoById, updateEvento } from '@/services/eventos'
import { fetchInscricoesByEvento, realizarCheckin, setInscricaoStatus, reenviarQrInscricao, exportarPresencaCsv, enviarCertificadosEvento } from '@/services/inscricoes'
import { formatDate, formatDateTime } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'
import { getErrorMessage } from '@/lib/errors'
import type { Evento, EventoInscricao } from '@/types'

export function AdminEventoDetalhes() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [evento, setEvento] = useState<Evento | null>(null)
  const [inscricoes, setInscricoes] = useState<EventoInscricao[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [bannerModal, setBannerModal] = useState(false)
  const [reenviandoId, setReenviandoId] = useState<string | null>(null)
  const [exportando, setExportando] = useState(false)
  const [toggleCert, setToggleCert] = useState(false)
  const [enviandoCert, setEnviandoCert] = useState(false)
  const [scanResult, setScanResult] = useState<{ ok: boolean; message: string; name?: string } | null>(null)
  const [manualToken, setManualToken] = useState('')
  const scanResultTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadData = useCallback(async () => {
    if (!id) return
    setIsLoading(true)
    try {
      const [ev, ins] = await Promise.all([
        fetchEventoById(id),
        fetchInscricoesByEvento(id),
      ])
      setEvento(ev)
      setInscricoes(ins)
    } catch {
      setNotFound(true)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => { loadData() }, [loadData])
  useRealtimeRefresh(loadData)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
      </div>
    )
  }

  if (notFound || !evento) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-gray-500 mb-4">Evento não encontrado.</p>
        <BackButton onClick={() => navigate('/admin/eventos')} />
      </div>
    )
  }

  const total_inscritos = inscricoes.filter((i) => i.status !== 'cancelado').length
  const total_presentes = inscricoes.filter((i) => i.status === 'presente').length
  const total_ausentes = inscricoes.filter((i) => i.status === 'ausente').length
  const taxa = total_inscritos > 0 ? ((total_presentes / total_inscritos) * 100).toFixed(1) : '0.0'

  const handleStatus = async (inscricaoId: string, status: 'presente' | 'ausente' | 'cancelado') => {
    try {
      await setInscricaoStatus(inscricaoId, status)
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
    } catch (err) {
      toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' })
    }
  }

  const handleExportCsv = async () => {
    setExportando(true)
    try {
      await exportarPresencaCsv(id!, evento?.titulo)
      toast({ title: 'Lista exportada', description: 'O arquivo CSV foi baixado.' })
    } catch (err) {
      toast({ title: 'Erro ao exportar', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setExportando(false)
    }
  }

  const handleToggleCertificados = async () => {
    if (!evento) return
    const novo = !evento.certificados_habilitados
    setToggleCert(true)
    try {
      await updateEvento(evento.id, { certificados_habilitados: novo })
      setEvento({ ...evento, certificados_habilitados: novo })
      toast({ title: novo ? 'Certificados liberados' : 'Certificados bloqueados', description: novo ? 'Os presentes já podem baixar o certificado.' : undefined })
    } catch (err) {
      toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setToggleCert(false)
    }
  }

  const handleEnviarCertificados = async () => {
    if (!evento) return
    setEnviandoCert(true)
    try {
      const r = await enviarCertificadosEvento(evento.id)
      toast({
        title: 'Certificados enviados',
        description: `${r.enfileirados} enviado(s) por WhatsApp${r.semOptIn ? ` · ${r.semOptIn} sem opt-in/WhatsApp` : ''}.`,
      })
    } catch (err) {
      toast({ title: 'Erro ao enviar', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setEnviandoCert(false)
    }
  }

  const handleReenviarQr = async (inscricaoId: string) => {
    setReenviandoId(inscricaoId)
    try {
      await reenviarQrInscricao(inscricaoId)
      toast({ title: 'QR reenviado', description: 'O QR Code de check-in foi enviado no WhatsApp do corretor.' })
    } catch (err) {
      toast({ title: 'Não foi possível reenviar', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setReenviandoId(null)
    }
  }

  const handleCheckinByToken = async (token: string) => {
    try {
      const result = await realizarCheckin(token)
      if (!result.ok) {
        setScanResult({ ok: false, message: result.erro || 'QR Code inválido.' })
        return
      }
      const nome = result.inscricao?.corretor?.nome || 'Corretor'
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
    } catch (err) {
      setScanResult({ ok: false, message: getErrorMessage(err) })
    }
  }

  const handleManualCheckin = () => {
    if (!manualToken.trim()) return
    handleCheckinByToken(manualToken.trim())
    setManualToken('')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <BackButton onClick={() => navigate('/admin/eventos')} />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{evento.titulo}</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <StatusBadge status={evento.status} />
            {evento.tipo && (
              <span className="text-sm text-gray-500 capitalize">{evento.tipo}</span>
            )}
            {evento.exclusivo && (
              <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Exclusivo</span>
            )}
          </div>
        </div>
        {!evento.exclusivo && id && <ShareEventoButton eventoId={id} titulo={evento.titulo} />}
      </div>

      {/* Evento info */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {evento.banner_url && (
          <button
            type="button"
            onClick={() => setBannerModal(true)}
            className="group relative block w-full h-48 sm:h-56 overflow-hidden cursor-zoom-in"
            aria-label="Ver imagem completa do banner"
          >
            <img
              src={evento.banner_url}
              alt={evento.titulo}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <span className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            <span className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-lg bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
              <Maximize2 className="w-3.5 h-3.5" /> Ver imagem completa
            </span>
          </button>
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
              onClick={() => navigate(`/admin/credenciamento/${id}`)}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold rounded-xl gap-2"
              size="lg"
            >
              <BadgeCheck className="w-4 h-4" />
              Credenciamento
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

      {/* Certificados */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Award className="w-4 h-4 text-green-600" />
          <h2 className="font-semibold text-gray-900">Certificados de participação</h2>
        </div>
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              role="switch"
              aria-checked={!!evento.certificados_habilitados}
              onClick={handleToggleCertificados}
              disabled={toggleCert}
              className={`mt-0.5 w-11 h-6 rounded-full flex-shrink-0 transition-colors ${evento.certificados_habilitados ? 'bg-green-600' : 'bg-gray-300'} disabled:opacity-60`}
            >
              <span className={`block w-5 h-5 bg-white rounded-full shadow transform transition-transform ${evento.certificados_habilitados ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
            <div>
              <p className="text-sm font-medium text-gray-800">
                {evento.certificados_habilitados ? 'Certificados liberados' : 'Certificados bloqueados'}
              </p>
              <p className="text-xs text-gray-500 max-w-md">
                Quando liberado, os corretores <strong>presentes</strong> podem baixar o certificado no portal e você pode enviá-los por WhatsApp.
              </p>
            </div>
          </div>
          <Button
            onClick={handleEnviarCertificados}
            disabled={!evento.certificados_habilitados || enviandoCert || total_presentes === 0}
            className="bg-green-700 hover:bg-green-800 gap-1.5 self-start"
          >
            {enviandoCert ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Enviar certificados (WhatsApp)
          </Button>
        </div>
      </div>

      {/* Materiais do evento */}
      {id && <EventoMateriais eventoId={id} admin />}

      {/* Treinamentos do evento */}
      {id && <EventoTreinamentosAdmin eventoId={id} />}

      {/* Inscritos table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-gray-900">Lista de Inscritos ({total_inscritos})</h2>
          {inscricoes.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={exportando}
              className="border-gray-200 gap-1.5"
            >
              {exportando
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Exportando…</>
                : <><Download className="w-3.5 h-3.5" /> Exportar CSV</>}
            </Button>
          )}
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
                      <p className="font-medium text-gray-900">{inscricao.corretor?.nome || '—'}</p>
                      <p className="text-xs text-gray-400">{inscricao.corretor?.whatsapp}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-gray-600">
                      {inscricao.corretor?.creci || '—'}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                      {inscricao.corretor?.imobiliaria?.nome || '—'}
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
                          onClick={() => navigate(`/admin/corretores/${inscricao.corretor?.id}`)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver perfil"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {inscricao.status !== 'cancelado' && (
                          <button
                            onClick={() => handleReenviarQr(inscricao.id)}
                            disabled={reenviandoId === inscricao.id}
                            className="p-1.5 text-gray-400 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Reenviar QR no WhatsApp"
                          >
                            {reenviandoId === inscricao.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Send className="w-4 h-4" />}
                          </button>
                        )}
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

      {/* Lightbox do banner (imagem completa) */}
      {bannerModal && evento.banner_url && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setBannerModal(false)}
        >
          <button
            onClick={() => setBannerModal(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={evento.banner_url}
            alt={evento.titulo}
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
