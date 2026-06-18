import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Loader2, Type, Image as ImageIcon, QrCode, Square, Circle as CircleIcon, Minus,
  Save, Download, Upload, ZoomIn, ZoomOut, Trash2, Copy, Lock, Unlock,
  ChevronUp, ChevronDown, ArrowUpToLine, ArrowDownToLine, Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight, Palette, LayoutGrid, Magnet, Eye, FileText, Crosshair,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'
import { fetchModelo, updateModelo, TIPO_MODELO_LABEL, type ModeloVisual } from '@/services/modelos'
import { FabricModeloEditor, FONTES } from '@/lib/fabric-editor'
import { GRUPOS_VARIAVEIS, DADOS_FICTICIOS } from '@/lib/modelo-variaveis'
import { renderModeloDataURL } from '@/lib/modelo-render'
import { baixarDataURL, baixarPDF, slug } from '@/lib/modelo-export'
import type * as fabric from 'fabric'

type FObj = fabric.FabricObject & Record<string, unknown>

/** Lê uma imagem como dataURL, com limite de tamanho e downscale de imagens enormes. */
async function lerImagem(file: File, maxDim = 1600, maxMB = 8): Promise<string> {
  if (file.size > maxMB * 1024 * 1024) throw new Error(`Imagem acima de ${maxMB} MB. Reduza o arquivo.`)
  const dataURL = await new Promise<string>((res, rej) => {
    const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = () => rej(new Error('Falha ao ler o arquivo')); r.readAsDataURL(file)
  })
  const img = new Image()
  await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('Imagem inválida')); img.src = dataURL })
  if (Math.max(img.width, img.height) <= maxDim) return dataURL
  const scale = maxDim / Math.max(img.width, img.height)
  const c = document.createElement('canvas')
  c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale)
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.85)
}

