import { api } from '@/lib/api'
import { mockImobiliarias } from '@/data/mockData'
import type { Imobiliaria } from '@/types'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

// ─── Listagem ────────────────────────────────────────────────────

export async function fetchImobiliarias(): Promise<Imobiliaria[]> {
  if (USE_MOCK) {
    return mockImobiliarias
  }

  return api.get<Imobiliaria[]>('/imobiliarias')
}

/** Lista pública (sem auth) — usada no cadastro de corretores. */
export async function fetchImobiliariasPublicas(): Promise<Pick<Imobiliaria, 'id' | 'nome'>[]> {
  if (USE_MOCK) {
    return mockImobiliarias.map((i) => ({ id: i.id, nome: i.nome }))
  }

  return api.get<Pick<Imobiliaria, 'id' | 'nome'>[]>('/imobiliarias/publicas')
}

export async function fetchImobiliariaById(id: string): Promise<Imobiliaria> {
  if (USE_MOCK) {
    const i = mockImobiliarias.find((i) => i.id === id)
    if (!i) throw new Error('Imobiliária não encontrada')
    return i
  }

  return api.get<Imobiliaria>(`/imobiliarias/${id}`)
}

// ─── Mutações ────────────────────────────────────────────────────

export async function createImobiliaria(
  data: Omit<Imobiliaria, 'id' | 'created_at' | 'total_corretores'>,
): Promise<Imobiliaria> {
  if (USE_MOCK) {
    return { ...data, id: String(Date.now()), created_at: new Date().toISOString(), total_corretores: 0 }
  }

  return api.post<Imobiliaria>('/imobiliarias', data)
}

export async function updateImobiliaria(
  id: string,
  data: Partial<Imobiliaria>,
): Promise<Imobiliaria> {
  if (USE_MOCK) {
    console.log('[mock] updateImobiliaria', id, data)
    const i = mockImobiliarias.find((i) => i.id === id)!
    return { ...i, ...data }
  }

  return api.patch<Imobiliaria>(`/imobiliarias/${id}`, data)
}

export async function setImobiliariaStatus(
  id: string,
  status: Imobiliaria['status'],
): Promise<void> {
  if (USE_MOCK) {
    console.log('[mock] setImobiliariaStatus', id, status)
    return
  }

  await api.patch(`/imobiliarias/${id}/status`, { status })
}

export async function deleteImobiliaria(id: string): Promise<void> {
  if (USE_MOCK) {
    console.log('[mock] deleteImobiliaria', id)
    return
  }

  await api.delete(`/imobiliarias/${id}`)
}

// ─── Logo ────────────────────────────────────────────────────────

export async function uploadLogoImobiliaria(id: string, file: File): Promise<{ logo_url: string }> {
  if (USE_MOCK) {
    return { logo_url: URL.createObjectURL(file) }
  }

  const form = new FormData()
  form.append('logo', file)
  return api.upload<{ logo_url: string }>(`/imobiliarias/${id}/logo`, form)
}

export async function removeLogoImobiliaria(id: string): Promise<void> {
  if (USE_MOCK) {
    console.log('[mock] removeLogoImobiliaria', id)
    return
  }

  await api.delete(`/imobiliarias/${id}/logo`)
}
