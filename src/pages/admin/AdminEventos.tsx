import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Eye, Edit2, CheckCircle, XCircle, PlayCircle, StopCircle, Calendar, Ban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonTable } from '@/components/shared/Skeleton'
import { TablePagination } from '@/components/shared/TablePagination'
import { EventoModal } from '@/components/admin/EventoModal'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { mockEventos } from '@/data/mockData'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { usePageLoader } from '@/hooks/usePageLoader'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import type { Evento } from '@/types'

const PAGE_SIZE = 10

export function AdminEventos() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const isLoading = usePageLoader()
  const [eventos, setEventos] = useState<Evento[]>(mockEventos)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEvento, setEditingEvento] = useState<Evento | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ evento: Evento; action: 'encerrar' | 'cancelar' } | null>(null)
  const [page, setPage] = useState(1)

  const filtered = eventos.filter((e) => {
    const matchSearch = e.titulo.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      e.local.toLowerCase().includes(debouncedSearch.toLowerCase())
    const matchStatus = !statusFilter || e.status === statusFilter
    return matchSearch && matchStatus
  })

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleAction = (evento: Evento, action: string) => {
    const newStatus = {
      publicar: 'publicado',
      encerrar: 'encerrado',
      cancelar: 'cancelado',
    }[action] as Evento['status'] | undefined

    if (newStatus) {
      setEventos(prev => prev.map(e => e.id === evento.id ? { ...e, status: newStatus } : e))
      toast({ title: 'Status atualizado', description: `Evento ${action === 'publicar' ? 'publicado' : action === 'encerrar' ? 'encerrado' : 'cancelado'} com sucesso.`, variant: 'default' })
    }
  }

  const handleSave = (data: Partial<Evento>) => {
    if (editingEvento) {
      setEventos(prev => prev.map(e => e.id === editingEvento.id ? { ...e, ...data } : e))
      toast({ title: 'Evento atualizado', description: 'As alterações foram salvas.' })
    } else {
      const novo: Evento = {
        id: String(Date.now()),
        titulo: data.titulo || '',
        descricao: data.descricao || '',
        tipo: data.tipo || 'outro',
        empreendimento: data.empreendimento,
        local: data.local || '',
        endereco: data.endereco || '',
        link_maps: data.link_maps,
        data_evento: data.data_evento || '',
        hora_inicio: data.hora_inicio || '',
        hora_fim: data.hora_fim || '',
        capacidade: data.capacidade || 0,
        banner_url: data.banner_url,
        status: 'rascunho',
        inscricoes_abertas: data.inscricoes_abertas ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        total_inscritos: 0,
        total_presentes: 0,
      }
      setEventos(prev => [novo, ...prev])
      toast({ title: 'Evento criado', description: 'Novo evento criado com sucesso.', variant: 'default' })
    }
    setModalOpen(false)
    setEditingEvento(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Eventos</h1>
          <p className="text-gray-500 text-sm mt-1">{eventos.length} eventos cadastrados</p>
        </div>
        <Button
          onClick={() => { setEditingEvento(null); setModalOpen(true) }}
          className="bg-green-700 hover:bg-green-800 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Evento
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por título ou local..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="h-10 px-3 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 text-gray-700"
        >
          <option value="">Todos os status</option>
          <option value="rascunho">Rascunho</option>
          <option value="publicado">Publicado</option>
          <option value="encerrado">Encerrado</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {!isLoading && filtered.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Nenhum evento encontrado"
            description="Tente ajustar os filtros ou crie um novo evento."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Nome</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Tipo</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Data</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden xl:table-cell">Local</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Inscritos</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Presentes</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Ações</th>
                  </tr>
                </thead>
                {isLoading ? (
                  <SkeletonTable rows={8} cols={8} />
                ) : (
                <tbody className="divide-y divide-gray-50">
                {paginated.map((evento) => (
                  <tr key={evento.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 line-clamp-1">{evento.titulo}</p>
                      <p className="text-xs text-gray-400 mt-0.5 md:hidden">{evento.tipo} • {formatDate(evento.data_evento)}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="capitalize text-gray-600">{evento.tipo}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-600">
                      {formatDate(evento.data_evento)}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <span className="text-gray-600 line-clamp-1">{evento.local}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={evento.status} />
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      <span className="font-semibold text-gray-900">{evento.total_inscritos ?? 0}</span>
                      <span className="text-gray-400">/{evento.capacidade}</span>
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      <span className="font-semibold text-green-700">{evento.total_presentes ?? 0}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Fixas: Ver e Editar */}
                        <button
                          onClick={() => navigate(`/admin/eventos/${evento.id}`)}
                          title="Ver inscritos"
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 hover:scale-105 transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { setEditingEvento(evento); setModalOpen(true) }}
                          title="Editar evento"
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:scale-105 transition-all"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Separador visual */}
                        {evento.status !== 'cancelado' && (
                          <span className="w-px h-5 bg-gray-200 mx-0.5" />
                        )}

                        {/* Rascunho → Publicar */}
                        {evento.status === 'rascunho' && (
                          <button
                            onClick={() => handleAction(evento, 'publicar')}
                            title="Publicar evento"
                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:scale-105 text-xs font-semibold transition-all"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            Publicar
                          </button>
                        )}

                        {/* Publicado → Encerrar | Cancelar */}
                        {evento.status === 'publicado' && (
                          <>
                            <button
                              onClick={() => setConfirmAction({ evento, action: 'encerrar' })}
                              title="Encerrar evento"
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 hover:scale-105 transition-all"
                            >
                              <StopCircle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmAction({ evento, action: 'cancelar' })}
                              title="Cancelar evento"
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500 border border-red-100 hover:bg-red-100 hover:scale-105 transition-all"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {/* Encerrado → indicador */}
                        {evento.status === 'encerrado' && (
                          <span
                            title="Evento encerrado"
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 border border-slate-100"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </span>
                        )}

                        {/* Cancelado → indicador */}
                        {evento.status === 'cancelado' && (
                          <span
                            title="Evento cancelado"
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-300 border border-red-100"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
                )}
              </table>
            </div>
            {!isLoading && (
              <TablePagination
                total={filtered.length}
                page={page}
                pageSize={PAGE_SIZE}
                onPage={setPage}
              />
            )}
          </>
        )}
      </div>

      <EventoModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingEvento(null) }}
        onSave={handleSave}
        evento={editingEvento}
      />

      {/* Confirmação de ação destrutiva */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null) }}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-1 ${confirmAction?.action === 'cancelar' ? 'bg-red-50' : 'bg-amber-50'}`}>
              {confirmAction?.action === 'cancelar'
                ? <XCircle className="w-6 h-6 text-red-500" />
                : <StopCircle className="w-6 h-6 text-amber-500" />
              }
            </div>
            <AlertDialogTitle className="text-base">
              {confirmAction?.action === 'cancelar' ? 'Cancelar evento?' : 'Encerrar evento?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {confirmAction?.action === 'cancelar'
                ? <>O evento <strong>"{confirmAction?.evento.titulo}"</strong> será cancelado. Todos os inscritos serão notificados. Esta ação não pode ser desfeita.</>
                : <>O evento <strong>"{confirmAction?.evento.titulo}"</strong> será encerrado e não aceitará novas inscrições.</>
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmAction) handleAction(confirmAction.evento, confirmAction.action)
                setConfirmAction(null)
              }}
              className={`rounded-xl ${confirmAction?.action === 'cancelar' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'}`}
            >
              {confirmAction?.action === 'cancelar' ? 'Sim, cancelar' : 'Sim, encerrar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
