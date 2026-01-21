"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

import rcaData from "../data/rootCauseAnalysis.json";
import processesData from "../data/processes.json";

import NodeDetailsModal from "./NodeDetailsModal";
import ProcessesAndMethodsPanel from "./ProcessesAndMethodsPanel";

const cx = (...c) => c.filter(Boolean).join(" ");

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function estimateNodeWidth(title) {
  // Minimal heuristic: wide enough for text, but not huge.
  // 6.2px/char approx for this font size.
  const base = 170;
  const w = base + Math.min(220, Math.max(0, (title?.length ?? 0) - 18) * 6.2);
  return clamp(Math.round(w), 170, 360);
}

function buildGraph(raw) {
  const requirements = raw?.requirements ?? [];
  const functions = raw?.functions ?? [];
  const failureModes = raw?.failureModes ?? [];
  const causes = raw?.causes ?? [];
  const effects = raw?.effects ?? [];
  const controls = raw?.controls ?? [];

  const funByReq = new Map();
  for (const f of functions) {
    if (!funByReq.has(f.requirementId)) funByReq.set(f.requirementId, []);
    funByReq.get(f.requirementId).push(f);
  }

  const fmByFun = new Map();
  for (const fm of failureModes) {
    if (!fmByFun.has(fm.functionId)) fmByFun.set(fm.functionId, []);
    fmByFun.get(fm.functionId).push(fm);
  }

  const causesByFM = new Map();
  for (const c of causes) {
    if (!causesByFM.has(c.failureModeId)) causesByFM.set(c.failureModeId, []);
    causesByFM.get(c.failureModeId).push(c);
  }

  const effectsByFM = new Map();
  for (const e of effects) {
    if (!effectsByFM.has(e.failureModeId)) effectsByFM.set(e.failureModeId, []);
    effectsByFM.get(e.failureModeId).push(e);
  }

  const controlsByParent = new Map();
  for (const ctrl of controls) {
    const key = `${ctrl.parentType}:${ctrl.parentId}`;
    if (!controlsByParent.has(key)) controlsByParent.set(key, []);
    controlsByParent.get(key).push(ctrl);
  }

  const nodes = [];
  const edges = [];

  const addNode = (id, kind, title, meta = {}) => {
    const existing = nodes.find((n) => n.id === id);
    if (existing) return existing;

    const n = {
      id,
      kind,
      title,
      meta,
      // sim state:
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      fx: null,
      fy: null
    };
    nodes.push(n);
    return n;
  };

  for (const req of requirements) {
    addNode(req.id, "Requirement", req.title, { priority: req.priority });

    const funs = funByReq.get(req.id) ?? [];
    for (const fun of funs) {
      addNode(fun.id, "Function", fun.title);
      edges.push({ id: `${req.id}->${fun.id}`, from: req.id, to: fun.id });

      const fms = fmByFun.get(fun.id) ?? [];
      for (const fm of fms) {
        addNode(fm.id, "Failure Mode", fm.title, { rpn: fm.rpn });
        edges.push({ id: `${fun.id}->${fm.id}`, from: fun.id, to: fm.id });

        const cs = causesByFM.get(fm.id) ?? [];
        for (const c of cs) {
          addNode(c.id, "Cause", c.title, {
            occurrence: c.occurrence,
            detection: c.detection
          });
          edges.push({ id: `${fm.id}->${c.id}`, from: fm.id, to: c.id });

          const ctrl = controlsByParent.get(`cause:${c.id}`) ?? [];
          for (const cc of ctrl) {
            addNode(cc.id, "Control", cc.title, { controlType: cc.controlType });
            edges.push({ id: `${c.id}->${cc.id}`, from: c.id, to: cc.id });
          }
        }

        const es = effectsByFM.get(fm.id) ?? [];
        for (const e of es) {
          addNode(e.id, "Effect", e.title, { severity: e.severity });
          edges.push({ id: `${fm.id}->${e.id}`, from: fm.id, to: e.id });

          const ctrl = controlsByParent.get(`effect:${e.id}`) ?? [];
          for (const cc of ctrl) {
            addNode(cc.id, "Control", cc.title, { controlType: cc.controlType });
            edges.push({ id: `${e.id}->${cc.id}`, from: e.id, to: cc.id });
          }
        }
      }
    }
  }

  return { nodes, edges };
}

