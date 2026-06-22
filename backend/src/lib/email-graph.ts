/**
 * Envio de e-mail via Microsoft Graph API (Outlook), app-only (client credentials).
 * Requer no Azure AD: permissão de APLICAÇÃO Mail.Send (com consentimento do admin)
 * e um mailbox remetente (GRAPH_SENDER_EMAIL) licenciado.
 */
import { config } from '@/config'

let tokenCache: { token: string; exp: number } | null = null

async function getToken(): Promise<string> {
  if (tokenCache && tokenCache.exp > Date.now() + 60_000) return tokenCache.token
  const url = `https://login.microsoftonline.com/${config.graph.tenantId}/oauth2/v2.0/token`
  const body = new URLSearchParams({
    client_id:     config.graph.clientId,
    client_secret: config.graph.clientSecret,
    grant_type:    'client_credentials',
    scope:         'https://graph.microsoft.com/.default',
  })
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
  if (!res.ok) throw new Error(`Graph token ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const data = (await res.json()) as { access_token: string; expires_in: number }
  tokenCache = { token: data.access_token, exp: Date.now() + data.expires_in * 1000 }
  return data.access_token
}

export interface EmailAttachment { name: string; contentBytes: string; contentType?: string }
export interface EmailParams { to: string; subject: string; html: string; attachments?: EmailAttachment[] }

export function emailEnabled(): boolean {
  return config.graph.enabled
}

export async function sendEmail({ to, subject, html, attachments }: EmailParams): Promise<void> {
  if (!config.graph.enabled) return
  const token = await getToken()

  const message: Record<string, unknown> = {
    subject,
    body: { contentType: 'HTML', content: html },
    from: { emailAddress: { name: config.graph.senderName, address: config.graph.senderEmail } },
    toRecipients: [{ emailAddress: { address: to } }],
  }
  if (attachments?.length) {
    message.attachments = attachments.map((a) => ({
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: a.name,
      contentType: a.contentType ?? 'application/octet-stream',
      contentBytes: a.contentBytes,
    }))
  }

  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.graph.senderEmail)}/sendMail`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, saveToSentItems: true }),
  })
  if (!res.ok) throw new Error(`Graph sendMail ${res.status}: ${(await res.text()).slice(0, 300)}`)
}
