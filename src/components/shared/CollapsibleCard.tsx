import { useState, type ReactNode } from 'react'
import { ChevronDown, type LucideIcon } from 'lucide-react'

interface Props {
  title: string
  icon: LucideIcon
  /** Começa aberto? (padrão: fechado) */
  defaultOpen?: boolean
  /** Texto pequeno ao lado do título. */
  note?: ReactNode
  children: ReactNode
}

/** Cartão com cabeçalho clicável que expande/recolhe o conteúdo (accordion). */
export function CollapsibleCard({ title, icon: Icon, defaultOpen = false, note, children }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`w-full px-6 py-4 flex items-center gap-2 text-left transition-colors hover:bg-gray-50/60 ${open ? 'border-b border-gray-100' : ''}`}
      >
        <Icon className="w-4 h-4 text-green-600 flex-shrink-0" />
        <h2 className="font-semibold text-gray-900">{title}</h2>
        {note && <span className="text-xs text-gray-400">{note}</span>}
        <ChevronDown className={`w-4 h-4 text-gray-400 ml-auto flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && children}
    </div>
  )
}
