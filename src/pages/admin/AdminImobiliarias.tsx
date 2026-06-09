import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Edit2, ToggleLeft, ToggleRight, Building2, Trash2, AlertTriangle, Mail, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/shared/Skeleton'
import { ImobiliariaModal } from '@/components/admin/ImobiliariaModal'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  fetchImobiliarias, createImobiliaria, updateImobiliaria,
  setImobiliariaStatus, deleteImobiliaria,
  uploadLogoImobiliaria, removeLogoImobiliaria,
} from '@/services/imobiliarias'
import { useToast } from '@/hooks/use-toast'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { getErrorMessage } from '@/lib/errors'
import type { Imobiliaria } from '@/types'

export function AdminImobiliarias() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [imobiliarias, setImobiliarias] = useState<Imobiliaria[]>([])
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Imobiliaria | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Imobiliaria | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      setImobiliarias(await fetchImobiliarias())
    } catch (err) {
      toast({ title: 'Erro ao carregar imobiliárias', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => { loadData() }, [loadData])

  const filtered = imobiliarias.filter((i) =>
    i.nome.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    i.cidade.toLowerCase().includes(debouncedSearch.toLowerCase())
  )

  const handleToggle = async (id: string) => {
    const target = imobiliarias.find((i) => i.id === id)
    const nextStatus = target?.status === 'ativa' ? 'inativa' : 'ativa'
    try {
      await setImobiliariaStatus(id, nextStatus)
      setImobiliarias((prev) => prev.map((i) => i.id === id ? { ...i, status: nextStatus } : i))
      toast({
        title: nextStatus === 'ativa' ? 'Imobiliária ativada' : 'Imobiliária inativada',
        description: target?.nome,
      })
    } catch (err) {
      toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' })
    }
  }

  const handleDelete = async (imob: Imobiliaria) => {
    try {
      await deleteImobiliaria(imob.id)
      setImobiliarias((prev) => prev.filter((i) => i.id !== imob.id))
      toast({ title: 'Imobiliária excluída', description: imob.nome })
    } catch (err) {
      toast({ title: 'Erro ao excluir', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setConfirmDelete(null)
    }
  }

  const handleSave = async (data: Partial<Imobiliaria>, logoFile: File | null, logoRemoved: boolean) => {
    try {
      let id: string
      if (editing) {
        await updateImobiliaria(editing.id, data)
        id = editing.id
        toast({ title: 'Imobiliária atualizada', description: data.nome || editing.nome })
      } else {
        const criada = await createImobiliaria(data as Parameters<typeof createImobiliaria>[0])
        id = criada.id
        toast({ title: 'Imobiliária cadastrada', description: data.nome })
      }

      // Logo: envia a nova ou remove a existente (apenas na edição)
      if (logoFile) {
        await uploadLogoImobiliaria(id, logoFile)
      } else if (logoRemoved && editing?.logo_url) {
        await removeLogoImobiliaria(id)
      }

      setModalOpen(false)
      setEditing(null)
      await loadData()
    } catch (err) {
      toast({ title: 'Erro ao salvar', description: getErrorMessage(err), variant: 'destructive' })
    }
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
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3 animate-pulse">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-2/5" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-8 flex-1 rounded-lg" />
                <Skeleton className="h-8 flex-1 rounded-lg" />
                <Skeleton className="h-8 w-9 rounded-lg" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
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
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-100 bg-white">
                    {imob.logo_url ? (
                      <img src={imob.logo_url} alt={imob.nome} className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full bg-green-100 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-green-700" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{imob.nome}</p>
                    <p className="text-xs text-gray-400">{imob.cnpj ? imob.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : '—'}</p>
                  </div>
                </div>
                <StatusBadge status={imob.status} />
              </div>

              <div className="space-y-1.5 text-sm text-gray-600 mb-4">
                <p>{imob.cidade}/{imob.uf}</p>
                {imob.email && (
                  <a href={`mailto:${imob.email}`} className="flex items-center gap-1.5 hover:text-green-700 hover:underline transition-colors group w-fit">
                    <Mail className="w-3.5 h-3.5 text-gray-400 group-hover:text-green-600 flex-shrink-0" />
                    {imob.email}
                  </a>
                )}
                {imob.telefone && (
                  <a href={`tel:+55${imob.telefone.replace(/\D/g, '')}`} className="flex items-center gap-1.5 hover:text-green-700 hover:underline transition-colors group w-fit">
                    <Phone className="w-3.5 h-3.5 text-gray-400 group-hover:text-green-600 flex-shrink-0" />
                    {imob.telefone}
                  </a>
                )}
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDelete(imob)}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 border-gray-200 hover:border-red-200 px-2.5"
                  title="Excluir imobiliária"
                >
                  <Trash2 className="w-3.5 h-3.5" />
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

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => { if (!open) setConfirmDelete(null) }}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-1">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <AlertDialogTitle className="text-base">Excluir imobiliária?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm space-y-2">
              <span>
                A imobiliária <strong>"{confirmDelete?.nome}"</strong> será removida permanentemente. Esta ação não pode ser desfeita.
              </span>
              {(confirmDelete?.total_corretores ?? 0) > 0 && (
                <span className="flex items-start gap-2 mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  {confirmDelete!.total_corretores} corretor(es) vinculado(s) perderão o vínculo com esta imobiliária.
                </span>
              )}
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
