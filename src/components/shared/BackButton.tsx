import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BackButtonProps {
  onClick: () => void
  label?: string
  className?: string
}

export function BackButton({ onClick, label = 'Voltar', className }: BackButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group inline-flex items-center gap-2.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors duration-150',
        className
      )}
    >
      <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-white border border-gray-200 shadow-sm group-hover:border-gray-300 group-hover:shadow group-hover:-translate-x-0.5 transition-all duration-200">
        <ArrowLeft className="w-4 h-4" />
      </span>
      {label}
    </button>
  )
}
