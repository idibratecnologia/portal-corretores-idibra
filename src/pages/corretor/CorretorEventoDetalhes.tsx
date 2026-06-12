import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Calendar, Clock, MapPin, Users, ExternalLink, QrCode, X, Loader2, Maximize2, Award } from 'lucide-react'
import { BackButton } from '@/components/shared/BackButton'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { QrCodeCard } from '@/components/shared/QrCodeCard'
import { EventoMateriais } from '@/components/shared/EventoMateriais'
import { fetchEventoById } from '@/services/eventos'
import { fetchMinhasInscricoes, createInscricao, cancelarInscricao, baixarCertificado } from '@/services/inscricoes'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'
import type { Evento, EventoInscricao } from '@/types'

export function CorretorEventoDetalhes() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [evento, setEvento] = useState<Evento | null>(null)
  const [inscricoes, setInscricoes] = useState<EventoInscricao[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [qrModal, setQrModal] = useState(false)
  const [bannerModal, setBannerModal] = useState(false)
  const [acting, setActing] = useState(false)
  const [baixandoCert, setBaixandoCert] = useState(false)

  const loadData = useCallback(async () => {
    if (!id) return
    setIsLoading(true)
    try {
      const [ev, minhas] = await Promise.all([fetchEventoById(id), fetchMinhasInscricoes()])
      setEvento(ev)
      setInscricoes(minhas)
    } catch {
      setNotFound(true)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => { loadData() }, [loadData])

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
        <BackButton onClick={() => navigate('/portal/eventos')} />
      </div>
    )
  }

  const inscricao = inscricoes.find((i) => i.evento_id === id)
  const isInscrito = !!inscricao && inscricao.status !== 'cancelado'
  const totalInscritos = evento.total_inscritos ?? 0
  const vagas = Math.max(0, evento.capacidade - totalInscritos)
  const lotado = vagas === 0 && !isInscrito

  const handleInscrever = async () => {
    if (acting) return
    setActing(true)
    try {
      await createInscricao(id!)
      toast({ title: 'Inscrição realizada!', description: `Você se inscreveu em "${evento.titulo}".` })
      await loadData()
    } catch (err) {
      toast({ title: 'Não foi possível inscrever', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setActing(false)
    }
  }

  const handleBaixarCertificado = async () => {
    if (!inscricao) return
    setBaixandoCert(true)
    try {
      await baixarCertificado(inscricao.id, evento.titulo)
    } catch (err) {
      toast({ title: 'Certificado indisponível', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setBaixandoCert(false)
    }
  }

  const handleCancelar = async () => {
    if (!inscricao || acting) return
    setActing(true)
    try {
      await cancelarInscricao(inscricao.id)
      toast({ title: 'Inscrição cancelada', description: 'Sua inscrição foi cancelada.' })
      await loadData()
    } catch (err) {
      toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setActing(false)
    }
  }

  return (
    <div className="space-y-6">
      <BackButton onClick={() => navigate('/portal/eventos')} label="Voltar aos eventos" />

      {/* Banner (visão reduzida — clique para ver a imagem completa) */}
      {evento.banner_url ? (
        <button
          type="button"
          onClick={() => setBannerModal(true)}
          className="group relative block w-full h-40 sm:h-52 overflow-hidden rounded-xl cursor-zoom-in"
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
      ) : (
        <div className="w-full h-40 sm:h-52 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center">
          <Calendar className="w-16 h-16 text-green-400" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-green-700 bg-green-50 px-3 py-1 rounded-full capitalize">
                {evento.tipo}
              </span>
              <StatusBadge status={evento.status} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{evento.titulo}</h1>
            {evento.empreendimento && (
              <p className="text-gray-500 mt-1">Empreendimento: {evento.empreendimento}</p>
            )}
          </div>

          {evento.descricao && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-2">Sobre o evento</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{evento.descricao}</p>
            </div>
          )}
        </div>

        {/* Side info */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
            <h3 className="font-semibold text-gray-900">Informações</h3>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">{formatDate(evento.data_evento)}</p>
                  <p className="text-gray-500">{evento.hora_inicio} – {evento.hora_fim}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">{evento.local}</p>
                  <p className="text-gray-500 text-xs">{evento.endereco}</p>
                  {evento.link_maps && (
                    <a
                      href={evento.link_maps}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 text-xs flex items-center gap-1 mt-1 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" /> Ver no mapa
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">
                    {lotado ? 'Sem vagas disponíveis' : `${vagas} vaga(s) disponível(is)`}
                  </p>
                  <p className="text-gray-500 text-xs">{totalInscritos}/{evento.capacidade} inscritos</p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 space-y-2">
              {isInscrito ? (
                <>
                  <div className="flex items-center justify-between bg-green-50 border border-green-100 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <QrCode className="w-4 h-4 text-green-700" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-green-800">Você está inscrito!</p>
                        <StatusBadge status={inscricao?.status || 'inscrito'} />
                      </div>
                    </div>
                  </div>

                  {(inscricao?.status === 'inscrito' || inscricao?.status === 'presente') && (
                    <Button
                      className="w-full bg-green-700 hover:bg-green-800 gap-2 rounded-xl"
                      onClick={() => setQrModal(true)}
                    >
                      <QrCode className="w-4 h-4" />
                      Ver QR Code de Check-in
                    </Button>
                  )}

                  {inscricao?.status === 'inscrito' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-red-600 border-red-200 hover:bg-red-50 rounded-xl"
                      onClick={handleCancelar}
                    >
                      Cancelar inscrição
                    </Button>
                  )}

                  {inscricao?.checkin_at && (
                    <p className="text-[11px] text-green-600 font-medium text-center">
                      Check-in realizado: {new Date(inscricao.checkin_at).toLocaleString('pt-BR')}
                    </p>
                  )}

                  {inscricao?.status === 'presente' && evento.certificados_habilitados && (
                    <Button
                      variant="outline"
                      className="w-full border-green-200 text-green-700 hover:bg-green-50 gap-2 rounded-xl"
                      onClick={handleBaixarCertificado}
                      disabled={baixandoCert}
                    >
                      {baixandoCert ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                      Baixar certificado
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  className="w-full bg-green-700 hover:bg-green-800 rounded-xl"
                  onClick={handleInscrever}
                  disabled={lotado || evento.status !== 'publicado'}
                >
                  {lotado ? 'Evento lotado' : 'Inscrever-se'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Materiais do evento (apenas para inscritos) */}
      {isInscrito && id && <EventoMateriais eventoId={id} />}

      {/* QR Code Modal */}
      {qrModal && inscricao && (
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
                onClick={() => setQrModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <QrCodeCard token={inscricao.qr_code_token} eventTitle={evento.titulo} size={190} />

            <Button
              onClick={() => setQrModal(false)}
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
