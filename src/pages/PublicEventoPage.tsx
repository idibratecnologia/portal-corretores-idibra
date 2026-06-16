import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Calendar, Clock, MapPin, ExternalLink, Loader2, ArrowRight } from 'lucide-react'
import idibraLogoPreta from '@/assets/idibra_logo_preta.png'
import { Button } from '@/components/ui/button'
import { fetchEventoPublico, type EventoPublico } from '@/services/eventos'
import { formatDate } from '@/lib/utils'

export function PublicEventoPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [evento, setEvento] = useState<EventoPublico | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    if (!id) return
    fetchEventoPublico(id)
      .then(setEvento)
      .catch(() => setErro(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
      </div>
    )
  }

  if (erro || !evento) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <img src={idibraLogoPreta} alt="IDIBRA" className="h-8 mb-6" />
        <p className="text-gray-600 mb-4">Evento não encontrado ou indisponível.</p>
        <Button onClick={() => navigate('/')} className="bg-green-700 hover:bg-green-800 rounded-xl">Acessar o portal</Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Topo */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-5 h-16 flex items-center justify-between">
          <img src={idibraLogoPreta} alt="Corretor IDIBRA" className="h-7 w-auto object-contain" />
          <Button size="sm" onClick={() => navigate('/')} className="bg-green-700 hover:bg-green-800 rounded-xl gap-1.5">
            Entrar no portal <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-8">
        {/* Banner */}
        <div className="w-full aspect-[1200/630] rounded-2xl border border-gray-100 overflow-hidden mb-6 bg-gradient-to-br from-green-100 to-green-200">
          {evento.banner_url ? (
            <img src={evento.banner_url} alt={evento.titulo} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Calendar className="w-16 h-16 text-green-400" />
            </div>
          )}
        </div>

        <span className="inline-block text-xs font-semibold text-green-700 bg-green-50 px-3 py-1 rounded-full capitalize mb-3">{evento.tipo}</span>
        <h1 className="text-3xl font-bold text-gray-900 leading-tight">{evento.titulo}</h1>
        {evento.empreendimento && <p className="text-gray-500 mt-1">Empreendimento: {evento.empreendimento}</p>}

        {/* Infos */}
        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          <div className="flex items-start gap-3 bg-white rounded-xl border border-gray-100 p-4">
            <Calendar className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900">{formatDate(evento.data_evento)}</p>
              <p className="text-sm text-gray-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {evento.hora_inicio} – {evento.hora_fim}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-white rounded-xl border border-gray-100 p-4">
            <MapPin className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900">{evento.local}</p>
              <p className="text-sm text-gray-500">{evento.endereco}</p>
              {evento.link_maps && (
                <a href={evento.link_maps} target="_blank" rel="noopener noreferrer" className="text-green-600 text-xs flex items-center gap-1 mt-1 hover:underline">
                  <ExternalLink className="w-3 h-3" /> Ver no mapa
                </a>
              )}
            </div>
          </div>
        </div>

        {evento.descricao && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 mt-4">
            <h2 className="font-semibold text-gray-900 mb-2">Sobre o evento</h2>
            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{evento.descricao}</p>
          </div>
        )}

        {/* CTA */}
        <div className="bg-green-700 text-white rounded-2xl p-6 mt-6 text-center">
          <p className="font-semibold text-lg">Quer participar?</p>
          <p className="text-green-100 text-sm mt-1 mb-4">Entre ou cadastre-se no Portal de Corretores IDIBRA para se inscrever neste evento.</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button onClick={() => navigate('/')} className="bg-white text-green-800 hover:bg-green-50 rounded-xl font-semibold">Já sou corretor — Entrar</Button>
            <Button onClick={() => navigate('/cadastro')} className="bg-transparent border border-white text-white hover:bg-white/15 hover:text-white rounded-xl font-semibold">Quero me cadastrar</Button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">© IDIBRA — Portal de Corretores Parceiros</p>
      </main>
    </div>
  )
}
