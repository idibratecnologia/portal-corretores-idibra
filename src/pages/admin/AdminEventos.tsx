import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, Eye, Edit2, CheckCircle, XCircle,
  PlayCircle, StopCircle, Calendar, Ban, ChevronUp, ChevronDown, BadgeCheck, Trash2,
} from 'lucide-react'
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
import { fetchEventos, createEvento, updateEvento, setEventoStatus, uploadBannerEvento, deleteEvento } from '@/services/eventos'
import { useAuth } from '@/contexts/AuthContext'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { getErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import type { Evento } from '@/types'
import { TIPO_EVENTO_LABELS } from '@/types'

const PAGE_SIZE = 10

type SortFieldE = 'titulo' | 'data_evento' | 'status' | 'total_inscritos' | 'total_presentes'
type SortDir = 'asc' | 'desc'

const tipoColors: Record<string, string> = {
  lancamento:  'bg-purple-50 text-purple-700 border border-purple-100',
  treinamento: 'bg-blue-50 text-blue-700 border border-blue-100',
  reuniao:     'bg-amber-50 text-amber-700 border border-amber-100',
  feira:       'bg-pink-50 text-pink-700 border border-pink-100',
  workshop:    'bg-teal-50 text-teal-700 border border-teal-100',
  outro:       'bg-gray-50 text-gray-600 border border-gray-100',
}

function relativeDays(dateStr: string): { label: string; cls: string } {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0)  return { label: 'Hoje!',         cls: 'text-amber-600 font-bold' }
  if (diff === 1)  return { label: 'Amanhã',        cls: 'text-green-600 font-semibold' }
  if (diff > 1 && diff <= 7)  return { label: `Em ${diff} dias`, cls: 'text-green-600' }
  if (diff > 7)   return { label: `Em ${diff} dias`, cls: 'text-gray-400' }
  if (diff === -1) return { label: 'Ontem',         cls: 'text-gray-400' }
  return { label: `Há ${Math.abs(diff)} dias`,      cls: 'text-gray-400' }
}

