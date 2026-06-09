import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, Loader2, CheckCircle2, QrCode, RefreshCw, X, Link2Off, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { getWhatsappStatus, conectarWhatsapp, desconectarWhatsapp, enviarTesteWhatsapp } from '@/services/whatsapp'
import type { WhatsappStatus } from '@/services/whatsapp'
import { fetchEventosPublicados } from '@/services/eventos'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Send } from 'lucide-react'
import type { Evento } from '@/types'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'

export function WhatsappSync() {
  const { toast } = useToast()
  const [status, setStatus] = useState<WhatsappStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrModal, setQrModal] = useState(false)
  const [qrcode, setQrcode] = useState<string | null>(null)
  const [conectando, setConectando] = useState(false)
  const [confirmDesconectar, setConfirmDesconectar] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Teste de envio
  const [eventos, setEventos] = useState<Evento[]>([])
  const [testeNumero, setTesteNumero] = useState('')
  const [testeEvento, setTesteEvento] = useState('')
  const [testeImagem, setTesteImagem] = useState('')
  const [enviandoTeste, setEnviandoTeste] = useState(false)

  const carregarStatus = useCallback(async () => {
    try {
      setStatus(await getWhatsappStatus())
    } catch {
      setStatus({ configurado: false, state: 'desconhecido', conectado: false, fila: 0 })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarStatus()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [carregarStatus])

  // Atualiza o status periodicamente quando conectado (mantém o indicador da fila vivo)
  useEffect(() => {
    if (!status?.conectado) return
    const id = setInterval(() => { carregarStatus() }, 5000)
    return () => clearInterval(id)
  }, [status?.conectado, carregarStatus])

  // Carrega eventos publicados para o seletor de teste (quando conectado)
  useEffect(() => {
    if (status?.conectado) {
      fetchEventosPublicados().then((evs) => {
        setEventos(evs)
        if (evs[0]) setTesteEvento(evs[0].id)
      }).catch(() => {})
    }
  }, [status?.conectado])

  const handleEnviarTeste = async () => {
    if (!testeNumero.trim() || !testeEvento) {
      toast({ title: 'Preencha o número e selecione um evento', variant: 'destructive' })
      return
    }
    setEnviandoTeste(true)
    try {
      const r = await enviarTesteWhatsapp({
        numero: testeNumero,
        evento_id: testeEvento,
        imagem_url: testeImagem.trim() || undefined,
      })
      toast({ title: 'Teste enviado!', description: r.comImagem ? 'Mensagem com imagem enviada.' : 'Mensagem enviada.' })
    } catch (err) {
      toast({ title: 'Erro ao enviar', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setEnviandoTeste(false)
    }
  }

  const handleSincronizar = async () => {
    setConectando(true)
    setQrcode(null)
    setQrModal(true)
    try {
      const res = await conectarWhatsapp()
      if (res.conectado) {
        setQrModal(false)
        toast({ title: 'WhatsApp conectado!', description: 'A integração já está ativa.' })
        carregarStatus()
        return
      }
      setQrcode(res.qrcode)
      // Faz polling do status até conectar (ou o admin fechar)
      pollRef.current = setInterval(async () => {
        const s = await getWhatsappStatus()
        if (s.conectado) {
          if (pollRef.current) clearInterval(pollRef.current)
          setStatus(s)
          setQrModal(false)
          toast({ title: 'WhatsApp conectado!', description: 'Sincronização concluída com sucesso.' })
        }
      }, 3000)
    } catch (err) {
      setQrModal(false)
      toast({ title: 'Erro ao conectar', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setConectando(false)
    }
  }

  const fecharModal = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    setQrModal(false)
    carregarStatus()
  }

  const handleDesconectar = async () => {
    try {
      await desconectarWhatsapp()
      toast({ title: 'WhatsApp desconectado' })
      carregarStatus()
    } catch (err) {
      toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setConfirmDesconectar(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-green-600" />
          <CardTitle className="text-base">Integração WhatsApp</CardTitle>
        </div>
        <CardDescription>Conecte o WhatsApp da IDIBRA para enviar as notificações automáticas</CardDescription>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
          </div>
        ) : !status?.configurado ? (
          // Evolution não configurado no servidor
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <p className="font-semibold mb-1">Servidor de WhatsApp não configurado</p>
            <p className="text-xs leading-relaxed">
              Para habilitar, configure o Evolution API no servidor (variáveis <code>EVOLUTION_URL</code> e
              <code> EVOLUTION_API_KEY</code> no <code>.env</code>) e reinicie a API.
            </p>
          </div>
        ) : status.conectado ? (
          // Conectado
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-green-800">WhatsApp conectado</p>
                <p className="text-xs text-green-600">As notificações automáticas estão ativas.</p>
              </div>
            </div>

            {/* Indicador da fila de envio */}
            <div
              className={`flex items-center gap-3 rounded-xl p-3 border transition-colors ${
                (status.fila ?? 0) > 0
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  (status.fila ?? 0) > 0 ? 'bg-amber-100' : 'bg-gray-100'
                }`}
              >
                {(status.fila ?? 0) > 0
                  ? <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                  : <Clock className="w-4 h-4 text-gray-400" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-700">Fila de envio</p>
                <p className="text-xs text-gray-500">
                  {(status.fila ?? 0) > 0
                    ? `${status.fila} mensagem(ns) aguardando envio (ritmo controlado para evitar bloqueio).`
                    : 'Nenhuma mensagem na fila.'}
                </p>
              </div>
              {(status.fila ?? 0) > 0 && (
                <span className="text-lg font-black text-amber-600 tabular-nums">{status.fila}</span>
              )}
            </div>

            {/* Enviar teste */}
            <div className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50/50">
              <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-green-600" /> Enviar teste
              </p>
              <div>
                <Label className="text-xs">Número (com DDD)</Label>
                <Input
                  value={testeNumero}
                  onChange={(e) => setTesteNumero(e.target.value)}
                  placeholder="Ex: 88998404876"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Evento</Label>
                <select
                  value={testeEvento}
                  onChange={(e) => setTesteEvento(e.target.value)}
                  className="mt-1 flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 text-gray-700"
                >
                  {eventos.length === 0 && <option value="">Nenhum evento publicado</option>}
                  {eventos.map((e) => (
                    <option key={e.id} value={e.id}>{e.titulo}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">URL da imagem (opcional)</Label>
                <Input
                  value={testeImagem}
                  onChange={(e) => setTesteImagem(e.target.value)}
                  placeholder="https://... (usa o banner do evento se vazio)"
                  className="mt-1"
                />
              </div>
              <Button
                onClick={handleEnviarTeste}
                disabled={enviandoTeste}
                className="w-full bg-green-700 hover:bg-green-800 gap-2"
              >
                {enviandoTeste ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Enviar notificação de teste</>}
              </Button>
            </div>

            <Button
              variant="outline"
              onClick={() => setConfirmDesconectar(true)}
              className="w-full border-red-200 text-red-600 hover:bg-red-50 gap-2"
            >
              <Link2Off className="w-4 h-4" /> Desconectar
            </Button>
          </div>
        ) : (
          // Configurado mas desconectado
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <QrCode className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Não conectado</p>
                <p className="text-xs text-gray-500">Sincronize escaneando o QR Code com o WhatsApp da empresa.</p>
              </div>
            </div>
            <Button onClick={handleSincronizar} className="w-full bg-green-700 hover:bg-green-800 gap-2">
              <QrCode className="w-4 h-4" /> Sincronizar WhatsApp
            </Button>
          </div>
        )}
      </CardContent>

      {/* Modal do QR Code */}
      {qrModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-green-700" />
                </div>
                <p className="text-sm font-bold text-gray-900">Sincronizar WhatsApp</p>
              </div>
              <button onClick={fecharModal} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {conectando && !qrcode ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
                <p className="text-sm text-gray-500">Gerando QR Code...</p>
              </div>
            ) : qrcode ? (
              <>
                <div className="bg-white border-2 border-gray-100 rounded-2xl p-3 mx-auto w-fit">
                  <img src={qrcode} alt="QR Code WhatsApp" className="w-56 h-56" />
                </div>
                <div className="mt-4 text-left bg-gray-50 rounded-xl p-3 text-xs text-gray-600 space-y-1">
                  <p className="font-semibold text-gray-700">Como sincronizar:</p>
                  <p>1. Abra o WhatsApp da empresa no celular</p>
                  <p>2. Toque em <strong>Configurações → Aparelhos conectados</strong></p>
                  <p>3. Toque em <strong>Conectar um aparelho</strong> e escaneie</p>
                </div>
                <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Aguardando leitura...
                </div>
                <Button variant="outline" onClick={handleSincronizar} className="w-full mt-3 rounded-xl gap-2 text-xs">
                  <RefreshCw className="w-3.5 h-3.5" /> Gerar novo QR Code
                </Button>
              </>
            ) : (
              <p className="py-8 text-sm text-gray-500">Não foi possível gerar o QR Code.</p>
            )}
          </div>
        </div>
      )}

      {/* Confirmação de desconexão */}
      <AlertDialog open={confirmDesconectar} onOpenChange={setConfirmDesconectar}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Desconectar WhatsApp?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              As notificações automáticas deixarão de ser enviadas até você sincronizar novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDesconectar} className="rounded-xl bg-red-600 hover:bg-red-700">
              Desconectar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
