"use client";

import React, { useState } from "react";
import { MonacoEditor } from "../components/editor/MonacoEditor";
import { FileText, Play, Download, Upload, Search, Loader2, Cpu, CheckCircle2, Zap, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const FIFO_EXAMPLE = `// FIFO Synchronous - Clean Verification Example
// VerifiX AI - V0.1 Demo RTL

module fifo_sync #(
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

    // Internal signals
    logic [DATA_WIDTH-1:0] mem [0:DEPTH-1];
    logic [$clog2(DEPTH):0] wr_ptr, rd_ptr;
    logic [$clog2(DEPTH):0] wr_ptr_next, rd_ptr_next;
    logic [$clog2(DEPTH):0] count_next;
    logic full_next, empty_next;

    // Write pointer logic
    assign wr_ptr_next = wr_ptr + (wr_en && !full);
    assign rd_ptr_next = rd_ptr + (rd_en && !empty);
    assign count_next  = wr_ptr_next - rd_ptr_next;
    assign full_next   = (count_next == DEPTH);
    assign empty_next  = (count_next == 0);

    // Memory write
    always_ff @(posedge clk) begin
        if (wr_en && !full) begin
            mem[wr_ptr[$clog2(DEPTH)-1:0]] <= din;
        end
    end

    // Memory read
    always_ff @(posedge clk) begin
        if (reset) begin
            dout <= '0;
        end else if (rd_en && !empty) begin
            dout <= mem[rd_ptr[$clog2(DEPTH)-1:0]];
        end
    end

    // State registers
    always_ff @(posedge clk) begin
        if (reset) begin
            wr_ptr  <= '0;
            rd_ptr  <= '0;
            count   <= '0;
            full    <= 1'b0;
            empty   <= 1'b1;
        end else begin
            wr_ptr  <= wr_ptr_next;
            rd_ptr  <= rd_ptr_next;
            count   <= count_next;
            full    <= full_next;
            empty   <= empty_next;
        end
    end

    // Assertions for verification
    property p_no_write_when_full;
        @(posedge clk) disable iff (reset) full |-> !wr_en;
    endproperty
    a_no_write_when_full: assert property (p_no_write_when_full);

    property p_no_read_when_empty;
        @(posedge clk) disable iff (reset) empty |-> !rd_en;
    endproperty
    a_no_read_when_empty: assert property (p_no_read_when_empty);

endmodule`;

export default function RTLEditorPage() {
  const router = useRouter();
  const [rtlContent, setRtlContent] = useState(FIFO_EXAMPLE);
  const [filename, setFilename] = useState("fifo_sync.sv");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"editor" | "analysis" | "files">("editor");
  const [files, setFiles] = useState<{ name: string; content: string }[]>([
    { name: "fifo_sync.sv", content: FIFO_EXAMPLE },
  ]);

  const handleAnalyze = async () => {
    if (!rtlContent.trim()) {
      toast.error("No RTL content to analyze");
      return;
    }

    setAnalyzing(true);
    try {
      const response = await api.post("/rtl/analyze", {
        content: rtlContent,
        filename,
      });
      setAnalysisResult(response.data);
      setActiveTab("analysis");
      toast.success("RTL analysis complete");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFullFlow = async () => {
    if (!rtlContent.trim()) {
      toast.error("No RTL content to process");
      return;
    }

    setAnalyzing(true);
    try {
      const projectRes = await api.post("/projects/", {
        name: filename.replace(".sv", "").replace("_", " ").toUpperCase(),
        description: `Auto-generated from ${filename}`,
      });
      const projectId = projectRes.data.id;

      await api.post(`/projects/${projectId}/rtl`, {
        content: rtlContent,
        filename,
      });

      await api.post("/verification/full-flow", {
        rtl_content: rtlContent,
        specification: `Parameterized synchronous FIFO with full/empty flags.`,
      });

      toast.success("Full verification flow complete!");
      router.push(`/projects/${projectId}`);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Full flow failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const content = await file.text();
    setRtlContent(content);
    setFilename(file.name);
    setFiles((prev) => [...prev, { name: file.name, content }]);
    toast.success(`Loaded ${file.name}`);
  };

  const handleFileSelect = (file: { name: string; content: string }) => {
    setRtlContent(file.content);
    setFilename(file.name);
    setActiveTab("editor");
  };

  const handleDownload = () => {
    const blob = new Blob([rtlContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] w-full bg-amber-50/60 backdrop-blur-md rounded-2xl border border-amber-300/80 shadow-[0_6px_24px_rgba(180,130,20,0.15)] overflow-hidden font-sans text-amber-950">
      {/* Top Header Controls Bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-amber-200/90 bg-gradient-to-r from-amber-100/90 via-amber-50 to-amber-100/90 shrink-0">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-amber-900 shrink-0" />
          <input
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            className="bg-white border border-amber-300 focus:border-amber-500 rounded-xl px-3 py-1.5 text-amber-950 font-mono text-sm w-48 outline-none font-bold shadow-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="cursor-pointer p-2 bg-white hover:bg-amber-100 border border-amber-300 text-amber-950 rounded-xl shadow-sm transition-all" title="Upload File">
            <Upload className="w-4 h-4" />
            <input type="file" accept=".sv,.v,.svh,.vh" onChange={handleFileUpload} className="hidden" />
          </label>

          <button onClick={handleDownload} className="p-2 bg-white hover:bg-amber-100 border border-amber-300 text-amber-950 rounded-xl shadow-sm transition-all" title="Download RTL">
            <Download className="w-4 h-4" />
          </button>

          <button onClick={handleAnalyze} disabled={analyzing} className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-amber-950 font-black rounded-xl text-sm shadow-md border border-amber-400/80 flex items-center gap-2 transition-all">
            <Search className="w-4 h-4" />
            {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Analyze"}
          </button>

          <button onClick={handleFullFlow} disabled={analyzing} className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black rounded-xl text-sm shadow-md border border-amber-500 flex items-center gap-2 transition-all">
            <Play className="w-4 h-4 fill-white" />
            Full Flow
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-amber-200/90 bg-amber-100/60 px-4 shrink-0">
        {[
          { id: "editor", label: "Editor", icon: FileText },
          { id: "analysis", label: "Analysis", icon: Search },
          { id: "files", label: "Files", icon: Layers },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "px-5 py-3 text-xs font-black transition-all border-b-2 flex items-center gap-2 relative cursor-pointer",
              activeTab === tab.id
                ? "border-amber-700 text-amber-950 bg-white shadow-sm"
                : "border-transparent text-amber-800/80 hover:text-amber-950 hover:bg-white/50"
            )}
          >
            <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-amber-950" : "text-amber-800/70")} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Full-Height View Area */}
      <div className="flex-1 w-full h-full bg-amber-50/20 flex flex-col overflow-hidden">
        {activeTab === "editor" && (
          <div className="flex-1 w-full h-full flex flex-col p-4">
            <div className="flex-1 w-full h-full rounded-2xl border border-amber-300/80 overflow-hidden shadow-md bg-amber-50/40 flex flex-col">
              {/* Single Banner Bar */}
              <div className="px-4 py-2.5 bg-gradient-to-r from-amber-200/90 via-amber-100 to-amber-200/90 border-b border-amber-300/80 flex justify-between items-center text-xs font-black text-amber-950 font-mono shrink-0">
                <span>RTL Source Editor (Verilog / SystemVerilog)</span>
                <span className="text-amber-900/80">Live Edit</span>
              </div>
              
              {/* Full Canvas Monaco Editor Wrapper */}
              <div className="flex-1 w-full h-full relative bg-amber-50/30">
                <MonacoEditor
                  value={rtlContent}
                  onChange={(val) => setRtlContent(val || "")}
                  language="systemverilog"
                  theme="light"
                  height="100%"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "analysis" && (
          <div className="p-6 overflow-auto h-full">
            <p className="text-sm font-bold text-amber-950">Click &quot;Analyze&quot; to review FSM and port extraction results.</p>
          </div>
        )}

        {activeTab === "files" && (
          <div className="p-6 overflow-auto h-full space-y-2">
            {files.map((f, i) => (
              <button key={i} onClick={() => handleFileSelect(f)} className="w-full p-4 rounded-xl text-left bg-white border border-amber-200 font-mono text-sm font-bold text-amber-950 hover:border-amber-400">
                {f.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}