function SortTh({ label, field, current, dir, onSort, className }: {
  label: string; field: SortFieldE; current: SortFieldE; dir: SortDir
  onSort: (f: SortFieldE) => void; className?: string
}) {
  const active = field === current
  return (
    <th
      onClick={() => onSort(field)}
      className={cn('text-left px-4 py-3 font-semibold cursor-pointer select-none group whitespace-nowrap', active ? 'text-green-700' : 'text-gray-600', className)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className={cn('transition-opacity', active ? 'opacity-100 text-green-600' : 'opacity-0 group-hover:opacity-40')}>
          {active && dir === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </span>
    </th>
  )
}


export function AdminEventos() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { adminUser } = useAuth()
  const isSuper = adminUser?.nivel === 'super'
  const [eventos, setEventos] = useState<Evento[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEvento, setEditingEvento] = useState<Evento | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ evento: Evento; action: 'encerrar' | 'cancelar' } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Evento | null>(null)
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState<SortFieldE>('data_evento')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Carrega eventos da API
  const loadEventos = async () => {
    setIsLoading(true)
    try {
      const res = await fetchEventos({ limit: 100 })
      setEventos(res.data)
    } catch (err) {
      toast({ title: 'Erro ao carregar eventos', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadEventos() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useRealtimeRefresh(loadEventos)

  const toggleSort = (field: SortFieldE) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('asc') }
    setPage(1)
  }

  // Status counts for filter tabs
  const counts = {
    todos:     eventos.length,
    publicado: eventos.filter((e) => e.status === 'publicado').length,
    rascunho:  eventos.filter((e) => e.status === 'rascunho').length,
    encerrado: eventos.filter((e) => e.status === 'encerrado').length,
    cancelado: eventos.filter((e) => e.status === 'cancelado').length,
  }

  const filtered = eventos.filter((e) => {
    const matchSearch = e.titulo.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      e.local.toLowerCase().includes(debouncedSearch.toLowerCase())
    const matchStatus = !statusFilter || e.status === statusFilter
    return matchSearch && matchStatus
  })

  const sorted = [...filtered].sort((a, b) => {
    const m = sortDir === 'asc' ? 1 : -1
    switch (sortField) {
      case 'titulo':          return a.titulo.localeCompare(b.titulo, 'pt-BR') * m
      case 'data_evento':     return (new Date(a.data_evento).getTime() - new Date(b.data_evento).getTime()) * m
      case 'status':          return a.status.localeCompare(b.status, 'pt-BR') * m
      case 'total_inscritos': return ((a.total_inscritos ?? 0) - (b.total_inscritos ?? 0)) * m
      case 'total_presentes': return ((a.total_presentes ?? 0) - (b.total_presentes ?? 0)) * m
      default:                return 0
    }
  })
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleAction = async (evento: Evento, action: string) => {
    const newStatus = { publicar: 'publicado', encerrar: 'encerrado', cancelar: 'cancelado' }[action] as Evento['status'] | undefined
    if (!newStatus) return
    try {
      await setEventoStatus(evento.id, newStatus)
      setEventos((prev) => prev.map((e) => e.id === evento.id ? { ...e, status: newStatus } : e))
      toast({
        title: 'Status atualizado',
        description: `Evento ${action === 'publicar' ? 'publicado' : action === 'encerrar' ? 'encerrado' : 'cancelado'} com sucesso.`,
      })
    } catch (err) {
      toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' })
    }
  }

  const handleDelete = async (evento: Evento) => {
    try {
      await deleteEvento(evento.id)
      setEventos((prev) => prev.filter((e) => e.id !== evento.id))
      toast({ title: 'Evento excluído', description: evento.titulo })
    } catch (err) {
      toast({ title: 'Erro ao excluir', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setConfirmDelete(null)
    }
  }

  const handleSave = async (data: Partial<Evento> & { convidados?: string[] }, bannerFile: File | null) => {
    try {
      // 1. Cria ou atualiza o evento (obtém o id)
      const salvo = editingEvento
        ? await updateEvento(editingEvento.id, data)
        : await createEvento(data as Parameters<typeof createEvento>[0])

      // 2. Se um novo banner foi escolhido, faz upload (salva no storage da VPS)
      if (bannerFile) {
        await uploadBannerEvento(salvo.id, bannerFile)
      }

      toast({
        title: editingEvento ? 'Evento atualizado' : 'Evento criado',
        description: bannerFile ? 'Dados e banner salvos.' : 'Alterações salvas.',
      })
      setModalOpen(false)
      setEditingEvento(null)
      await loadEventos()
    } catch (err) {
      toast({ title: 'Erro ao salvar', description: getErrorMessage(err), variant: 'destructive' })
    }
  }

  const isToday = (dateStr: string) => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const d = new Date(dateStr); d.setHours(0, 0, 0, 0)
    return d.getTime() === today.getTime()
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Eventos</h1>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {[
              { key: 'publicado', label: 'Publicados',  cls: 'bg-green-50 text-green-700 border-green-200'   },
              { key: 'rascunho',  label: 'Rascunhos',   cls: 'bg-gray-50 text-gray-600 border-gray-200'      },
              { key: 'encerrado', label: 'Encerrados',  cls: 'bg-slate-50 text-slate-500 border-slate-200'   },
              { key: 'cancelado', label: 'Cancelados',  cls: 'bg-red-50 text-red-500 border-red-100'         },
            ].map((s) => (
              <span key={s.key} className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border', s.cls)}>
                {counts[s.key as keyof typeof counts]} {s.label}
              </span>
            ))}
          </div>
        </div>
        <Button
          onClick={() => { setEditingEvento(null); setModalOpen(true) }}
          className="bg-green-700 hover:bg-green-800 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 mr-2" /> Novo Evento
        </Button>
      </div>

      {/* Search + filter tabs */}
      <div className="space-y-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por título ou local..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { key: '',          label: 'Todos',      count: counts.todos     },
            { key: 'publicado', label: 'Publicado',  count: counts.publicado },
            { key: 'rascunho',  label: 'Rascunho',   count: counts.rascunho  },
            { key: 'encerrado', label: 'Encerrado',  count: counts.encerrado },
            { key: 'cancelado', label: 'Cancelado',  count: counts.cancelado },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setStatusFilter(tab.key); setPage(1) }}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all',
                statusFilter === tab.key
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              )}
            >
              {tab.label}
              <span className={cn(
                'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                statusFilter === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
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
                    <SortTh label="Nome"      field="titulo"          current={sortField} dir={sortDir} onSort={toggleSort} />
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Tipo</th>
                    <SortTh label="Data"      field="data_evento"     current={sortField} dir={sortDir} onSort={toggleSort} className="hidden lg:table-cell" />
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden xl:table-cell">Local</th>
                    <SortTh label="Status"    field="status"          current={sortField} dir={sortDir} onSort={toggleSort} />
                    <SortTh label="Vagas"     field="total_inscritos" current={sortField} dir={sortDir} onSort={toggleSort} className="hidden sm:table-cell" />
                    <SortTh label="Presentes" field="total_presentes" current={sortField} dir={sortDir} onSort={toggleSort} className="hidden sm:table-cell text-center" />
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Ações</th>
                  </tr>
                </thead>
                {isLoading ? (
                  <SkeletonTable rows={8} cols={8} />
                ) : (
                  <tbody className="divide-y divide-gray-50">
                    {paginated.map((evento) => {
                      const total = evento.total_inscritos ?? 0
                      const pct = evento.capacidade > 0 ? Math.min(100, Math.round((total / evento.capacidade) * 100)) : 0
                      const today = isToday(evento.data_evento) && evento.status === 'publicado'
                      const rel = relativeDays(evento.data_evento)
                      const tipoCls = tipoColors[evento.tipo] ?? tipoColors['outro']

                      return (
                        <tr
                          key={evento.id}
                          className={cn('hover:bg-gray-50/80 transition-colors', today && 'bg-amber-50/30')}
                        >
                          {/* Nome */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {today && (
                                <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 animate-pulse" title="Evento hoje!" />
                              )}
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 line-clamp-1">{evento.titulo}</p>
                                <p className="text-xs text-gray-400 mt-0.5 md:hidden">{TIPO_EVENTO_LABELS[evento.tipo] ?? evento.tipo} · {formatDate(evento.data_evento)}</p>
                              </div>
                            </div>
                          </td>

                          {/* Tipo badge */}
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full', tipoCls)}>
                              {TIPO_EVENTO_LABELS[evento.tipo] ?? evento.tipo}
                            </span>
                          </td>

                          {/* Data + relativo */}
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <p className="text-gray-700 font-medium">{formatDate(evento.data_evento)}</p>
                            <p className={cn('text-[11px] mt-0.5', rel.cls)}>{rel.label}</p>
                          </td>

                          {/* Local */}
                          <td className="px-4 py-3 hidden xl:table-cell">
                            <span className="text-gray-600 line-clamp-1">{evento.local}</span>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            <StatusBadge status={evento.status} />
                          </td>

                          {/* Vagas com progress bar */}
                          <td className="px-4 py-3 hidden sm:table-cell min-w-[110px]">
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className={cn('font-bold', pct >= 100 ? 'text-red-600' : pct >= 80 ? 'text-amber-600' : 'text-gray-900')}>
                                  {total}
                                </span>
                                <span className="text-gray-400">/ {evento.capacidade}</span>
                              </div>
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden w-20">
                                <div
                                  className={cn('h-full rounded-full transition-all', pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-400' : 'bg-green-500')}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Presentes */}
                          <td className="px-4 py-3 text-center hidden sm:table-cell">
                            <span className={cn('font-semibold', (evento.total_presentes ?? 0) > 0 ? 'text-green-700' : 'text-gray-400')}>
                              {evento.total_presentes ?? 0}
                            </span>
                          </td>

                          {/* Ações */}
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1.5">
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

                              {evento.status !== 'cancelado' && <span className="w-px h-5 bg-gray-200 mx-0.5" />}

                              {/* Rascunho → Publicar */}
                              {evento.status === 'rascunho' && (
                                <button
                                  onClick={() => handleAction(evento, 'publicar')}
                                  title="Publicar evento"
                                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:scale-105 text-xs font-semibold transition-all"
                                >
                                  <PlayCircle className="w-3.5 h-3.5" /> Publicar
                                </button>
                              )}

                              {/* Publicado → Credenciar (hoje) | Encerrar | Cancelar */}
                              {evento.status === 'publicado' && (
                                <>
                                  {isToday(evento.data_evento) && (
                                    <button
                                      onClick={() => navigate(`/admin/credenciamento/${evento.id}`)}
                                      title="Modo credenciamento"
                                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 hover:scale-105 text-xs font-semibold transition-all"
                                    >
                                      <BadgeCheck className="w-3.5 h-3.5" /> Credenciar
                                    </button>
                                  )}
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

                              {evento.status === 'encerrado' && (
                                <span title="Evento encerrado" className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 border border-slate-100">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </span>
                              )}
                              {evento.status === 'cancelado' && (
                                <span title="Evento cancelado" className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-300 border border-red-100">
                                  <Ban className="w-3.5 h-3.5" />
                                </span>
                              )}

                              {isSuper && (
                                <>
                                  <span className="w-px h-5 bg-gray-200 mx-0.5" />
                                  <button
                                    onClick={() => setConfirmDelete(evento)}
                                    title="Excluir evento"
                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500 border border-red-100 hover:bg-red-100 hover:scale-105 transition-all"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                )}
              </table>
            </div>
            {!isLoading && (
              <TablePagination total={filtered.length} page={page} pageSize={PAGE_SIZE} onPage={setPage} />
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

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null) }}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-1', confirmAction?.action === 'cancelar' ? 'bg-red-50' : 'bg-amber-50')}>
              {confirmAction?.action === 'cancelar'
                ? <XCircle className="w-6 h-6 text-red-500" />
                : <StopCircle className="w-6 h-6 text-amber-500" />}
            </div>
            <AlertDialogTitle className="text-base">
              {confirmAction?.action === 'cancelar' ? 'Cancelar evento?' : 'Encerrar evento?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {confirmAction?.action === 'cancelar'
                ? <>O evento <strong>"{confirmAction?.evento.titulo}"</strong> será cancelado. Todos os inscritos serão notificados. Esta ação não pode ser desfeita.</>
                : <>O evento <strong>"{confirmAction?.evento.titulo}"</strong> será encerrado e não aceitará novas inscrições.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (confirmAction) handleAction(confirmAction.evento, confirmAction.action); setConfirmAction(null) }}
              className={cn('rounded-xl', confirmAction?.action === 'cancelar' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600')}
            >
              {confirmAction?.action === 'cancelar' ? 'Sim, cancelar' : 'Sim, encerrar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Exclusão de evento (super-admin) */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => { if (!open) setConfirmDelete(null) }}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-1 bg-red-50">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <AlertDialogTitle className="text-base">Excluir evento?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              O evento <strong>"{confirmDelete?.titulo}"</strong> e todas as suas inscrições serão removidos permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              className="rounded-xl bg-red-600 hover:bg-red-700"
            >
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
