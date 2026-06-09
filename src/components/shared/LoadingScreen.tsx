import idibraLogo from '@/assets/idibra_logo.png'

/**
 * Tela exibida enquanto o AuthContext restaura a sessão do localStorage.
 * Usa o mesmo gradiente dos heroes do portal para identidade visual consistente.
 */
export function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-8 bg-gradient-to-br from-slate-900 via-green-950 to-slate-900 overflow-hidden">

      {/* Blobs decorativos — mesma estética do CorretorHome */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-0 h-96 w-96 rounded-full bg-green-500/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-16 h-72 w-72 rounded-full bg-emerald-500/10 blur-2xl" />
      </div>

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Logo + anel giratório */}
      <div className="relative z-10 flex items-center justify-center">
        {/* Anel externo — gira lento */}
        <span className="absolute h-28 w-28 animate-spin rounded-full border-2 border-green-500/20 border-t-green-400 [animation-duration:2s]" />
        {/* Anel interno — gira ao contrário, mais rápido */}
        <span className="absolute h-20 w-20 animate-spin rounded-full border border-green-500/15 border-b-green-500/60 [animation-direction:reverse] [animation-duration:1.2s]" />

        {/* Logo */}
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 shadow-lg shadow-black/20 backdrop-blur-sm ring-1 ring-white/10">
          <img
            src={idibraLogo}
            alt="IDIBRA"
            className="h-9 w-auto object-contain"
            draggable={false}
          />
        </div>
      </div>

      {/* Texto de branding */}
      <div className="relative z-10 text-center">
        <p className="text-lg font-bold tracking-widest text-white">IDIBRA</p>
        <p className="mt-0.5 text-sm font-medium text-green-400 tracking-wide">
          Portal de Corretores
        </p>
      </div>

      {/* Barra de progresso indeterminada */}
      <div className="relative z-10 h-0.5 w-32 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-1/2 animate-[loading-bar_1.4s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-transparent via-green-400 to-transparent" />
      </div>

      <style>{`
        @keyframes loading-bar {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  )
}
