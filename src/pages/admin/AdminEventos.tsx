import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Eye, Edit2, CheckCircle, XCircle, PlayCircle, StopCircle, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { EventoModal } from '@/components/admin/EventoModal'
import { mockEventos } from '@/data/mockData'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import type { Evento } from '@/types'

export function AdminEventos() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [eventos, setEventos] = useState<Evento[]>(mockEventos)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEvento, setEditingEvento] = useState<Evento | null>(null)

  const filtered = eventos.filter((e) => {
    const matchSearch = e.titulo.toLowerCase().includes(search.toLowerCase()) ||
      e.local.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || e.status === statusFilter
    return matchSearch && matchStatus
  })

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
          <option value="rascunho">Rascunho</option>
          <option value="publicado">Publicado</option>
          <option value="encerrado">Encerrado</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Nenhum evento encontrado"
            description="Tente ajustar os filtros ou crie um novo evento."
          />
        ) : (
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
              <tbody className="divide-y divide-gray-50">
                {filtered.map((evento) => (
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
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/admin/eventos/${evento.id}`)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver inscritos"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setEditingEvento(evento); setModalOpen(true) }}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {evento.status === 'rascunho' && (
                          <button
                            onClick={() => handleAction(evento, 'publicar')}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Publicar"
                          >
                            <PlayCircle className="w-4 h-4" />
                          </button>
                        )}
                        {evento.status === 'publicado' && (
                          <>
                            <button
                              onClick={() => handleAction(evento, 'encerrar')}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Encerrar"
                            >
                              <StopCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleAction(evento, 'cancelar')}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Cancelar"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {evento.status === 'encerrado' && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4 text-blue-500" />
                          </span>
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

      <EventoModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingEvento(null) }}
        onSave={handleSave}
        evento={editingEvento}
      />
    </div>
  )
}
