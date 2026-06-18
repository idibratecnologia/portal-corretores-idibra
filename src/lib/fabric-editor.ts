/**
 * Wrapper do Fabric.js para o editor de modelos visuais.
 * Encapsula criação/serialização do canvas e as operações de edição,
 * mantendo o componente React enxuto.
 */
import * as fabric from 'fabric'
import QRCode from 'qrcode'

/** Propriedades customizadas que precisam ser persistidas no JSON. */
export const EXTRA_PROPS = [
  'varKey', 'qrPayload', 'isQR',
  'lockMovementX', 'lockMovementY', 'lockScalingX', 'lockScalingY', 'lockRotation',
  'selectable', 'evented', 'editable',
]

export const FONTES = ['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Courier New', 'Verdana', 'Trebuchet MS', 'Impact']

type FObj = fabric.FabricObject & Record<string, unknown>

interface Opts {
  onChange: () => void
  onSelect: (obj: FObj | null) => void
}

export class FabricModeloEditor {
  canvas: fabric.Canvas
  readonly width: number
  readonly height: number
  readonly gridSize = 20
  private snap = false
  private onChange: () => void
  private onSelect: (obj: FObj | null) => void

  constructor(el: HTMLCanvasElement, width: number, height: number, opts: Opts) {
    this.width = width
    this.height = height
    this.onChange = opts.onChange
    this.onSelect = opts.onSelect
    this.canvas = new fabric.Canvas(el, {
      width, height, backgroundColor: '#ffffff', preserveObjectStacking: true,
    })
    const sel = () => this.onSelect((this.canvas.getActiveObject() as unknown as FObj) ?? null)
    this.canvas.on('selection:created', sel)
    this.canvas.on('selection:updated', sel)
    this.canvas.on('selection:cleared', () => this.onSelect(null))
    this.canvas.on('object:modified', () => this.onChange())
    // Encaixe na grade ao mover
    this.canvas.on('object:moving', (e) => {
      if (!this.snap || !e.target) return
      const g = this.gridSize
      e.target.set({ left: Math.round((e.target.left ?? 0) / g) * g, top: Math.round((e.target.top ?? 0) / g) * g })
    })
  }

  setSnap(v: boolean) { this.snap = v }

  async load(json: unknown) {
    if (!json) return
    await this.canvas.loadFromJSON(json as object)
    this.canvas.requestRenderAll()
  }

  /** Serializa o canvas (com props customizadas) para salvar/exportar. */
  toJSON(): object {
    return this.canvas.toObject(EXTRA_PROPS)
  }

  private place(obj: fabric.FabricObject) {
    this.canvas.add(obj)
    this.canvas.setActiveObject(obj)
    this.canvas.requestRenderAll()
    this.onSelect(obj as unknown as FObj)
    this.onChange()
  }

  private center() {
    return { left: this.width / 2, top: this.height / 2, originX: 'center' as const, originY: 'center' as const }
  }

  addTexto(texto = 'Texto') {
    this.place(new fabric.Textbox(texto, {
      ...this.center(), width: Math.min(320, this.width * 0.7),
      fontSize: 28, fill: '#111827', fontFamily: 'Arial', textAlign: 'center',
    }))
  }

  addVariavelTexto(chave: string) {
    this.addTexto(`{{${chave}}}`)
  }

  /** Placeholder de imagem dinâmica (ex.: foto do participante). */
  addVariavelImagem(chave: string) {
    const size = Math.min(180, this.width * 0.4)
    const rect = new fabric.Rect({
      ...this.center(), width: size, height: size,
      fill: '#eef2f7', stroke: '#94a3b8', strokeDashArray: [6, 4], strokeWidth: 2,
    })
    ;(rect as unknown as FObj).varKey = chave
    this.place(rect)
  }

  async addImagem(dataURL: string) {
    const img = await fabric.FabricImage.fromURL(dataURL, { crossOrigin: 'anonymous' })
    const max = this.width * 0.5
    if ((img.width ?? 0) > max) img.scaleToWidth(max)
    img.set(this.center())
    this.place(img)
  }

  async setBackgroundImage(dataURL: string) {
    const img = await fabric.FabricImage.fromURL(dataURL, { crossOrigin: 'anonymous' })
    img.scaleX = this.width / (img.width || 1)
    img.scaleY = this.height / (img.height || 1)
    this.canvas.backgroundImage = img
    this.canvas.requestRenderAll()
    this.onChange()
  }

  removeBackgroundImage() {
    this.canvas.backgroundImage = undefined
    this.canvas.requestRenderAll()
    this.onChange()
  }

  setBackgroundColor(cor: string) {
    this.canvas.backgroundColor = cor
    this.canvas.requestRenderAll()
    this.onChange()
  }