export function AdminModeloEditor() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [modelo, setModelo] = useState<ModeloVisual | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [, setVersion] = useState(0)         // força re-render do painel
  const [selected, setSelected] = useState<FObj | null>(null)
  const [gridOn, setGridOn] = useState(false)
  const [snapOn, setSnapOn] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const editorRef = useRef<FabricModeloEditor | null>(null)
  const imgInputRef = useRef<HTMLInputElement>(null)
  const bgInputRef = useRef<HTMLInputElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  // 1) carrega o modelo
  useEffect(() => {
    let ativo = true
    fetchModelo(id)
      .then((m) => { if (ativo) setModelo(m) })
      .catch((err) => toast({ title: 'Erro ao carregar', description: getErrorMessage(err), variant: 'destructive' }))
      .finally(() => { if (ativo) setLoading(false) })
    return () => { ativo = false }
  }, [id, toast])

  // 2) inicializa o Fabric quando o modelo e o <canvas> existem
  useEffect(() => {
    if (!modelo || !canvasElRef.current || editorRef.current) return
    const ed = new FabricModeloEditor(canvasElRef.current, modelo.largura, modelo.altura, {
      onChange: () => setVersion((v) => v + 1),
      onSelect: (o) => setSelected(o),
    })
    editorRef.current = ed
    const z = Math.min(720 / modelo.largura, 560 / modelo.altura, 1)
    setZoom(z); ed.setZoom(z)
    ed.load(modelo.canvas_json).catch(() => {})
    return () => { ed.dispose(); editorRef.current = null }
  }, [modelo])

  // atalhos de teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ed = editorRef.current
      if (!ed || !ed.active()) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); ed.deleteActive() }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); void ed.duplicateActive() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const ed = () => editorRef.current

  const aplicarZoom = (z: number) => { const nz = Math.max(0.1, Math.min(3, z)); setZoom(nz); ed()?.setZoom(nz) }

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>, bg: boolean) => {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    try {
      const url = await lerImagem(f)
      if (bg) await ed()?.setBackgroundImage(url)
      else await ed()?.addImagem(url)
    } catch (err) { toast({ title: 'Erro na imagem', description: getErrorMessage(err), variant: 'destructive' }) }
  }

  const salvar = async () => {
    if (!ed()) return
    setSaving(true)
    try {
      await updateModelo(id, { canvas_json: ed()!.toJSON() })
      toast({ title: 'Modelo salvo' })
    } catch (err) { toast({ title: 'Erro ao salvar', description: getErrorMessage(err), variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  const exportarJSON = () => {
    if (!ed() || !modelo) return
    const blob = new Blob([JSON.stringify(ed()!.toJSON(), null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `modelo-${modelo.nome.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`
    a.click(); URL.revokeObjectURL(a.href)
  }

  const importarJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    try {
      const txt = await f.text()
      const json = JSON.parse(txt)
      if (!json || typeof json !== 'object' || !Array.isArray(json.objects)) throw new Error('Arquivo não é um template Fabric.js válido.')
      await ed()?.load(json)
      setVersion((v) => v + 1)
      toast({ title: 'Template importado' })
    } catch (err) { toast({ title: 'Erro ao importar', description: getErrorMessage(err), variant: 'destructive' }) }
  }

  const toggleSnap = () => { const v = !snapOn; setSnapOn(v); ed()?.setSnap(v) }

  const exportar = (fmt: 'png' | 'jpeg' | 'pdf') => {
    if (!ed() || !modelo) return
    setExportOpen(false)
    const nome = slug(modelo.nome)
    if (fmt === 'pdf') {
      const url = ed()!.getDataURL({ format: 'png', multiplier: 2 })
      baixarPDF(url, modelo.largura, modelo.altura, `${nome}.pdf`)
    } else {
      const url = ed()!.getDataURL({ format: fmt, multiplier: 2 })
      baixarDataURL(url, `${nome}.${fmt === 'jpeg' ? 'jpg' : 'png'}`)
    }
  }

  const abrirPreview = async () => {
    if (!ed() || !modelo) return
    setPreviewLoading(true)
    setPreviewUrl('')
    try {
      const url = await renderModeloDataURL(ed()!.toJSON(), modelo.largura, modelo.altura, DADOS_FICTICIOS, { multiplier: 2 })
      setPreviewUrl(url)
    } catch (err) {
      toast({ title: 'Erro na pré-visualização', description: getErrorMessage(err), variant: 'destructive' })
      setPreviewUrl(null)
    } finally {
      setPreviewLoading(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-green-600 animate-spin" /></div>
  if (!modelo) return <div className="p-8 text-center text-gray-500">Modelo não encontrado.</div>

  return (
    <div className="space-y-3">
      {/* Cabeçalho + ações */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <button onClick={() => navigate('/admin/modelos')} className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Modelos
          </button>
          <div className="flex items-center gap-2 mt-1">
            <h1 className="text-xl font-bold text-gray-900">{modelo.nome}</h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">{TIPO_MODELO_LABEL[modelo.tipo]}</span>
            <span className="text-xs text-gray-400">{modelo.largura}×{modelo.altura}px</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={abrirPreview} className="gap-1.5"><Eye className="w-4 h-4" /> Pré-visualizar</Button>

          {/* Exportar (dropdown) */}
          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setExportOpen((o) => !o)} className="gap-1.5"><Download className="w-4 h-4" /> Exportar</Button>
            {exportOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
                <div className="absolute right-0 mt-1 z-20 w-44 bg-white rounded-xl border border-gray-100 shadow-lg py-1 text-sm">
                  <button onClick={() => exportar('png')} className="w-full text-left px-3 py-2 hover:bg-gray-50 inline-flex items-center gap-2"><ImageIcon className="w-4 h-4 text-gray-400" /> PNG (alta qualidade)</button>
                  <button onClick={() => exportar('jpeg')} className="w-full text-left px-3 py-2 hover:bg-gray-50 inline-flex items-center gap-2"><ImageIcon className="w-4 h-4 text-gray-400" /> JPG</button>
                  <button onClick={() => exportar('pdf')} className="w-full text-left px-3 py-2 hover:bg-gray-50 inline-flex items-center gap-2"><FileText className="w-4 h-4 text-gray-400" /> PDF</button>
                  <div className="my-1 border-t border-gray-100" />
                  <button onClick={() => { setExportOpen(false); exportarJSON() }} className="w-full text-left px-3 py-2 hover:bg-gray-50 inline-flex items-center gap-2"><Download className="w-4 h-4 text-gray-400" /> Template JSON</button>
                </div>
              </>
            )}
          </div>

          <Button variant="outline" size="sm" onClick={() => importInputRef.current?.click()} className="gap-1.5"><Upload className="w-4 h-4" /> Importar</Button>
          <Button size="sm" onClick={salvar} disabled={saving} className="bg-green-700 hover:bg-green-800 gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 flex-wrap bg-white rounded-xl border border-gray-100 shadow-sm p-2">
        <TbBtn icon={Type} label="Texto" onClick={() => ed()?.addTexto()} />
        <TbBtn icon={ImageIcon} label="Imagem" onClick={() => imgInputRef.current?.click()} />
        <TbBtn icon={QrCode} label="QR Code" onClick={() => ed()?.addQR()} />
        <TbBtn icon={Square} label="Retângulo" onClick={() => ed()?.addRetangulo()} />
        <TbBtn icon={CircleIcon} label="Círculo" onClick={() => ed()?.addCirculo()} />
        <TbBtn icon={Minus} label="Linha" onClick={() => ed()?.addLinha()} />
        <span className="w-px h-6 bg-gray-200 mx-1" />
        {/* Fundo */}
        <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
          <Palette className="w-4 h-4" /> Fundo
          <input type="color" defaultValue="#ffffff" onChange={(e) => ed()?.setBackgroundColor(e.target.value)} className="w-5 h-5 rounded border-0 p-0 cursor-pointer" />
        </label>
        <TbBtn icon={ImageIcon} label="Fundo (img)" onClick={() => bgInputRef.current?.click()} />
        <TbBtn icon={Trash2} label="Remover fundo" onClick={() => ed()?.removeBackgroundImage()} />
        <span className="w-px h-6 bg-gray-200 mx-1" />
        <TbBtn icon={ZoomOut} label="Zoom -" onClick={() => aplicarZoom(zoom - 0.1)} />
        <span className="text-xs text-gray-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
        <TbBtn icon={ZoomIn} label="Zoom +" onClick={() => aplicarZoom(zoom + 0.1)} />
        <span className="w-px h-6 bg-gray-200 mx-1" />
        <ToggleBtn icon={LayoutGrid} label="Grade" active={gridOn} onClick={() => setGridOn((g) => !g)} />
        <ToggleBtn icon={Magnet} label="Encaixar" active={snapOn} onClick={toggleSnap} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr_260px] gap-3">
        {/* Variáveis */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 order-2 lg:order-1 max-h-[70vh] overflow-y-auto">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Variáveis</h3>
          {GRUPOS_VARIAVEIS.map((g) => (
            <div key={g.titulo} className="mb-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">{g.titulo}</p>
              <div className="flex flex-wrap gap-1">
                {g.itens.map((v) => (
                  <button
                    key={v.chave}
                    onClick={() => {
                      if (v.chave === 'qr_code') ed()?.addQR()
                      else if (v.tipo === 'imagem') ed()?.addVariavelImagem(v.chave)
                      else ed()?.addVariavelTexto(v.chave)
                    }}
                    className="text-[11px] px-2 py-1 rounded-md bg-gray-50 hover:bg-green-50 hover:text-green-700 text-gray-600 border border-gray-100"
                    title={`{{${v.chave}}}`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Canvas */}
        <div className="bg-slate-100 rounded-xl border border-gray-200 p-4 overflow-auto order-1 lg:order-2 flex items-start justify-center min-h-[420px]">
          <div className="relative shadow-lg ring-1 ring-gray-300">
            <canvas ref={canvasElRef} />
            {gridOn && (
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, rgba(0,0,0,0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.10) 1px, transparent 1px)',
                  backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
                }}
              />
            )}
          </div>
        </div>

        {/* Propriedades */}
        <div className="order-3 lg:order-3">
          <PropriedadesPanel editor={ed()} selected={selected} />
        </div>
      </div>

      {/* inputs ocultos */}
      <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPickImage(e, false)} />
      <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPickImage(e, true)} />
      <input ref={importInputRef} type="file" accept="application/json,.json" className="hidden" onChange={importarJSON} />

      {/* Pré-visualização com dados fictícios */}
      <Dialog open={previewUrl !== null} onOpenChange={(o) => { if (!o) setPreviewUrl(null) }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Pré-visualização (dados fictícios)</DialogTitle></DialogHeader>
          {previewLoading ? (
            <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 text-green-600 animate-spin" /></div>
          ) : previewUrl ? (
            <div className="space-y-3">
              <div className="bg-slate-100 rounded-lg p-3 flex justify-center max-h-[60vh] overflow-auto">
                <img src={previewUrl} alt="Pré-visualização" className="max-w-full h-auto shadow ring-1 ring-gray-200" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => previewUrl && baixarDataURL(previewUrl, `${slug(modelo.nome)}-preview.png`)} className="gap-1.5"><ImageIcon className="w-4 h-4" /> PNG</Button>
                <Button variant="outline" size="sm" onClick={() => previewUrl && baixarPDF(previewUrl, modelo.largura, modelo.altura, `${slug(modelo.nome)}-preview.pdf`)} className="gap-1.5"><FileText className="w-4 h-4" /> PDF</Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TbBtn({ icon: Icon, label, onClick }: { icon: typeof Type; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} title={label} className="inline-flex items-center gap-1.5 text-xs text-gray-600 px-2 py-1.5 rounded-lg hover:bg-gray-50">
      <Icon className="w-4 h-4" /> <span className="hidden xl:inline">{label}</span>
    </button>
  )
}

function ToggleBtn({ icon: Icon, label, active, onClick }: { icon: typeof Type; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} title={label} className={`inline-flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg ${active ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
      <Icon className="w-4 h-4" /> <span className="hidden xl:inline">{label}</span>
    </button>
  )
}

function MiniBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-[11px] py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">{label}</button>
  )
}

// ─── Painel de propriedades ──────────────────────────────────────
function PropriedadesPanel({ editor, selected }: { editor: FabricModeloEditor | null; selected: FObj | null }) {
  if (!editor || !selected) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-sm text-gray-400">
        Selecione um elemento para editar suas propriedades.
      </div>
    )
  }

  const type = (selected.type as string) || ''
  const isTexto = type === 'textbox' || type === 'i-text' || type === 'text'
  const isForma = type === 'rect' || type === 'circle' || type === 'triangle' || type === 'line' || type === 'ellipse'
  const locked = !!selected.lockMovementX
  const up = (p: Record<string, unknown>) => editor.updateActive(p)
  const num = (v: unknown, d = 0) => (typeof v === 'number' ? Math.round(v) : d)

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4 text-sm max-h-[70vh] overflow-y-auto">
      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Propriedades</h3>

      {/* Texto */}
      {isTexto && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500">Conteúdo</label>
            <textarea
              value={(selected.text as string) ?? ''}
              onChange={(e) => up({ text: e.target.value })}
              rows={2}
              className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">Fonte</label>
              <select value={(selected.fontFamily as string) ?? 'Arial'} onChange={(e) => up({ fontFamily: e.target.value })} className="mt-1 w-full h-9 rounded-md border border-gray-200 px-2 text-sm">
                {FONTES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Tamanho</label>
              <input type="number" min={6} value={num(selected.fontSize, 28)} onChange={(e) => up({ fontSize: Number(e.target.value) })} className="mt-1 w-full h-9 rounded-md border border-gray-200 px-2 text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Cor</label>
            <input type="color" value={(selected.fill as string) ?? '#111827'} onChange={(e) => up({ fill: e.target.value })} className="w-8 h-8 rounded border border-gray-200 p-0.5" />
            <div className="flex gap-1 ml-auto">
              <IconToggle active={selected.fontWeight === 'bold'} onClick={() => up({ fontWeight: selected.fontWeight === 'bold' ? 'normal' : 'bold' })} icon={Bold} />
              <IconToggle active={selected.fontStyle === 'italic'} onClick={() => up({ fontStyle: selected.fontStyle === 'italic' ? 'normal' : 'italic' })} icon={Italic} />
              <IconToggle active={!!selected.underline} onClick={() => up({ underline: !selected.underline })} icon={Underline} />
            </div>
          </div>
          <div className="flex gap-1">
            <IconToggle active={selected.textAlign === 'left'} onClick={() => up({ textAlign: 'left' })} icon={AlignLeft} />
            <IconToggle active={selected.textAlign === 'center'} onClick={() => up({ textAlign: 'center' })} icon={AlignCenter} />
            <IconToggle active={selected.textAlign === 'right'} onClick={() => up({ textAlign: 'right' })} icon={AlignRight} />
          </div>
        </div>
      )}

      {/* Formas */}
      {isForma && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 w-16">Preench.</label>
            <input type="color" value={(selected.fill as string) ?? '#16a34a'} onChange={(e) => up({ fill: e.target.value })} className="w-8 h-8 rounded border border-gray-200 p-0.5" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 w-16">Borda</label>
            <input type="color" value={(selected.stroke as string) ?? '#000000'} onChange={(e) => up({ stroke: e.target.value })} className="w-8 h-8 rounded border border-gray-200 p-0.5" />
            <input type="number" min={0} value={num(selected.strokeWidth, 0)} onChange={(e) => up({ strokeWidth: Number(e.target.value) })} className="w-16 h-9 rounded-md border border-gray-200 px-2 text-sm" title="Espessura" />
          </div>
        </div>
      )}

      {/* QR */}
      {!!selected.isQR && (
        <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
          QR Code dinâmico — payload: <code className="text-green-700">{String(selected.qrPayload ?? '{{qr_code}}')}</code>. Será gerado na emissão.
        </div>
      )}

      {/* Imagem dinâmica (placeholder) */}
      {!!selected.varKey && (
        <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
          Imagem dinâmica — variável: <code className="text-green-700">{`{{${String(selected.varKey)}}}`}</code>. Será preenchida na emissão.
        </div>
      )}

      {/* Opacidade */}
      <div>
        <label className="text-xs text-gray-500">Opacidade: {Math.round((typeof selected.opacity === 'number' ? selected.opacity : 1) * 100)}%</label>
        <input type="range" min={0} max={100} value={Math.round((typeof selected.opacity === 'number' ? selected.opacity : 1) * 100)} onChange={(e) => up({ opacity: Number(e.target.value) / 100 })} className="w-full" />
      </div>

      {/* Alinhar no canvas */}
      <div className="pt-2 border-t border-gray-100">
        <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Alinhar / nivelar</p>
        <div className="grid grid-cols-3 gap-1">
          <MiniBtn label="Esq." onClick={() => editor.alinhar('left')} />
          <MiniBtn label="Centro H" onClick={() => editor.alinhar('centerH')} />
          <MiniBtn label="Dir." onClick={() => editor.alinhar('right')} />
          <MiniBtn label="Topo" onClick={() => editor.alinhar('top')} />
          <MiniBtn label="Meio V" onClick={() => editor.alinhar('middle')} />
          <MiniBtn label="Base" onClick={() => editor.alinhar('bottom')} />
        </div>
        <button onClick={() => editor.alinhar('center')} className="mt-1 w-full inline-flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100">
          <Crosshair className="w-3.5 h-3.5" /> Centralizar
        </button>
      </div>

      {/* Camadas e ações */}
      <div className="grid grid-cols-4 gap-1 pt-2 border-t border-gray-100">
        <AcaoBtn icon={ArrowUpToLine} label="Frente" onClick={() => editor.toFront()} />
        <AcaoBtn icon={ChevronUp} label="Subir" onClick={() => editor.bringForward()} />
        <AcaoBtn icon={ChevronDown} label="Descer" onClick={() => editor.sendBackwards()} />
        <AcaoBtn icon={ArrowDownToLine} label="Fundo" onClick={() => editor.toBack()} />
        <AcaoBtn icon={Copy} label="Duplicar" onClick={() => void editor.duplicateActive()} />
        <AcaoBtn icon={locked ? Unlock : Lock} label={locked ? 'Liberar' : 'Travar'} onClick={() => editor.toggleLock()} />
        <AcaoBtn icon={Trash2} label="Excluir" onClick={() => editor.deleteActive()} danger />
      </div>
    </div>
  )
}

function IconToggle({ active, onClick, icon: Icon }: { active: boolean; onClick: () => void; icon: typeof Bold }) {
  return (
    <button onClick={onClick} className={`w-8 h-8 rounded-md border flex items-center justify-center ${active ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
      <Icon className="w-4 h-4" />
    </button>
  )
}

function AcaoBtn({ icon: Icon, label, onClick, danger }: { icon: typeof Copy; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} title={label} className={`flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[10px] ${danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-600 hover:bg-gray-50'}`}>
      <Icon className="w-4 h-4" /> {label}
    </button>
  )
}
