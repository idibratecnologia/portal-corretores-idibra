import { useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface QrCodeCardProps {
  token: string
  eventTitle?: string
  size?: number
}

export function QrCodeCard({ token, eventTitle, size = 200 }: QrCodeCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = url
    link.download = `checkin-${token.slice(-8)}.png`
    link.click()
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {eventTitle && (
        <p className="text-xs text-gray-500 text-center font-medium max-w-[200px] leading-snug">
          {eventTitle}
        </p>
      )}

      <div className="p-4 bg-white border-2 border-gray-100 rounded-2xl shadow-sm">
        <QRCodeCanvas
          ref={canvasRef}
          value={token}
          size={size}
          marginSize={1}
          level="M"
        />
      </div>

      <p className="text-[10px] font-mono text-gray-400 text-center break-all max-w-[200px] leading-tight">
        {token}
      </p>

      <Button
        onClick={handleDownload}
        variant="outline"
        size="sm"
        className="gap-2 rounded-xl border-gray-200 text-xs"
      >
        <Download className="w-3.5 h-3.5" />
        Baixar QR Code
      </Button>
    </div>
  )
}
