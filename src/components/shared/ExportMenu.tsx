import { useState } from 'react'
import { Download, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react'

export type ExportFormat = 'pdf' | 'excel' | 'csv'

interface Props {
  onExport: (fmt: ExportFormat) => void
  disabled?: boolean
  /** Formatos oferecidos (padrão: pdf, excel, csv). */
  formats?: ExportFormat[]
  label?: string
  /** Abre o menu para cima (útil quando o botão fica no rodapé). */
  dropUp?: boolean
}

const OPCOES: Record<ExportFormat, { label: string; icon: typeof FileText; color: string }> = {
  pdf:   { label: 'PDF',   icon: FileText,        color: 'text-red-600' },
  excel: { label: 'Excel', icon: FileSpreadsheet, color: 'text-green-700' },
  csv:   { label: 'CSV',   icon: Download,        color: 'text-gray-500' },
}

/** Botão "Exportar ▾" com menu de formatos. */
export function ExportMenu({ onExport, disabled, formats = ['pdf', 'excel', 'csv'], label = 'Exportar', dropUp = false }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        <Download className="w-3.5 h-3.5" /> {label} <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open !== dropUp ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <button type="button" aria-hidden className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} />
          <div className={`absolute right-0 z-20 w-36 bg-white rounded-xl border border-gray-100 shadow-lg py-1 ${dropUp ? 'bottom-full mb-1' : 'mt-1'}`}>
            {formats.map((f) => {
              const o = OPCOES[f]
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => { setOpen(false); onExport(f) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                >
                  <o.icon className={`w-4 h-4 ${o.color}`} /> {o.label}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
