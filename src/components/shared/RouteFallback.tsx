import { Loader2 } from 'lucide-react'

/**
 * Loader discreto exibido enquanto o "pedaço" (chunk) de uma página
 * carrega sob demanda. Leve por design — o splash de marca é reservado
 * apenas para a inicialização do app.
 */
export function RouteFallback() {
  return (
    <div className="flex items-center justify-center py-24 text-green-600">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  )
}
