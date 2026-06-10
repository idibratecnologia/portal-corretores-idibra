import { useRef, useState } from 'react'
import { Upload, Download, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle, Users, Building2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'
import {
  baixarModelo, importarPlanilha,
  type ImportTipo, type ImportModo, type ImportReport,
} from '@/services/importacao'

const TIPOS: { id: ImportTipo; label: string; icon: React.ElementType }[] = [
  { id: 'imobiliarias', label: 'Imobiliárias', icon: Building2 },
  { id: 'corretores',   label: 'Corretores',   icon: Users },
]

export function ImportarDados() {
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [tipo, setTipo] = useState<ImportTipo>('imobiliarias')
  const [modo, setModo] = useState<ImportModo>('ignorar')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportReport | null>(null)
  const [resultado, setResultado] = useState<ImportReport | null>(null)
  const [carregando, setCarregando] = useState<'modelo' | 'validar' | 'importar' | null>(null)

  const limpar = () => {
    setFile(null); setPreview(null); setResultado(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const trocarTipo = (t: ImportTipo) => { setTipo(t); limpar() }

  const handleModelo = async () => {
    setCarregando('modelo')
    try {
      await baixarModelo(tipo)
    } catch (err) {
      toast({ title: 'Erro ao baixar modelo', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setCarregando(null)
    }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setFile(f); setPreview(null); setResultado(null)
  }

  const handleValidar = async () => {
    if (!file) return
    setCarregando('validar')
    setResultado(null)
    try {
      const rep = await importarPlanilha(tipo, file, { dryRun: true, modo })
      setPreview(rep)
    } catch (err) {
      toast({ title: 'Erro ao validar', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setCarregando(null)
    }
  }

  const handleImportar = async () => {
    if (!file) return
    setCarregando('importar')
    try {
      const rep = await importarPlanilha(tipo, file, { dryRun: false, modo })
      setResultado(rep)
      setPreview(null)
      toast({
        title: 'Importação concluída',
        description: `${rep.criados} criado(s), ${rep.atualizados} atualizado(s), ${rep.ignorados} ignorado(s).`,
      })
    } catch (err) {
      toast({ title: 'Erro ao importar', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setCarregando(null)
    }
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-green-600" />
          <CardTitle className="text-base">Importar dados (Excel / CSV)</CardTitle>
        </div>
        <CardDescription>
          Cadastre imobiliárias e corretores em massa a partir de uma planilha.
          Importe as <strong>imobiliárias primeiro</strong> para vincular os corretores pelo CNPJ.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Tipo */}
        <div className="flex gap-2">
          {TIPOS.map((t) => (
            <button
              key={t.id}
              onClick={() => trocarTipo(t.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold border transition-all ${
                tipo === t.id ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* Passo 1: modelo */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleModelo} disabled={carregando === 'modelo'} className="gap-1.5">
            {carregando === 'modelo' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Baixar modelo
          </Button>
          <span className="text-xs text-gray-400">Preencha o modelo e envie o arquivo abaixo.</span>
        </div>

        {/* Passo 2: arquivo */}
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            onChange={handleFile}
            className="hidden"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5">
              <Upload className="w-3.5 h-3.5" /> {file ? 'Trocar arquivo' : 'Escolher arquivo'}
            </Button>
            {file && <span className="text-xs text-gray-600 font-medium truncate max-w-[220px]">{file.name}</span>}
          </div>
        </div>

        {/* Duplicados */}
        <div>
          <p className="text-xs text-gray-500 mb-1.5">Se um registro já existir (mesmo CNPJ/CPF/CRECI/e-mail):</p>
          <div className="flex gap-2">
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="radio" name="modo" checked={modo === 'ignorar'} onChange={() => setModo('ignorar')} className="accent-green-600" />
              Ignorar
            </label>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer ml-3">
              <input type="radio" name="modo" checked={modo === 'atualizar'} onChange={() => setModo('atualizar')} className="accent-green-600" />
              Atualizar
            </label>
          </div>
        </div>

        {/* Ações */}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button onClick={handleValidar} disabled={!file || carregando === 'validar'} className="bg-gray-900 hover:bg-gray-800 gap-1.5">
            {carregando === 'validar' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Validar (pré-visualizar)
          </Button>
          <Button
            onClick={handleImportar}
            disabled={!preview || preview.validos === 0 || carregando === 'importar'}
            className="bg-green-700 hover:bg-green-800 gap-1.5"
          >
            {carregando === 'importar' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Confirmar importação
          </Button>
          {(preview || resultado) && (
            <Button variant="ghost" size="sm" onClick={limpar} className="text-gray-500">Limpar</Button>
          )}
        </div>

        {/* Relatório (preview ou resultado) */}
        {(preview || resultado) && (
          <Relatorio rep={(resultado ?? preview)!} final={!!resultado} />
        )}
      </CardContent>
    </Card>
  )
}

function Relatorio({ rep, final }: { rep: ImportReport; final: boolean }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-800">
        {final ? 'Resultado da importação' : 'Pré-visualização'} — {rep.total} linha(s)
      </p>

      <div className="flex flex-wrap gap-2 text-xs">
        <Badge cor="green"  label={final ? `${rep.criados} criados` : `${rep.novos} novos`} />
        <Badge cor="blue"   label={final ? `${rep.atualizados} atualizados` : `${rep.existentes} já existem`} />
        {final && <Badge cor="gray" label={`${rep.ignorados} ignorados`} />}
        <Badge cor={rep.erros.length ? 'amber' : 'gray'} label={`${rep.erros.length} com erro`} />
      </div>

      {rep.erros.length > 0 && (
        <div className="max-h-44 overflow-y-auto rounded-lg border border-amber-200 bg-amber-50 p-2.5">
          <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Linhas com erro (corrija e reenvie)
          </p>
          <ul className="space-y-0.5">
            {rep.erros.map((e, i) => (
              <li key={i} className="text-[11px] text-amber-700">
                Linha {e.linha}: {e.mensagem}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!final && rep.validos > 0 && (
        <p className="text-[11px] text-gray-500">
          Tudo certo? Clique em <strong>Confirmar importação</strong> para gravar as {rep.validos} linha(s) válida(s).
        </p>
      )}
    </div>
  )
}

function Badge({ cor, label }: { cor: 'green' | 'blue' | 'amber' | 'gray'; label: string }) {
  const cls = {
    green: 'bg-green-100 text-green-700',
    blue:  'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
    gray:  'bg-gray-100 text-gray-600',
  }[cor]
  return <span className={`px-2 py-0.5 rounded-full font-semibold ${cls}`}>{label}</span>
}
