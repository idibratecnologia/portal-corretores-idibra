import { useState, useRef } from 'react'
import {
  Loader2, Upload, Video, Edit2, Trash2, ChevronUp, ChevronDown, AlertCircle,
  Calendar, Clock, Eye, EyeOff, GripVertical,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'
import { statusVideoInfo, videoEmProcessamento, formatDuracao } from '@/lib/treinamentos-ui'
import { uploadVideoAula, videoAulaUrl, type Aula } from '@/services/treinamentos'

function formatData(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

interface Props {
  aula: Aula
  sequencial: boolean
  index: number
  total: number
  onChanged: () => void
  onEdit: (a: Aula) => void
  onDelete: (a: Aula) => void
  onMove: (index: number, dir: -1 | 1) => void
}

export function AulaAdmin({ aula, sequencial, index, total, onChanged, onEdit, onDelete, onMove }: Props) {
  const { toast } = useToast()
  const [uploadPct, setUploadPct] = useState<number | null>(null)
  const [preview, setPreview] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const sv = statusVideoInfo(aula.status_video)

  const onFile = async (file: File) => {
    setUploadPct(0)
    try {
      await uploadVideoAula(aula.id, file, setUploadPct)
      toast({ title: 'Vídeo enviado', description: 'Entrou na fila de processamento (720p).' })
      onChanged()
    } catch (err) {
      toast({ title: 'Falha no upload', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setUploadPct(null)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="rounded-xl border border-gray-100 p-4">
      <div className="flex items-start gap-3">
        {/* Reordenar */}
        <div className="flex flex-col items-center pt-1 text-gray-300">
          <GripVertical className="w-4 h-4" />
          <button onClick={() => onMove(index, -1)} disabled={index === 0} className="hover:text-gray-600 disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
          <button onClick={() => onMove(index, 1)} disabled={index === total - 1} className="hover:text-gray-600 disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
        </div>

        {/* Thumb */}
        <div className="w-28 aspect-video rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
          {aula.thumbnail_url ? <img src={aula.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <Video className="w-6 h-6 text-slate-300" />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-gray-400">#{aula.ordem}</span>
            <h3 className="font-semibold text-gray-900 truncate">{aula.titulo}</h3>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${sv.className}`}>
              {videoEmProcessamento(aula.status_video) && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
              {sv.label}{aula.video_duracao ? ` · ${formatDuracao(aula.video_duracao)}` : ''}
            </span>
          </div>
          {aula.descricao && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{aula.descricao}</p>}
          <div className="flex flex-wrap gap-3 text-[11px] text-gray-400 mt-1">
            {!sequencial && <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> Libera: {formatData(aula.data_liberacao)}</span>}
            <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> Encerra: {formatData(aula.data_encerramento)}</span>
            {aula.excluir_video_automaticamente && <span className="inline-flex items-center gap-1 text-amber-600"><Clock className="w-3 h-3" /> exclui +{aula.dias_para_exclusao ?? 0}d</span>}
          </div>
          {aula.status_video === 'erro_processamento' && aula.video_erro && (
            <p className="text-[11px] text-red-500 mt-1 inline-flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {aula.video_erro}</p>
          )}
        </div>

        {/* Ações */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {aula.status_video === 'disponivel' && (
            <button onClick={() => setPreview((p) => !p)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg" title="Pré-visualizar">
              {preview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
          <button onClick={() => onEdit(aula)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar"><Edit2 className="w-4 h-4" /></button>
          <button onClick={() => onDelete(aula)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Excluir"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Player de pré-visualização */}
      {preview && aula.status_video === 'disponivel' && (
        <video controls poster={aula.thumbnail_url ?? undefined} src={videoAulaUrl(aula.id)} className="w-full mt-3 rounded-lg bg-black aspect-video" />
      )}

      {/* Upload */}
      <div className="mt-3 pl-7">
        {uploadPct !== null ? (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Enviando…</span><span>{uploadPct}%</span></div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-green-500 transition-all" style={{ width: `${uploadPct}%` }} /></div>
          </div>
        ) : (
          <>
            <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
            <button
              onClick={() => inputRef.current?.click()}
              disabled={videoEmProcessamento(aula.status_video)}
              className="text-xs font-medium inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" /> {aula.status_video === 'disponivel' ? 'Substituir vídeo' : 'Enviar vídeo'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
