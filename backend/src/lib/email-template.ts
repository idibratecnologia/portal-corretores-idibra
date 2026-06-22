/**
 * Converte a mensagem (texto estilo WhatsApp) em um e-mail HTML com a identidade IDIBRA.
 */

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Texto → HTML: links clicáveis, *negrito* e quebras de linha. */
function textoParaHtml(texto: string): string {
  let h = escapeHtml(texto)
  h = h.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#15803d;word-break:break-all">$1</a>')
  h = h.replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>')
  h = h.replace(/\n/g, '<br>')
  return h
}

/** Envelopa o conteúdo num layout de e-mail responsivo e simples. */
export function montarHtmlEmail(mensagem: string): string {
  const corpo = textoParaHtml(mensagem)
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;padding:24px 0;font-family:Arial,Helvetica,sans-serif;color:#374151">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
      <tr><td style="background:#15803d;padding:20px 28px">
        <span style="color:#ffffff;font-size:18px;font-weight:bold;letter-spacing:.5px">IDIBRA</span>
        <span style="color:#bbf7d0;font-size:12px;display:block;margin-top:2px">Portal de Corretores</span>
      </td></tr>
      <tr><td style="padding:28px;font-size:15px;line-height:1.6">${corpo}</td></tr>
      <tr><td style="padding:16px 28px;border-top:1px solid #f1f5f9;color:#9ca3af;font-size:12px">
        Esta é uma mensagem automática do Portal de Corretores IDIBRA.
      </td></tr>
    </table>
    <p style="color:#9ca3af;font-size:11px;margin:16px 0 0">© ${new Date().getFullYear()} IDIBRA — corretoridibra.com.br</p>
  </td></tr></table>
  </body></html>`
}
