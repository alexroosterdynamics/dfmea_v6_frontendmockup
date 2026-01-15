// components/ProcessDiagramViewport.js
"use client";

import ProcessForceGraph from "./ProcessForceGraph";

export default function ProcessDiagramViewport() {
  return (
    <div
      className={[
        "relative",
        // Full canvas height inside the workspace scroll area:
        // top nav is 56px, workspace header is 48px => 104px
        // this makes the graph feel full-screen.
        "h-[calc(100vh-104px)]",
        "bg-[#fbfbfa]"
      ].join(" ")}
    >
      {/* Optional tiny label (very subtle, no big title spacing) */}
      <div className="absolute left-10 top-6 z-10">
        <div className="text-[13px] font-medium tracking-tight text-zinc-900">
          Process Diagram
        </div>
        <div className="mt-1 text-[11px] text-zinc-500 tracking-tight">
          requirements → systems → functions
        </div>
      </div>

      {/* Graph fills entire viewport */}
      <div className="absolute inset-0">
        <ProcessForceGraph />
      </div>
    </div>
  );
}
