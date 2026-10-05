"use client";

import React, { useState } from "react";
import {
  FileText,
  Search,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Cpu,
  BarChart2,
  Shield,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Inline helper function for confidence color styling
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

// Sample Verification Plan Data
const SAMPLE_PLAN = {
  title: "FIFO Synchronous Verification Plan",
  overview:
    "Comprehensive verification plan covering functional coverage, assertion-based verification, and boundary conditions for parameterized synchronous FIFO design.",
  features: [
    {
      id: "FEAT-1",
      name: "Basic Read / Write Operations",
      coverage: 100,
      confidence: "high",
      description: "Verify standard write followed by read operations under normal clock conditions.",
    },
    {
      id: "FEAT-2",
      name: "Full and Empty Flag Logic",
      coverage: 85,
      confidence: "medium",
      description: "Stress test pointer boundaries when memory depth reaches max capacity or zero.",
    },
    {
      id: "FEAT-3",
      name: "Simultaneous Read & Write",
      coverage: 70,
      confidence: "medium",
      description: "Verify flag stability and data integrity during simultaneous read/write cycles.",
    },
    {
      id: "FEAT-4",
      name: "Reset Behavior & Recovery",
      coverage: 100,
      confidence: "high",
      description: "Ensure state registers, pointers, and memory flags correctly default on reset assertion.",
    },
  ],
};

export default function VerificationPlanPage() {
  const [activeTab, setActiveTab] = useState<"plan" | "coverage">("plan");

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] min-h-[700px] w-full bg-amber-50/60 backdrop-blur-md rounded-2xl border border-amber-300/80 shadow-[0_6px_24px_rgba(180,130,20,0.15)] overflow-hidden font-sans text-amber-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-amber-200/90 bg-gradient-to-r from-amber-100/90 via-amber-50 to-amber-100/90">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-amber-900" />
          <div>
            <h1 className="text-lg font-black text-amber-950 tracking-tight">
              {SAMPLE_PLAN.title}
            </h1>
            <p className="text-xs font-semibold text-amber-800/80">
              SystemVerilog & Assertion Verification Plan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-200 border border-amber-400 text-amber-950">
            Status: Active
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-amber-200/90 bg-amber-100/60 px-4">
        <button
          onClick={() => setActiveTab("plan")}
          className={cn(
            "px-5 py-3 text-xs font-black transition-all border-b-2 flex items-center gap-2",
            activeTab === "plan"
              ? "border-amber-700 text-amber-950 bg-white shadow-sm"
              : "border-transparent text-amber-800/80 hover:text-amber-950 hover:bg-white/50"
          )}
        >
          <FileText className="w-4 h-4 text-amber-900" />
          Plan Features
        </button>
        <button
          onClick={() => setActiveTab("coverage")}
          className={cn(
            "px-5 py-3 text-xs font-black transition-all border-b-2 flex items-center gap-2",
            activeTab === "coverage"
              ? "border-amber-700 text-amber-950 bg-white shadow-sm"
              : "border-transparent text-amber-800/80 hover:text-amber-950 hover:bg-white/50"
          )}
        >
          <BarChart2 className="w-4 h-4 text-amber-900" />
          Coverage Analysis
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 bg-amber-50/30 space-y-6">
        {/* Overview Box */}
        <div className="bg-white p-5 rounded-2xl border border-amber-200/90 shadow-sm">
          <h2 className="text-xs font-black text-amber-900/80 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-700" /> Executive Summary
          </h2>
          <p className="text-sm font-semibold text-amber-900 leading-relaxed">
            {SAMPLE_PLAN.overview}
          </p>
        </div>

        {/* Feature List */}
        {activeTab === "plan" && (
          <div className="space-y-4">
            {SAMPLE_PLAN.features.map((feature) => (
              <div
                key={feature.id}
                className="bg-white p-5 rounded-2xl border border-amber-200/90 shadow-sm hover:border-amber-400 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                      {feature.id}
                    </span>
                    <h3 className="font-black text-amber-950 text-base">
                      {feature.name}
                    </h3>
                  </div>
                  <p className="text-xs font-medium text-amber-800/90">
                    {feature.description}
                  </p>
                </div>

                <div className="flex items-center gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-amber-100">
                  <div className="text-right">
                    <div className="text-[10px] font-black uppercase text-amber-900/80">
                      Coverage
                    </div>
                    <div className="text-base font-black text-amber-950 tabular-nums">
                      {feature.coverage}%
                    </div>
                  </div>

                  <span
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-black border capitalize",
                      getConfidenceColor(feature.confidence)
                    )}
                  >
                    {feature.confidence} Confidence
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Coverage Chart / Summary */}
        {activeTab === "coverage" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SAMPLE_PLAN.features.map((feature) => (
              <div
                key={feature.id}
                className="bg-white p-5 rounded-2xl border border-amber-200/90 shadow-sm space-y-3"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-amber-950 text-sm">
                    {feature.name}
                  </span>
                  <span className="font-black text-amber-950 text-sm">
                    {feature.coverage}%
                  </span>
                </div>
                <div className="w-full bg-amber-100 h-3 rounded-full overflow-hidden border border-amber-200">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${feature.coverage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}