import { useState } from 'react'
import { Plus, Search, Edit2, ToggleLeft, ToggleRight, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { ImobiliariaModal } from '@/components/admin/ImobiliariaModal'
import { mockImobiliarias } from '@/data/mockData'
import { useToast } from '@/hooks/use-toast'
import type { Imobiliaria } from '@/types'

export function AdminImobiliarias() {
  const { toast } = useToast()
  const [imobiliarias, setImobiliarias] = useState<Imobiliaria[]>(mockImobiliarias)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Imobiliaria | null>(null)

  const filtered = imobiliarias.filter((i) =>
    i.nome.toLowerCase().includes(search.toLowerCase()) ||
    i.cidade.toLowerCase().includes(search.toLowerCase())
  )

  const handleToggle = (id: string) => {
    setImobiliarias((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, status: i.status === 'ativa' ? 'inativa' : 'ativa' } : i
      )
    )
    toast({ title: 'Status atualizado' })
  }

  const handleSave = (data: Partial<Imobiliaria>) => {
    if (editing) {
      setImobiliarias((prev) => prev.map((i) => (i.id === editing.id ? { ...i, ...data } : i)))
      toast({ title: 'Imobiliária atualizada' })
    } else {
      const nova: Imobiliaria = {
        id: String(Date.now()),
        nome: data.nome || '',
        cnpj: data.cnpj || '',
        telefone: data.telefone || '',
        email: data.email || '',
        cidade: data.cidade || '',
        uf: data.uf || '',
        status: 'ativa',
        created_at: new Date().toISOString(),
        total_corretores: 0,
      }
      setImobiliarias((prev) => [nova, ...prev])
      toast({ title: 'Imobiliária cadastrada' })
    }
    setModalOpen(false)
    setEditing(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Imobiliárias</h1>
          <p className="text-gray-500 text-sm mt-1">{imobiliarias.length} imobiliárias cadastradas</p>
        </div>
        <Button
          onClick={() => { setEditing(null); setModalOpen(true) }}
          className="bg-green-700 hover:bg-green-800 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 mr-2" /> Nova Imobiliária
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar por nome ou cidade..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={Building2}
              title="Nenhuma imobiliária encontrada"
              description="Tente ajustar a busca ou cadastre uma nova imobiliária."
            />
          </div>
        ) : (
          filtered.map((imob) => (
            <div key={imob.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-green-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{imob.nome}</p>
                    <p className="text-xs text-gray-400">{imob.cnpj ? imob.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : '—'}</p>
                  </div>
                </div>
                <StatusBadge status={imob.status} />
              </div>

              <div className="space-y-1 text-sm text-gray-600 mb-4">
                <p>{imob.cidade}/{imob.uf}</p>
                {imob.email && <p>{imob.email}</p>}
                {imob.telefone && <p>{imob.telefone}</p>}
                <p className="text-green-700 font-medium">{imob.total_corretores ?? 0} corretor(es) vinculado(s)</p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setEditing(imob); setModalOpen(true) }}
                  className="flex-1"
                >
                  <Edit2 className="w-3 h-3 mr-1" /> Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggle(imob.id)}
                  className="flex-1"
                >
                  {imob.status === 'ativa' ? (
                    <><ToggleRight className="w-3 h-3 mr-1 text-green-600" /> Ativa</>
                  ) : (
                    <><ToggleLeft className="w-3 h-3 mr-1 text-gray-400" /> Inativa</>
                  )}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <ImobiliariaModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        onSave={handleSave}
        imobiliaria={editing}
      />
    </div>
  )
}
