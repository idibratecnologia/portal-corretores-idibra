import { useNavigate } from 'react-router-dom'
import { Play, CheckCircle2, Star, Video, ListVideo, RotateCcw } from 'lucide-react'
import { statusProgressoInfo } from '@/lib/treinamentos-ui'
import type { TreinamentoResumo } from '@/services/treinamentos'

export function TreinamentoCorretorCard({ t, eventoTitulo }: { t: TreinamentoResumo; eventoTitulo?: string }) {
  const navigate = useNavigate()
  const sp = statusProgressoInfo(t.status)
  const concluido = t.status === 'concluido'

  const botao = concluido
    ? { label: 'Revisar', icon: RotateCcw }
    : t.status === 'em_andamento'
      ? { label: 'Continuar', icon: Play }
      : { label: 'Começar', icon: Play }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
      <div className="relative aspect-video bg-slate-100">
        {t.thumbnail_url ? (
          <img src={t.thumbnail_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300"><Video className="w-10 h-10" /></div>
        )}
        <span className={`absolute top-2 left-2 text-[10px] font-semibold px-2 py-1 rounded-full ${sp.className}`}>{sp.label}</span>
        {t.obrigatorio && (
          <span className="absolute top-2 right-2 text-[10px] font-semibold px-2 py-1 rounded-full bg-amber-500 text-white inline-flex items-center gap-1">
            <Star className="w-3 h-3 fill-white" /> Obrigatório
          </span>
        )}
        <span className="absolute bottom-2 right-2 text-[10px] font-medium px-1.5 py-0.5 rounded bg-black/70 text-white inline-flex items-center gap-1">
          <ListVideo className="w-3 h-3" /> {t.total_aulas} aula{t.total_aulas === 1 ? '' : 's'}
        </span>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        {eventoTitulo && <p className="text-[11px] text-green-700 font-medium mb-0.5 truncate">{eventoTitulo}</p>}
        <h3 className="font-semibold text-gray-900 leading-tight">{t.titulo}</h3>
        {t.descricao && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.descricao}</p>}

        <div className="mt-3">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full ${concluido ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${t.percentual}%` }} />
          </div>
          <p className="text-[10px] text-gray-400 mt-1">{t.aulas_concluidas} de {t.total_aulas} aula{t.total_aulas === 1 ? '' : 's'} concluída{t.aulas_concluidas === 1 ? '' : 's'}</p>
        </div>

        <button
          onClick={() => navigate(`/portal/treinamentos/${t.id}`)}
          disabled={t.total_aulas === 0}
          className={`mt-3 w-full py-2 rounded-xl text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors ${
            t.total_aulas === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : concluido
                ? 'bg-green-50 text-green-700 hover:bg-green-100'
                : 'bg-green-700 text-white hover:bg-green-800'
          }`}
        >
          {concluido ? <CheckCircle2 className="w-4 h-4" /> : <botao.icon className="w-4 h-4" />} {t.total_aulas === 0 ? 'Em breve' : botao.label}
        </button>
      </div>
    </div>
  )
}
