import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Palette, Loader2, Eye, PencilRuler, Unlink, Image as ImageIcon, FileText, Layers, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'
import { renderModeloDataURL } from '@/lib/modelo-render'
import { baixarDataURL, baixarPDF, baixarPDFLote, baixarZip, slug } from '@/lib/modelo-export'
import { DADOS_FICTICIOS } from '@/lib/modelo-variaveis'
import {
  fetchModelosDoEvento, fetchModelos, fetchModelo, vincularModelo, desvincularModelo,
  fetchDadosInscricao, fetchInscritosDados, registrarGeracao, fetchGeracoes, TIPO_MODELO_LABEL,
  type EventoModeloVinculo, type ModeloVisual, type TipoModelo,
} from '@/services/modelos'
import { fetchInscricoesByEvento } from '@/services/inscricoes'
import type { EventoInscricao } from '@/types'

type StatusFiltro = '' | 'presente' | 'inscrito'
type FormatoLote = 'pdf' | 'zip-png' | 'zip-pdf'

const TIPOS: TipoModelo[] = ['credenciamento', 'cracha', 'certificado']

export function EventoModelosAdmin({ eventoId, embedded = false }: { eventoId: string; embedded?: boolean }) {
  const { toast } = useToast()
  const [vinculos, setVinculos] = useState<EventoModeloVinculo[]>([])
  const [modelos, setModelos] = useState<ModeloVisual[]>([])
  const [inscritos, setInscritos] = useState<EventoInscricao[]>([])
  const [inscritoId, setInscritoId] = useState('')
  const [loading, setLoading] = useState(true)
  const [salvandoTipo, setSalvandoTipo] = useState<TipoModelo | null>(null)

  const [preview, setPreview] = useState<{ open: boolean; loading: boolean; url: string | null; tipo: TipoModelo | null }>({ open: false, loading: false, url: null, tipo: null })
  const [geracoes, setGeracoes] = useState<Record<string, number>>({})
  const [lote, setLote] = useState<{ open: boolean; tipo: TipoModelo | null; status: StatusFiltro; formato: FormatoLote; running: boolean; done: number; total: number }>(
    { open: false, tipo: null, status: '', formato: 'pdf', running: false, done: 0, total: 0 },
  )

  const load = useCallback(async () => {
    try {
      const [v, m, ins, g] = await Promise.all([
        fetchModelosDoEvento(eventoId),
        fetchModelos({ ativo: 'true' }),
        fetchInscricoesByEvento(eventoId),
        fetchGeracoes(eventoId),
      ])
      setVinculos(v); setModelos(m); setInscritos(ins.filter((i) => i.status !== 'cancelado'))
      setGeracoes(Object.fromEntries(g.map((x) => [x.tipo, x.total])))
    } catch (err) {
      toast({ title: 'Erro ao carregar modelos', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [eventoId, toast])

  useEffect(() => { load() }, [load])

  const vinculoDe = (tipo: TipoModelo) => vinculos.find((v) => v.tipo === tipo)

  const onSelecionar = async (tipo: TipoModelo, modeloId: string) => {
    setSalvandoTipo(tipo)
    try {
      if (modeloId) await vincularModelo(eventoId, modeloId)
      else await desvincularModelo(eventoId, tipo)
      await load()
    } catch (err) {
      toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setSalvandoTipo(null)
    }
  }

  const previewTipo = async (tipo: TipoModelo) => {
    const v = vinculoDe(tipo)
    if (!v) return
    setPreview({ open: true, loading: true, url: null, tipo })
    try {
      const modelo = await fetchModelo(v.modelo_id)
      const dados = inscritoId
        ? await fetchDadosInscricao(eventoId, inscritoId, tipo)
        : DADOS_FICTICIOS
      const url = await renderModeloDataURL(modelo.canvas_json, modelo.largura, modelo.altura, dados, { multiplier: 2 })
      setPreview({ open: true, loading: false, url, tipo })
    } catch (err) {
      toast({ title: 'Erro na pré-visualização', description: getErrorMessage(err), variant: 'destructive' })
      setPreview({ open: false, loading: false, url: null, tipo: null })
    }
  }

  const dimsDoTipo = (tipo: TipoModelo) => {
    const v = vinculoDe(tipo)
    return v ? { w: v.modelo.largura, h: v.modelo.altura, nome: v.modelo.nome } : null
  }

  const gerarLote = async () => {
    const tipo = lote.tipo
    if (!tipo) return
    const v = vinculoDe(tipo)
    if (!v) return
    setLote((l) => ({ ...l, running: true, done: 0, total: 0 }))
    try {
      const modelo = await fetchModelo(v.modelo_id)
      const status = lote.status === '' ? undefined : lote.status
      const lista = await fetchInscritosDados(eventoId, tipo, status)
      if (lista.length === 0) {
        toast({ title: 'Nenhum inscrito para gerar', variant: 'destructive' })
        setLote((l) => ({ ...l, running: false }))
        return
      }
      setLote((l) => ({ ...l, total: lista.length }))
      const artes: Array<{ nome: string; dataURL: string }> = []
      for (const it of lista) {
        const url = await renderModeloDataURL(modelo.canvas_json, modelo.largura, modelo.altura, it.dados, { multiplier: 2 })
        artes.push({ nome: it.nome, dataURL: url })
        setLote((l) => ({ ...l, done: l.done + 1 }))
      }
      const base = `${tipo}-${slug(modelo.nome)}`
      if (lote.formato === 'pdf') baixarPDFLote(artes.map((a) => a.dataURL), modelo.largura, modelo.altura, `${base}.pdf`)
      else await baixarZip(artes, modelo.largura, modelo.altura, lote.formato === 'zip-pdf' ? 'pdf' : 'png', `${base}.zip`)
      await registrarGeracao(eventoId, {
        modelo_id: v.modelo_id, tipo, formato: lote.formato === 'pdf' ? 'pdf' : 'zip',
        itens: lista.map((l) => ({ inscricao_id: l.inscricao_id })),
      })
      toast({ title: 'Geração concluída', description: `${artes.length} ${TIPO_MODELO_LABEL[tipo].toLowerCase()}(s) gerado(s).` })
      setLote((l) => ({ ...l, open: false, running: false }))
      load()
    } catch (err) {
      toast({ title: 'Erro na geração', description: getErrorMessage(err), variant: 'destructive' })
      setLote((l) => ({ ...l, running: false }))
    }
  }

  const previewToolbar = (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">Pré-visualizar com:</span>
      <select value={inscritoId} onChange={(e) => setInscritoId(e.target.value)} className="h-9 rounded-md border border-gray-200 px-2 text-sm max-w-[220px]">
        <option value="">Dados fictícios</option>
        {inscritos.map((i) => <option key={i.id} value={i.id}>{i.corretor?.nome ?? 'Corretor'}{i.status === 'presente' ? ' ✓' : ''}</option>)}
      </select>
    </div>
  )

  const body = (
    <>
      {embedded && <div className="px-6 pt-4 flex justify-end">{previewToolbar}</div>}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 text-green-600 animate-spin" /></div>
        ) : (
          <div className="space-y-3">
            {TIPOS.map((tipo) => {
              const v = vinculoDe(tipo)
              const opcoes = modelos.filter((m) => m.tipo === tipo)
              const dims = dimsDoTipo(tipo)
              return (
                <div key={tipo} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border border-gray-100">
                  <div className="w-32 flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-800">{TIPO_MODELO_LABEL[tipo]}</p>
                    {dims && <p className="text-[11px] text-gray-400">{dims.w}×{dims.h}px</p>}
                    {geracoes[tipo] > 0 && (
                      <p className="text-[10px] text-green-600 inline-flex items-center gap-1 mt-0.5"><CheckCircle2 className="w-3 h-3" /> {geracoes[tipo]} gerado(s)</p>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <select
                      value={v?.modelo_id ?? ''}
                      onChange={(e) => onSelecionar(tipo, e.target.value)}
                      disabled={salvandoTipo === tipo}
                      className="h-9 w-full rounded-md border border-gray-200 px-2 text-sm"
                    >
                      <option value="">— Nenhum modelo —</option>
                      {opcoes.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                    </select>
                    {opcoes.length === 0 && <p className="text-[11px] text-gray-400 mt-1">Nenhum modelo de {TIPO_MODELO_LABEL[tipo].toLowerCase()} criado ainda.</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {salvandoTipo === tipo && <Loader2 className="w-4 h-4 animate-spin text-green-600" />}
                    {v && (
                      <>
                        <button onClick={() => previewTipo(tipo)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg" title="Pré-visualizar"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => setLote({ open: true, tipo, status: '', formato: 'pdf', running: false, done: 0, total: 0 })} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg" title="Gerar em lote"><Layers className="w-4 h-4" /></button>
                        <Link to={`/admin/modelos/${v.modelo_id}`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Abrir editor"><PencilRuler className="w-4 h-4" /></Link>
                        <button onClick={() => onSelecionar(tipo, '')} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Desvincular"><Unlink className="w-4 h-4" /></button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Preview */}
      <Dialog open={preview.open} onOpenChange={(o) => { if (!o) setPreview({ open: false, loading: false, url: null, tipo: null }) }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Pré-visualização {preview.tipo ? `· ${TIPO_MODELO_LABEL[preview.tipo]}` : ''} {inscritoId ? '(dados reais)' : '(dados fictícios)'}</DialogTitle></DialogHeader>
          {preview.loading ? (
            <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 text-green-600 animate-spin" /></div>
          ) : preview.url ? (
            <div className="space-y-3">
              <div className="bg-slate-100 rounded-lg p-3 flex justify-center max-h-[60vh] overflow-auto">
                <img src={preview.url} alt="Pré-visualização" className="max-w-full h-auto shadow ring-1 ring-gray-200" />
              </div>
              <div className="flex justify-end gap-2">
                {(() => {
                  const dims = preview.tipo ? dimsDoTipo(preview.tipo) : null
                  const nome = `${preview.tipo}-${slug(dims?.nome ?? 'modelo')}`
                  return (
                    <>
                      <Button variant="outline" size="sm" onClick={() => preview.url && baixarDataURL(preview.url, `${nome}.png`)} className="gap-1.5"><ImageIcon className="w-4 h-4" /> PNG</Button>
                      <Button variant="outline" size="sm" onClick={() => preview.url && dims && baixarPDF(preview.url, dims.w, dims.h, `${nome}.pdf`)} className="gap-1.5"><FileText className="w-4 h-4" /> PDF</Button>
                    </>
                  )
                })()}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Geração em lote */}
      <Dialog open={lote.open} onOpenChange={(o) => { if (!o && !lote.running) setLote((l) => ({ ...l, open: false })) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Gerar em lote {lote.tipo ? `· ${TIPO_MODELO_LABEL[lote.tipo]}` : ''}</DialogTitle></DialogHeader>
          {lote.running ? (
            <div className="py-8 text-center">
              <Loader2 className="w-7 h-7 text-green-600 animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-700">Gerando {lote.done}{lote.total ? ` / ${lote.total}` : ''}…</p>
              {lote.total > 0 && (
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-3">
                  <div className="h-full bg-green-500 transition-all" style={{ width: `${Math.round((lote.done / lote.total) * 100)}%` }} />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500">Participantes</label>
                <select value={lote.status} onChange={(e) => setLote((l) => ({ ...l, status: e.target.value as StatusFiltro }))} className="mt-1 w-full h-10 rounded-md border border-gray-200 px-2 text-sm">
                  <option value="">Todos os inscritos (não cancelados)</option>
                  <option value="presente">Somente presença confirmada</option>
                  <option value="inscrito">Somente inscritos (sem check-in)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Formato</label>
                <select value={lote.formato} onChange={(e) => setLote((l) => ({ ...l, formato: e.target.value as FormatoLote }))} className="mt-1 w-full h-10 rounded-md border border-gray-200 px-2 text-sm">
                  <option value="pdf">PDF único (uma página por pessoa)</option>
                  <option value="zip-pdf">ZIP com 1 PDF por pessoa</option>
                  <option value="zip-png">ZIP com 1 PNG por pessoa</option>
                </select>
              </div>
              <p className="text-[11px] text-gray-400">A geração acontece no navegador. Para muitos inscritos pode levar alguns segundos.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLote((l) => ({ ...l, open: false }))} disabled={lote.running}>Cancelar</Button>
            <Button onClick={gerarLote} disabled={lote.running} className="bg-green-700 hover:bg-green-800 gap-1.5">
              {lote.running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />} Gerar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )

  if (embedded) return body

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Palette className="w-4 h-4 text-green-600" /> Artes / Modelos do evento</h2>
        {previewToolbar}
      </div>
      {body}
    </div>
  )
}
