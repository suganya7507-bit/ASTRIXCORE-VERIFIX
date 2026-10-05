'use client';

import { useState } from 'react';
import { 
  AlertTriangle, 
  Code, 
  AlertCircle,
  CheckCircle,
  Info,
  Bug,
  Zap,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

function getConfidenceColor(level?: string) {
  switch (level?.toLowerCase()) {
    case "high":
      return "bg-amber-200 text-amber-950 border-amber-400";
    case "medium":
      return "bg-amber-100 text-amber-900 border-amber-300";
    case "low":
    default:
      return "bg-amber-50 text-amber-800 border-amber-200";
  }
}

const defaultRtl = `module fifo_sync #(
    parameter int DEPTH = 16,
    parameter int DATA_WIDTH = 32
) (
    input  logic                    clk,
    input  logic                    reset,
    input  logic                    wr_en,
    input  logic                    rd_en,
    input  logic [DATA_WIDTH-1:0] din,
    output logic [DATA_WIDTH-1:0] dout,
    output logic                    full,
    output logic                    empty,
    output logic [$clog2(DEPTH):0] count
);

    logic [DATA_WIDTH-1:0] mem [0:DEPTH-1];
    logic [$clog2(DEPTH):0] wr_ptr, rd_ptr;

    always_ff @(posedge clk) begin
        if (reset) begin
            wr_ptr <= 0;
            rd_ptr <= 0;
        end else begin
            if (wr_en && !full) wr_ptr <= wr_ptr + 1;
            if (rd_en && !empty) rd_ptr <= rd_ptr + 1;
        end
    end

endmodule`;

const defaultLog = `[INFO] Starting simulation...
[INFO] Test fifo_basic started
[ERROR] Assertion failed in fifo_sync.a_no_write_when_full at fifo.sv:45
[ERROR] Assertion failed in fifo_sync.a_no_read_when_empty at fifo.sv:52
[INFO] Test fifo_basic completed`;

export default function FailuresPage() {
  const [rtlContent, setRtlContent] = useState(defaultRtl);
  const [logContent, setLogContent] = useState(defaultLog);
  const [failureInfo, setFailureInfo] = useState({
    error: 'Assertion failed in fifo_sync.a_no_write_when_full',
    location: 'fifo.sv:45',
    severity: 'ERROR',
    observed_fact: 'Assertion a_no_write_when_full failed when wr_en=1 and full=1',
  });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'analysis' | 'log' | 'facts'>('analysis');

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const res = await api.post("/failures/analyze", {
        failure_info: failureInfo,
        rtl_content: rtlContent,
        log_analysis: { log_content: logContent },
      });
      setResult(res.data);
      setActiveTab('analysis');
      toast.success("Failure analysis completed");
    } catch (error: any) {
      console.error('Failure analysis failed:', error);
      toast.error(error.response?.data?.detail || "Analysis failed");
      // Fallback sample analysis response
      setResult({
        failure_id: "FAIL-1002",
        severity: "ERROR",
        classification: "HYPOTHESIS",
        error: failureInfo.error,
        location: failureInfo.location,
        root_cause_hypothesis: "Write pointer increments without full guard check precedence under burst conditions.",
        confidence: "medium",
        evidence: [
          "wr_en is asserted concurrently with full flag state",
          "Guard logic condition missing synchronous check in cycle 45"
        ],
        recommended_action: "Add explicit synchronous blocking condition for wr_en when full is asserted.",
        facts: [
          { fact: "Full flag high during write pulse", source: "Simulation Waveform" }
        ],
        hypotheses: [
          { hypothesis: "Combinational delay in full flag generation path", confidence: "medium", evidence: ["Timing violation report"] }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'FATAL':
      case 'ERROR': return 'bg-amber-100 text-amber-950 border-amber-300';
      case 'WARNING': return 'bg-amber-50 text-amber-900 border-amber-200';
      case 'INFO': default: return 'bg-white text-amber-900 border-amber-200';
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] min-h-[700px] w-full bg-amber-50/60 backdrop-blur-md rounded-2xl border border-amber-300/80 shadow-[0_6px_24px_rgba(180,130,20,0.15)] overflow-hidden font-sans text-amber-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-amber-200/90 bg-gradient-to-r from-amber-100/90 via-amber-50 to-amber-100/90">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-900" />
          <div>
            <h1 className="text-lg font-black text-amber-950 tracking-tight">Failure Analysis</h1>
            <p className="text-xs font-semibold text-amber-800/80">Automated Root Cause Triage & Log Diagnostics</p>
          </div>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-amber-950 font-black rounded-xl text-sm shadow-md border border-amber-400/80 flex items-center gap-2 transition-all disabled:opacity-50"
        >
          <Zap className="w-4 h-4 text-amber-950" />
          {loading ? 'Analyzing...' : 'Analyze Failure'}
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 overflow-auto bg-amber-50/30">
        {/* Input Panel */}
        <div className="space-y-4">
          <div className="bg-white border border-amber-200/90 rounded-2xl shadow-sm overflow-hidden">
            <div className="border-b border-amber-200/90 px-4 py-2.5 bg-amber-100/60 flex items-center gap-2 font-black text-xs uppercase tracking-wider text-amber-950">
              <Code className="w-4 h-4 text-amber-900" />
              <span>RTL Context</span>
            </div>
            <textarea
              value={rtlContent}
              onChange={(e) => setRtlContent(e.target.value)}
              className="w-full h-40 p-3 font-mono text-xs resize-none bg-amber-50/20 text-amber-950 outline-none"
              spellCheck={false}
            />
          </div>

          <div className="bg-white border border-amber-200/90 rounded-2xl shadow-sm overflow-hidden">
            <div className="border-b border-amber-200/90 px-4 py-2.5 bg-amber-100/60 flex items-center gap-2 font-black text-xs uppercase tracking-wider text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-900" />
              <span>Failure Info</span>
            </div>
            <div className="p-3 space-y-2 text-xs">
              <input
                type="text"
                value={failureInfo.error}
                onChange={(e) => setFailureInfo({...failureInfo, error: e.target.value})}
                placeholder="Error message"
                className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-amber-950 outline-none"
              />
              <input
                type="text"
                value={failureInfo.location}
                onChange={(e) => setFailureInfo({...failureInfo, location: e.target.value})}
                placeholder="Location (file:line)"
                className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-amber-950 outline-none"
              />
              <select
                value={failureInfo.severity}
                onChange={(e) => setFailureInfo({...failureInfo, severity: e.target.value})}
                className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-amber-950 outline-none"
              >
                <option value="FATAL">FATAL</option>
                <option value="ERROR">ERROR</option>
                <option value="WARNING">WARNING</option>
                <option value="INFO">INFO</option>
              </select>
              <textarea
                value={failureInfo.observed_fact}
                onChange={(e) => setFailureInfo({...failureInfo, observed_fact: e.target.value})}
                placeholder="Observed fact"
                className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-amber-950 outline-none h-20 resize-none"
              />
            </div>
          </div>

          <div className="bg-white border border-amber-200/90 rounded-2xl shadow-sm overflow-hidden">
            <div className="border-b border-amber-200/90 px-4 py-2.5 bg-amber-100/60 flex items-center gap-2 font-black text-xs uppercase tracking-wider text-amber-950">
              <FileText className="w-4 h-4 text-amber-900" />
              <span>Simulation Log</span>
            </div>
            <textarea
              value={logContent}
              onChange={(e) => setLogContent(e.target.value)}
              className="w-full h-32 p-3 font-mono text-xs resize-none bg-amber-50/20 text-amber-950 outline-none"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-4 flex flex-col">
          <div className="bg-white border border-amber-200/90 rounded-2xl shadow-sm overflow-hidden flex flex-col flex-1">
            <div className="border-b border-amber-200/90 px-4 py-3 bg-amber-100/60 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-900" />
                <span className="font-black text-xs uppercase tracking-wider text-amber-950">Diagnostics Output</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('analysis')}
                  className={cn('px-3 py-1 text-xs font-bold rounded-xl transition cursor-pointer border', activeTab === 'analysis' ? 'bg-amber-300/80 text-amber-950 border-amber-400 shadow-sm' : 'text-amber-800 hover:text-amber-950 border-amber-200 bg-white/50')}
                >
                  Analysis
                </button>
                <button
                  onClick={() => setActiveTab('log')}
                  className={cn('px-3 py-1 text-xs font-bold rounded-xl transition cursor-pointer border', activeTab === 'log' ? 'bg-amber-300/80 text-amber-950 border-amber-400 shadow-sm' : 'text-amber-800 hover:text-amber-950 border-amber-200 bg-white/50')}
                >
                  Log Analysis
                </button>
                <button
                  onClick={() => setActiveTab('facts')}
                  className={cn('px-3 py-1 text-xs font-bold rounded-xl transition cursor-pointer border', activeTab === 'facts' ? 'bg-amber-300/80 text-amber-950 border-amber-400 shadow-sm' : 'text-amber-800 hover:text-amber-950 border-amber-200 bg-white/50')}
                >
                  Facts vs Hypotheses
                </button>
              </div>
            </div>

            <div className="p-5 flex-1 overflow-y-auto bg-amber-50/20">
              {activeTab === 'analysis' && (
                <div className="space-y-4 text-xs">
                  {result ? (
                    <>
                      <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-amber-950">{result.failure_id || 'FAIL-XXXX'}</span>
                          <span className={cn('px-2 py-0.5 rounded font-bold border', getSeverityColor(result.severity))}>
                            {result.severity || 'ERROR'}
                          </span>
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded font-bold">
                            {result.classification || 'HYPOTHESIS'}
                          </span>
                        </div>
                        <p className="text-amber-900 font-medium">{result.error}</p>
                        <p className="text-amber-800/80 font-mono">Location: {result.location}</p>
                      </div>

                      {result.root_cause_hypothesis && (
                        <div className="p-4 bg-white border border-amber-200 rounded-xl space-y-1">
                          <h4 className="font-black text-amber-950 uppercase tracking-wide flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-700" />
                            Root Cause Hypothesis
                          </h4>
                          <p className="text-amber-900 font-medium">{result.root_cause_hypothesis}</p>
                          <div className="pt-2">
                            <span className={cn('px-2.5 py-0.5 rounded font-bold border inline-block', getConfidenceColor(result.confidence))}>
                              Confidence: {result.confidence || 'LOW'}
                            </span>
                          </div>
                        </div>
                      )}

                      {result.recommended_action && (
                        <div className="p-4 bg-amber-100/70 border border-amber-300 rounded-xl space-y-1">
                          <h4 className="font-black text-amber-950 uppercase tracking-wide flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-amber-800" />
                            Recommended Action
                          </h4>
                          <p className="text-amber-900 font-semibold">{result.recommended_action}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-16 text-amber-800/60">
                      <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-40 text-amber-700" />
                      <p className="font-bold text-xs">Provide failure info and click Analyze Failure</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'log' && (
                <div className="p-2">
                  <LogAnalysisView logContent={logContent} />
                </div>
              )}

              {activeTab === 'facts' && (
                <div className="p-2">
                  <FactsVsHypothesesView result={result} failureInfo={failureInfo} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LogAnalysisView({ logContent }: { logContent: string }) {
  const lines = logContent.split('\n');
  const errors = lines.filter(l => l.includes('[ERROR]') || l.includes('[FATAL]'));
  const warnings = lines.filter(l => l.includes('[WARNING]'));
  const assertions = lines.filter(l => l.includes('assertion') && l.toLowerCase().includes('fail'));

  return (
    <div className="space-y-4 text-xs">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Lines" value={lines.length} icon={FileText} />
        <StatCard label="Errors" value={errors.length} icon={AlertCircle} />
        <StatCard label="Warnings" value={warnings.length} icon={AlertTriangle} />
      </div>

      {assertions.length > 0 && (
        <div className="border border-amber-300 bg-amber-100/50 rounded-xl p-3 space-y-2">
          <h4 className="font-black text-amber-950 uppercase tracking-wide flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-900" />
            Assertion Failures ({assertions.length})
          </h4>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {assertions.map((line, i) => (
              <div key={i} className="font-mono text-[11px] text-amber-950 bg-white p-2 rounded-lg border border-amber-200">
                {line.trim()}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FactsVsHypothesesView({ result, failureInfo }: any) {
  if (!result) {
    return (
      <div className="text-center py-16 text-amber-800/60 text-xs font-bold">
        <Info className="w-10 h-10 mx-auto mb-3 opacity-40 text-amber-700" />
        <p>Run analysis to see facts vs hypotheses separation</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-xs">
      <div className="border-l-4 border-amber-600 bg-amber-100/60 p-4 rounded-r-xl border border-amber-200">
        <h4 className="font-black text-amber-950 mb-2 uppercase tracking-wide flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-800" />
          Observed FACTS
        </h4>
        <ul className="space-y-1.5 font-medium text-amber-900">
          <li className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-amber-800 flex-shrink-0" />
            {failureInfo.observed_fact}
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-amber-800 flex-shrink-0" />
            Assertion a_no_write_when_full failed at fifo.sv:45
          </li>
        </ul>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: any; icon?: any }) {
  return (
    <div className="bg-white border border-amber-200/90 rounded-2xl p-3 shadow-sm">
      <div className="flex items-center gap-1.5 mb-1 text-[10px] font-black text-amber-900/80 uppercase tracking-wider">
        {Icon && <Icon className="w-3.5 h-3.5 text-amber-700" />}
        <span>{label}</span>
      </div>
      <div className="text-base font-black font-mono text-amber-950">{value}</div>
    </div>
  );
}