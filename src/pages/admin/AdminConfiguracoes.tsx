import { useState, useEffect } from 'react'
import { Settings, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { fetchConfiguracao, updateConfiguracao } from '@/services/configuracoes'
import { getErrorMessage } from '@/lib/errors'
import { WhatsappSync } from '@/components/admin/WhatsappSync'

interface EmpresaForm {
  nome: string
  email: string
  telefone: string
  site: string
}

interface RegrasForm {
  auto_approve: boolean
  notify_inscricao: boolean
  allow_cancel: boolean
}

export function AdminConfiguracoes() {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [empresa, setEmpresa] = useState<EmpresaForm>({ nome: '', email: '', telefone: '', site: '' })
  const [regras, setRegras] = useState<RegrasForm>({ auto_approve: false, notify_inscricao: true, allow_cancel: true })

  const [savingEmpresa, setSavingEmpresa] = useState(false)
  const [savingRegras, setSavingRegras] = useState(false)

  useEffect(() => {
    fetchConfiguracao()
      .then((cfg) => {
        setEmpresa({ nome: cfg.empresa_nome, email: cfg.empresa_email, telefone: cfg.empresa_telefone, site: cfg.empresa_site })
        setRegras({ auto_approve: cfg.auto_approve, notify_inscricao: cfg.notify_inscricao, allow_cancel: cfg.allow_cancel })
      })
      .catch((err) => toast({ title: 'Erro ao carregar', description: getErrorMessage(err), variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [toast])

  const handleSaveEmpresa = async () => {
    setSavingEmpresa(true)
    try {
      await updateConfiguracao({
        empresa_nome: empresa.nome, empresa_email: empresa.email,
        empresa_telefone: empresa.telefone, empresa_site: empresa.site,
      })
      toast({ title: 'Dados da empresa salvos', description: 'As informações foram atualizadas com sucesso.' })
    } catch (err) {
      toast({ title: 'Erro ao salvar', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setSavingEmpresa(false)
    }
  }

  const handleSaveRegras = async () => {
    setSavingRegras(true)
    try {
      await updateConfiguracao({
        auto_approve: regras.auto_approve,
        notify_inscricao: regras.notify_inscricao,
        allow_cancel: regras.allow_cancel,
      })
      toast({ title: 'Configurações salvas', description: 'Regras de inscrição atualizadas.' })
    } catch (err) {
      toast({ title: 'Erro ao salvar', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setSavingRegras(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-500 text-sm mt-1">Configurações gerais do sistema</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dados da Empresa */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-green-600" />
              <CardTitle className="text-base">Dados da Empresa</CardTitle>
            </div>
            <CardDescription>Informações institucionais exibidas no portal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="nome_empresa">Nome da empresa</Label>
              <Input
                id="nome_empresa"
                value={empresa.nome}
                onChange={(e) => setEmpresa((prev) => ({ ...prev, nome: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email_empresa">E-mail de contato</Label>
              <Input
                id="email_empresa"
                type="email"
                value={empresa.email}
                onChange={(e) => setEmpresa((prev) => ({ ...prev, email: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="tel_empresa">Telefone</Label>
              <Input
                id="tel_empresa"
                value={empresa.telefone}
                onChange={(e) => setEmpresa((prev) => ({ ...prev, telefone: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="site_empresa">Site</Label>
              <Input
                id="site_empresa"
                value={empresa.site}
                onChange={(e) => setEmpresa((prev) => ({ ...prev, site: e.target.value }))}
                className="mt-1"
              />
            </div>
            <Button
              className="bg-green-700 hover:bg-green-800 w-full"
              onClick={handleSaveEmpresa}
              disabled={savingEmpresa}
            >
              {savingEmpresa ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
              ) : (
                'Salvar alterações'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Regras de Inscrição */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Regras de Inscrição</CardTitle>
            <CardDescription>Configurações do processo de inscrição em eventos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl bg-gray-50/50 cursor-pointer hover:bg-gray-100/50 transition-colors">
              <input
                type="checkbox"
                checked={regras.auto_approve}
                onChange={(e) => setRegras((prev) => ({ ...prev, auto_approve: e.target.checked }))}
                className="rounded mt-0.5 flex-shrink-0 accent-green-600"
              />
              <div>
                <p className="text-sm font-medium text-gray-800">Aprovação automática de corretores</p>
                <p className="text-xs text-gray-400 mt-0.5">Novos corretores são aprovados automaticamente</p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl bg-gray-50/50 cursor-pointer hover:bg-gray-100/50 transition-colors">
              <input
                type="checkbox"
                checked={regras.notify_inscricao}
                onChange={(e) => setRegras((prev) => ({ ...prev, notify_inscricao: e.target.checked }))}
                className="rounded mt-0.5 flex-shrink-0 accent-green-600"
              />
              <div>
                <p className="text-sm font-medium text-gray-800">Notificar inscrição por e-mail</p>
                <p className="text-xs text-gray-400 mt-0.5">Enviar confirmação ao corretor ao se inscrever</p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl bg-gray-50/50 cursor-pointer hover:bg-gray-100/50 transition-colors">
              <input
                type="checkbox"
                checked={regras.allow_cancel}
                onChange={(e) => setRegras((prev) => ({ ...prev, allow_cancel: e.target.checked }))}
                className="rounded mt-0.5 flex-shrink-0 accent-green-600"
              />
              <div>
                <p className="text-sm font-medium text-gray-800">Permitir cancelamento pelo corretor</p>
                <p className="text-xs text-gray-400 mt-0.5">Corretor pode cancelar sua própria inscrição</p>
              </div>
            </label>

            <Button
              className="bg-green-700 hover:bg-green-800 w-full"
              onClick={handleSaveRegras}
              disabled={savingRegras}
            >
              {savingRegras ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
              ) : (
                'Salvar configurações'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Integração WhatsApp */}
        <WhatsappSync />
      </div>
    </div>
  )
}
