import { useState } from 'react'
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { trocarSenha } from '@/services/auth'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'

export function TrocarSenhaModal({ open, onClose, obrigatorio = false }: { open: boolean; onClose: () => void; obrigatorio?: boolean }) {
  const { toast } = useToast()
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ atual: '', nova: '', confirma: '' })

  const reset = () => { setForm({ atual: '', nova: '', confirma: '' }); setError('') }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.nova.length < 6) { setError('A nova senha deve ter no mínimo 6 caracteres'); return }
    if (form.nova !== form.confirma) { setError('As senhas não conferem'); return }

    setLoading(true)
    try {
      await trocarSenha(form.atual, form.nova)
      toast({ title: 'Senha alterada!', description: 'Sua senha foi atualizada com sucesso.' })
      reset()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { if (obrigatorio) return; reset(); onClose() } }}>
      <DialogContent className="rounded-2xl max-w-sm" hideClose={obrigatorio} onEscapeKeyDown={(e) => obrigatorio && e.preventDefault()} onInteractOutside={(e) => obrigatorio && e.preventDefault()}>
        <DialogHeader>
          <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-1">
            <Lock className="w-6 h-6 text-green-700" />
          </div>
          <DialogTitle>{obrigatorio ? 'Defina sua nova senha' : 'Trocar senha'}</DialogTitle>
        </DialogHeader>

        {obrigatorio && (
          <p className="text-sm text-gray-500 -mt-2">
            Este é seu primeiro acesso. Sua senha atual é o seu <strong>CPF</strong> (somente números). Crie uma nova senha para continuar.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label>Senha atual</Label>
            <Input type={show ? 'text' : 'password'} value={form.atual}
              onChange={(e) => setForm((f) => ({ ...f, atual: e.target.value }))} className="mt-1" autoFocus />
          </div>
          <div>
            <Label>Nova senha</Label>
            <div className="relative">
              <Input type={show ? 'text' : 'password'} value={form.nova}
                onChange={(e) => setForm((f) => ({ ...f, nova: e.target.value }))} className="mt-1 pr-10" />
              <button type="button" onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label>Confirmar nova senha</Label>
            <Input type={show ? 'text' : 'password'} value={form.confirma}
              onChange={(e) => setForm((f) => ({ ...f, confirma: e.target.value }))} className="mt-1" />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-xs text-red-600 font-medium">
              {error}
            </div>
          )}

          <DialogFooter className="gap-2 pt-1">
            {!obrigatorio && (
              <Button type="button" variant="outline" onClick={() => { reset(); onClose() }} className="flex-1 rounded-xl" disabled={loading}>
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={loading} className="flex-1 bg-green-700 hover:bg-green-800 rounded-xl">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
