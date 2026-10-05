'use client';

import { useState } from 'react';
import { ShieldCheck, BarChart3, FileCode } from 'lucide-react';

export default function CoveragePage() {
  const [activeTab, setActiveTab] = useState<'line' | 'toggle' | 'functional'>('line');

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] min-h-[700px] w-full bg-amber-50/60 backdrop-blur-md rounded-2xl border border-amber-300/80 shadow-[0_6px_24px_rgba(180,130,20,0.15)] overflow-hidden font-sans text-amber-950">
      {/* Header Banner */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-amber-200/90 bg-gradient-to-r from-amber-100/90 via-amber-50 to-amber-100/90">
        <div className="flex items-center gap-3">
          <div className="bg-amber-200 border border-amber-400 p-2.5 rounded-xl text-amber-950 shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-amber-950 tracking-tight">Verification Coverage Analysis</h1>
            <p className="text-xs font-semibold text-amber-800/80">Inspect line, toggle, and functional coverage metrics for RTL testbenches.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto bg-amber-50/30 space-y-6">
        {/* Coverage Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Line Coverage" value="94.8%" status="good" />
          <StatCard title="Toggle Coverage" value="88.2%" status="warning" />
          <StatCard title="Functional Coverage" value="96.5%" status="good" />
        </div>

        {/* Main Breakdown Section */}
        <div className="bg-white border border-amber-200/90 rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="border-b border-amber-200/90 px-5 py-3 flex items-center justify-between bg-amber-100/60">
            <div className="flex items-center gap-2 text-amber-950">
              <BarChart3 className="w-4 h-4 text-amber-900" />
              <span className="font-black text-xs uppercase tracking-wider">Coverage Breakdown</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('line')}
                className={`px-3 py-1 text-xs rounded-xl font-bold transition cursor-pointer ${
                  activeTab === 'line' ? 'bg-amber-300/80 text-amber-950 shadow-sm' : 'text-amber-800 hover:text-amber-950 bg-white/50 border border-amber-200'
                }`}
              >
                Line
              </button>
              <button
                onClick={() => setActiveTab('toggle')}
                className={`px-3 py-1 text-xs rounded-xl font-bold transition cursor-pointer ${
                  activeTab === 'toggle' ? 'bg-amber-300/80 text-amber-950 shadow-sm' : 'text-amber-800 hover:text-amber-950 bg-white/50 border border-amber-200'
                }`}
              >
                Toggle
              </button>
              <button
                onClick={() => setActiveTab('functional')}
                className={`px-3 py-1 text-xs rounded-xl font-bold transition cursor-pointer ${
                  activeTab === 'functional' ? 'bg-amber-300/80 text-amber-950 shadow-sm' : 'text-amber-800 hover:text-amber-950 bg-white/50 border border-amber-200'
                }`}
              >
                Functional
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4 bg-amber-50/20">
            {activeTab === 'line' && (
              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between text-amber-900/70 border-b border-amber-200 pb-2 font-bold uppercase text-[10px]">
                  <span>Module / File</span>
                  <span>Hit / Total Lines</span>
                  <span>Percentage</span>
                </div>
                <div className="flex justify-between items-center text-amber-950 py-1.5 border-b border-amber-100/60">
                  <span className="font-bold text-amber-900">fifo_sync.sv</span>
                  <span className="text-amber-800">142 / 150</span>
                  <span className="text-amber-950 font-black bg-amber-200/70 px-2 py-0.5 rounded border border-amber-300">94.6%</span>
                </div>
                <div className="flex justify-between items-center text-amber-950 py-1.5 border-b border-amber-100/60">
                  <span className="font-bold text-amber-900">tb_fifo_sync.sv</span>
                  <span className="text-amber-800">85 / 88</span>
                  <span className="text-amber-950 font-black bg-amber-200/70 px-2 py-0.5 rounded border border-amber-300">96.5%</span>
                </div>
              </div>
            )}

            {activeTab === 'toggle' && (
              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between text-amber-900/70 border-b border-amber-200 pb-2 font-bold uppercase text-[10px]">
                  <span>Signal / Net</span>
                  <span>Transitions</span>
                  <span>Status</span>
                </div>
                <div className="flex justify-between items-center text-amber-950 py-1.5 border-b border-amber-100/60">
                  <span className="font-bold text-amber-900">clk</span>
                  <span className="text-amber-800">1,240 / 1,240</span>
                  <span className="text-amber-950 font-black bg-amber-200/70 px-2 py-0.5 rounded border border-amber-300">100%</span>
                </div>
                <div className="flex justify-between items-center text-amber-950 py-1.5 border-b border-amber-100/60">
                  <span className="font-bold text-amber-900">wr_ptr [4:0]</span>
                  <span className="text-amber-800">310 / 320</span>
                  <span className="text-amber-950 font-black bg-amber-100 px-2 py-0.5 rounded border border-amber-300">96.8%</span>
                </div>
                <div className="flex justify-between items-center text-amber-950 py-1.5 border-b border-amber-100/60">
                  <span className="font-bold text-amber-900">overflow_flag</span>
                  <span className="text-amber-800">12 / 20</span>
                  <span className="text-amber-950 font-black bg-amber-50 px-2 py-0.5 rounded border border-amber-200">60.0%</span>
                </div>
              </div>
            )}

            {activeTab === 'functional' && (
              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between text-amber-900/70 border-b border-amber-200 pb-2 font-bold uppercase text-[10px]">
                  <span>Covergroup / Bin</span>
                  <span>Hits</span>
                  <span>Status</span>
                </div>
                <div className="flex justify-between items-center text-amber-950 py-1.5 border-b border-amber-100/60">
                  <span className="font-bold text-amber-900">cg_fifo_depth</span>
                  <span className="text-amber-800">16 / 16 bins</span>
                  <span className="text-amber-950 font-black bg-amber-200/70 px-2 py-0.5 rounded border border-amber-300">Covered</span>
                </div>
                <div className="flex justify-between items-center text-amber-950 py-1.5 border-b border-amber-100/60">
                  <span className="font-bold text-amber-900">cg_simultaneous_rw</span>
                  <span className="text-amber-800">3 / 4 bins</span>
                  <span className="text-amber-950 font-black bg-amber-100 px-2 py-0.5 rounded border border-amber-300">Partial</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, status }: { title: string; value: string; status: 'good' | 'warning' }) {
  return (
    <div className="bg-white border border-amber-200/90 rounded-2xl p-4 shadow-sm flex items-center justify-between">
      <div>
        <div className="text-[10px] font-black text-amber-900/80 uppercase tracking-wider">{title}</div>
        <div className="text-xl font-black font-mono text-amber-950 mt-1">{value}</div>
      </div>
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 shadow-sm">
        <FileCode className="w-5 h-5" />
      </div>
    </div>
  );
}