export default function RootCauseViewport() {
  const { nodes: initialNodes, edges } = useMemo(() => buildGraph(rcaData), []);

  // Graph state (positions initialized per lane)
  const [nodes, setNodes] = useState(() => {
    const laneX = {
      Requirement: 140,
      Function: 420,
      "Failure Mode": 700,
      Cause: 980,
      Effect: 980,
      Control: 1280
    };

    const perTypeCount = new Map();
    return initialNodes.map((n) => {
      const c = (perTypeCount.get(n.kind) ?? 0) + 1;
      perTypeCount.set(n.kind, c);
      const y = 120 + c * 110 + (n.kind === "Effect" ? 50 : 0);
      return { ...n, x: laneX[n.kind] ?? 260, y, vx: 0, vy: 0 };
    });
  });

  // Pan/zoom (graph only)
  const [view, setView] = useState({ x: 40, y: 20, k: 0.9 });

  // search
  const [query, setQuery] = useState("");

  // modal
  const [selectedNode, setSelectedNode] = useState(null);

  // workflow highlighting (red flash)
  const [highlightNodeId, setHighlightNodeId] = useState(null);

  const wrapRef = useRef(null);
  const simRef = useRef({ running: true });
  const dragRef = useRef({
    mode: null, // "node" | "pan"
    nodeId: null,
    offsetX: 0,
    offsetY: 0,
    startPanX: 0,
    startPanY: 0,
    startX: 0,
    startY: 0
  });

  // Build lookup for render
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  // filtered ids by search
  const filteredIds = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return new Set();
    const ids = new Set();
    for (const n of nodes) {
      const hay = `${n.id} ${n.kind} ${n.title} ${JSON.stringify(n.meta ?? {})}`.toLowerCase();
      if (hay.includes(q)) ids.add(n.id);
    }
    return ids;
  }, [nodes, query]);

  // force simulation loop
  useEffect(() => {
    simRef.current.running = true;

    const REPULSE = 2100;
    const LINK_DIST = 170;
    const LINK_STRENGTH = 0.012;
    const DAMPING = 0.86;

    const raf = { id: 0 };

    const tick = () => {
      if (!simRef.current.running) return;

      setNodes((prev) => {
        const next = prev.map((n) => ({ ...n }));

        // repulsion
        for (let i = 0; i < next.length; i++) {
          for (let j = i + 1; j < next.length; j++) {
            const a = next[i];
            const b = next[j];
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const dist2 = dx * dx + dy * dy + 0.01;
            const f = REPULSE / dist2;
            const inv = 1 / Math.sqrt(dist2);
            const fx = dx * inv * f;
            const fy = dy * inv * f;

            if (a.fx == null) {
              a.vx += fx;
              a.vy += fy;
            }
            if (b.fx == null) {
              b.vx -= fx;
              b.vy -= fy;
            }
          }
        }

        // springs
        for (const e of edges) {
          const a = next.find((x) => x.id === e.from);
          const b = next.find((x) => x.id === e.to);
          if (!a || !b) continue;

          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.max(10, Math.sqrt(dx * dx + dy * dy));
          const diff = dist - LINK_DIST;

          const fx = (dx / dist) * diff * LINK_STRENGTH;
          const fy = (dy / dist) * diff * LINK_STRENGTH;

          if (a.fx == null) {
            a.vx += fx;
            a.vy += fy;
          }
          if (b.fx == null) {
            b.vx -= fx;
            b.vy -= fy;
          }
        }

        // lane gravity (keeps chain readable)
        const laneX = {
          Requirement: 140,
          Function: 420,
          "Failure Mode": 700,
          Cause: 980,
          Effect: 980,
          Control: 1280
        };
        for (const n of next) {
          const targetX = laneX[n.kind] ?? 280;
          const gx = (targetX - n.x) * 0.003;
          if (n.fx == null) n.vx += gx;
        }

        // integrate
        for (const n of next) {
          if (n.fx != null && n.fy != null) {
            n.x = n.fx;
            n.y = n.fy;
            n.vx = 0;
            n.vy = 0;
            continue;
          }
          n.vx *= DAMPING;
          n.vy *= DAMPING;
          n.x += n.vx;
          n.y += n.vy;
        }

        return next;
      });

      raf.id = requestAnimationFrame(tick);
    };

    raf.id = requestAnimationFrame(tick);

    return () => {
      simRef.current.running = false;
      cancelAnimationFrame(raf.id);
    };
  }, [edges]);

  // --- wheel zoom (IMPORTANT: disable page scrolling while zooming) ---
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const onWheel = (e) => {
      // kill scroll always while pointer is over viewport
      e.preventDefault();
      e.stopPropagation();

      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const delta = e.deltaY > 0 ? -0.06 : 0.06;

      setView((v) => {
        const nk = clamp(v.k + delta, 0.35, 1.65);

        // zoom to cursor
        const wx = (mouseX - v.x) / v.k;
        const wy = (mouseY - v.y) / v.k;

        const nx = mouseX - wx * nk;
        const ny = mouseY - wy * nk;

        return { x: nx, y: ny, k: nk };
      });
    };

    // Non-passive listener so preventDefault works
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const screenToWorld = (sx, sy) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = (sx - rect.left - view.x) / view.k;
    const y = (sy - rect.top - view.y) / view.k;
    return { x, y };
  };

  const onBackgroundPointerDown = (e) => {
    dragRef.current.mode = "pan";
    dragRef.current.nodeId = null;
    dragRef.current.startPanX = view.x;
    dragRef.current.startPanY = view.y;
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;

    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d.mode) return;

    if (d.mode === "pan") {
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      setView((v) => ({ ...v, x: d.startPanX + dx, y: d.startPanY + dy }));
      return;
    }

    if (d.mode === "node" && d.nodeId) {
      const w = screenToWorld(e.clientX, e.clientY);

      setNodes((prev) =>
        prev.map((n) => {
          if (n.id !== d.nodeId) return n;
          return { ...n, fx: w.x - d.offsetX, fy: w.y - d.offsetY };
        })
      );
    }
  };

  const onPointerUp = () => {
    const d = dragRef.current;
    if (!d.mode) return;

    if (d.mode === "node" && d.nodeId) {
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id !== d.nodeId) return n;
          return { ...n, fx: null, fy: null };
        })
      );
    }

    dragRef.current.mode = null;
    dragRef.current.nodeId = null;
  };

  const onNodePointerDown = (e, node) => {
    e.preventDefault();
    e.stopPropagation();

    const w = screenToWorld(e.clientX, e.clientY);

    dragRef.current.mode = "node";
    dragRef.current.nodeId = node.id;
    dragRef.current.offsetX = w.x - node.x;
    dragRef.current.offsetY = w.y - node.y;

    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== node.id) return n;
        return { ...n, fx: node.x, fy: node.y, vx: 0, vy: 0 };
      })
    );

    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onNodeClick = (e, node) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedNode(node);
  };

  const resetView = () => setView({ x: 40, y: 20, k: 0.9 });
  const zoomBy = (delta) => setView((v) => ({ ...v, k: clamp(v.k + delta, 0.35, 1.65) }));

  const nodeStroke = (n) => {
    if (highlightNodeId === n.id) return "rgba(220,38,38,0.95)"; // red highlight
    if (filteredIds.size && filteredIds.has(n.id)) return "rgba(24,24,27,0.60)";
    return "rgba(24,24,27,0.18)";
  };

  const nodeFill = (n) => {
    if (highlightNodeId === n.id) return "rgba(254,226,226,0.95)"; // light red
    return "white";
  };

  return (
    <div className="px-6 pt-6 pb-44">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold tracking-tight text-zinc-900">
            Root Cause Analysis
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            Drag nodes • Drag background to pan • Wheel to zoom
          </div>
        </div>

        {/* toolbar */}
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-white border border-zinc-200/80 px-2.5 py-2 flex items-center gap-2">
            <Search size={16} strokeWidth={1.7} className="text-zinc-600" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-[220px] text-[13px] tracking-tight outline-none placeholder:text-zinc-400 bg-transparent"
              placeholder="Search nodes"
            />
          </div>

          <button
            type="button"
            onClick={() => zoomBy(0.1)}
            className={cx(
              "h-9 px-2 rounded-md border border-zinc-200/80 bg-white",
              "text-[12px] text-zinc-700 inline-flex items-center gap-1.5",
              "hover:bg-zinc-100 transition-colors"
            )}
            title="Zoom in"
          >
            <ZoomIn size={16} strokeWidth={1.7} className="text-zinc-600" />
          </button>

          <button
            type="button"
            onClick={() => zoomBy(-0.1)}
            className={cx(
              "h-9 px-2 rounded-md border border-zinc-200/80 bg-white",
              "text-[12px] text-zinc-700 inline-flex items-center gap-1.5",
              "hover:bg-zinc-100 transition-colors"
            )}
            title="Zoom out"
          >
            <ZoomOut size={16} strokeWidth={1.7} className="text-zinc-600" />
          </button>

          <button
            type="button"
            onClick={resetView}
            className={cx(
              "h-9 px-2 rounded-md border border-zinc-200/80 bg-white",
              "text-[12px] text-zinc-700 inline-flex items-center gap-1.5",
              "hover:bg-zinc-100 transition-colors"
            )}
            title="Reset view"
          >
            <RotateCcw size={16} strokeWidth={1.7} className="text-zinc-600" />
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-12 gap-5">
        {/* GRAPH */}
        <div className="col-span-8">
          <div className="rounded-xl border border-zinc-200/70 bg-[#f5f5f3] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-200/70 bg-[#f5f5f3] flex items-center justify-between">
              <div className="text-[11px] font-medium text-zinc-500 tracking-tight">Graph</div>
              <div className="text-[11px] text-zinc-500">
                {nodes.length} nodes • {edges.length} links
              </div>
            </div>

            {/* graph area: pan+zoom only, no scroll */}
            <div
              ref={wrapRef}
              className="relative w-full"
              style={{
                height: "calc(100vh - 260px)",
                minHeight: 520,
                maxHeight: 780,
                overflow: "hidden",
                touchAction: "none"
              }}
              onPointerDown={onBackgroundPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {/* subtle paper grid */}
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(24,24,27,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(24,24,27,0.05) 1px, transparent 1px)",
                  backgroundSize: "40px 40px"
                }}
              />

              <svg className="absolute inset-0 w-full h-full">
                <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
                  {/* edges */}
                  {edges.map((e) => {
                    const a = byId.get(e.from);
                    const b = byId.get(e.to);
                    if (!a || !b) return null;

                    const highlighted =
                      highlightNodeId === a.id ||
                      highlightNodeId === b.id ||
                      (filteredIds.size && (filteredIds.has(a.id) || filteredIds.has(b.id)));

                    return (
                      <line
                        key={e.id}
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke={highlighted ? "rgba(24,24,27,0.35)" : "rgba(24,24,27,0.20)"}
                        strokeWidth={highlighted ? 2.2 : 1.6}
                      />
                    );
                  })}

                  {/* nodes */}
                  {nodes.map((n) => {
                    const height = 86;
                    const width = estimateNodeWidth(n.title);
                    const x = n.x - width / 2;
                    const y = n.y - height / 2;

                    const metaTopRight =
                      n.kind === "Failure Mode" && typeof n?.meta?.rpn === "number"
                        ? `RPN ${n.meta.rpn}`
                        : n.kind === "Requirement" && n?.meta?.priority
                        ? n.meta.priority
                        : n.kind === "Effect" && typeof n?.meta?.severity === "number"
                        ? `S ${n.meta.severity}`
                        : n.kind === "Cause" &&
                          typeof n?.meta?.occurrence === "number" &&
                          typeof n?.meta?.detection === "number"
                        ? `O ${n.meta.occurrence} • D ${n.meta.detection}`
                        : n.kind === "Control" && n?.meta?.controlType
                        ? n.meta.controlType
                        : "";

                    return (
                      <g
                        key={n.id}
                        transform={`translate(${x}, ${y})`}
                        style={{ cursor: "grab" }}
                        onPointerDown={(e) => onNodePointerDown(e, n)}
                        onDoubleClick={(e) => onNodeClick(e, n)}
                        onClick={(e) => {
                          // click opens modal (single click)
                          onNodeClick(e, n);
                        }}
                      >
                        <rect
                          width={width}
                          height={height}
                          rx="12"
                          ry="12"
                          fill={nodeFill(n)}
                          stroke={nodeStroke(n)}
                          strokeWidth={highlightNodeId === n.id ? 2.6 : 1.5}
                        />

                        {/* kind */}
                        <text x="12" y="20" fontSize="10" fill="rgba(24,24,27,0.55)">
                          {n.kind}
                        </text>

                        {/* meta badge */}
                        {metaTopRight ? (
                          <g>
                            <rect
                              x={width - 12 - 96}
                              y={8}
                              width={96}
                              height={16}
                              rx="8"
                              ry="8"
                              fill="rgba(244,244,245,0.98)"
                              stroke="rgba(24,24,27,0.14)"
                            />
                            <text
                              x={width - 12 - 48}
                              y={20}
                              fontSize="9.5"
                              fill="rgba(24,24,27,0.6)"
                              textAnchor="middle"
                            >
                              {metaTopRight}
                            </text>
                          </g>
                        ) : null}

                        {/* title */}
                        <text x="12" y="44" fontSize="11.5" fill="rgba(24,24,27,0.90)">
                          {(n.title ?? "").length > 48 ? (n.title ?? "").slice(0, 48) + "…" : n.title}
                        </text>

                        {/* id */}
                        <text x="12" y="66" fontSize="10" fill="rgba(24,24,27,0.45)">
                          {n.id}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>

              <div className="absolute left-4 bottom-4 rounded-md border border-zinc-200/80 bg-white px-2.5 py-1.5 text-[11px] text-zinc-600 shadow-sm">
                Zoom is locked to viewport (no page scroll)
              </div>
            </div>
          </div>
        </div>

        {/* PROCESSES */}
        <div className="col-span-4">
          <ProcessesAndMethodsPanel
            processes={processesData}
            nodes={nodes}
            onHighlightNode={(id) => setHighlightNodeId(id)}
            onClearHighlight={() => setHighlightNodeId(null)}
          />
        </div>
      </div>

      <NodeDetailsModal
        open={!!selectedNode}
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
      />
    </div>
  );
}
