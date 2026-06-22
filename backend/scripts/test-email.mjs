/**
 * Teste de envio de e-mail via Microsoft Graph (Outlook).
 * Uso:  node scripts/test-email.mjs destinatario@exemplo.com
 *
 * Lê as variáveis do backend/.env (AZURE_*, GRAPH_SENDER_EMAIL/NAME).
 */
import 'dotenv/config'

const to = process.argv[2]
if (!to) { console.error('Uso: node scripts/test-email.mjs destinatario@exemplo.com'); process.exit(1) }

const tenant = process.env.AZURE_TENANT_ID
const clientId = process.env.AZURE_CLIENT_ID
const secret = process.env.AZURE_CLIENT_SECRET
const sender = process.env.GRAPH_SENDER_EMAIL
const senderName = process.env.GRAPH_SENDER_NAME || 'IDIBRA'

const faltando = []
if (!tenant) faltando.push('AZURE_TENANT_ID')
if (!clientId) faltando.push('AZURE_CLIENT_ID')
if (!secret) faltando.push('AZURE_CLIENT_SECRET')
if (!sender) faltando.push('GRAPH_SENDER_EMAIL')
if (faltando.length) { console.error('❌ Faltam variáveis no .env:', faltando.join(', ')); process.exit(1) }

console.log('▶ Obtendo token (client_credentials)…')
const tokenRes = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ client_id: clientId, client_secret: secret, grant_type: 'client_credentials', scope: 'https://graph.microsoft.com/.default' }),
})
if (!tokenRes.ok) { console.error(`❌ Token ${tokenRes.status}:`, (await tokenRes.text()).slice(0, 500)); process.exit(1) }
const { access_token } = await tokenRes.json()
console.log('✅ Token obtido.')

const html = `<div style="font-family:Arial;padding:16px">
  <h2 style="color:#15803d">IDIBRA — Teste de e-mail</h2>
  <p>Se você recebeu esta mensagem, o envio via Microsoft Graph está funcionando. 🎉</p>
  <p style="color:#888;font-size:12px">Enviado em ${new Date().toLocaleString('pt-BR')}</p>
</div>`

console.log(`▶ Enviando e-mail de ${sender} para ${to}…`)
const sendRes = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: {
      subject: 'IDIBRA — Teste de e-mail (Graph)',
      body: { contentType: 'HTML', content: html },
      from: { emailAddress: { name: senderName, address: sender } },
      toRecipients: [{ emailAddress: { address: to } }],
    },
    saveToSentItems: true,
  }),
})
if (!sendRes.ok) { console.error(`❌ sendMail ${sendRes.status}:`, (await sendRes.text()).slice(0, 700)); process.exit(1) }
console.log('✅ E-mail enviado com sucesso! Verifique a caixa de entrada (e o spam).')
