import { useState, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'

interface AsyncState<T> {
  data:    T | null
  loading: boolean
  error:   string | null
}

interface UseAsyncReturn<T, Args extends unknown[]> {
  data:    T | null
  loading: boolean
  error:   string | null
  execute: (...args: Args) => Promise<T | null>
  reset:   () => void
}

/**
 * Hook para executar operações assíncronas com estado de loading/erro padronizado.
 *
 * @param fn       Função async a executar
 * @param options  successMessage: toast de sucesso após execução bem-sucedida
 *                 showErrorToast: mostrar toast automático em caso de erro (padrão: true)
 *
 * @example
 * const { execute, loading } = useAsync(updateCorretor, { successMessage: 'Corretor atualizado!' })
 * await execute(id, formData)
 */
export function useAsync<T, Args extends unknown[]>(
  fn: (...args: Args) => Promise<T>,
  options: { successMessage?: string; showErrorToast?: boolean } = {},
): UseAsyncReturn<T, Args> {
  const { showErrorToast = true } = options
  const { toast } = useToast()

  const [state, setState] = useState<AsyncState<T>>({
    data: null, loading: false, error: null,
  })

  const execute = useCallback(async (...args: Args): Promise<T | null> => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const result = await fn(...args)
      setState({ data: result, loading: false, error: null })

      if (options.successMessage) {
        toast({ title: options.successMessage })
      }

      return result
    } catch (err) {
      const message = getErrorMessage(err)
      setState((prev) => ({ ...prev, loading: false, error: message }))

      if (showErrorToast) {
        toast({ title: 'Erro', description: message, variant: 'destructive' })
      }

      return null
    }
  }, [fn, options.successMessage, showErrorToast, toast]) // eslint-disable-line react-hooks/exhaustive-deps

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  return { ...state, execute, reset }
}

/**
 * Versão simplificada para um único disparo (ex: load inicial da página).
 * Chama a função automaticamente na primeira renderização.
 */
export function useAsyncOnce<T>(
  fn: () => Promise<T>,
): { data: T | null; loading: boolean; error: string | null; refetch: () => void } {
  const { data, loading, error, execute } = useAsync(fn, { showErrorToast: false })

  // A chamada inicial é feita externamente com useEffect — este hook não usa useEffect
  // para manter a responsabilidade de quando chamar no componente.

  return { data, loading, error, refetch: () => execute() }
}
