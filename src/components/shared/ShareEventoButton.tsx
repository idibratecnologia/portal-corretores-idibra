import { useState } from 'react'
import { Share2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  eventoId: string
  titulo?: string
  className?: string
}

/** Gera/compartilha o link público do evento (/evento/:id). */
export function ShareEventoButton({ eventoId, titulo, className }: Props) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/evento/${eventoId}`

  const handleShare = async () => {
    // Web Share API (mobile) — abre o menu nativo de compartilhamento
    if (navigator.share) {
      try {
        await navigator.share({ title: titulo || 'Evento IDIBRA', url })
        return
      } catch { /* usuário cancelou — segue para copiar */ }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard indisponível */ }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleShare} className={`gap-1.5 border-gray-200 ${className ?? ''}`}>
      {copied
        ? <><Check className="w-3.5 h-3.5 text-green-600" /> Link copiado</>
        : <><Share2 className="w-3.5 h-3.5" /> Compartilhar</>}
    </Button>
  )
}
