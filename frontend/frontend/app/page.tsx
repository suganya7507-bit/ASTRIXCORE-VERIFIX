import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Top Banner - AstrixCore Verification AI */}
      <div className="bg-gradient-to-r from-[#FFE89C] via-[#F4CE5A] to-[#D4AF37] border-2 border-amber-400/80 p-6 rounded-2xl shadow-md flex items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-950 rounded-xl text-amber-300 shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-xl font-black text-slate-950 tracking-tight">
              AstrixCore Verification AI
            </h1>
          </div>
          <p className="text-xs font-bold text-amber-950/80 max-w-xl">
            Hardware RTL design verification, TCAD co-optimization, and automated testbench sandbox.
          </p>
        </div>

        <Link
          href="/simulation"
          className="px-4 py-2.5 bg-slate-950 hover:bg-slate-900 text-amber-300 font-bold text-xs rounded-xl shadow-md border border-amber-400/40 transition-transform active:scale-95 flex items-center gap-2 shrink-0"
        >
          <span>Open Simulator</span>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
      </div>

      {/* Uniform 4 White KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="ACTIVE SIMULATORS" value="Verilator / Icarus" sub="Engine Active" />
        <KpiCard title="VERIFICATION STATUS" value="Operational" badge="100% Ready" />
        <KpiCard title="RTL MODULES" value="FIFO Sync Ready" sub="Verified AST" />
        <KpiCard title="SYSTEM HEALTH" value="99.9%" />
      </div>

      {/* 2 Main Sandbox & Traceability Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: RTL Simulation Sandbox */}
        <div className="bg-white border border-amber-300/80 p-6 rounded-2xl shadow-sm space-y-4 hover:border-amber-400 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 text-amber-950 rounded-xl border border-amber-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-base font-black text-slate-950">RTL Simulation Sandbox</h2>
            </div>
            <p className="text-xs text-slate-700 font-medium leading-relaxed">
              Test and verify synchronous FIFOs and custom RTL logic in real-time with automated testbenches, wave logs, and compile-only checks.
            </p>
          </div>

          <div>
            <Link
              href="/simulation"
              className="inline-flex items-center gap-1.5 text-xs font-black text-amber-950 bg-gradient-to-r from-amber-200 to-amber-300 px-4 py-2 rounded-xl border border-amber-400 shadow-sm hover:shadow-md transition"
            >
              <span>Launch Sandbox</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Card 2: Traceability & Compliance */}
        <div className="bg-white border border-amber-300/80 p-6 rounded-2xl shadow-sm space-y-4 hover:border-amber-400 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 text-amber-950 rounded-xl border border-amber-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-base font-black text-slate-950">Traceability & Compliance</h2>
            </div>
            <p className="text-xs text-slate-700 font-medium leading-relaxed">
              Manage hardware verification requirements, trace test coverage against RTL specifications, and audit verification matrices.
            </p>
          </div>

          <div>
            <Link
              href="/traceability"
              className="inline-flex items-center gap-1.5 text-xs font-black text-amber-950 bg-gradient-to-r from-amber-200 to-amber-300 px-4 py-2 rounded-xl border border-amber-400 shadow-sm hover:shadow-md transition"
            >
              <span>View Traceability</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

function KpiCard({ title, value, sub, badge }: { title: string; value: string; sub?: string; badge?: string }) {
  return (
    <div className="p-4 rounded-xl border bg-white border-amber-300/80 shadow-sm flex flex-col justify-between min-h-[100px] transition-all">
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-[10px] font-black tracking-wider text-slate-800 uppercase leading-snug">
          {title}
        </p>
        {badge && (
          <span className="text-[9px] bg-slate-950 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">
            {badge}
          </span>
        )}
      </div>
      <div>
        <p className="text-lg font-black text-slate-950 leading-none">{value}</p>
        {sub && <p className="text-[10px] text-slate-600 font-bold mt-1.5">{sub}</p>}
      </div>
    </div>
  );
}