  async addQR(payload = '{{qr_code}}') {
    const url = await QRCode.toDataURL(payload || ' ', { margin: 1, width: 300 })
    const img = await fabric.FabricImage.fromURL(url)
    img.scaleToWidth(140)
    img.set(this.center())
    const fo = img as unknown as FObj
    fo.isQR = true
    fo.qrPayload = payload
    this.place(img)
  }

  addRetangulo() {
    this.place(new fabric.Rect({ ...this.center(), width: 180, height: 110, fill: '#16a34a', rx: 6, ry: 6 }))
  }
  addCirculo() {
    this.place(new fabric.Circle({ ...this.center(), radius: 70, fill: '#16a34a' }))
  }
  addLinha() {
    const y = this.height / 2
    this.place(new fabric.Line([this.width * 0.25, y, this.width * 0.75, y], { stroke: '#111827', strokeWidth: 3 }))
  }

  // ── Ações sobre o objeto selecionado ──
  active(): FObj | null { return (this.canvas.getActiveObject() as unknown as FObj) ?? null }

  updateActive(props: Record<string, unknown>) {
    const o = this.active()
    if (!o) return
    ;(o as fabric.FabricObject).set(props as unknown as Partial<fabric.FabricObject>)
    o.setCoords()
    this.canvas.requestRenderAll()
    this.onChange()
  }

  deleteActive() {
    const o = this.active()
    if (!o) return
    this.canvas.remove(o)
    this.canvas.discardActiveObject()
    this.canvas.requestRenderAll()
    this.onSelect(null)
    this.onChange()
  }

  async duplicateActive() {
    const o = this.active()
    if (!o) return
    const cl = await o.clone(EXTRA_PROPS)
    cl.set({ left: (o.left ?? 0) + 24, top: (o.top ?? 0) + 24 })
    this.place(cl)
  }

  bringForward() { const o = this.active(); if (o) { this.canvas.bringObjectForward(o); this.canvas.requestRenderAll(); this.onChange() } }
  sendBackwards() { const o = this.active(); if (o) { this.canvas.sendObjectBackwards(o); this.canvas.requestRenderAll(); this.onChange() } }
  toFront() { const o = this.active(); if (o) { this.canvas.bringObjectToFront(o); this.canvas.requestRenderAll(); this.onChange() } }
  toBack() { const o = this.active(); if (o) { this.canvas.sendObjectToBack(o); this.canvas.requestRenderAll(); this.onChange() } }

  toggleLock() {
    const o = this.active()
    if (!o) return
    const locked = !!o.lockMovementX
    this.updateActive({
      lockMovementX: !locked, lockMovementY: !locked,
      lockScalingX: !locked, lockScalingY: !locked, lockRotation: !locked,
      hasControls: locked, editable: locked,
    })
    this.onSelect(o) // atualiza o painel (ícone travar/liberar)
  }

  setZoom(z: number) {
    this.canvas.setZoom(z)
    this.canvas.setDimensions({ width: this.width * z, height: this.height * z })
  }

  /** Alinha/centraliza o objeto ativo em relação ao canvas. */
  alinhar(pos: 'left' | 'centerH' | 'right' | 'top' | 'middle' | 'bottom' | 'center') {
    const o = this.active()
    if (!o) return
    if (pos === 'center') this.canvas.centerObject(o)
    else if (pos === 'centerH') this.canvas.centerObjectH(o)
    else if (pos === 'middle') this.canvas.centerObjectV(o)
    else {
      const b = o.getBoundingRect()
      let dx = 0, dy = 0
      if (pos === 'left') dx = -b.left
      else if (pos === 'right') dx = this.width - (b.left + b.width)
      else if (pos === 'top') dy = -b.top
      else if (pos === 'bottom') dy = this.height - (b.top + b.height)
      o.set({ left: (o.left ?? 0) + dx, top: (o.top ?? 0) + dy })
    }
    o.setCoords()
    this.canvas.requestRenderAll()
    this.onChange()
  }

  /** Exporta o canvas atual como dataURL em resolução real (independente do zoom). */
  getDataURL(opts: { format?: 'png' | 'jpeg'; multiplier?: number; quality?: number } = {}): string {
    const { format = 'png', multiplier = 2, quality = 0.92 } = opts
    const z = this.canvas.getZoom()
    this.canvas.discardActiveObject()
    this.canvas.setZoom(1)
    this.canvas.setDimensions({ width: this.width, height: this.height })
    this.canvas.requestRenderAll()
    const url = this.canvas.toDataURL({ format, multiplier, quality, enableRetinaScaling: false })
    this.canvas.setZoom(z)
    this.canvas.setDimensions({ width: this.width * z, height: this.height * z })
    this.canvas.requestRenderAll()
    return url
  }

  dispose() { this.canvas.dispose() }
}
