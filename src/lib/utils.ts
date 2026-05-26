import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatCPF(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export function formatCNPJ(cnpj: string): string {
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }
  return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ativo: 'bg-green-100 text-green-800',
    ativa: 'bg-green-100 text-green-800',
    pendente: 'bg-yellow-100 text-yellow-800',
    bloqueado: 'bg-red-100 text-red-800',
    inativo: 'bg-gray-100 text-gray-800',
    inativa: 'bg-gray-100 text-gray-800',
    publicado: 'bg-green-100 text-green-800',
    rascunho: 'bg-gray-100 text-gray-800',
    encerrado: 'bg-blue-100 text-blue-800',
    cancelado: 'bg-red-100 text-red-800',
    inscrito: 'bg-blue-100 text-blue-800',
    presente: 'bg-green-100 text-green-800',
    ausente: 'bg-red-100 text-red-800',
  }
  return colors[status.toLowerCase()] || 'bg-gray-100 text-gray-800'
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    ativo: 'Ativo',
    ativa: 'Ativa',
    pendente: 'Pendente',
    bloqueado: 'Bloqueado',
    inativo: 'Inativo',
    inativa: 'Inativa',
    publicado: 'Publicado',
    rascunho: 'Rascunho',
    encerrado: 'Encerrado',
    cancelado: 'Cancelado',
    inscrito: 'Inscrito',
    presente: 'Presente',
    ausente: 'Ausente',
  }
  return labels[status.toLowerCase()] || status
}

export function generateToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}
