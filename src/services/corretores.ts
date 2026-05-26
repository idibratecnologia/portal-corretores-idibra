import { mockCorretoresComImobiliaria } from '@/data/mockData'
import type { Corretor } from '@/types'

// swap: import { supabase } from '@/lib/supabase'

export async function fetchCorretores(): Promise<Corretor[]> {
  // swap: const { data } = await supabase
  //         .from('corretores')
  //         .select('*, imobiliaria:imobiliarias(*)')
  //         .order('nome')
  //       return data ?? []
  return mockCorretoresComImobiliaria
}

export async function fetchCorretorById(id: string): Promise<Corretor | null> {
  // swap: const { data } = await supabase
  //         .from('corretores')
  //         .select('*, imobiliaria:imobiliarias(*)')
  //         .eq('id', id)
  //         .single()
  //       return data
  return mockCorretoresComImobiliaria.find((c) => c.id === id) ?? null
}

export async function updateCorretor(id: string, data: Partial<Corretor>): Promise<void> {
  // swap: await supabase.from('corretores').update(data).eq('id', id)
  console.log('[mock] updateCorretor', id, data)
}

export async function createCorretor(
  data: Omit<Corretor, 'id' | 'created_at' | 'updated_at' | 'total_eventos'>
): Promise<Corretor> {
  // swap: const { data: novo } = await supabase.from('corretores').insert(data).select().single()
  //       return novo
  const now = new Date().toISOString()
  return { ...data, id: String(Date.now()), created_at: now, updated_at: now, total_eventos: 0 }
}

export async function setCorretorStatus(id: string, status: Corretor['status']): Promise<void> {
  // swap: await supabase.from('corretores').update({ status }).eq('id', id)
  console.log('[mock] setCorretorStatus', id, status)
}
