import { Settings } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AdminConfiguracoes() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-500 text-sm mt-1">Configurações gerais do sistema</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              <Label>Nome da empresa</Label>
              <Input defaultValue="IDIBRA" className="mt-1" />
            </div>
            <div>
              <Label>E-mail de contato</Label>
              <Input defaultValue="contato@idibra.com.br" type="email" className="mt-1" />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input defaultValue="(11) 9999-9999" className="mt-1" />
            </div>
            <div>
              <Label>Site</Label>
              <Input defaultValue="https://www.idibra.com.br" className="mt-1" />
            </div>
            <Button className="bg-green-700 hover:bg-green-800 w-full">Salvar alterações</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Regras de Inscrição</CardTitle>
            <CardDescription>Configurações do processo de inscrição em eventos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl bg-gray-50/50">
              <input type="checkbox" id="auto_approve" defaultChecked className="rounded mt-0.5 flex-shrink-0 accent-green-600" />
              <div>
                <Label htmlFor="auto_approve" className="cursor-pointer">Aprovação automática de corretores</Label>
                <p className="text-xs text-gray-400">Novos corretores são aprovados automaticamente</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl bg-gray-50/50">
              <input type="checkbox" id="notify_inscricao" defaultChecked className="rounded mt-0.5 flex-shrink-0 accent-green-600" />
              <div>
                <Label htmlFor="notify_inscricao" className="cursor-pointer">Notificar inscrição por e-mail</Label>
                <p className="text-xs text-gray-400">Enviar confirmação ao corretor ao se inscrever</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl bg-gray-50/50">
              <input type="checkbox" id="allow_cancel" defaultChecked className="rounded mt-0.5 flex-shrink-0 accent-green-600" />
              <div>
                <Label htmlFor="allow_cancel" className="cursor-pointer">Permitir cancelamento pelo corretor</Label>
                <p className="text-xs text-gray-400">Corretor pode cancelar sua própria inscrição</p>
              </div>
            </div>
            <Button className="bg-green-700 hover:bg-green-800 w-full">Salvar configurações</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
