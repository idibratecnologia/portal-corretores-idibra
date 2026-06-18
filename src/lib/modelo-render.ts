/**
 * Renderiza um modelo (canvas_json do Fabric) substituindo as variáveis pelos
 * dados fornecidos e devolve um dataURL (PNG/JPG). Usado no preview e na geração.
 *
 * - Tokens {{...}} em textos → valores de `dados`
 * - Objetos com isQR → QR Code gerado a partir do payload (com tokens substituídos)
 * - Objetos com varKey (imagem dinâmica, ex.: foto) → imagem da URL em dados[varKey]
 */
import * as fabric from 'fabric'
import QRCode from 'qrcode'
import { substituirTokens } from './modelo-variaveis'

type AnyObj = fabric.FabricObject & Record<string, unknown>

export async function renderModeloDataURL(
  canvasJson: unknown,
  width: number,
  height: number,
  dados: Record<string, string>,
  opts: { format?: 'png' | 'jpeg'; multiplier?: number } = {},
): Promise<string> {
  const { format = 'png', multiplier = 2 } = opts
  const el = document.createElement('canvas')
  const canvas = new fabric.StaticCanvas(el, { width, height, backgroundColor: '#ffffff' })

  if (canvasJson) await canvas.loadFromJSON(canvasJson as object)

  for (const obj of [...canvas.getObjects()]) {
    const o = obj as AnyObj
    const type = (o.type as string) || ''

    // Textos com tokens
    if ((type === 'textbox' || type === 'i-text' || type === 'text') && typeof o.text === 'string') {
      ;(o as fabric.FabricObject).set('text' as keyof fabric.FabricObject, substituirTokens(o.text, dados) as never)
      continue
    }

    // QR Code dinâmico
    if (o.isQR) {
      const payload = substituirTokens(String(o.qrPayload ?? ''), dados) || ' '
      try {
        const url = await QRCode.toDataURL(payload, { margin: 1, width: 400 })
        const img = await fabric.FabricImage.fromURL(url)
        img.set({
          left: o.left, top: o.top, originX: o.originX, originY: o.originY, angle: o.angle,
          scaleX: o.getScaledWidth() / (img.width || 1), scaleY: o.getScaledHeight() / (img.height || 1),
        })
        canvas.remove(o); canvas.add(img)
      } catch { /* mantém o placeholder */ }
      continue
    }

    // Imagem dinâmica (ex.: foto do participante)
    if (o.varKey) {
      const val = dados[String(o.varKey)]
      if (val) {
        try {
          const bw = o.getScaledWidth(), bh = o.getScaledHeight()
          const img = await fabric.FabricImage.fromURL(val, { crossOrigin: 'anonymous' })
          const s = Math.max(bw / (img.width || 1), bh / (img.height || 1)) // cobrir
          img.set({ left: o.left, top: o.top, originX: o.originX, originY: o.originY, angle: o.angle, scaleX: s, scaleY: s })
          canvas.remove(o); canvas.add(img)
        } catch { /* mantém o placeholder */ }
      }
    }
  }

  canvas.renderAll()
  const dataURL = canvas.toDataURL({ format, multiplier })
  canvas.dispose()
  return dataURL
}
