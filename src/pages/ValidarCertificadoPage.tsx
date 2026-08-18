import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, XCircle, Loader2, Calendar, MapPin, BadgeCheck, GraduationCap, Clock } from 'lucide-react'
import idibraLogo from '@/assets/idibra_logo_preta.png'
import { fetchValidacao, type ValidacaoResult } from '@/services/modelos'

export function ValidarCertificadoPage() {
  const { codigo = '' } = useParams()
  const [res, setRes] = useState<ValidacaoResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchValidacao(codigo)
      .then(setRes)
      .catch(() => setRes({ valido: false }))
      .finally(() => setLoading(false))
  }, [codigo])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-green-50 flex flex-col items-center justify-center p-4">
      <img src={idibraLogo} alt="IDIBRA" className="h-10 w-auto object-contain mb-6" />

      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-7 h-7 text-green-600 animate-spin" /></div>
        ) : res?.valido ? (
          (() => {
            const curso = res.tipo === 'treinamento'
            return (
              <>
                <div className="bg-green-600 text-white px-6 py-5 text-center">
                  {curso ? <GraduationCap className="w-10 h-10 mx-auto mb-1" /> : <CheckCircle2 className="w-10 h-10 mx-auto mb-1" />}
                  <p className="font-bold text-lg">{curso ? 'Certificado válido' : 'Participação válida'}</p>
                </div>
                <div className="p-6 space-y-3 text-sm">
                  <Linha label="Participante" valor={res.nome} forte />
                  {res.creci && <Linha label="CRECI" valor={res.creci} />}
                  <div className="flex items-start gap-2 text-gray-700">
                    {curso ? <GraduationCap className="w-4 h-4 text-green-600 mt-0.5" /> : <BadgeCheck className="w-4 h-4 text-green-600 mt-0.5" />}
                    <div><p className="text-gray-400 text-xs">{curso ? 'Curso' : 'Evento'}</p><p className="font-medium">{res.evento}</p></div>
                  </div>
                  <div className="flex items-start gap-2 text-gray-700"><Calendar className="w-4 h-4 text-green-600 mt-0.5" /><div><p className="text-gray-400 text-xs">{curso ? 'Concluído em' : 'Data'}</p><p className="font-medium">{res.data}</p></div></div>
                  {curso && res.carga_horaria && <div className="flex items-start gap-2 text-gray-700"><Clock className="w-4 h-4 text-green-600 mt-0.5" /><div><p className="text-gray-400 text-xs">Carga horária</p><p className="font-medium">{res.carga_horaria}</p></div></div>}
                  {res.local && <div className="flex items-start gap-2 text-gray-700"><MapPin className="w-4 h-4 text-green-600 mt-0.5" /><div><p className="text-gray-400 text-xs">Local</p><p className="font-medium">{res.local}</p></div></div>}
                  <div className="pt-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${res.presente ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{res.status}</span>
                  </div>
                </div>
              </>
            )
          })()
        ) : (
          <div className="px-6 py-12 text-center">
            <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="font-semibold text-gray-800">Documento não encontrado</p>
            <p className="text-gray-400 text-sm mt-1">O código informado não corresponde a nenhuma participação.</p>
          </div>
        )}
      </div>

      <p className="text-slate-400 text-xs mt-6">© 2026 IDIBRA — Validação de participação</p>
    </div>
  )
}

function Linha({ label, valor, forte }: { label: string; valor?: string; forte?: boolean }) {
  return (
    <div>
      <p className="text-gray-400 text-xs">{label}</p>
      <p className={forte ? 'text-lg font-bold text-gray-900' : 'font-medium text-gray-700'}>{valor}</p>
    </div>
  )
}
