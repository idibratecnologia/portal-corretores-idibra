import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Eye, Edit2, UserCheck, UserX, Users, ChevronUp, ChevronDown, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonTable } from '@/components/shared/Skeleton'
import { TablePagination } from '@/components/shared/TablePagination'
import { CorretorModal } from '@/components/admin/CorretorModal'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { fetchCorretores, createCorretor, updateCorretor, setCorretorStatus, deleteCorretor } from '@/services/corretores'
import { fetchImobiliarias } from '@/services/imobiliarias'
import { PENDING_CHANGED_EVENT } from '@/components/admin/AdminSidebar'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { getErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import type { Corretor, Imobiliaria } from '@/types'

const PAGE_SIZE = 10

type SortFieldC = 'nome' | 'creci' | 'status' | 'cidade' | 'total_eventos'
type SortDir = 'asc' | 'desc'

function SortTh({ label, field, current, dir, onSort, className }: {
  label: string; field: SortFieldC; current: SortFieldC; dir: SortDir
  onSort: (f: SortFieldC) => void; className?: string
}) {
  const active = field === current
  return (
    <th
      onClick={() => onSort(field)}
      className={cn('text-left px-4 py-3 font-semibold cursor-pointer select-none group', active ? 'text-green-700' : 'text-gray-600', className)}
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

export function AdminCorretores() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { adminUser } = useAuth()
  const isSuper = adminUser?.nivel === 'super'
  const [isLoading, setIsLoading] = useState(true)
  const [corretores, setCorretores] = useState<Corretor[]>([])
  const [confirmDelete, setConfirmDelete] = useState<Corretor | null>(null)
  const [imobiliarias, setImobiliarias] = useState<Imobiliaria[]>([])
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [statusFilter, setStatusFilter] = useState('')
  const [imobFilter, setImobFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCorretor, setEditingCorretor] = useState<Corretor | null>(null)
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState<SortFieldC>('nome')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [cor, imob] = await Promise.all([
        fetchCorretores({ limit: 100 }),
        fetchImobiliarias(),
      ])
      setCorretores(cor.data)
      setImobiliarias(imob)
    } catch (err) {
      toast({ title: 'Erro ao carregar corretores', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => { loadData() }, [loadData])

  const toggleSort = (field: SortFieldC) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('asc') }
    setPage(1)
  }

  const filtered = corretores.filter((c) => {
    const q = debouncedSearch.toLowerCase()
    const matchSearch =
      c.nome.toLowerCase().includes(q) ||
      c.creci.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    const matchStatus = !statusFilter || c.status === statusFilter
    const matchImob = !imobFilter || c.imobiliaria_id === imobFilter
    return matchSearch && matchStatus && matchImob
  })

  const sorted = [...filtered].sort((a, b) => {
    const m = sortDir === 'asc' ? 1 : -1
    switch (sortField) {
      case 'nome':         return a.nome.localeCompare(b.nome, 'pt-BR') * m
      case 'creci':        return a.creci.localeCompare(b.creci, 'pt-BR') * m
      case 'status':       return a.status.localeCompare(b.status, 'pt-BR') * m
      case 'cidade':       return a.cidade.localeCompare(b.cidade, 'pt-BR') * m
      case 'total_eventos':return ((a.total_eventos ?? 0) - (b.total_eventos ?? 0)) * m
      default:             return 0
    }
  })
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleStatusChange = async (id: string, status: Corretor['status']) => {
    try {
      await setCorretorStatus(id, status)
      setCorretores((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)))
      window.dispatchEvent(new Event(PENDING_CHANGED_EVENT))
      toast({ title: 'Status atualizado', description: `Corretor ${status === 'ativo' ? 'ativado' : 'bloqueado'} com sucesso.` })
    } catch (err) {
      toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' })
    }
  }

  const handleDelete = async (corretor: Corretor) => {
    try {
      await deleteCorretor(corretor.id)
      setCorretores((prev) => prev.filter((c) => c.id !== corretor.id))
      window.dispatchEvent(new Event(PENDING_CHANGED_EVENT))
      toast({ title: 'Corretor excluído', description: corretor.nome })
    } catch (err) {
      toast({ title: 'Erro ao excluir', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setConfirmDelete(null)
    }
  }

  const handleSave = async (data: Partial<Corretor>) => {
    try {
      if (editingCorretor) {
        await updateCorretor(editingCorretor.id, data)
        toast({ title: 'Corretor atualizado', description: 'Dados salvos com sucesso.' })
      } else {
        await createCorretor(data as Parameters<typeof createCorretor>[0])
        toast({ title: 'Corretor cadastrado', description: 'Novo corretor criado com sucesso.' })
      }
      setModalOpen(false)
      setEditingCorretor(null)
      await loadData()
    } catch (err) {
      toast({ title: 'Erro ao salvar', description: getErrorMessage(err), variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Corretores</h1>
          <p className="text-gray-500 text-sm mt-1">{corretores.length} corretores cadastrados</p>
        </div>
        <Button
          onClick={() => { setEditingCorretor(null); setModalOpen(true) }}
          className="bg-green-700 hover:bg-green-800 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Corretor
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por nome, CRECI ou e-mail..."
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
          <option value="ativo">Ativo</option>
          <option value="pendente">Pendente</option>
          <option value="bloqueado">Bloqueado</option>
        </select>
        <select
          value={imobFilter}
          onChange={(e) => { setImobFilter(e.target.value); setPage(1) }}
          className="h-10 px-3 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 text-gray-700"
        >
          <option value="">Todas as imobiliárias</option>
          {imobiliarias.map((i) => (
            <option key={i.id} value={i.id}>{i.nome}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {!isLoading && filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum corretor encontrado"
            description="Tente ajustar os filtros ou cadastre um novo corretor."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <SortTh label="Nome"    field="nome"          current={sortField} dir={sortDir} onSort={toggleSort} />
                    <SortTh label="CRECI"   field="creci"         current={sortField} dir={sortDir} onSort={toggleSort} className="hidden sm:table-cell" />
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">E-mail</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Imobiliária</th>
                    <SortTh label="Cidade/UF" field="cidade"      current={sortField} dir={sortDir} onSort={toggleSort} className="hidden xl:table-cell" />
                    <SortTh label="Eventos" field="total_eventos"  current={sortField} dir={sortDir} onSort={toggleSort} className="hidden sm:table-cell text-center" />
                    <SortTh label="Status"  field="status"         current={sortField} dir={sortDir} onSort={toggleSort} />
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Ações</th>
                  </tr>
                </thead>
                {isLoading ? (
                  <SkeletonTable rows={8} cols={8} />
                ) : (
                  <tbody className="divide-y divide-gray-50">
                    {paginated.map((corretor) => (
                      <tr key={corretor.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm flex-shrink-0">
                              {corretor.foto_url ? (
                                <img src={corretor.foto_url} alt={corretor.nome} className="w-full h-full object-cover" />
                              ) : corretor.nome.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{corretor.nome}</p>
                              <p className="text-xs text-gray-400 sm:hidden">{corretor.creci}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell text-gray-600">{corretor.creci}</td>
                        <td className="px-4 py-3 hidden md:table-cell text-gray-600">{corretor.email}</td>
                        <td className="px-4 py-3 hidden lg:table-cell text-gray-600">
                          {corretor.imobiliaria?.nome || '—'}
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell text-gray-600">
                          {corretor.cidade}/{corretor.uf}
                        </td>
                        <td className="px-4 py-3 text-center hidden sm:table-cell">
                          <span className="font-semibold text-gray-900">{corretor.total_eventos ?? 0}</span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={corretor.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => navigate(`/admin/corretores/${corretor.id}`)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Ver perfil"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setEditingCorretor(corretor); setModalOpen(true) }}
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {corretor.status !== 'ativo' && (
                              <button
                                onClick={() => handleStatusChange(corretor.id, 'ativo')}
                                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Ativar"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                            )}
                            {corretor.status === 'ativo' && (
                              <button
                                onClick={() => handleStatusChange(corretor.id, 'bloqueado')}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Bloquear"
                              >
                                <UserX className="w-4 h-4" />
                              </button>
                            )}
                            {isSuper && (
                              <button
                                onClick={() => setConfirmDelete(corretor)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Excluir corretor"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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

      <CorretorModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingCorretor(null) }}
        onSave={handleSave}
        corretor={editingCorretor}
      />

      {/* Exclusão de corretor (super-admin) */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => { if (!open) setConfirmDelete(null) }}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-1">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <AlertDialogTitle className="text-base">Excluir corretor?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              O corretor <strong>"{confirmDelete?.nome}"</strong> e suas inscrições serão removidos permanentemente. Esta ação não pode ser desfeita.
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
