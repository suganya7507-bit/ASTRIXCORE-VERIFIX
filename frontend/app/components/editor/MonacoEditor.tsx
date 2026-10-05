"use client";

import React from "react";
import Editor from "@monaco-editor/react";

interface MonacoEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  language?: string;
  theme?: string;
  height?: string;
}

export function MonacoEditor({
  value,
  onChange,
  language = "systemverilog",
  theme = "vs",
  height = "100%",
}: MonacoEditorProps) {
  return (
    <div className="w-full h-full bg-amber-50/30">
      <Editor
        height={height}
        language={language}
        value={value}
        onChange={onChange}
        theme="vs"
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: "'Fira Code', 'Courier New', monospace",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 12, bottom: 12 },
          lineNumbers: "on",
          renderLineHighlight: "all",
        }}
      />
    </div>
  );
}