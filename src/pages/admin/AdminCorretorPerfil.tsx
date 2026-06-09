import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Mail, Phone, MessageCircle, Instagram, MapPin, Building2,
  Calendar, CheckCircle, XCircle, Clock, Edit2, UserCheck, UserX, Loader2, Lock, Copy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/shared/BackButton'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { StatCard } from '@/components/shared/StatCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { CorretorModal } from '@/components/admin/CorretorModal'
import {
  AlertDialog, AlertDialogAction, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { fetchCorretorById, updateCorretor, setCorretorStatus } from '@/services/corretores'
import { fetchInscricoesByCorretor } from '@/services/inscricoes'
import { resetarSenhaCorretor } from '@/services/auth'
import { formatDate, formatDateTime } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/errors'
import type { Corretor, EventoInscricao } from '@/types'

function phoneDigits(v: string) {
  return v.replace(/\D/g, '')
}

export function AdminCorretorPerfil() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [corretor, setCorretor] = useState<Corretor | undefined>()
  const [inscricoes, setInscricoes] = useState<EventoInscricao[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [resetandoSenha, setResetandoSenha] = useState(false)
  const [senhaTemp, setSenhaTemp] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!id) return
    setIsLoading(true)
    try {
      const [c, ins] = await Promise.all([
        fetchCorretorById(id),
        fetchInscricoesByCorretor(id),
      ])
      setCorretor(c)
      setInscricoes(ins)
    } catch {
      setNotFound(true)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
      </div>
    )
  }

  if (notFound || !corretor) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-gray-500 mb-4">Corretor não encontrado.</p>
        <BackButton onClick={() => navigate('/admin/corretores')} />
      </div>
    )
  }

  const inscricoesCorretor = inscricoes

  const totalInscritos  = inscricoesCorretor.length
  const totalPresentes  = inscricoesCorretor.filter((i) => i.status === 'presente').length
  const totalAusentes   = inscricoesCorretor.filter((i) => i.status === 'ausente').length
  const taxa = totalInscritos > 0 ? ((totalPresentes / totalInscritos) * 100).toFixed(1) : '0.0'

  const ultimoEvento = inscricoesCorretor
    .filter((i) => i.status === 'presente' && i.evento)
    .sort((a, b) => new Date(b.evento!.data_evento).getTime() - new Date(a.evento!.data_evento).getTime())[0]

  const handleSave = async (data: Partial<Corretor>) => {
    try {
      await updateCorretor(corretor.id, data)
      toast({ title: 'Corretor atualizado', description: 'Dados salvos com sucesso.' })
      setModalOpen(false)
      await loadData()
    } catch (err) {
      toast({ title: 'Erro ao salvar', description: getErrorMessage(err), variant: 'destructive' })
    }
  }

  const handleResetSenha = async () => {
    if (!corretor || resetandoSenha) return
    setResetandoSenha(true)
    try {
      const { senha_temporaria } = await resetarSenhaCorretor(corretor.id)
      setSenhaTemp(senha_temporaria)
    } catch (err) {
      toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setResetandoSenha(false)
    }
  }

  const handleStatusChange = async (status: Corretor['status']) => {
    try {
      await setCorretorStatus(corretor.id, status)
      setCorretor((prev) => (prev ? { ...prev, status } : prev))
      toast({
        title: status === 'ativo' ? 'Corretor ativado' : 'Corretor bloqueado',
        description: corretor.nome,
      })
    } catch (err) {
      toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <BackButton onClick={() => navigate('/admin/corretores')} />
        <h1 className="text-2xl font-bold text-gray-900 flex-1">Perfil do Corretor</h1>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalOpen(true)}
            className="gap-1.5 rounded-xl border-gray-200"
          >
            <Edit2 className="w-3.5 h-3.5" /> Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetSenha}
            disabled={resetandoSenha}
            className="gap-1.5 rounded-xl border-gray-200"
          >
            {resetandoSenha ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />} Resetar senha
          </Button>
          {corretor.status !== 'ativo' ? (
            <Button
              size="sm"
              onClick={() => handleStatusChange('ativo')}
              className="gap-1.5 rounded-xl bg-green-700 hover:bg-green-800"
            >
              <UserCheck className="w-3.5 h-3.5" /> Ativar
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange('bloqueado')}
              className="gap-1.5 rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
            >
              <UserX className="w-3.5 h-3.5" /> Bloquear
            </Button>
          )}
        </div>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex-shrink-0">
            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-4xl font-bold select-none">
              {corretor.nome.charAt(0)}
            </div>
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">{corretor.nome}</h2>
              <StatusBadge status={corretor.status} />
            </div>
            <p className="text-gray-500 text-sm">{corretor.creci}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-sm">
              <a
                href={`mailto:${corretor.email}`}
                className="flex items-center gap-2 text-gray-600 hover:text-green-700 group transition-colors"
              >
                <Mail className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="group-hover:underline truncate">{corretor.email}</span>
              </a>
              <a
                href={`tel:+55${phoneDigits(corretor.telefone)}`}
                className="flex items-center gap-2 text-gray-600 hover:text-green-700 group transition-colors"
              >
                <Phone className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="group-hover:underline">{corretor.telefone}</span>
              </a>
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={`https://wa.me/55${phoneDigits(corretor.whatsapp)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-gray-600 hover:text-green-700 group transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="group-hover:underline">{corretor.whatsapp}</span>
                </a>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    corretor.whatsapp_opt_in ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}
                  title="Consentimento para notificações por WhatsApp (LGPD)"
                >
                  {corretor.whatsapp_opt_in ? 'Notificações ✓' : 'Notificações ✗'}
                </span>
              </div>
              {corretor.instagram && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Instagram className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>{corretor.instagram}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span>{corretor.cidade}/{corretor.uf}</span>
              </div>
              {corretor.imobiliaria && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Building2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>{corretor.imobiliaria.nome}</span>
                </div>
              )}
            </div>

            {corretor.cpf && (
              <p className="text-xs text-gray-400 mt-2">
                CPF: {corretor.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
              </p>
            )}
            {corretor.observacoes_admin && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-100 rounded-lg">
                <p className="text-xs text-yellow-700 font-medium">Observações internas</p>
                <p className="text-sm text-yellow-800 mt-1">{corretor.observacoes_admin}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Eventos Inscritos"  value={totalInscritos}    icon={Calendar}      color="blue"   />
        <StatCard title="Participações"       value={totalPresentes}    icon={CheckCircle}   color="green"  />
        <StatCard title="Ausências"           value={totalAusentes}     icon={XCircle}       color="red"    />
        <StatCard title="Taxa de Presença"    value={`${taxa}%`}        icon={CheckCircle}   color="purple" />
        <StatCard
          title="Último Evento"
          value={ultimoEvento?.evento ? formatDate(ultimoEvento.evento.data_evento) : '—'}
          icon={Clock}
          color="gray"
        />
      </div>

      {/* History table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Histórico de Participações</h2>
        </div>
        {inscricoesCorretor.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Sem histórico"
            description="Este corretor ainda não participou de nenhum evento."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Evento</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Data</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Tipo</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Check-in</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {inscricoesCorretor.map((i) => (
                  <tr key={i.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{i.evento?.titulo || '—'}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-gray-600">
                      {i.evento ? formatDate(i.evento.data_evento) : '—'}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-600 capitalize">
                      {i.evento?.tipo || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={i.status} />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">
                      {i.checkin_at ? formatDateTime(i.checkin_at) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CorretorModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        corretor={corretor}
      />

      {/* Senha temporária gerada */}
      <AlertDialog open={!!senhaTemp} onOpenChange={(o) => { if (!o) setSenhaTemp(null) }}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-1">
              <Lock className="w-6 h-6 text-green-700" />
            </div>
            <AlertDialogTitle className="text-base">Senha temporária gerada</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Repasse esta senha para <strong>{corretor.nome}</strong>. Ele deve trocá-la no primeiro acesso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
            <code className="flex-1 text-lg font-bold text-gray-900 tracking-wider">{senhaTemp}</code>
            <button
              onClick={() => { if (senhaTemp) navigator.clipboard?.writeText(senhaTemp); toast({ title: 'Copiado!' }) }}
              className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
              title="Copiar"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setSenhaTemp(null)} className="rounded-xl bg-green-700 hover:bg-green-800">
              Entendi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
