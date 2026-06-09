import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { ZoomIn, ZoomOut, RotateCw, X, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ImageCropModalProps {
  open: boolean
  imageSrc: string | null
  /** Proporção do recorte (largura/altura). 1 = quadrado. */
  aspect?: number
  /** 'round' mostra a máscara circular (ideal p/ avatar). */
  cropShape?: 'rect' | 'round'
  title?: string
  onCancel: () => void
  onConfirm: (blob: Blob) => Promise<void> | void
}

/** Carrega a imagem e gera o recorte num canvas, retornando um Blob (WebP). */
async function getCroppedBlob(
  imageSrc: string,
  area: Area,
  rotation: number,
): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', reject)
    img.src = imageSrc
  })

  const rad = (rotation * Math.PI) / 180
  // Canvas auxiliar do tamanho da imagem rotacionada
  const safe = Math.max(image.width, image.height) * 2
  const tmp = document.createElement('canvas')
  const tctx = tmp.getContext('2d')!
  tmp.width = safe
  tmp.height = safe
  tctx.translate(safe / 2, safe / 2)
  tctx.rotate(rad)
  tctx.translate(-image.width / 2, -image.height / 2)
  tctx.drawImage(image, 0, 0)

  // Recorta a área selecionada
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  canvas.width = area.width
  canvas.height = area.height
  ctx.drawImage(
    tmp,
    safe / 2 - image.width / 2 + area.x,
    safe / 2 - image.height / 2 + area.y,
    area.width,
    area.height,
    0,
    0,
    area.width,
    area.height,
  )

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar a imagem'))),
      'image/webp',
      0.92,
    )
  })
}

export function ImageCropModal({
  open,
  imageSrc,
  aspect = 1,
  cropShape = 'round',
  title = 'Ajustar foto',
  onCancel,
  onConfirm,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [areaPixels, setAreaPixels] = useState<Area | null>(null)
  const [saving, setSaving] = useState(false)

  const onCropComplete = useCallback((_: Area, areaPx: Area) => {
    setAreaPixels(areaPx)
  }, [])

  const handleConfirm = async () => {
    if (!imageSrc || !areaPixels) return
    setSaving(true)
    try {
      const blob = await getCroppedBlob(imageSrc, areaPixels, rotation)
      await onConfirm(blob)
    } finally {
      setSaving(false)
    }
  }

  if (!open || !imageSrc) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <p className="text-sm font-bold text-gray-900">{title}</p>
          <button
            onClick={onCancel}
            disabled={saving}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Área do cropper */}
        <div className="relative w-full h-72 bg-gray-900">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            cropShape={cropShape}
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Controles */}
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <ZoomOut className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-green-600"
            />
            <ZoomIn className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors ml-1"
              title="Girar 90°"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-gray-400 text-center">
            Arraste para posicionar · use a barra para dar zoom
          </p>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-2 px-5 pb-5">
          <Button variant="outline" onClick={onCancel} disabled={saving} className="flex-1 rounded-xl">
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={saving || !areaPixels} className="flex-1 rounded-xl bg-green-700 hover:bg-green-800 gap-2">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</> : <><Check className="w-4 h-4" /> Aplicar</>}
          </Button>
        </div>
      </div>
    </div>
  )
}
