import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserCheck, UserX, Eye, Clock, Users, Building2, MapPin, Mail, Phone, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { BackButton } from '@/components/shared/BackButton'
import { fetchCorretores, setCorretorStatus } from '@/services/corretores'
import { PENDING_CHANGED_EVENT } from '@/components/admin/AdminSidebar'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import type { Corretor } from '@/types'

export function AdminAprovacoes() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [pendentes, setPendentes] = useState<Corretor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processing, setProcessing] = useState<Set<string>>(new Set())

  const loadPendentes = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetchCorretores({ status: 'pendente', limit: 100 })
      setPendentes(res.data)
    } catch (err) {
      toast({ title: 'Erro ao carregar', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => { loadPendentes() }, [loadPendentes])

  const handleAction = async (id: string, action: 'ativo' | 'bloqueado') => {
    const corretor = pendentes.find((c) => c.id === id)
    if (!corretor) return

    setProcessing((prev) => new Set([...prev, id]))
    try {
      await setCorretorStatus(id, action)
      // pequena espera para a animação de saída
      await new Promise((r) => setTimeout(r, 300))
      setPendentes((prev) => prev.filter((c) => c.id !== id))
      window.dispatchEvent(new Event(PENDING_CHANGED_EVENT))
      toast({
        title: action === 'ativo' ? 'Corretor aprovado ✓' : 'Corretor rejeitado',
        description: corretor.nome,
      })
    } catch (err) {
      toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <BackButton onClick={() => navigate('/admin/corretores')} />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Aprovação de Corretores</h1>
          <p className="text-gray-500 text-sm mt-1">
            {pendentes.length > 0
              ? `${pendentes.length} corretor${pendentes.length !== 1 ? 'es' : ''} aguardando análise`
              : 'Todos os cadastros foram processados'}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
        </div>
      ) : pendentes.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum corretor pendente"
          description="Todos os cadastros foram analisados. Novos pedidos aparecerão aqui."
          action={
            <Button
              onClick={() => navigate('/admin/corretores')}
              className="bg-green-700 hover:bg-green-800 rounded-xl"
            >
              Ver todos os corretores
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {pendentes.map((corretor) => {
            const isProcessing = processing.has(corretor.id)
            return (
              <div
                key={corretor.id}
                className={cn(
                  'bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-350',
                  isProcessing ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
                )}
              >
                {/* Status strip */}
                <div className="h-1 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400" />

                <div className="p-5">
                  {/* Avatar + name */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center text-green-700 text-2xl font-black flex-shrink-0 select-none">
                      {corretor.nome.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-base truncate leading-tight">
                        {corretor.nome}
                      </p>
                      <p className="text-xs text-gray-500 font-semibold mt-0.5">{corretor.creci}</p>
                      <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3" /> Aguardando aprovação
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="space-y-2 mb-5 text-sm">
                    {corretor.imobiliaria && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="truncate font-medium">{corretor.imobiliaria.nome}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-500">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span>{corretor.cidade}/{corretor.uf}</span>
                    </div>
                    <a
                      href={`mailto:${corretor.email}`}
                      className="flex items-center gap-2 text-gray-500 hover:text-green-700 transition-colors group w-fit"
                    >
                      <Mail className="w-3.5 h-3.5 text-gray-400 group-hover:text-green-600 flex-shrink-0" />
                      <span className="text-xs group-hover:underline truncate max-w-[180px]">{corretor.email}</span>
                    </a>
                    {corretor.telefone && (
                      <a
                        href={`tel:+55${corretor.telefone.replace(/\D/g, '')}`}
                        className="flex items-center gap-2 text-gray-500 hover:text-green-700 transition-colors group w-fit"
                      >
                        <Phone className="w-3.5 h-3.5 text-gray-400 group-hover:text-green-600 flex-shrink-0" />
                        <span className="text-xs group-hover:underline">{corretor.telefone}</span>
                      </a>
                    )}
                    <div className="flex items-center gap-2 text-gray-400">
                      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="text-xs">Cadastrado em {formatDate(corretor.created_at)}</span>
                    </div>
                  </div>

                  {/* Primary actions */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <Button
                      onClick={() => handleAction(corretor.id, 'ativo')}
                      disabled={isProcessing}
                      className="bg-green-600 hover:bg-green-700 text-white rounded-xl h-10 text-sm font-semibold gap-1.5 shadow-sm shadow-green-500/20"
                    >
                      <UserCheck className="w-4 h-4" /> Aprovar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleAction(corretor.id, 'bloqueado')}
                      disabled={isProcessing}
                      className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl h-10 text-sm font-semibold gap-1.5"
                    >
                      <UserX className="w-4 h-4" /> Rejeitar
                    </Button>
                  </div>

                  {/* Secondary action */}
                  <button
                    onClick={() => navigate(`/admin/corretores/${corretor.id}`)}
                    className="flex items-center justify-center gap-1.5 w-full py-2 text-xs text-gray-400 hover:text-green-700 transition-colors rounded-xl hover:bg-gray-50"
                  >
                    <Eye className="w-3.5 h-3.5" /> Ver perfil completo
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
