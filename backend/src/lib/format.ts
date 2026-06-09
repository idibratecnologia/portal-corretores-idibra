/**
 * Helpers de formatação para mensagens e respostas.
 */

/** Formata uma data para o padrão brasileiro: 14/06/2026 */
export function formatDataEvento(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(date)
}
