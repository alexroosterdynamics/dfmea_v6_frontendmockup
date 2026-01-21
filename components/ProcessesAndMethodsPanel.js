"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Square, StopCircle } from "lucide-react";

const cx = (...c) => c.filter(Boolean).join(" ");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function DiagramMini({ proc }) {
  const width = 920;
  const height = 120;

  const nodes = proc?.diagram?.nodes ?? [];
  const edges = proc?.diagram?.edges ?? [];
  const byId = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white overflow-hidden">
      <div className="px-3 py-2 border-b border-zinc-200/70">
        <div className="text-[12px] font-semibold tracking-tight text-zinc-900 truncate">
          {proc?.title ?? "Process"}
        </div>
        <div className="text-[11px] text-zinc-500 mt-0.5 leading-snug">
          {proc?.description ?? ""}
        </div>
      </div>

      <div className="p-3">
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="block">
          {edges.map((e, idx) => {
            const a = byId.get(e.from);
            const b = byId.get(e.to);
            if (!a || !b) return null;

            const x1 = a.x + 140;
            const y1 = a.y + 22;
            const x2 = b.x;
            const y2 = b.y + 22;

            return (
              <g key={idx}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(39,39,42,0.35)"
                  strokeWidth="2"
                />
                <polygon
                  points={`${x2},${y2} ${x2 - 10},${y2 - 6} ${x2 - 10},${y2 + 6}`}
                  fill="rgba(39,39,42,0.35)"
                />
                {e.label ? (
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 - 8}
                    fontSize="10"
                    fill="rgba(39,39,42,0.55)"
                    textAnchor="middle"
                  >
                    {e.label}
                  </text>
                ) : null}
              </g>
            );
          })}

          {nodes.map((n) => (
            <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
              <rect
                x="0"
                y="0"
                rx="10"
                ry="10"
                width="140"
                height="44"
                fill="white"
                stroke="rgba(39,39,42,0.16)"
                strokeWidth="1.4"
              />
              <text
                x="70"
                y="26"
                fontSize="11"
                fill="rgba(39,39,42,0.85)"
                textAnchor="middle"
              >
                {n.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function makeConclusion(node) {
  if (!node) return null;

  const m = node.meta ?? {};
  const kind = node.kind;

  if (kind === "Failure Mode") {
    const rpn = m.rpn ?? 0;
    if (rpn >= 200)
      return `High risk failure mode (RPN ${rpn}). Prioritize prevention + detection controls.`;
    if (rpn >= 160) return `Moderate risk (RPN ${rpn}). Validate controls coverage and timing.`;
    return `Lower risk (RPN ${rpn}). Monitor trends and maintain coverage.`;
  }

  if (kind === "Effect") {
    const s = m.severity ?? 0;
    if (s >= 9) return `Severe effect (S=${s}). Ensure mitigation/fail-safe exists.`;
    if (s >= 7) return `Meaningful effect (S=${s}). Confirm operator response + alarms.`;
    return `Minor effect (S=${s}). Track and validate acceptable impact.`;
  }

  if (kind === "Cause") {
    const o = m.occurrence ?? 0;
    const d = m.detection ?? 0;
    if (d >= 7) return `Weak detection (D=${d}). Add sensing/monitoring or detection tests.`;
    if (o >= 7) return `High occurrence (O=${o}). Add prevention / robustness improvements.`;
    return `Cause stability acceptable (O=${o}, D=${d}). Verify via tests.`;
  }

  if (kind === "Control") {
    const ct = m.controlType ?? "Control";
    return `${ct} control linked. Validate effectiveness + verification method.`;
  }

  if (kind === "Requirement") {
    return `Requirement anchor. Ensure mapping to functions and measurable verification.`;
  }

  if (kind === "Function") {
    return `Function analysis. Confirm inputs/outputs and timing constraints.`;
  }

  return `Analyzing node.`;
}

function buildTraversalSequence(nodes) {
  const order = ["Requirement", "Function", "Failure Mode", "Cause", "Effect", "Control"];
  const rank = new Map(order.map((k, i) => [k, i]));
  return [...nodes].sort((a, b) => {
    const ra = rank.get(a.kind) ?? 999;
    const rb = rank.get(b.kind) ?? 999;
    if (ra !== rb) return ra - rb;
    return (a.title ?? "").localeCompare(b.title ?? "");
  });
}

export default function ProcessesAndMethodsPanel({
  processes,
  nodes,
  onHighlightNode,
  onClearHighlight
}) {
  const [procId, setProcId] = useState(processes?.[0]?.id ?? "");
  const activeProc = processes.find((p) => p.id === procId) ?? processes?.[0];

  const [logs, setLogs] = useState([]);
  const [running, setRunning] = useState(false);

  const cancelRef = useRef({ cancel: false });

  const sequence = useMemo(() => buildTraversalSequence(nodes), [nodes]);

  useEffect(() => {
    if (!running) return;
    const el = document.getElementById("proc-log-box");
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs, running]);

  const stop = () => {
    cancelRef.current.cancel = true;
    setRunning(false);
    onClearHighlight?.();
    setLogs((prev) => [
      ...prev,
      { type: "system", text: "Stopped.", t: Date.now() }
    ]);
  };

  const play = async () => {
    if (!sequence.length) return;

    cancelRef.current.cancel = false;
    setRunning(true);

    setLogs([
      { type: "system", text: `Running: ${activeProc?.title ?? "Process"}`, t: Date.now() }
    ]);

    // Traverse nodes and simulate “agent thinking”
    let topFM = null;

    for (const node of sequence) {
      if (cancelRef.current.cancel) break;

      // highlight node
      onHighlightNode?.(node.id);
      await sleep(140);

      // log conclusion
      const conclusion = makeConclusion(node);
      setLogs((prev) => [
        ...prev,
        {
          type: "step",
          text: `${node.kind} • ${node.id}: ${conclusion}`,
          t: Date.now()
        }
      ]);

      // track top risk FM for final conclusion
      if (node.kind === "Failure Mode") {
        const rpn = node?.meta?.rpn ?? 0;
        if (!topFM || rpn > (topFM?.meta?.rpn ?? 0)) topFM = node;
      }

      await sleep(160);
    }

    onClearHighlight?.();

    if (!cancelRef.current.cancel) {
      // final conclusion
      const final = topFM
        ? `Final conclusion: Highest risk is ${topFM.id} (RPN ${topFM.meta?.rpn}). Prioritize controls on its causes/effects first.`
        : "Final conclusion: No failure modes detected.";

      setLogs((prev) => [
        ...prev,
        { type: "final", text: final, t: Date.now() }
      ]);
    }

    setRunning(false);
  };

  return (
    <div className="rounded-xl border border-zinc-200/70 bg-[#f5f5f3] shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-200/70 bg-[#f5f5f3] flex items-center justify-between">
        <div>
          <div className="text-[11px] font-medium text-zinc-500 tracking-tight">
            Processes & Methods
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5 leading-snug">
            Visual simulation of how the AI agent analyzes DFMEA changes
          </div>
        </div>

        <div className="flex items-center gap-2">
          {running ? (
            <button
              type="button"
              onClick={stop}
              className={cx(
                "h-9 px-2 rounded-md border border-zinc-200/80 bg-white",
                "text-[12px] text-zinc-700 inline-flex items-center gap-1.5",
                "hover:bg-zinc-100 transition-colors"
              )}
              title="Stop"
            >
              <StopCircle size={16} strokeWidth={1.7} className="text-zinc-600" />
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={play}
              className={cx(
                "h-9 px-2 rounded-md border border-zinc-200/80 bg-white",
                "text-[12px] text-zinc-700 inline-flex items-center gap-1.5",
                "hover:bg-zinc-100 transition-colors"
              )}
              title="Play process"
            >
              <Play size={16} strokeWidth={1.7} className="text-zinc-600" />
              Play
            </button>
          )}
        </div>
      </div>

      {/* Scroll only panel */}
      <div
        className="p-4 overflow-y-auto"
        style={{
          height: "calc(100vh - 260px)",
          minHeight: 520,
          maxHeight: 780
        }}
      >
        <div className="mb-3">
          <div className="text-[11px] font-medium text-zinc-500 tracking-tight">Workflow</div>

          <select
            value={procId}
            onChange={(e) => setProcId(e.target.value)}
            className="mt-2 w-full rounded-md border border-zinc-200/80 bg-white px-3 py-2 text-[13px] tracking-tight outline-none focus:ring-2 focus:ring-zinc-900/10"
            disabled={running}
          >
            {processes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border border-zinc-200/80 bg-white px-3 py-3">
          <div className="text-[12px] font-semibold tracking-tight text-zinc-900">Steps</div>

          <div className="mt-2 space-y-1.5">
            {(activeProc?.steps ?? []).map((s, idx) => (
              <div key={`${activeProc?.id}-step-${idx}`} className="flex items-start gap-2">
                <div className="mt-[3px] h-4 w-4 rounded-md border border-zinc-200/70 bg-zinc-50 text-[10px] grid place-items-center text-zinc-600">
                  {idx + 1}
                </div>
                <div className="text-[12px] text-zinc-700 leading-snug">{s}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <DiagramMini proc={activeProc} />
        </div>

        {/* results */}
        <div className="mt-3 rounded-xl border border-zinc-200/80 bg-white overflow-hidden">
          <div className="px-3 py-2 border-b border-zinc-200/70 flex items-center justify-between">
            <div className="text-[12px] font-semibold tracking-tight text-zinc-900">
              Run results
            </div>
            <div className="text-[11px] text-zinc-500">{logs.length} events</div>
          </div>

          <div
            id="proc-log-box"
            className="px-3 py-2 max-h-[260px] overflow-y-auto"
          >
            {logs.length ? (
              <div className="space-y-1.5">
                {logs.map((l, i) => (
                  <div
                    key={i}
                    className={cx(
                      "text-[12px] leading-snug",
                      l.type === "final"
                        ? "text-zinc-900 font-semibold"
                        : l.type === "system"
                        ? "text-zinc-600"
                        : "text-zinc-700"
                    )}
                  >
                    {l.text}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[12px] text-zinc-500 py-2">
                Click <span className="font-medium">Play</span> to simulate the workflow.
              </div>
            )}
          </div>
        </div>

        <div className="h-16" />
      </div>
    </div>
  );
}
