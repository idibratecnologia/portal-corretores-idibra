import { useState, useEffect, useRef } from 'react'
import { Bell, Loader2, Image as ImageIcon, MessageSquare, Save, RotateCcw, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { fetchTemplates, updateTemplate, type MensagemTemplate } from '@/services/templates'
import { getErrorMessage } from '@/lib/errors'

/** Valores de exemplo para a pré-visualização da mensagem. */
const PREVIEW_VARS: Record<string, string> = {
  nome: 'João Silva',
  evento: 'Lançamento Residencial Aurora',
  descricao: 'Um empreendimento exclusivo com condições especiais para corretores parceiros.',
  data: '15/07/2026',
  hora: '19:00',
  hora_fim: '22:00',
  local: 'Salão de Eventos IDIBRA',
  endereco: 'Av. Beira Mar, 1500 — Fortaleza/CE',
  empreendimento: 'Residencial Aurora',
  vagas: '120',
  link: 'https://portal.idibra.com.br/portal/eventos/123',
  dias: '1',
}

function renderPreview(conteudo: string): string {
  return conteudo.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => PREVIEW_VARS[key] ?? `{{${key}}}`)
}

/** Card editável de um template individual. */
function TemplateEditor({
  template,
  onSaved,
}: {
  template: MensagemTemplate
  onSaved: (t: MensagemTemplate) => void
}) {
  const { toast } = useToast()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [conteudo, setConteudo] = useState(template.conteudo)
  const [ativo, setAtivo] = useState(template.ativo)
  const [comImagem, setComImagem] = useState(template.com_imagem)
  const [dias, setDias] = useState<number>(template.dias_antecedencia ?? 1)
  const [showPreview, setShowPreview] = useState(false)
  const [saving, setSaving] = useState(false)

  const isLembreteAntecedencia = template.tipo === 'lembrete_antecedencia'

  const dirty =
    conteudo !== template.conteudo ||
    ativo !== template.ativo ||
    comImagem !== template.com_imagem ||
    (isLembreteAntecedencia && dias !== (template.dias_antecedencia ?? 1))

  /** Insere um placeholder na posição atual do cursor. */
  const inserirPlaceholder = (ph: string) => {
    const el = textareaRef.current
    const token = `{{${ph}}}`
    if (!el) {
      setConteudo((c) => c + token)
      return
    }
    const start = el.selectionStart ?? conteudo.length
    const end = el.selectionEnd ?? conteudo.length
    const novo = conteudo.slice(0, start) + token + conteudo.slice(end)
    setConteudo(novo)
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + token.length
      el.setSelectionRange(pos, pos)
    })
  }

  const resetar = () => {
    setConteudo(template.conteudo)
    setAtivo(template.ativo)
    setComImagem(template.com_imagem)
    setDias(template.dias_antecedencia ?? 1)
  }

  const salvar = async () => {
    setSaving(true)
    try {
      const atualizado = await updateTemplate(template.tipo, {
        conteudo,
        ativo,
        com_imagem: comImagem,
        ...(isLembreteAntecedencia ? { dias_antecedencia: dias } : {}),
      })
      onSaved(atualizado)
      toast({ title: 'Mensagem salva', description: `"${template.titulo}" foi atualizada.` })
    } catch (err) {
      toast({ title: 'Erro ao salvar', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className={ativo ? '' : 'opacity-90'}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {template.titulo}
                {template.com_imagem && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    <ImageIcon className="w-3 h-3" /> banner
                  </span>
                )}
              </CardTitle>
              <CardDescription className="mt-0.5">{template.descricao}</CardDescription>
            </div>
          </div>
          {/* Toggle ativo/inativo */}
          <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
            <span className={`text-xs font-medium ${ativo ? 'text-green-600' : 'text-gray-400'}`}>
              {ativo ? 'Ativo' : 'Inativo'}
            </span>
            <input
              type="checkbox"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              className="rounded accent-green-600 w-4 h-4"
            />
          </label>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Placeholders disponíveis */}
        <div>
          <p className="text-xs text-gray-500 mb-1.5">Clique para inserir uma variável:</p>
          <div className="flex flex-wrap gap-1.5">
            {template.placeholders.map((ph) => (
              <button
                key={ph}
                type="button"
                onClick={() => inserirPlaceholder(ph)}
                className="text-[11px] font-mono text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-2 py-0.5 rounded-md transition-colors"
              >
                {`{{${ph}}}`}
              </button>
            ))}
          </div>
        </div>

        {/* Editor de conteúdo */}
        <div>
          <Label htmlFor={`conteudo-${template.tipo}`}>Mensagem</Label>
          <textarea
            id={`conteudo-${template.tipo}`}
            ref={textareaRef}
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
            rows={8}
            className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 resize-y"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            Use <code className="font-mono">*texto*</code> para negrito (WhatsApp). As variáveis serão substituídas no envio.
          </p>
        </div>

        {/* Pré-visualização */}
        <div>
          <button
            type="button"
            onClick={() => setShowPreview((s) => !s)}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-green-700 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            {showPreview ? 'Ocultar pré-visualização' : 'Pré-visualizar mensagem'}
          </button>
          {showPreview && (
            <div className="mt-2 rounded-xl bg-[#e5ddd5] p-3">
              <div className="max-w-md rounded-lg bg-[#dcf8c6] px-3 py-2 shadow-sm whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
                {renderPreview(conteudo)}
              </div>
            </div>
          )}
        </div>

        {/* Opções extras */}
        <div className="flex flex-wrap items-center gap-4 pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={comImagem}
              onChange={(e) => setComImagem(e.target.checked)}
              className="rounded accent-green-600 w-4 h-4"
            />
            <span className="text-sm text-gray-700">Anexar banner do evento</span>
          </label>

          {isLembreteAntecedencia && (
            <div className="flex items-center gap-2">
              <Label htmlFor={`dias-${template.tipo}`} className="text-sm text-gray-700 mb-0">
                Enviar
              </Label>
              <Input
                id={`dias-${template.tipo}`}
                type="number"
                min={1}
                max={60}
                value={dias}
                onChange={(e) => setDias(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                className="w-16 h-8 text-center"
              />
              <span className="text-sm text-gray-700">dia(s) antes do evento</span>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex items-center justify-end gap-2 pt-1">
          {dirty && (
            <Button variant="ghost" size="sm" onClick={resetar} disabled={saving} className="text-gray-500">
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Desfazer
            </Button>
          )}
          <Button
            className="bg-green-700 hover:bg-green-800"
            size="sm"
            onClick={salvar}
            disabled={saving || !dirty}
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Salvar mensagem</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function AdminNotificacoes() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<MensagemTemplate[]>([])

  useEffect(() => {
    fetchTemplates()
      .then(setTemplates)
      .catch((err) => toast({ title: 'Erro ao carregar', description: getErrorMessage(err), variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [toast])

  const handleSaved = (t: MensagemTemplate) => {
    setTemplates((prev) => prev.map((x) => (x.tipo === t.tipo ? { ...x, ...t } : x)))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
          <Bell className="w-5 h-5 text-green-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Central de Notificações</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Mensagens automáticas enviadas via WhatsApp nos gatilhos do sistema
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {templates.map((t) => (
            <TemplateEditor key={t.tipo} template={t} onSaved={handleSaved} />
          ))}
        </div>
      )}
    </div>
  )
}
