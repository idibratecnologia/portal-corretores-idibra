import { api } from '@/lib/api'
import type { EventoMaterial } from '@/types'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

export async function fetchMateriais(eventoId: string): Promise<EventoMaterial[]> {
  if (USE_MOCK) return []
  return api.get<EventoMaterial[]>(`/eventos/${eventoId}/materiais`)
}

export async function addMaterialLink(eventoId: string, titulo: string, url: string): Promise<EventoMaterial> {
  if (USE_MOCK) return { id: String(Date.now()), evento_id: eventoId, tipo: 'link', titulo, url, created_at: new Date().toISOString() }
  return api.post<EventoMaterial>(`/eventos/${eventoId}/materiais`, { titulo, url })
}

export async function addMaterialArquivo(eventoId: string, file: File, titulo?: string): Promise<EventoMaterial> {
  if (USE_MOCK) return { id: String(Date.now()), evento_id: eventoId, tipo: 'arquivo', titulo: titulo || file.name, url: '#', created_at: new Date().toISOString() }
  const form = new FormData()
  form.append('file', file)
  const qs = titulo ? `?titulo=${encodeURIComponent(titulo)}` : ''
  return api.upload<EventoMaterial>(`/eventos/${eventoId}/materiais${qs}`, form)
}

export async function deleteMaterial(id: string): Promise<void> {
  if (USE_MOCK) { console.log('[mock] deleteMaterial', id); return }
  await api.delete(`/materiais/${id}`)
}
