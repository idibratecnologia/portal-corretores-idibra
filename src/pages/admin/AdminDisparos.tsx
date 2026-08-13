import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Send, Search, Loader2, Megaphone, Check, AlertTriangle, MessageCircle, Mail, Paperclip, X, CalendarClock, Trash2, Clock, CalendarCheck } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'
import { fetchCorretoresOpcoes, type CorretorOpcao } from '@/services/corretores'
import { fetchImobiliarias } from '@/services/imobiliarias'
import { fetchEventos } from '@/services/eventos'
import { fetchInscricoesByEvento } from '@/services/inscricoes'
import { dispararEmMassa } from '@/services/whatsapp'
import { agendarDisparo, fetchDisparosAgendados, cancelarDisparoAgendado, type DisparoAgendado } from '@/services/disparosAgendados'
import { ModelosMensagemBar } from '@/components/admin/ModelosMensagemBar'
import { formatDateTime } from '@/lib/utils'
import type { Imobiliaria, Evento } from '@/types'

export function AdminDisparos() {
  const { toast } = useToast()
  const [corretores, setCorretores] = useState<CorretorOpcao[]>([])
  const [imobiliarias, setImobiliarias] = useState<Imobiliaria[]>([])
  const [loading, setLoading] = useState(true)
  // Selecionar público por evento (pós-evento)
  const [eventos, setEventos] = useState<Evento[]>([])
  const [eventoSel, setEventoSel] = useState('')
  const [vincularEvento, setVincularEvento] = useState(false)
  const [modeloImagemUrl, setModeloImagemUrl] = useState('')
  interface PublicoItem { id: string; nome: string; creci: string; checkin_at: string | null }
  const [publico, setPublico] = useState<{
    open: boolean; status: 'presente' | 'inscrito' | 'ausente'; loading: boolean
    itens: PublicoItem[]; checked: Set<string>
  }>({ open: false, status: 'presente', loading: false, itens: [], checked: new Set() })
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
  // Agendamento
  const [agendar, setAgendar] = useState(false)
  const [agendarPara, setAgendarPara] = useState('')
  const [agendados, setAgendados] = useState<DisparoAgendado[]>([])

  // filtros
  const [busca, setBusca] = useState('')
  const [fStatus, setFStatus] = useState('ativo')
  const [fImob, setFImob] = useState('')
  const [fCidade, setFCidade] = useState('')
  const [fOptIn, setFOptIn] = useState(true)

  useEffect(() => {
    Promise.all([fetchCorretoresOpcoes(), fetchImobiliarias(), fetchEventos({ limit: 100 })])
      .then(([c, i, ev]) => { setCorretores(c); setImobiliarias(i); setEventos(ev.data) })
      .catch((err) => toast({ title: 'Erro ao carregar dados', description: getErrorMessage(err), variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [toast])

  // Abre a janela com os participantes do evento (por status) para revisar antes de adicionar
  const STATUS_PUBLICO_LABEL = { presente: 'Presentes', inscrito: 'Inscritos', ausente: 'Ausentes' } as const
  const abrirPublico = async (status: 'presente' | 'inscrito' | 'ausente') => {
    if (!eventoSel) return
    setPublico({ open: true, status, loading: true, itens: [], checked: new Set() })
    try {
      const inscricoes = await fetchInscricoesByEvento(eventoSel)
      const itens: PublicoItem[] = inscricoes
        .filter((i) => i.status === status && i.corretor)
        .map((i) => ({ id: i.corretor!.id, nome: i.corretor!.nome, creci: i.corretor!.creci, checkin_at: i.checkin_at ?? null }))
      setPublico((p) => ({ ...p, loading: false, itens, checked: new Set(itens.map((i) => i.id)) }))
    } catch (err) {
      toast({ title: 'Erro ao carregar público', description: getErrorMessage(err), variant: 'destructive' })
      setPublico((p) => ({ ...p, open: false, loading: false }))
    }
  }
  const togglePublicoItem = (id: string) =>
    setPublico((p) => { const n = new Set(p.checked); n.has(id) ? n.delete(id) : n.add(id); return { ...p, checked: n } })
  const togglePublicoTodos = () =>
    setPublico((p) => ({ ...p, checked: p.checked.size === p.itens.length ? new Set() : new Set(p.itens.map((i) => i.id)) }))
  const adicionarPublico = () => {
    setSelected((prev) => { const n = new Set(prev); publico.checked.forEach((id) => n.add(id)); return n })
    toast({ title: 'Público adicionado', description: `${publico.checked.size} corretor(es) adicionados à seleção.` })
    setPublico((p) => ({ ...p, open: false }))
  }

  const carregarAgendados = useCallback(() => {
    fetchDisparosAgendados().then(setAgendados).catch(() => {})
  }, [])
  useEffect(() => { carregarAgendados() }, [carregarAgendados])

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

  const resetForm = () => {
    setSelected(new Set()); setMensagem(''); setAnexo(null)
    setAgendar(false); setAgendarPara('')
    setVincularEvento(false); setEventoSel(''); setModeloImagemUrl('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const inserirLinkEvento = () => {
    if (!eventoSel) return
    const url = `${window.location.origin}/portal/eventos/${eventoSel}`
    setMensagem((m) => `${m.trimEnd()}${m.trim() ? '\n\n' : ''}${url}`)
  }

  const eventoIdVinc = vincularEvento && eventoSel ? eventoSel : undefined
  const imagemModelo = modeloImagemUrl || undefined

  const handleEnviar = async () => {
    setConfirmar(false)
    setEnviando(true)
    try {
      const canais = { whatsapp: canalWhats, email: canalEmail }
      const assuntoFinal = canalEmail ? (assunto.trim() || undefined) : undefined

      if (agendar) {
        const iso = new Date(agendarPara).toISOString()
        const d = await agendarDisparo(mensagem.trim(), [...selected], canais, iso, assuntoFinal, anexo ?? undefined, eventoIdVinc, imagemModelo)
        toast({ title: 'Disparo agendado', description: `Para ${formatDateTime(d.agendado_para)} · ${d.total_corretores} corretor(es).` })
        carregarAgendados()
      } else {
        const r = await dispararEmMassa(mensagem.trim(), [...selected], canais, assuntoFinal, anexo ?? undefined, eventoIdVinc, imagemModelo)
        const partes: string[] = []
        if (canalWhats) partes.push(`WhatsApp: ${r.whatsapp}`)
        if (canalEmail) partes.push(`E-mail: ${r.emails}`)
        toast({ title: 'Disparo iniciado', description: `${partes.join(' · ')}${r.semCanal ? ` · ${r.semCanal} sem canal disponível` : ''}.` })
      }
      resetForm()
    } catch (err) {
      toast({ title: agendar ? 'Erro ao agendar' : 'Erro no disparo', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setEnviando(false)
    }
  }

  const cancelarAgendado = async (id: string) => {
    try {
      await cancelarDisparoAgendado(id)
      setAgendados((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'cancelado' } : d)))
    } catch (err) {
      toast({ title: 'Erro ao cancelar', description: getErrorMessage(err), variant: 'destructive' })
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
  const agendamentoValido = !agendar || (!!agendarPara && new Date(agendarPara).getTime() > Date.now())
  const podeEnviar = mensagem.trim().length > 0 && selected.size > 0 && (canalWhats || canalEmail) && agendamentoValido
  // valor mínimo do input (agora, formato datetime-local)
  const minDateTime = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)

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
            <ModelosMensagemBar
              mensagem={mensagem}
              assunto={canalEmail ? assunto : undefined}
              onApply={(conteudo, assuntoModelo, imagemUrl) => {
                setMensagem(conteudo)
                if (assuntoModelo) { setAssunto(assuntoModelo); setCanalEmail(true) }
                setModeloImagemUrl(imagemUrl ?? '')
              }}
            />
            {modeloImagemUrl && (
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg p-2">
                <img src={modeloImagemUrl} alt="Banner do modelo" className="w-14 h-9 object-cover rounded flex-shrink-0" />
                <span className="flex-1">Banner do modelo será enviado com a mensagem.</span>
                <button onClick={() => setModeloImagemUrl('')} className="text-gray-400 hover:text-red-600" title="Remover banner"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}
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

          {/* Selecionar público de um evento (pós-evento) */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"><CalendarCheck className="w-4 h-4 text-green-600" /> Selecionar público de um evento</p>
            <p className="text-xs text-gray-400 -mt-1">Ex.: mensagem pós-evento para quem esteve presente.</p>
            <select value={eventoSel} onChange={(e) => setEventoSel(e.target.value)} className="h-9 w-full rounded-md border border-gray-200 px-2 text-sm">
              <option value="">Selecione um evento…</option>
              {eventos.map((ev) => <option key={ev.id} value={ev.id}>{ev.titulo}</option>)}
            </select>
            {eventoSel && (
              <>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => abrirPublico('presente')} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100">Ver presentes</button>
                  <button onClick={() => abrirPublico('inscrito')} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">Ver inscritos</button>
                  <button onClick={() => abrirPublico('ausente')} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100">Ver ausentes</button>
                </div>
                <div className="pt-2 border-t border-gray-100 space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={vincularEvento} onChange={(e) => setVincularEvento(e.target.checked)} className="rounded border-gray-300 accent-green-600" />
                    Usar o <strong className="font-semibold">banner do evento</strong> na mensagem
                  </label>
                  <button onClick={inserirLinkEvento} type="button" className="text-xs text-gray-600 hover:text-green-700 inline-flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5" /> Inserir link do evento na mensagem
                  </button>
                </div>
              </>
            )}
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

            {/* Agendamento */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={agendar} onChange={(e) => setAgendar(e.target.checked)} className="rounded border-gray-300 accent-green-600" />
                <CalendarClock className="w-4 h-4 text-green-600" /> Agendar para depois
              </label>
              {agendar && (
                <>
                  <Input type="datetime-local" value={agendarPara} min={minDateTime} onChange={(e) => setAgendarPara(e.target.value)} className="mt-2" />
                  {agendarPara && !agendamentoValido && <p className="text-[11px] text-amber-600 mt-1">Escolha uma data/hora futura.</p>}
                  <p className="text-[10px] text-gray-400 mt-1">O envio acontece automaticamente no horário marcado (fuso de Brasília).</p>
                </>
              )}
            </div>

            <Button onClick={() => setConfirmar(true)} disabled={!podeEnviar || enviando} className="w-full mt-4 bg-green-700 hover:bg-green-800 gap-2">
              {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : agendar ? <CalendarClock className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              {agendar ? 'Agendar disparo' : 'Enviar disparo'}
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

      {/* Disparos agendados */}
      {agendados.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-green-600" />
            <h2 className="text-sm font-semibold text-gray-800">Disparos agendados</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {agendados.map((d) => (
              <div key={d.id} className="flex items-start gap-3 px-5 py-3">
                <Clock className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-800">{formatDateTime(d.agendado_para)}</span>
                    <StatusBadge status={d.status} />
                    <span className="text-[11px] text-gray-400">
                      {[d.canal_whatsapp && 'WhatsApp', d.canal_email && 'E-mail'].filter(Boolean).join(' + ')} · {d.total_corretores} corretor(es){d.tem_anexo ? ' · anexo' : ''}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{d.mensagem}</p>
                  {d.resultado && <p className="text-[11px] text-green-600 mt-0.5">{d.resultado}</p>}
                  {d.erro && <p className="text-[11px] text-red-500 mt-0.5">{d.erro}</p>}
                </div>
                {d.status === 'pendente' && (
                  <button onClick={() => cancelarAgendado(d.id)} title="Cancelar agendamento" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{agendar ? 'Confirmar agendamento?' : 'Confirmar disparo?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {agendar && <>Será agendada para <strong>{agendarPara ? formatDateTime(new Date(agendarPara).toISOString()) : '—'}</strong>: a mensagem </>}
              {!agendar && 'A mensagem '}
              será enviada {canalWhats && <>por <strong>WhatsApp</strong> a <strong>{comOptIn}</strong> (opt-in)</>}
              {canalWhats && canalEmail && ' e '}
              {canalEmail && <>por <strong>e-mail</strong> a <strong>{comEmail}</strong></>}
              {' '}corretor(es).{semNenhumCanal > 0 && ` ${semNenhumCanal} sem canal disponível serão ignorados.`} O envio respeita a fila.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleEnviar} className="rounded-xl bg-green-700 hover:bg-green-800">{agendar ? 'Sim, agendar' : 'Sim, enviar'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Participantes do evento (revisar antes de adicionar) */}
      <Dialog open={publico.open} onOpenChange={(o) => { if (!o) setPublico((p) => ({ ...p, open: false })) }}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2"><CalendarCheck className="w-5 h-5 text-green-600" /> {STATUS_PUBLICO_LABEL[publico.status]} do evento</DialogTitle>
            <DialogDescription>{eventos.find((e) => e.id === eventoSel)?.titulo ?? ''}</DialogDescription>
          </DialogHeader>

          {publico.loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 text-green-600 animate-spin" /></div>
          ) : publico.itens.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">Nenhum corretor com esse status neste evento.</p>
          ) : (
            <>
              <div className="flex items-center justify-between flex-shrink-0">
                <button onClick={togglePublicoTodos} className="text-xs font-semibold text-green-700 hover:text-green-800 inline-flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> {publico.checked.size === publico.itens.length ? 'Desmarcar' : 'Selecionar'} todos
                </button>
                <span className="text-xs text-gray-400">{publico.checked.size} de {publico.itens.length}</span>
              </div>
              <div className="mt-2 flex-1 min-h-0 overflow-y-auto rounded-xl border border-gray-100 divide-y divide-gray-50">
                {publico.itens.map((it) => (
                  <label key={it.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" checked={publico.checked.has(it.id)} onChange={() => togglePublicoItem(it.id)} className="w-4 h-4 rounded accent-green-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{it.nome}</p>
                      <p className="text-[11px] text-gray-400">{it.creci}{it.checkin_at ? ` · check-in ${formatDateTime(it.checkin_at)}` : ''}</p>
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}

          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={() => setPublico((p) => ({ ...p, open: false }))} className="rounded-xl">Cancelar</Button>
            <Button onClick={adicionarPublico} disabled={publico.checked.size === 0} className="rounded-xl bg-green-700 hover:bg-green-800 gap-1.5">
              <Check className="w-4 h-4" /> Adicionar {publico.checked.size} à seleção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  pendente:     { label: 'Agendado',    cls: 'bg-amber-100 text-amber-700' },
  processando:  { label: 'Enviando…',   cls: 'bg-blue-100 text-blue-700' },
  enviado:      { label: 'Enviado',     cls: 'bg-green-100 text-green-700' },
  erro:         { label: 'Erro',        cls: 'bg-red-100 text-red-600' },
  cancelado:    { label: 'Cancelado',   cls: 'bg-gray-100 text-gray-500' },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? { label: status, cls: 'bg-gray-100 text-gray-500' }
  return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
}
