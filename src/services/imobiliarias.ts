import { mockImobiliarias } from '@/data/mockData'
import type { Imobiliaria } from '@/types'

// swap: import { supabase } from '@/lib/supabase'

export async function fetchImobiliarias(): Promise<Imobiliaria[]> {
  // swap: const { data } = await supabase
  //         .from('imobiliarias')
  //         .select('*')
  //         .order('nome')
  //       return data ?? []
  return mockImobiliarias
}

export async function createImobiliaria(
  data: Omit<Imobiliaria, 'id' | 'created_at' | 'total_corretores'>
): Promise<Imobiliaria> {
  // swap: const { data: nova } = await supabase.from('imobiliarias').insert(data).select().single()
  //       return nova
  return { ...data, id: String(Date.now()), created_at: new Date().toISOString(), total_corretores: 0 }
}

export async function updateImobiliaria(id: string, data: Partial<Imobiliaria>): Promise<void> {
  // swap: await supabase.from('imobiliarias').update(data).eq('id', id)
  console.log('[mock] updateImobiliaria', id, data)
}

export async function setImobiliariaStatus(
  id: string,
  status: Imobiliaria['status']
): Promise<void> {
  // swap: await supabase.from('imobiliarias').update({ status }).eq('id', id)
  console.log('[mock] setImobiliariaStatus', id, status)
}
