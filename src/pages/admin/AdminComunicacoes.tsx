import { useState, useEffect, useCallback } from 'react'
import { Loader2, Search, MessageCircle, Mail, CheckCircle2, XCircle, Inbox } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { TablePagination } from '@/components/shared/TablePagination'
import { useToast } from '@/hooks/use-toast'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'
import { getErrorMessage } from '@/lib/errors'
import { formatDateTime } from '@/lib/utils'
import {
  fetchComunicacoes, fetchResumoComunicacoes, TIPO_NOTIF_LABEL,
  type Comunicacao, type ResumoComunicacoes, type CanalComunicacao, type StatusComunicacao,
} from '@/services/comunicacoes'

const PAGE_SIZE = 20

export function AdminComunicacoes() {
  const { toast } = useToast()
  const [itens, setItens] = useState<Comunicacao[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [resumo, setResumo] = useState<ResumoComunicacoes | null>(null)

  const [canal, setCanal] = useState<CanalComunicacao | ''>('')
  const [status, setStatus] = useState<StatusComunicacao | ''>('')
  const [tipo, setTipo] = useState('')
  const [busca, setBusca] = useState('')
  const q = useDebouncedValue(busca, 350)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetchComunicacoes({
        canal: canal || undefined, status: status || undefined, tipo: tipo || undefined,
        q: q || undefined, page, limit: PAGE_SIZE,
      })
      setItens(r.data); setTotal(r.meta.total)
    } catch (err) {
      toast({ title: 'Erro ao carregar comunicações', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [canal, status, tipo, q, page, toast])

  useEffect(() => { load() }, [load])
  useEffect(() => { fetchResumoComunicacoes().then(setResumo).catch(() => {}) }, [itens])
  useRealtimeRefresh(load)

  // volta para a página 1 quando um filtro muda
  useEffect(() => { setPage(1) }, [canal, status, tipo, q])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Comunicações</h1>
        <p className="text-gray-500 text-sm mt-1">Histórico de notificações enviadas por WhatsApp e e-mail, com status.</p>
      </div>

      {/* Resumo */}
      {resumo && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <ResumoCard icon={MessageCircle} label="WhatsApp enviados" valor={resumo.whatsapp.enviado} cor="text-green-600" />
          <ResumoCard icon={MessageCircle} label="WhatsApp com erro" valor={resumo.whatsapp.erro} cor="text-red-500" />
          <ResumoCard icon={Mail} label="E-mails enviados" valor={resumo.email.enviado} cor="text-green-600" />
          <ResumoCard icon={Mail} label="E-mails com erro" valor={resumo.email.erro} cor="text-red-500" />
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por corretor ou mensagem…" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          {([['', 'Todos'], ['whatsapp', 'WhatsApp'], ['email', 'E-mail']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setCanal(v as CanalComunicacao | '')}
              className={`text-sm px-3 py-1.5 rounded-lg font-medium ${canal === v ? 'bg-green-700 text-white' : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'}`}>{l}</button>
          ))}
          <select value={status} onChange={(e) => setStatus(e.target.value as StatusComunicacao | '')} className="h-9 rounded-lg border border-gray-200 px-2 text-sm">
            <option value="">Status</option>
            <option value="enviado">Enviado</option>
            <option value="erro">Erro</option>
          </select>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="h-9 rounded-lg border border-gray-200 px-2 text-sm max-w-[180px]">
            <option value="">Todos os tipos</option>
            {Object.entries(TIPO_NOTIF_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-green-600 animate-spin" /></div>
        ) : itens.length === 0 ? (
          <div className="p-12 text-center text-gray-400"><Inbox className="w-10 h-10 mx-auto mb-3 text-gray-300" />Nenhuma comunicação encontrada.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/60 border-b border-gray-100 text-gray-500">
                    <th className="text-left px-4 py-3 text-xs font-semibold">Data</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold">Corretor</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold">Canal</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold hidden md:table-cell">Tipo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold hidden lg:table-cell">Mensagem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {itens.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDateTime(c.enviado_at)}</td>
                      <td className="px-4 py-3 text-gray-800">{c.corretor_nome}{c.evento_titulo && <span className="block text-[11px] text-gray-400">{c.evento_titulo}</span>}</td>
                      <td className="px-4 py-3">
                        {c.canal === 'email'
                          ? <span className="inline-flex items-center gap-1 text-xs text-gray-600"><Mail className="w-3.5 h-3.5 text-blue-500" /> E-mail</span>
                          : <span className="inline-flex items-center gap-1 text-xs text-gray-600"><MessageCircle className="w-3.5 h-3.5 text-green-600" /> WhatsApp</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs hidden md:table-cell">{TIPO_NOTIF_LABEL[c.tipo] ?? c.tipo}</td>
                      <td className="px-4 py-3">
                        {c.status === 'enviado'
                          ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3" /> Enviado</span>
                          : <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600" title={c.erro ?? ''}><XCircle className="w-3 h-3" /> Erro</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell max-w-[280px] truncate" title={c.mensagem ?? ''}>{c.mensagem ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination total={total} page={page} pageSize={PAGE_SIZE} onPage={setPage} />
          </>
        )}
      </div>
    </div>
  )
}

function ResumoCard({ icon: Icon, label, valor, cor }: { icon: typeof Mail; label: string; valor: number; cor: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1"><Icon className="w-3.5 h-3.5" /> {label}</div>
      <p className={`text-2xl font-bold ${cor}`}>{valor}</p>
    </div>
  )
}
