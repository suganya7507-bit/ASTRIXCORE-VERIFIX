'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AstrixLogo } from './Logo';

export function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Dashboard', icon: <IconDashboard /> },
    { href: '/rtl', label: 'RTL Explorer', icon: <IconRtl /> },
    { href: '/verification-plan', label: 'Verification Plan', icon: <IconPlan /> },
    { href: '/assertions', label: 'Assertions', icon: <IconTarget /> },
    { href: '/tests', label: 'Tests', icon: <IconTests /> },
    { href: '/simulation', label: 'Simulation', icon: <IconSimulation /> },
    { href: '/coverage', label: 'Coverage', icon: <IconCoverage /> },
    { href: '/failures', label: 'Failures', icon: <IconFailures /> },
    { href: '/regression', label: 'Regression', icon: <IconRegression /> },
    { href: '/traceability', label: 'Traceability', icon: <IconTraceability /> },
    { href: '/settings', label: 'Settings', icon: <IconSettings /> },
  ];

  return (
    <aside className="w-64 bg-gradient-to-b from-[#F3D371] via-[#E2B33B] via-[#F8E397] to-[#C99824] border-r border-amber-300/80 p-5 flex flex-col justify-between shadow-[inset_-1px_0_1px_rgba(255,255,255,0.7),4px_0_20px_rgba(180,130,20,0.2)] z-20 shrink-0 backdrop-blur-md">
      <div className="space-y-6">
        <AstrixLogo version="v0.1" />

        <div className="space-y-1">
          <p className="text-[10px] font-black tracking-widest text-slate-950/90 uppercase px-3 mb-2">
            Navigation Modules
          </p>

          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-full text-xs font-black transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-[#FFFFFF] via-[#FFF3C4] to-[#E6B83B] text-slate-950 shadow-md border border-white/80 ring-1 ring-amber-400/50"
                    : "text-slate-950/90 hover:bg-white/40 hover:text-slate-950 hover:shadow-sm"
                }`}
              >
                <span className="w-4 h-4 text-slate-950 shrink-0">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Engine Status Banner */}
      <div className="p-3 bg-white/80 border border-amber-200/90 rounded-xl backdrop-blur-md shadow-[0_2px_10px_rgba(255,255,255,0.5)]">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
          <span className="text-xs font-black text-slate-950">Engine Connected</span>
        </div>
        <p className="text-[10px] text-slate-800 font-mono mt-0.5 truncate font-bold">
          http://localhost:8000/api
        </p>
      </div>
    </aside>
  );
}

/* Icon Helpers */
function IconDashboard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function IconRtl() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function IconPlan() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function IconTarget() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function IconTests() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2v7.31L4.75 18.5A2 2 0 0 0 6.4 21.5h11.2a2 2 0 0 0 1.65-3L14 9.31V2" />
      <line x1="8.5" y1="2" x2="15.5" y2="2" />
    </svg>
  );
}

function IconSimulation() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function IconCoverage() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function IconFailures() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function IconRegression() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

function IconTraceability() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}