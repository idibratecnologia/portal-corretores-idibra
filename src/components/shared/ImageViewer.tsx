import { useEffect } from 'react'
import { X } from 'lucide-react'

/**
 * Modal para visualizar uma imagem ampliada (ex.: foto de perfil).
 * Responsivo: ocupa quase a tela no mobile e centraliza num card no desktop.
 * Fecha no clique fora, no botão X ou com Esc.
 */
export function ImageViewer({ src, alt, open, onClose }: { src: string; alt?: string; open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    // trava o scroll do fundo enquanto o modal está aberto
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão fechar */}
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Imagem */}
        <div className="bg-slate-100 flex items-center justify-center">
          <img
            src={src}
            alt={alt ?? 'Foto'}
            className="w-full max-h-[70vh] sm:max-h-[75vh] object-contain"
          />
        </div>

        {/* Legenda (nome) */}
        {alt && (
          <div className="px-5 py-3 border-t border-gray-100">
            <p className="text-sm font-semibold text-gray-900 truncate">{alt}</p>
          </div>
        )}
      </div>
    </div>
  )
}
