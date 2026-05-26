import { mockEventos } from '@/data/mockData'
import type { Evento } from '@/types'

// swap: import { supabase } from '@/lib/supabase'

export async function fetchEventos(): Promise<Evento[]> {
  // swap: const { data } = await supabase
  //         .from('eventos')
  //         .select('*')
  //         .order('data_evento', { ascending: false })
  //       return data ?? []
  return mockEventos
}

export async function fetchEventoById(id: string): Promise<Evento | null> {
  // swap: const { data } = await supabase
  //         .from('eventos')
  //         .select('*')
  //         .eq('id', id)
  //         .single()
  //       return data
  return mockEventos.find((e) => e.id === id) ?? null
}

export async function createEvento(
  data: Omit<Evento, 'id' | 'created_at' | 'updated_at' | 'total_inscritos' | 'total_presentes'>
): Promise<Evento> {
  // swap: const { data: novo } = await supabase.from('eventos').insert(data).select().single()
  //       return novo
  const now = new Date().toISOString()
  return { ...data, id: String(Date.now()), created_at: now, updated_at: now, total_inscritos: 0, total_presentes: 0 }
}

export async function updateEvento(id: string, data: Partial<Evento>): Promise<void> {
  // swap: await supabase.from('eventos').update(data).eq('id', id)
  console.log('[mock] updateEvento', id, data)
}

export async function setEventoStatus(id: string, status: Evento['status']): Promise<void> {
  // swap: await supabase.from('eventos').update({ status }).eq('id', id)
  console.log('[mock] setEventoStatus', id, status)
}
