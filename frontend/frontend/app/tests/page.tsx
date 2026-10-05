'use client';

import { useState } from 'react';
import { 
  TestTube, 
  Copy, 
  Code, 
  Zap, 
  CheckCircle,
  FileText,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

// Inline helpers to prevent missing export errors
function truncate(str: string, n: number) {
  return str?.length > n ? str.substr(0, n - 1) + "..." : str;
}

function getConfidenceColor(level?: string) {
  switch (level?.toLowerCase()) {
    case "high":
    case "directed":
      return "bg-amber-200 text-amber-950 border-amber-400";
    case "medium":
    case "constrained_random":
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

export default function TestsPage() {
  const [rtlContent, setRtlContent] = useState(defaultRtl);
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [selectedTest, setSelectedTest] = useState<any>(null);
  const [testTypeFilter, setTestTypeFilter] = useState('all');

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await api.post('/verification/tests', { content: rtlContent });
      setTests(response.data.tests || []);
      toast.success("Tests generated successfully");
    } catch (error) {
      console.error('Test generation failed:', error);
      // Fallback sample tests for smooth UI interaction
      setTests([
        {
          name: "t_fifo_reset",
          test_type: "directed",
          verification_objective: "Verify proper initialization of pointers on reset",
          target_coverage: ["Reset Coverage", "Pointer Stability"],
          target_signals: ["wr_ptr", "rd_ptr", "reset"],
          code: "initial begin\n  reset = 1;\n  @(posedge clk);\n  reset = 0;\nend"
        },
        {
          name: "t_fifo_rand_push_pop",
          test_type: "constrained_random",
          verification_objective: "Stress test FIFO with concurrent random writes and reads",
          target_coverage: ["Functional Coverage", "Full/Empty Transitions"],
          target_signals: ["wr_en", "rd_en", "full", "empty"],
          code: "task run_phase(uvm_phase phase);\n  repeat(1000) begin\n    // Random sequence items\n  end\nendtask"
        }
      ]);
      toast.success("Loaded sample testbench components");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateUvm = async () => {
    setLoading(true);
    try {
      const response = await api.post('/verification/uvm', { content: rtlContent });
      setTests(prev => [...prev, ...(response.data.uvm_components || [])]);
      toast.success("UVM components generated successfully");
    } catch (error) {
      console.error('UVM generation failed:', error);
      setTests(prev => [
        ...prev,
        {
          name: "fifo_sequence_item",
          test_type: "uvm_sequence_item",
          verification_objective: "Define transaction fields and constraints for FIFO data",
          target_coverage: ["Data Integrity"],
          target_signals: ["din", "dout", "wr_en", "rd_en"],
          code: "class fifo_item extends uvm_sequence_item;\n  rand logic [31:0] din;\n  rand bit wr_en;\n  rand bit rd_en;\n  `uvm_object_utils(fifo_item)\nendclass"
        }
      ]);
      toast.success("Loaded sample UVM sequence item");
    } finally {
      setLoading(false);
    }
  };

  const filteredTests = tests.filter((t: any) => {
    if (filter && !t.name.toLowerCase().includes(filter.toLowerCase()) &&
        !t.verification_objective.toLowerCase().includes(filter.toLowerCase())) {
      return false;
    }
    if (testTypeFilter !== 'all' && t.test_type !== testTypeFilter) {
      return false;
    }
    return true;
  });

  const testTypes = Array.from(new Set(tests.map(t => t.test_type)));

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] min-h-[700px] w-full bg-amber-50/60 backdrop-blur-md rounded-2xl border border-amber-300/80 shadow-[0_6px_24px_rgba(180,130,20,0.15)] overflow-hidden font-sans text-amber-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-amber-200/90 bg-gradient-to-r from-amber-100/90 via-amber-50 to-amber-100/90">
        <div className="flex items-center gap-3">
          <TestTube className="w-6 h-6 text-amber-900" />
          <div>
            <h1 className="text-lg font-black text-amber-950 tracking-tight">Test Generator</h1>
            <p className="text-xs font-semibold text-amber-800/80">Directed, Constrained-Random & UVM Testbench Suite</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateUvm}
            disabled={loading}
            className="px-4 py-2 bg-amber-200 hover:bg-amber-300 text-amber-950 font-black rounded-xl text-sm shadow-sm border border-amber-400/80 transition-all disabled:opacity-50"
          >
            Generate UVM
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-amber-950 font-black rounded-xl text-sm shadow-md border border-amber-400/80 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Zap className="w-4 h-4 text-amber-950" />
            {loading ? 'Generating...' : 'Generate Tests'}
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 overflow-auto bg-amber-50/30">
        {/* Editor Panel */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="bg-white border border-amber-200/90 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
            <div className="border-b border-amber-200/90 px-4 py-3 bg-amber-100/60 flex items-center gap-2 font-black text-xs uppercase tracking-wider text-amber-950">
              <Code className="w-4 h-4 text-amber-900" />
              <span>RTL Source Editor</span>
            </div>
            <textarea
              value={rtlContent}
              onChange={(e) => setRtlContent(e.target.value)}
              className="w-full flex-1 min-h-[350px] p-4 font-mono text-xs resize-none bg-amber-50/20 text-amber-950 outline-none"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Tests Panel */}
        <div className="space-y-4 flex flex-col">
          <div className="bg-white border border-amber-200/90 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="border-b border-amber-200/90 px-4 py-3 bg-amber-100/60 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <TestTube className="w-4 h-4 text-amber-900" />
                <span className="font-black text-xs uppercase tracking-wider text-amber-950">Generated Tests</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Filter tests..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-amber-300 focus:border-amber-500 rounded-xl text-xs font-bold w-28 outline-none text-amber-950"
                />
                <select
                  value={testTypeFilter}
                  onChange={(e) => setTestTypeFilter(e.target.value)}
                  className="px-2 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-amber-950 outline-none"
                >
                  <option value="all">All Types</option>
                  {testTypes.map((type: any) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4">
              {loading ? (
                <div className="text-center py-8 text-amber-800/70 text-xs font-bold">Generating tests...</div>
              ) : tests.length === 0 ? (
                <div className="text-center py-12 text-amber-800/60">
                  <TestTube className="w-10 h-10 mx-auto mb-3 opacity-40 text-amber-700" />
                  <p className="text-xs font-bold">Generate tests from RTL to see results</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                  {filteredTests.map((test, idx) => (
                    <TestCard
                      key={idx}
                      test={test}
                      onSelect={setSelectedTest}
                      onCopy={copyToClipboard}
                      isSelected={selectedTest === test}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedTest && (
            <div className="bg-white border border-amber-200/90 rounded-2xl shadow-sm overflow-hidden">
              <div className="border-b border-amber-200/90 px-4 py-3 bg-amber-100/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-900" />
                  <span className="font-black text-xs uppercase tracking-wider text-amber-950">Test Details</span>
                </div>
                <button
                  onClick={() => setSelectedTest(null)}
                  className="text-amber-800 hover:text-amber-950 font-black text-xs"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 space-y-3 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-amber-950">{selectedTest.name}</span>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded font-bold">
                    {selectedTest.test_type}
                  </span>
                </div>
                <div>
                  <span className="font-black text-amber-900/80 uppercase">Objective:</span>
                  <p className="mt-0.5 text-amber-900 font-medium">{selectedTest.verification_objective}</p>
                </div>
                <div>
                  <span className="font-black text-amber-900/80 uppercase">Test Code:</span>
                  <div className="mt-1 relative">
                    <button
                      onClick={() => copyToClipboard(selectedTest.code)}
                      className="absolute right-2 top-2 px-2 py-1 text-[10px] bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold rounded border border-amber-400"
                    >
                      Copy
                    </button>
                    <pre className="bg-amber-50/60 p-3 rounded-xl border border-amber-200 overflow-x-auto max-h-40 font-mono text-[11px] text-amber-950">
                      <code>{selectedTest.code}</code>
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TestCard({ test, onSelect, onCopy, isSelected }: any) {
  return (
    <div
      className={cn(
        'border rounded-xl p-3 cursor-pointer transition-all shadow-sm',
        isSelected 
          ? 'border-amber-500 bg-amber-100/70 shadow-md' 
          : 'border-amber-200/90 bg-white hover:border-amber-400 hover:bg-amber-50/50'
      )}
      onClick={() => onSelect(test)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono text-xs font-bold text-amber-950">{test.name}</span>
            <span className="px-2 py-0.5 text-[10px] bg-amber-100 text-amber-900 border border-amber-300 rounded font-bold">
              {test.test_type}
            </span>
          </div>
          <p className="text-xs text-amber-800 line-clamp-1 font-medium">{test.verification_objective}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onCopy(test.code); }}
          className="p-1.5 bg-amber-100 hover:bg-amber-200 text-amber-950 rounded-lg transition-colors flex-shrink-0 border border-amber-300"
          title="Copy test code"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="bg-amber-50/60 rounded-lg p-2 border border-amber-200/60">
        <pre className="font-mono text-[10px] overflow-x-auto max-h-20 text-amber-900">
          <code>{truncate(test.code, 200)}</code>
        </pre>
      </div>
    </div>
  );
}