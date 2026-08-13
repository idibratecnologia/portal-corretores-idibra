import { api } from '@/lib/api'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

export type StatusDisparo = 'pendente' | 'processando' | 'enviado' | 'erro' | 'cancelado'

export interface DisparoAgendado {
  id: string
  mensagem: string
  assunto: string | null
  canal_whatsapp: boolean
  canal_email: boolean
  agendado_para: string
  status: StatusDisparo
  resultado: string | null
  erro: string | null
  enviado_at: string | null
  created_at: string
  total_corretores: number
  tem_anexo: boolean
}

export async function fetchDisparosAgendados(status?: StatusDisparo): Promise<DisparoAgendado[]> {
  if (USE_MOCK) return []
  return api.get<DisparoAgendado[]>('/disparos-agendados', status ? { status } : undefined)
}

/** Agenda um disparo em massa para uma data/hora futura (ISO). */
export async function agendarDisparo(
  mensagem: string,
  corretorIds: string[],
  canais: { whatsapp: boolean; email: boolean },
  agendadoParaISO: string,
  assunto?: string,
  anexo?: File,
  eventoId?: string,
): Promise<DisparoAgendado> {
  const form = new FormData()
  form.append('mensagem', mensagem)
  form.append('corretor_ids', JSON.stringify(corretorIds))
  form.append('canais', JSON.stringify(canais))
  form.append('agendado_para', agendadoParaISO)
  if (assunto) form.append('assunto', assunto)
  if (anexo) form.append('file', anexo)
  if (eventoId) form.append('evento_id', eventoId)
  return api.upload<DisparoAgendado>('/disparos-agendados', form)
}

export async function cancelarDisparoAgendado(id: string): Promise<void> {
  await api.delete(`/disparos-agendados/${id}`)
}
