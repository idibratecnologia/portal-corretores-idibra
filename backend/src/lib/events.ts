/**
 * Barramento de eventos interno (in-process) para notificações em tempo real.
 *
 * Os services emitem `emitAdminRefresh(motivo)` quando algo muda (novo cadastro,
 * mudança de status, evento publicado…). A rota SSE (/notifications/stream)
 * escuta o canal e empurra um sinal para os admins conectados, que então
 * recarregam suas notificações.
 *
 * É um EventEmitter de processo único — adequado a um backend rodando numa
 * instância. Se um dia escalar horizontalmente, trocar por Redis pub/sub.
 */
import { EventEmitter } from 'events'

export const appEvents = new EventEmitter()
// Muitos clientes SSE podem se registrar ao mesmo tempo — sem limite de listeners.
appEvents.setMaxListeners(0)

export const ADMIN_REFRESH = 'admin-refresh'

/** Sinaliza aos admins conectados que as notificações podem ter mudado. */
export function emitAdminRefresh(motivo: string): void {
  appEvents.emit(ADMIN_REFRESH, motivo)
}
