import { useState, useEffect, useMemo, useRef } from 'react'
import { Send, Search, Loader2, Megaphone, Check, AlertTriangle, MessageCircle, Mail, Paperclip, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'
import { fetchCorretores } from '@/services/corretores'
import { fetchImobiliarias } from '@/services/imobiliarias'
import { dispararEmMassa } from '@/services/whatsapp'
import type { Corretor, Imobiliaria } from '@/types'

export function AdminDisparos() {
  const { toast } = useToast()
  const [corretores, setCorretores] = useState<Corretor[]>([])
  const [imobiliarias, setImobiliarias] = useState<Imobiliaria[]>([])
  const [loading, setLoading] = useState(true)
  const [mensagem, setMensagem] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmar, setConfirmar] = useState(false)
  const [enviando, setEnviando] = useState(false)
  // Canais do disparo
  const [canalWhats, setCanalWhats] = useState(true)
  const [canalEmail, setCanalEmail] = useState(false)
  const [assunto, setAssunto] = useState('')
  const [anexo, setAnexo] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const MAX_ANEXO_MB = 10

  // filtros
  const [busca, setBusca] = useState('')
  const [fStatus, setFStatus] = useState('ativo')
  const [fImob, setFImob] = useState('')
  const [fCidade, setFCidade] = useState('')
  const [fOptIn, setFOptIn] = useState(true)

  useEffect(() => {
    Promise.all([fetchCorretores({ limit: 1000 }), fetchImobiliarias()])
      .then(([c, i]) => { setCorretores(c.data); setImobiliarias(i) })
      .catch((err) => toast({ title: 'Erro ao carregar corretores', description: getErrorMessage(err), variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [toast])

  const cidades = useMemo(
    () => [...new Set(corretores.map((c) => c.cidade).filter(Boolean))].sort(),
    [corretores],
  )

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return corretores.filter((c) => {
      if (fOptIn && !c.whatsapp_opt_in) return false
      if (fStatus && c.status !== fStatus) return false
      if (fImob && c.imobiliaria_id !== fImob) return false
      if (fCidade && c.cidade !== fCidade) return false
      if (q && !c.nome.toLowerCase().includes(q) && !(c.creci ?? '').toLowerCase().includes(q)) return false
      return true
    })
  }, [corretores, busca, fStatus, fImob, fCidade, fOptIn])

  const selecionados = corretores.filter((c) => selected.has(c.id))
  const comOptIn = selecionados.filter((c) => c.whatsapp_opt_in).length

  const toggle = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const todosFiltradosSelecionados = filtrados.length > 0 && filtrados.every((c) => selected.has(c.id))
  const toggleTodos = () =>
    setSelected((prev) => {
      const n = new Set(prev)
      if (todosFiltradosSelecionados) filtrados.forEach((c) => n.delete(c.id))
      else filtrados.forEach((c) => n.add(c.id))
      return n
    })

  const handleEnviar = async () => {
    setConfirmar(false)
    setEnviando(true)
    try {
      const r = await dispararEmMassa(
        mensagem.trim(), [...selected],
        { whatsapp: canalWhats, email: canalEmail },
        canalEmail ? (assunto.trim() || undefined) : undefined,
        anexo ?? undefined,
      )
      const partes: string[] = []
      if (canalWhats) partes.push(`WhatsApp: ${r.whatsapp}`)
      if (canalEmail) partes.push(`E-mail: ${r.emails}`)
      toast({
        title: 'Disparo iniciado',
        description: `${partes.join(' · ')}${r.semCanal ? ` · ${r.semCanal} sem canal disponível` : ''}.`,
      })
      setSelected(new Set()); setMensagem(''); setAnexo(null); if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      toast({ title: 'Erro no disparo', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setEnviando(false)
    }
  }

  const onAnexo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > MAX_ANEXO_MB * 1024 * 1024) {
      toast({ title: 'Anexo muito grande', description: `Máximo ${MAX_ANEXO_MB} MB.`, variant: 'destructive' })
      e.target.value = ''
      return
    }
    setAnexo(f)
  }
  const removerAnexo = () => { setAnexo(null); if (fileRef.current) fileRef.current.value = '' }
  const anexoGrandeEmail = !!anexo && canalEmail && anexo.size > 3 * 1024 * 1024

  const comEmail = selecionados.filter((c) => c.email).length
  const semNenhumCanal = selecionados.filter(
    (c) => !((canalWhats && c.whatsapp_opt_in && c.whatsapp) || (canalEmail && c.email)),
  ).length
  const podeEnviar = mensagem.trim().length > 0 && selected.size > 0 && (canalWhats || canalEmail)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Megaphone className="w-6 h-6 text-green-600" /> Disparo em massa</h1>
        <p className="text-gray-500 text-sm mt-1">Envie uma mensagem por <strong>WhatsApp</strong> e/ou <strong>e-mail</strong> para os corretores selecionados (respeita o opt-in e a fila).</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Mensagem */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <label className="text-sm font-semibold text-gray-700">Mensagem</label>
            <Textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} rows={8} placeholder={'Olá {nome}! ...'} className="mt-2" />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-400">Use <code className="bg-gray-100 px-1 rounded">{'{nome}'}</code> para inserir o primeiro nome do corretor.</p>
              <span className="text-[11px] text-gray-400">{mensagem.length} caracteres</span>
            </div>
          </div>

          {/* Canais */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <p className="text-sm font-semibold text-gray-700">Canais</p>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={canalWhats} onChange={(e) => setCanalWhats(e.target.checked)} className="rounded border-gray-300 accent-green-600" />
              <MessageCircle className="w-4 h-4 text-green-600" /> WhatsApp <span className="text-[11px] text-gray-400">(respeita opt-in)</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={canalEmail} onChange={(e) => setCanalEmail(e.target.checked)} className="rounded border-gray-300 accent-green-600" />
              <Mail className="w-4 h-4 text-green-600" /> E-mail (Outlook)
            </label>
            {canalEmail && (
              <div>
                <label className="text-xs text-gray-500">Assunto do e-mail</label>
                <Input value={assunto} onChange={(e) => setAssunto(e.target.value)} placeholder="IDIBRA — Comunicado" className="mt-1" />
              </div>
            )}
            {!canalWhats && !canalEmail && <p className="text-[11px] text-amber-600">Selecione ao menos um canal.</p>}

            {/* Anexo */}
            <div className="pt-2 border-t border-gray-100">
              <input ref={fileRef} type="file" className="hidden" onChange={onAnexo} accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip" />
              {anexo ? (
                <div className="flex items-center gap-2 text-sm">
                  <Paperclip className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="flex-1 min-w-0 truncate text-gray-700">{anexo.name}</span>
                  <span className="text-[11px] text-gray-400">{(anexo.size / 1024 / 1024).toFixed(1)} MB</span>
                  <button onClick={removerAnexo} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()} className="text-sm text-gray-600 hover:text-green-700 inline-flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4" /> Anexar arquivo (opcional)
                </button>
              )}
              {anexoGrandeEmail && <p className="text-[11px] text-amber-600 mt-1">Anexo &gt; 3 MB pode falhar no e-mail (limite do Outlook). No WhatsApp vai normalmente.</p>}
              {anexo && <p className="text-[10px] text-gray-400 mt-1">No WhatsApp, imagens vão como foto e os demais como documento; a mensagem vira a legenda.</p>}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Selecionados</span>
              <span className="flex items-center gap-2">
                <span className="font-bold text-gray-900">{selected.size}</span>
                {selected.size > 0 && (
                  <button onClick={() => setSelected(new Set())} className="text-[11px] text-gray-400 hover:text-red-600">limpar</button>
                )}
              </span>
            </div>
            {canalWhats && (
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-500">Com WhatsApp (opt-in)</span>
                <span className="font-bold text-green-700">{comOptIn}</span>
              </div>
            )}
            {canalEmail && (
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-500">Com e-mail</span>
                <span className="font-bold text-green-700">{comEmail}</span>
              </div>
            )}
            {selected.size > 0 && semNenhumCanal > 0 && (
              <p className="text-[11px] text-amber-600 mt-2 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {semNenhumCanal} selecionado(s) não receberão por nenhum canal escolhido.</p>
            )}
            <Button onClick={() => setConfirmar(true)} disabled={!podeEnviar || enviando} className="w-full mt-4 bg-green-700 hover:bg-green-800 gap-2">
              {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Enviar disparo
            </Button>
          </div>
        </div>

        {/* Seleção de corretores */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou CRECI…" className="pl-9" />
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
                <option value="">Todos status</option>
                <option value="ativo">Ativos</option>
                <option value="pendente">Pendentes</option>
                <option value="bloqueado">Bloqueados</option>
              </select>
              <select value={fImob} onChange={(e) => setFImob(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm max-w-[180px]">
                <option value="">Todas imobiliárias</option>
                {imobiliarias.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
              </select>
              <select value={fCidade} onChange={(e) => setFCidade(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm max-w-[160px]">
                <option value="">Todas cidades</option>
                {cidades.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer px-1">
                <input type="checkbox" checked={fOptIn} onChange={(e) => setFOptIn(e.target.checked)} className="w-4 h-4 rounded accent-green-600" />
                Só com opt-in
              </label>
            </div>
            <div className="flex items-center justify-between">
              <button onClick={toggleTodos} className="text-xs font-semibold text-green-700 hover:text-green-800 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> {todosFiltradosSelecionados ? 'Desmarcar' : 'Selecionar'} todos ({filtrados.length})
              </button>
              <span className="text-xs text-gray-400">{filtrados.length} corretor(es)</span>
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 text-green-600 animate-spin" /></div>
            ) : filtrados.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">Nenhum corretor encontrado.</p>
            ) : filtrados.map((c) => (
              <label key={c.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50">
                <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="w-4 h-4 rounded accent-green-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{c.nome}</p>
                  <p className="text-[11px] text-gray-400">{c.creci} · {c.cidade}/{c.uf}</p>
                </div>
                {!c.whatsapp_opt_in && <span className="text-[10px] text-amber-600 font-medium">sem opt-in</span>}
              </label>
            ))}
          </div>
        </div>
      </div>

      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar disparo?</AlertDialogTitle>
            <AlertDialogDescription>
              A mensagem será enviada {canalWhats && <>por <strong>WhatsApp</strong> a <strong>{comOptIn}</strong> (opt-in)</>}
              {canalWhats && canalEmail && ' e '}
              {canalEmail && <>por <strong>e-mail</strong> a <strong>{comEmail}</strong></>}
              {' '}corretor(es).{semNenhumCanal > 0 && ` ${semNenhumCanal} sem canal disponível serão ignorados.`} O envio respeita a fila.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleEnviar} className="rounded-xl bg-green-700 hover:bg-green-800">Sim, enviar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
