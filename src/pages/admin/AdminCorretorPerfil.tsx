import { useParams, useNavigate } from 'react-router-dom'
import { Mail, Phone, MessageCircle, Instagram, MapPin, Building2, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/shared/BackButton'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { StatCard } from '@/components/shared/StatCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { mockCorretoresComImobiliaria, mockInscricoes, mockEventos } from '@/data/mockData'
import { formatDate, formatDateTime } from '@/lib/utils'

export function AdminCorretorPerfil() {
  const { id } = useParams()
  const navigate = useNavigate()

  const corretor = mockCorretoresComImobiliaria.find((c) => c.id === id)

  if (!corretor) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-gray-500 mb-4">Corretor não encontrado.</p>
        <BackButton onClick={() => navigate('/admin/corretores')} />
      </div>
    )
  }

  const inscricoesCorretor = mockInscricoes
    .filter((i) => i.corretor_id === id)
    .map((i) => ({ ...i, evento: mockEventos.find((e) => e.id === i.evento_id) }))

  const totalInscritos = inscricoesCorretor.length
  const totalPresentes = inscricoesCorretor.filter((i) => i.status === 'presente').length
  const totalAusentes = inscricoesCorretor.filter((i) => i.status === 'ausente').length
  const taxa = totalInscritos > 0 ? ((totalPresentes / totalInscritos) * 100).toFixed(1) : '0.0'
  const ultimoEvento = inscricoesCorretor
    .filter((i) => i.status === 'presente')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <BackButton onClick={() => navigate('/admin/corretores')} />
        <h1 className="text-2xl font-bold text-gray-900">Perfil do Corretor</h1>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex-shrink-0">
            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-4xl font-bold">
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
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-4 h-4 text-green-600" />
                <span>{corretor.email}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="w-4 h-4 text-green-600" />
                <span>{corretor.telefone}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <MessageCircle className="w-4 h-4 text-green-600" />
                <span>{corretor.whatsapp}</span>
              </div>
              {corretor.instagram && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Instagram className="w-4 h-4 text-green-600" />
                  <span>{corretor.instagram}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-4 h-4 text-green-600" />
                <span>{corretor.cidade}/{corretor.uf}</span>
              </div>
              {(corretor as any).imobiliaria && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Building2 className="w-4 h-4 text-green-600" />
                  <span>{(corretor as any).imobiliaria.nome}</span>
                </div>
              )}
            </div>
            {corretor.cpf && (
              <p className="text-xs text-gray-400 mt-2">CPF: {corretor.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</p>
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

      {/* Indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Eventos Inscritos" value={totalInscritos} icon={Calendar} color="blue" />
        <StatCard title="Participações" value={totalPresentes} icon={CheckCircle} color="green" />
        <StatCard title="Ausências" value={totalAusentes} icon={XCircle} color="red" />
        <StatCard title="Taxa de Presença" value={`${taxa}%`} icon={CheckCircle} color="purple" />
        <StatCard
          title="Último Evento"
          value={ultimoEvento ? formatDate(ultimoEvento.created_at) : '—'}
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
    </div>
  )
}
