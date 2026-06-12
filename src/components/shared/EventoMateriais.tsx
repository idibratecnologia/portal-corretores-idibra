import { useState, useEffect, useCallback, useRef } from 'react'
import { FileText, Link as LinkIcon, Plus, Trash2, Loader2, Upload, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'
import { fetchMateriais, addMaterialLink, addMaterialArquivo, deleteMaterial } from '@/services/materiais'
import type { EventoMaterial } from '@/types'

interface Props {
  eventoId: string
  /** true = admin (adicionar/remover); false = corretor (só visualizar). */
  admin?: boolean
}

export function EventoMateriais({ eventoId, admin = false }: Props) {
  const { toast } = useToast()
  const [itens, setItens] = useState<EventoMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [tituloLink, setTituloLink] = useState('')
  const [url, setUrl] = useState('')
  const [tituloArq, setTituloArq] = useState('')
  const [salvando, setSalvando] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setItens(await fetchMateriais(eventoId))
    } catch (err) {
      toast({ title: 'Erro ao carregar materiais', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [eventoId, toast])

  useEffect(() => { load() }, [load])

  const handleAddLink = async () => {
    if (!tituloLink.trim() || !url.trim()) return
    setSalvando(true)
    try {
      await addMaterialLink(eventoId, tituloLink.trim(), url.trim())
      setTituloLink(''); setUrl('')
      await load()
      toast({ title: 'Link adicionado' })
    } catch (err) {
      toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSalvando(true)
    try {
      await addMaterialArquivo(eventoId, file, tituloArq.trim() || undefined)
      setTituloArq('')
      if (fileRef.current) fileRef.current.value = ''
      await load()
      toast({ title: 'Arquivo enviado' })
    } catch (err) {
      toast({ title: 'Erro ao enviar arquivo', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  const handleDelete = async (m: EventoMaterial) => {
    if (!window.confirm(`Remover "${m.titulo}"?`)) return
    try {
      await deleteMaterial(m.id)
      setItens((prev) => prev.filter((x) => x.id !== m.id))
      toast({ title: 'Material removido' })
    } catch (err) {
      toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' })
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        <FolderOpen className="w-4 h-4 text-green-600" />
        <h2 className="font-semibold text-gray-900">Materiais do evento</h2>
        {!admin && <span className="text-xs text-gray-400">(disponível para inscritos)</span>}
      </div>

      <div className="p-6 space-y-4">
        {/* Lista */}
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 text-green-600 animate-spin" /></div>
        ) : itens.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Nenhum material disponível.</p>
        ) : (
          <ul className="space-y-2">
            {itens.map((m) => (
              <li key={m.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${m.tipo === 'link' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                  {m.tipo === 'link' ? <LinkIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                </div>
                <a href={m.url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 text-sm font-medium text-gray-800 hover:text-green-700 truncate">
                  {m.titulo}
                </a>
                {admin && (
                  <button onClick={() => handleDelete(m)} title="Remover" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Admin: adicionar */}
        {admin && (
          <div className="pt-2 border-t border-gray-100 space-y-4">
            {/* Link */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">Adicionar link</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input value={tituloLink} onChange={(e) => setTituloLink(e.target.value)} placeholder="Título (ex.: Tabela de preços)" className="sm:max-w-[240px]" />
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="flex-1" />
                <Button onClick={handleAddLink} disabled={salvando || !tituloLink.trim() || !url.trim()} className="bg-gray-900 hover:bg-gray-800 gap-1.5">
                  <Plus className="w-4 h-4" /> Adicionar
                </Button>
              </div>
            </div>

            {/* Arquivo */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">Enviar arquivo (PDF, imagem, planilha…)</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input value={tituloArq} onChange={(e) => setTituloArq(e.target.value)} placeholder="Título (opcional)" className="sm:max-w-[240px]" />
                <input
                  ref={fileRef}
                  type="file"
                  onChange={handleFile}
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
                  className="hidden"
                />
                <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={salvando} className="gap-1.5 border-gray-200">
                  {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Escolher arquivo
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
