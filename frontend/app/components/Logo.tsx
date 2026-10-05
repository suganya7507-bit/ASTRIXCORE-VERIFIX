export function AstrixLogo({ version = "v0.1" }: { version?: string }) {
  return (
    <div className="flex items-center gap-2.5 shrink-0 select-none">
      {/* Black Square Container Box Around Logo */}
      <div className="w-9 h-9 bg-slate-950 rounded-xl p-1.5 flex items-center justify-center shadow-md border border-amber-400/40 shrink-0">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full text-amber-400 drop-shadow-[0_0_6px_rgba(255,215,0,0.8)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Reticle Box */}
          <rect
            x="10"
            y="10"
            width="80"
            height="80"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
          />

          {/* Crosshairs */}
          <line x1="50" y1="10" x2="50" y2="36" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
          <line x1="50" y1="64" x2="50" y2="90" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
          <line x1="10" y1="50" x2="36" y2="50" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
          <line x1="64" y1="50" x2="90" y2="50" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />

          {/* Center Dot */}
          <circle cx="50" cy="50" r="9" fill="currentColor" />
        </svg>
      </div>

      {/* Brand Title & Inline Version Badge */}
      <div className="flex flex-col min-w-0 justify-center">
        <div className="flex items-center gap-1.5 flex-nowrap">
          <span className="font-black tracking-[0.14em] text-slate-950 text-base leading-none">
            ASTRIXCORE
          </span>
          <span className="text-[9px] bg-slate-950 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold leading-none shrink-0 inline-block">
            {version}
          </span>
        </div>
        <span className="text-[8.5px] font-extrabold text-amber-950/80 tracking-tight mt-1 truncate uppercase leading-none">
          Enterprise Hardware Verification Suite
        </span>
      </div>
    </div>
  );
}