import { useState, useEffect, useCallback } from 'react'
import { Search, Loader2, ScrollText, ChevronLeft, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { useToast } from '@/hooks/use-toast'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { getErrorMessage } from '@/lib/errors'
import { fetchLogs, type AuditLog } from '@/services/logs'

const ACAO_LABEL: Record<string, { txt: string; cls: string }> = {
  criou:    { txt: 'Criou',    cls: 'bg-green-100 text-green-700' },
  editou:   { txt: 'Editou',   cls: 'bg-blue-100 text-blue-700' },
  excluiu:  { txt: 'Excluiu',  cls: 'bg-red-100 text-red-700' },
  status:   { txt: 'Status',   cls: 'bg-amber-100 text-amber-700' },
  aprovou:  { txt: 'Aprovou',  cls: 'bg-emerald-100 text-emerald-700' },
  enviou:   { txt: 'Enviou',   cls: 'bg-purple-100 text-purple-700' },
  importou: { txt: 'Importou', cls: 'bg-indigo-100 text-indigo-700' },
}

const ENTIDADE_LABEL: Record<string, string> = {
  corretor: 'Corretor', imobiliaria: 'Imobiliária', evento: 'Evento',
  usuario: 'Usuário', inscricao: 'Inscrição', certificado: 'Certificado', importacao: 'Importação',
}

export function AdminLogs() {
  const { toast } = useToast()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [entidade, setEntidade] = useState('')
  const [acao, setAcao] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetchLogs({ page, entidade: entidade || undefined, acao: acao || undefined, search: debouncedSearch || undefined })
      setLogs(r.data); setTotalPages(r.totalPages || 1); setTotal(r.total)
    } catch (err) {
      toast({ title: 'Erro ao carregar logs', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [page, entidade, acao, debouncedSearch, toast])

  useEffect(() => { load() }, [load])
  // volta à 1ª página ao mudar filtros
  useEffect(() => { setPage(1) }, [entidade, acao, debouncedSearch])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Logs de auditoria</h1>
        <p className="text-gray-500 text-sm mt-1">Histórico de ações dos administradores ({total})</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por alvo, usuário ou detalhe…" className="pl-9" />
        </div>
        <select value={entidade} onChange={(e) => setEntidade(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Todas as entidades</option>
          {Object.entries(ENTIDADE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={acao} onChange={(e) => setAcao(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Todas as ações</option>
          {Object.entries(ACAO_LABEL).map(([k, v]) => <option key={k} value={k}>{v.txt}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-green-600 animate-spin" /></div>
      ) : logs.length === 0 ? (
        <EmptyState icon={ScrollText} title="Nenhum log encontrado" description="As ações dos administradores aparecerão aqui." />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Data/hora</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Usuário</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Ação</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Entidade</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Alvo</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Detalhe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((l) => {
                  const a = ACAO_LABEL[l.acao] ?? { txt: l.acao, cls: 'bg-gray-100 text-gray-600' }
                  return (
                    <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{new Date(l.created_at).toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{l.admin_nome}</td>
                      <td className="px-4 py-3"><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${a.cls}`}>{a.txt}</span></td>
                      <td className="px-4 py-3 text-gray-600">{ENTIDADE_LABEL[l.entidade] ?? l.entidade}</td>
                      <td className="px-4 py-3 text-gray-800">{l.label ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 hidden lg:table-cell text-xs">{l.detalhe ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">Página {page} de {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="gap-1 border-gray-200">
                  <ChevronLeft className="w-4 h-4" /> Anterior
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="gap-1 border-gray-200">
                  Próxima <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
