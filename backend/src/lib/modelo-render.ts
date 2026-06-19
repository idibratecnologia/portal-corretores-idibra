/**
 * Renderização server-side de um modelo visual (Fabric.js) para PNG.
 * Roda o Fabric no Node (fabric/node + canvas), substituindo as variáveis
 * pelos dados reais — usado na emissão de certificado/credenciamento/crachá.
 */
import { readFile } from 'fs/promises'
import { join, resolve, extname } from 'path'
import QRCode from 'qrcode'
import { config } from '@/config'

function substituirTokens(texto: string, dados: Record<string, string>): string {
  return texto.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, chave) => dados[chave] ?? '')
}

/** Converte uma URL do nosso /uploads em data URL (lendo do disco). */
async function urlParaDataURL(url: string): Promise<string | null> {
  if (url.startsWith('data:')) return url
  const marker = '/uploads/'
  const i = url.indexOf(marker)
  if (i === -1) return null
  try {
    const rel = url.slice(i + marker.length)
    const buf = await readFile(join(resolve(config.upload.dir), rel))
    const ext = extname(rel).toLowerCase()
    const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : ext === '.svg' ? 'image/svg+xml' : 'image/jpeg'
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

/** Renderiza o modelo com os dados e devolve um PNG (Buffer) em 2x. */
export async function renderModeloPng(
  canvasJson: unknown, width: number, height: number, dados: Record<string, string>,
): Promise<Buffer> {
  // Import dinâmico: o 'canvas' (nativo) só é carregado quando há um modelo a renderizar.
  const { StaticCanvas, FabricImage } = await import('fabric/node')
  const canvas = new StaticCanvas(undefined, { width, height, backgroundColor: '#ffffff' })
  if (canvasJson) await canvas.loadFromJSON(canvasJson as object)

  for (const obj of [...canvas.getObjects()]) {
    // fabric/node objetos têm tipagem frouxa p/ props customizadas
    const o = obj as unknown as Record<string, unknown> & {
      type?: string; set: (p: Record<string, unknown>) => void
      left?: number; top?: number; originX?: string; originY?: string; angle?: number
      getScaledWidth: () => number; getScaledHeight: () => number; width?: number; height?: number
    }
    const type = o.type ?? ''

    if ((type === 'textbox' || type === 'i-text' || type === 'text') && typeof o.text === 'string') {
      o.set({ text: substituirTokens(o.text, dados) })
      continue
    }

    if (o.isQR) {
      const payload = substituirTokens(String(o.qrPayload ?? ''), dados) || ' '
      try {
        const u = await QRCode.toDataURL(payload, { margin: 1, width: 400 })
        const img = await FabricImage.fromURL(u)
        img.set({
          left: o.left, top: o.top, originX: o.originX, originY: o.originY, angle: o.angle,
          scaleX: o.getScaledWidth() / (img.width || 1), scaleY: o.getScaledHeight() / (img.height || 1),
        })
        canvas.remove(obj); canvas.add(img)
      } catch { /* mantém placeholder */ }
      continue
    }

    if (o.varKey) {
      const val = dados[String(o.varKey)]
      const du = val ? await urlParaDataURL(val) : null
      if (du) {
        try {
          const bw = o.getScaledWidth(), bh = o.getScaledHeight()
          const img = await FabricImage.fromURL(du)
          const s = Math.max(bw / (img.width || 1), bh / (img.height || 1)) // cobrir
          img.set({ left: o.left, top: o.top, originX: o.originX, originY: o.originY, angle: o.angle, scaleX: s, scaleY: s })
          canvas.remove(obj); canvas.add(img)
        } catch { /* mantém placeholder */ }
      }
    }
  }

  canvas.renderAll()
  const dataURL = canvas.toDataURL({ format: 'png', multiplier: 2 })
  return Buffer.from(dataURL.split(',')[1], 'base64')
}
