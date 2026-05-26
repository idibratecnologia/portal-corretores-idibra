import { useEffect, useRef, useState, useCallback } from 'react'
import jsQR from 'jsqr'
import { Camera, CameraOff, ShieldAlert, ScanLine } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface QrScannerProps {
  onScan: (token: string) => void
}

type ScannerState = 'idle' | 'requesting' | 'ready' | 'error'

export function QrScanner({ onScan }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  const rafRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)
  const lastCodeRef = useRef('')
  const lastTimeRef = useRef(0)
  const activeRef = useRef(false)

  const [state, setState] = useState<ScannerState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [isInsecure, setIsInsecure] = useState(false)

  const tick = useCallback(() => {
    if (!activeRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(tick)
      return
    }
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) { rafRef.current = requestAnimationFrame(tick); return }
    ctx.drawImage(video, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    })
    if (code?.data) {
      const now = Date.now()
      if (code.data !== lastCodeRef.current || now - lastTimeRef.current > 3000) {
        lastCodeRef.current = code.data
        lastTimeRef.current = now
        onScanRef.current(code.data)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const startCamera = useCallback(async () => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setState('error')
      setIsInsecure(true)
      setErrorMsg('A câmera requer conexão segura (HTTPS). Acesse o endereço https:// exibido no terminal.')
      return
    }

    setState('requesting')
    activeRef.current = true

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } },
      })
      if (!activeRef.current) { stream.getTracks().forEach((t) => t.stop()); return }
      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        video.onloadedmetadata = () => {
          video.play()
          setState('ready')
          rafRef.current = requestAnimationFrame(tick)
        }
      }
    } catch (err: any) {
      if (!activeRef.current) return
      setState('error')
      setIsInsecure(false)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
        setErrorMsg('Permissão de câmera negada. Clique no ícone de câmera na barra do navegador e selecione "Permitir".')
      else if (err.name === 'NotFoundError')
        setErrorMsg('Nenhuma câmera encontrada neste dispositivo.')
      else
        setErrorMsg(`Não foi possível acessar a câmera. (${err.name})`)
    }
  }, [tick])

  useEffect(() => {
    return () => {
      activeRef.current = false
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  // Tela inicial: pede confirmação antes de solicitar a câmera
  if (state === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8 text-center px-4">
        <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
          <ScanLine className="w-8 h-8 text-green-700" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-800 mb-1">Câmera necessária</p>
          <p className="text-xs text-gray-500 leading-relaxed max-w-[220px]">
            O navegador vai solicitar permissão para usar a câmera ao clicar no botão abaixo.
          </p>
        </div>
        <Button
          onClick={startCamera}
          className="bg-green-700 hover:bg-green-800 rounded-xl gap-2"
        >
          <Camera className="w-4 h-4" />
          Ativar câmera
        </Button>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8 text-center px-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isInsecure ? 'bg-amber-100' : 'bg-red-100'}`}>
          {isInsecure
            ? <ShieldAlert className="w-7 h-7 text-amber-600" />
            : <CameraOff className="w-7 h-7 text-red-500" />
          }
        </div>
        <div>
          <p className="text-sm font-bold text-gray-800 mb-1">
            {isInsecure ? 'Conexão insegura' : 'Câmera indisponível'}
          </p>
          <p className="text-xs text-gray-500 leading-relaxed max-w-[220px]">{errorMsg}</p>
        </div>
        {!isInsecure && (
          <Button
            onClick={() => { setState('idle'); setErrorMsg('') }}
            variant="outline"
            size="sm"
            className="rounded-xl text-xs"
          >
            Tentar novamente
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-black" style={{ aspectRatio: '4/3' }}>
      {state === 'requesting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/70 z-10">
          <Camera className="w-10 h-10 animate-pulse" />
          <p className="text-sm">Aguardando permissão…</p>
        </div>
      )}

      <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />
      <canvas ref={canvasRef} className="hidden" />

      {state === 'ready' && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="absolute inset-0 bg-black/35" />
          <div className="relative w-48 h-48 sm:w-56 sm:h-56">
            <div
              className="absolute inset-0 bg-transparent border-0 rounded-lg"
              style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }}
            />
            <div className="absolute top-0 left-0 w-7 h-7 border-t-2 border-l-2 border-green-400 rounded-tl" />
            <div className="absolute top-0 right-0 w-7 h-7 border-t-2 border-r-2 border-green-400 rounded-tr" />
            <div className="absolute bottom-0 left-0 w-7 h-7 border-b-2 border-l-2 border-green-400 rounded-bl" />
            <div className="absolute bottom-0 right-0 w-7 h-7 border-b-2 border-r-2 border-green-400 rounded-br" />
            <div className="absolute left-1 right-1 h-0.5 bg-green-400 rounded scan-line" />
          </div>
          <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-white/70">
            Posicione o QR Code no centro
          </p>
        </div>
      )}
    </div>
  )
}
