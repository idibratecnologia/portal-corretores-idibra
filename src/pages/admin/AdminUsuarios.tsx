import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Loader2, ShieldCheck, User, Edit2, Trash2, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'
import {
  fetchUsuarios, createUsuario, updateUsuario, deleteUsuario, type Usuario,
} from '@/services/usuarios'

const schema = z.object({
  nome:  z.string().min(3, 'Nome muito curto'),
  email: z.string().email('E-mail inválido'),
  nivel: z.enum(['super', 'operador']),
  senha: z.string().optional(),
})
type FormData = z.infer<typeof schema>

const NIVEL_LABEL: Record<string, string> = { super: 'Administrador', operador: 'Operador' }

export function AdminUsuarios() {
  const { adminUser } = useAuth()
  const { toast } = useToast()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Usuario | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Usuario | null>(null)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setUsuarios(await fetchUsuarios())
    } catch (err) {
      toast({ title: 'Erro ao carregar usuários', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  const abrirNovo = () => {
    setEditing(null)
    reset({ nome: '', email: '', nivel: 'operador', senha: '' })
    setModalOpen(true)
  }

  const abrirEdicao = (u: Usuario) => {
    setEditing(u)
    reset({ nome: u.nome, email: u.email, nivel: u.nivel, senha: '' })
    setModalOpen(true)
  }

  const onSubmit = async (data: FormData) => {
    setSaving(true)
    try {
      if (editing) {
        await updateUsuario(editing.id, {
          nome: data.nome, email: data.email, nivel: data.nivel,
          ...(data.senha ? { senha: data.senha } : {}),
        })
        toast({ title: 'Usuário atualizado', description: data.nome })
      } else {
        if (!data.senha || data.senha.length < 6) {
          toast({ title: 'Senha obrigatória', description: 'Mínimo 6 caracteres para um novo usuário.', variant: 'destructive' })
          setSaving(false); return
        }
        await createUsuario({ nome: data.nome, email: data.email, nivel: data.nivel, senha: data.senha })
        toast({ title: 'Usuário criado', description: data.nome })
      }
      setModalOpen(false)
      setEditing(null)
      await load()
    } catch (err) {
      toast({ title: 'Erro ao salvar', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (u: Usuario) => {
    try {
      await deleteUsuario(u.id)
      setUsuarios((prev) => prev.filter((x) => x.id !== u.id))
      toast({ title: 'Usuário excluído', description: u.nome })
    } catch (err) {
      toast({ title: 'Erro ao excluir', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setConfirmDelete(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-gray-500 text-sm mt-1">Administradores e operadores do sistema</p>
        </div>
        <Button onClick={abrirNovo} className="bg-green-700 hover:bg-green-800 self-start sm:self-auto">
          <Plus className="w-4 h-4 mr-2" /> Novo Usuário
        </Button>
      </div>

      {/* Legenda dos níveis */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-green-600" /> <strong>Administrador</strong>: acesso total (excluir, logs, usuários)</span>
        <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-gray-400" /> <strong>Operador</strong>: cria, edita e visualiza (sem excluir)</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-green-600 animate-spin" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Nome</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">E-mail</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Nível</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">
                      {u.nome}
                      {u.id === adminUser?.id && <span className="ml-2 text-[10px] text-green-600 font-semibold">(você)</span>}
                    </p>
                    <p className="text-xs text-gray-400 sm:hidden">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${
                      u.nivel === 'super' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {u.nivel === 'super' ? <ShieldCheck className="w-3 h-3" /> : <User className="w-3 h-3" />}
                      {NIVEL_LABEL[u.nivel]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => abrirEdicao(u)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(u)}
                        disabled={u.id === adminUser?.id}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title={u.id === adminUser?.id ? 'Você não pode excluir o seu próprio usuário' : 'Excluir'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal criar/editar */}
      <Dialog open={modalOpen} onOpenChange={(o) => { if (!o) { setModalOpen(false); setEditing(null) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input {...register('nome')} className="mt-1" />
              {errors.nome && <p className="text-xs text-red-500 mt-1">{errors.nome.message}</p>}
            </div>
            <div>
              <Label>E-mail *</Label>
              <Input type="email" {...register('email')} className="mt-1" />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <Label>Nível *</Label>
              <select {...register('nivel')} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="operador">Operador (cria/edita/vê)</option>
                <option value="super">Administrador (acesso total)</option>
              </select>
            </div>
            <div>
              <Label className="flex items-center gap-1.5"><KeyRound className="w-3.5 h-3.5" /> Senha {editing ? '(deixe em branco para manter)' : '*'}</Label>
              <Input type="password" {...register('senha')} placeholder={editing ? '••••••' : 'Mínimo 6 caracteres'} className="mt-1" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setModalOpen(false); setEditing(null) }}>Cancelar</Button>
              <Button type="submit" className="bg-green-700 hover:bg-green-800" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editing ? 'Salvar' : 'Criar')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null) }}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-1">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <AlertDialogTitle className="text-base">Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              O usuário <strong>"{confirmDelete?.nome}"</strong> perderá o acesso ao sistema. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && handleDelete(confirmDelete)} className="rounded-xl bg-red-600 hover:bg-red-700">
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
