import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Eye, Edit2, UserCheck, UserX, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { CorretorModal } from '@/components/admin/CorretorModal'
import { mockCorretoresComImobiliaria, mockImobiliarias } from '@/data/mockData'
import { useToast } from '@/hooks/use-toast'
import type { Corretor } from '@/types'

export function AdminCorretores() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [corretores, setCorretores] = useState<Corretor[]>(mockCorretoresComImobiliaria)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [imobFilter, setImobFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCorretor, setEditingCorretor] = useState<Corretor | null>(null)

  const filtered = corretores.filter((c) => {
    const q = search.toLowerCase()
    const matchSearch =
      c.nome.toLowerCase().includes(q) ||
      c.creci.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    const matchStatus = !statusFilter || c.status === statusFilter
    const matchImob = !imobFilter || c.imobiliaria_id === imobFilter
    return matchSearch && matchStatus && matchImob
  })

  const handleStatusChange = (id: string, status: Corretor['status']) => {
    setCorretores((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)))
    toast({ title: 'Status atualizado', description: `Corretor ${status === 'ativo' ? 'ativado' : 'bloqueado'} com sucesso.` })
  }

  const handleSave = (data: Partial<Corretor>) => {
    if (editingCorretor) {
      setCorretores((prev) =>
        prev.map((c) =>
          c.id === editingCorretor.id
            ? { ...c, ...data, imobiliaria: mockImobiliarias.find((i) => i.id === data.imobiliaria_id) }
            : c
        )
      )
      toast({ title: 'Corretor atualizado', description: 'Dados salvos com sucesso.' })
    } else {
      const novo: Corretor = {
        id: String(Date.now()),
        nome: data.nome || '',
        cpf: data.cpf || '',
        creci: data.creci || '',
        email: data.email || '',
        telefone: data.telefone || '',
        whatsapp: data.whatsapp || '',
        imobiliaria_id: data.imobiliaria_id,
        imobiliaria: mockImobiliarias.find((i) => i.id === data.imobiliaria_id),
        cidade: data.cidade || '',
        uf: data.uf || '',
        instagram: data.instagram,
        status: 'pendente',
        observacoes_admin: data.observacoes_admin,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        total_eventos: 0,
      }
      setCorretores((prev) => [novo, ...prev])
      toast({ title: 'Corretor cadastrado', description: 'Novo corretor criado com sucesso.' })
    }
    setModalOpen(false)
    setEditingCorretor(null)
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
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 text-gray-700"
        >
          <option value="">Todos os status</option>
          <option value="ativo">Ativo</option>
          <option value="pendente">Pendente</option>
          <option value="bloqueado">Bloqueado</option>
        </select>
        <select
          value={imobFilter}
          onChange={(e) => setImobFilter(e.target.value)}
          className="h-10 px-3 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 text-gray-700"
        >
          <option value="">Todas as imobiliárias</option>
          {mockImobiliarias.map((i) => (
            <option key={i.id} value={i.id}>{i.nome}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum corretor encontrado"
            description="Tente ajustar os filtros ou cadastre um novo corretor."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Nome</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">CRECI</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">E-mail</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Imobiliária</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden xl:table-cell">Cidade/UF</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Eventos</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((corretor) => (
                  <tr key={corretor.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm flex-shrink-0">
                          {corretor.nome.charAt(0)}
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
                      {(corretor as any).imobiliaria?.nome || '—'}
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CorretorModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingCorretor(null) }}
        onSave={handleSave}
        corretor={editingCorretor}
      />
    </div>
  )
}
