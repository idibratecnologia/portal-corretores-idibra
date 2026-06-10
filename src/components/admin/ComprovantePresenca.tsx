import { formatDate } from '@/lib/utils'
import type { EventoInscricao } from '@/types'

function maskCPF(v: string) {
  return v.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

interface Props {
  inscricao: EventoInscricao | null
  evento: { titulo: string; data_evento: string; local?: string | null } | null
}

/**
 * Comprovante/crachá de presença — visível apenas na impressão (window.print()).
 * Reutilizado no Modo Credenciamento e no Modo Quiosque / QR Code.
 */
export function ComprovantePresenca({ inscricao, evento }: Props) {
  return (
    <>
      <style>{`
        @media screen { .crachá-print { display: none !important; } }
        @media print {
          @page { size: A4; margin: 1cm; }
          body * { visibility: hidden; }
          .crachá-print, .crachá-print * { visibility: visible; }
          .crachá-print {
            position: fixed; inset: 0;
            display: flex !important;
            align-items: center;
            justify-content: center;
          }
          .crachá-card {
            width: 9cm;
            padding: 1.1cm 0.9cm;
            border: 1.5px solid #bbb;
            border-radius: 0.35cm;
            text-align: center;
            font-family: Arial, Helvetica, sans-serif;
            background: #fff;
          }
          .crachá-org {
            font-size: 11pt; font-weight: 900;
            letter-spacing: 3px; color: #15803d;
            margin-bottom: 5px;
          }
          .crachá-evento {
            font-size: 8pt; color: #444;
            line-height: 1.3; margin-bottom: 2px;
          }
          .crachá-data { font-size: 8pt; color: #888; margin-bottom: 7px; }
          .crachá-div { border-top: 1px solid #ddd; margin: 7px 0; }
          .crachá-nome {
            font-size: 20pt; font-weight: 900;
            color: #111; line-height: 1.15;
            margin: 9px 0 6px;
          }
          .crachá-creci { font-size: 9pt; color: #555; margin-bottom: 3px; }
          .crachá-imob { font-size: 9pt; color: #666; }
          .crachá-tag {
            margin-top: 9px;
            font-size: 7.5pt; font-weight: 700;
            letter-spacing: 1.5px; color: #15803d;
          }
        }
      `}</style>

      {inscricao && evento && (
        <div className="crachá-print">
          <div className="crachá-card">
            <div className="crachá-org">IDIBRA</div>
            <div className="crachá-evento">{evento.titulo}</div>
            <div className="crachá-data">
              {formatDate(evento.data_evento)}{evento.local ? ` · ${evento.local}` : ''}
            </div>
            <div className="crachá-div" />
            <div className="crachá-nome">{inscricao.corretor?.nome}</div>
            <div className="crachá-creci">CRECI: {inscricao.corretor?.creci}</div>
            {inscricao.corretor?.imobiliaria?.nome && (
              <div className="crachá-imob">{inscricao.corretor.imobiliaria.nome}</div>
            )}
            {inscricao.corretor?.cpf && (
              <div className="crachá-creci" style={{ marginTop: 2 }}>
                CPF: {maskCPF(inscricao.corretor.cpf)}
              </div>
            )}
            <div className="crachá-div" />
            <div className="crachá-tag">✓ PRESENÇA CONFIRMADA</div>
          </div>
        </div>
      )}
    </>
  )
}
