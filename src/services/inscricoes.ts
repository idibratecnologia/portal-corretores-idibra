import { mockInscricoes, mockInscricoesCorretorLogado } from '@/data/mockData'
import type { EventoInscricao, StatusInscricao } from '@/types'

// swap: import { supabase } from '@/lib/supabase'

export async function fetchInscricoesByEvento(eventoId: string): Promise<EventoInscricao[]> {
  // swap: const { data } = await supabase
  //         .from('inscricoes')
  //         .select('*, corretor:corretores(*, imobiliaria:imobiliarias(*))')
  //         .eq('evento_id', eventoId)
  //       return data ?? []
  return mockInscricoes.filter((i) => i.evento_id === eventoId)
}

export async function fetchInscricoesByCorretor(corretorId: string): Promise<EventoInscricao[]> {
  // swap: const { data } = await supabase
  //         .from('inscricoes')
  //         .select('*, evento:eventos(*)')
  //         .eq('corretor_id', corretorId)
  //         .order('created_at', { ascending: false })
  //       return data ?? []
  return mockInscricoesCorretorLogado.filter((i) => i.corretor_id === corretorId)
}

export async function createInscricao(
  eventoId: string,
  corretorId: string
): Promise<EventoInscricao> {
  // swap: const { data } = await supabase
  //         .from('inscricoes')
  //         .insert({ evento_id: eventoId, corretor_id: corretorId, status: 'inscrito' })
  //         .select()
  //         .single()
  //       return data
  return {
    id: String(Date.now()),
    evento_id: eventoId,
    corretor_id: corretorId,
    status: 'inscrito',
    qr_code_token: `TOKEN-${Date.now()}`,
    created_at: new Date().toISOString(),
  }
}

export async function cancelarInscricao(inscricaoId: string): Promise<void> {
  // swap: await supabase.from('inscricoes').update({ status: 'cancelado' }).eq('id', inscricaoId)
  console.log('[mock] cancelarInscricao', inscricaoId)
}

export async function realizarCheckin(
  token: string,
  checkinPor?: string
): Promise<{ ok: boolean; inscricao?: EventoInscricao; erro?: string }> {
  // swap: const { data: inscricao } = await supabase
  //         .from('inscricoes')
  //         .select('*, corretor:corretores(*, imobiliaria:imobiliarias(*))')
  //         .eq('qr_code_token', token)
  //         .single()
  //       if (!inscricao) return { ok: false, erro: 'Token não encontrado' }
  //       if (inscricao.status === 'presente') return { ok: false, erro: 'Já registrado', inscricao }
  //       if (inscricao.status === 'cancelado') return { ok: false, erro: 'Inscrição cancelada' }
  //       await supabase.from('inscricoes').update({
  //         status: 'presente',
  //         checkin_at: new Date().toISOString(),
  //         checkin_por: checkinPor,
  //       }).eq('id', inscricao.id)
  //       return { ok: true, inscricao }
  const inscricao = mockInscricoes.find((i) => i.qr_code_token === token)
  if (!inscricao) return { ok: false, erro: 'Token não encontrado' }
  if (inscricao.status === 'presente') return { ok: false, erro: 'Já registrado', inscricao: inscricao as EventoInscricao }
  if (inscricao.status === 'cancelado') return { ok: false, erro: 'Inscrição cancelada' }
  return { ok: true, inscricao: { ...inscricao, status: 'presente' as StatusInscricao, checkin_at: new Date().toISOString(), checkin_por: checkinPor } }
}
