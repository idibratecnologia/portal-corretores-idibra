/**
 * Materiais de evento (arquivos ou links). Visíveis apenas para inscritos
 * no evento (e para admins).
 */
import { prisma } from '@/lib/prisma'
import { NotFoundError, ForbiddenError } from '@/lib/errors'
import { deleteImage } from '@/lib/storage'

export function listMateriais(eventoId: string) {
  return prisma.eventoMaterial.findMany({
    where:   { evento_id: eventoId },
    orderBy: { created_at: 'asc' },
  })
}

/** Garante que o evento existe (lança 404 caso contrário). */
async function ensureEvento(eventoId: string) {
  const ev = await prisma.evento.findUnique({ where: { id: eventoId }, select: { id: true } })
  if (!ev) throw new NotFoundError('Evento não encontrado')
}

/** Garante que o corretor está inscrito (não cancelado) no evento. */
export async function ensureInscrito(eventoId: string, corretorId: string) {
  const insc = await prisma.inscricao.findUnique({
    where:  { corretor_id_evento_id: { corretor_id: corretorId, evento_id: eventoId } },
    select: { status: true },
  })
  if (!insc || insc.status === 'cancelado') {
    throw new ForbiddenError('Materiais disponíveis apenas para inscritos no evento.')
  }
}

export async function addLink(eventoId: string, titulo: string, url: string) {
  await ensureEvento(eventoId)
  return prisma.eventoMaterial.create({ data: { evento_id: eventoId, tipo: 'link', titulo, url } })
}

export async function addArquivo(eventoId: string, titulo: string, url: string) {
  await ensureEvento(eventoId)
  return prisma.eventoMaterial.create({ data: { evento_id: eventoId, tipo: 'arquivo', titulo, url } })
}

export async function deleteMaterial(id: string) {
  const m = await prisma.eventoMaterial.findUnique({ where: { id } })
  if (!m) throw new NotFoundError('Material não encontrado')
  await prisma.eventoMaterial.delete({ where: { id } })
  if (m.tipo === 'arquivo') await deleteImage(m.url) // remove o arquivo do storage
}
