import { useState } from 'react'
import { Settings, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

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

  const [empresa, setEmpresa] = useState<EmpresaForm>({
    nome: 'IDIBRA',
    email: 'contato@idibra.com.br',
    telefone: '(11) 9999-9999',
    site: 'https://www.idibra.com.br',
  })

  const [regras, setRegras] = useState<RegrasForm>({
    auto_approve: true,
    notify_inscricao: true,
    allow_cancel: true,
  })

  const [savingEmpresa, setSavingEmpresa] = useState(false)
  const [savingRegras, setSavingRegras] = useState(false)

  const handleSaveEmpresa = async () => {
    setSavingEmpresa(true)
    await new Promise((r) => setTimeout(r, 700))
    setSavingEmpresa(false)
    toast({ title: 'Dados da empresa salvos', description: 'As informações foram atualizadas com sucesso.' })
  }

  const handleSaveRegras = async () => {
    setSavingRegras(true)
    await new Promise((r) => setTimeout(r, 700))
    setSavingRegras(false)
    toast({ title: 'Configurações salvas', description: 'Regras de inscrição atualizadas.' })
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
      </div>
    </div>
  )
}
