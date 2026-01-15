// components/Workflows.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, List, Workflow as WorkflowIcon, Save, ZoomIn, ZoomOut } from "lucide-react";

const cx = (...c) => c.filter(Boolean).join(" ");

function snapToGrid(value, grid) {
  return Math.round(value / grid) * grid;
}

function nodeRect(n) {
  return {
    left: n.x,
    right: n.x + n.w,
    top: n.y,
    bottom: n.y + n.h,
    cx: n.x + n.w / 2,
    cy: n.y + n.h / 2
  };
}

function choosePortSide(from, to) {
  const a = nodeRect(from);
  const b = nodeRect(to);

  const dx = b.cx - a.cx;
  const dy = b.cy - a.cy;

  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "right" : "left";
  return dy >= 0 ? "bottom" : "top";
}

function portPoint(node, side) {
  const r = nodeRect(node);
  if (side === "left") return { x: r.left, y: r.cy };
  if (side === "right") return { x: r.right, y: r.cy };
  if (side === "top") return { x: r.cx, y: r.top };
  return { x: r.cx, y: r.bottom };
}

function oppositeSide(side) {
  if (side === "left") return "right";
  if (side === "right") return "left";
  if (side === "top") return "bottom";
  return "top";
}

function edgeBezier(fromPt, toPt, fromSide, toSide) {
  const dx = toPt.x - fromPt.x;
  const dy = toPt.y - fromPt.y;
  const strength = Math.max(90, Math.min(280, Math.sqrt(dx * dx + dy * dy) * 0.35));

  const c1 =
    fromSide === "left"
      ? { x: fromPt.x - strength, y: fromPt.y }
      : fromSide === "right"
      ? { x: fromPt.x + strength, y: fromPt.y }
      : fromSide === "top"
      ? { x: fromPt.x, y: fromPt.y - strength }
      : { x: fromPt.x, y: fromPt.y + strength };

  const c2 =
    toSide === "left"
      ? { x: toPt.x - strength, y: toPt.y }
      : toSide === "right"
      ? { x: toPt.x + strength, y: toPt.y }
      : toSide === "top"
      ? { x: toPt.x, y: toPt.y - strength }
      : { x: toPt.x, y: toPt.y + strength };

  const d = `M ${fromPt.x} ${fromPt.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${toPt.x} ${toPt.y}`;
  return { d, c1, c2 };
}

function cubicAt(P0, P1, P2, P3, t) {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;

  const x =
    P0.x * mt2 * mt +
    3 * P1.x * mt2 * t +
    3 * P2.x * mt * t2 +
    P3.x * t2 * t;

  const y =
    P0.y * mt2 * mt +
    3 * P1.y * mt2 * t +
    3 * P2.y * mt * t2 +
    P3.y * t2 * t;

  return { x, y };
}

export default function Workflows({ data, selectedWorkflowId, onSelectWorkflowId }) {
  const workflows = data?.content?.workflows ?? [];

  const fallbackId = workflows?.[0]?.id ?? "";
  const effectiveSelectedId = selectedWorkflowId || fallbackId;

  const activeWorkflow = useMemo(
    () => workflows.find((w) => w.id === effectiveSelectedId) ?? workflows?.[0],
    [workflows, effectiveSelectedId]
  );

  const grid = activeWorkflow?.diagram?.grid ?? 20;

  const [viewMode, setViewMode] = useState("diagram"); // diagram | text
  const [nodes, setNodes] = useState(activeWorkflow?.diagram?.nodes ?? []);
  const [edges, setEdges] = useState(activeWorkflow?.diagram?.edges ?? []);
  const [zoom, setZoom] = useState(activeWorkflow?.diagram?.zoom ?? 1);

  // ✅ infinite camera (screen space translate, then scale)
  const [pan, setPan] = useState({ x: 80, y: 60 });

  const [selectedNodeId, setSelectedNodeId] = useState(null);

  const [dragNode, setDragNode] = useState(null);
  const [dragPan, setDragPan] = useState(null);

  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  const initialRef = useRef({
    nodes: JSON.stringify(activeWorkflow?.diagram?.nodes ?? []),
    zoom: activeWorkflow?.diagram?.zoom ?? 1,
    pan: JSON.stringify({ x: 80, y: 60 })
  });

  const wrapRef = useRef(null);

  // ✅ Sync when workflow changes
  useEffect(() => {
    setNodes(activeWorkflow?.diagram?.nodes ?? []);
    setEdges(activeWorkflow?.diagram?.edges ?? []);
    setZoom(activeWorkflow?.diagram?.zoom ?? 1);
    setPan({ x: 80, y: 60 }); // start centered-ish
    setViewMode("diagram");
    setSelectedNodeId(null);
    setSavedToast(false);

    initialRef.current = {
      nodes: JSON.stringify(activeWorkflow?.diagram?.nodes ?? []),
      zoom: activeWorkflow?.diagram?.zoom ?? 1,
      pan: JSON.stringify({ x: 80, y: 60 })
    };
  }, [activeWorkflow?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = useMemo(() => {
    return (
      JSON.stringify(nodes) !== initialRef.current.nodes ||
      zoom !== initialRef.current.zoom ||
      JSON.stringify(pan) !== initialRef.current.pan
    );
  }, [nodes, zoom, pan]);

  function clampZoom(z) {
    return Math.max(0.4, Math.min(2.75, z));
  }

  function addNode() {
    const id = `step-${Math.random().toString(16).slice(2, 7)}`;

    // Spawn near current view center
    const baseX = snapToGrid((120 - pan.x) / zoom, grid);
    const baseY = snapToGrid((120 - pan.y) / zoom, grid);

    setNodes((prev) => [
      ...prev,
      {
        id,
        x: baseX,
        y: baseY,
        w: 260,
        h: 80,
        title: "New step",
        detail: "Describe what happens here"
      }
    ]);

    setSelectedNodeId(id);
  }

  function onNodePointerDown(e, nodeId) {
    e.preventDefault();
    e.stopPropagation();

    const n = nodes.find((x) => x.id === nodeId);
    if (!n) return;

    setSelectedNodeId(nodeId);
    setDragNode({
      id: nodeId,
      startX: e.clientX,
      startY: e.clientY,
      originX: n.x,
      originY: n.y
    });
  }

  function onCanvasPointerDown(e) {
    // start panning when clicking empty space
    if (e.button !== 0) return; // left only
    setDragPan({
      startX: e.clientX,
      startY: e.clientY,
      originX: pan.x,
      originY: pan.y
    });
    setSelectedNodeId(null);
  }

  function onPointerMove(e) {
    // node drag
    if (dragNode) {
      const dx = (e.clientX - dragNode.startX) / zoom;
      const dy = (e.clientY - dragNode.startY) / zoom;

      setNodes((prev) =>
        prev.map((n) => {
          if (n.id !== dragNode.id) return n;
          return {
            ...n,
            x: snapToGrid(dragNode.originX + dx, grid),
            y: snapToGrid(dragNode.originY + dy, grid)
          };
        })
      );
      return;
    }

    // pan drag
    if (dragPan) {
      const dx = e.clientX - dragPan.startX;
      const dy = e.clientY - dragPan.startY;
      setPan({ x: dragPan.originX + dx, y: dragPan.originY + dy });
    }
  }

  function onPointerUp() {
    setDragNode(null);
    setDragPan(null);
  }

  function zoomIn() {
    setZoom((z) => clampZoom(Number((z + 0.1).toFixed(2))));
  }

  function zoomOut() {
    setZoom((z) => clampZoom(Number((z - 0.1).toFixed(2))));
  }

  function onWheel(e) {
    // ✅ Always wheel zoom (no ctrl required)
    e.preventDefault();

    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;

    const cursor = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    // world point under cursor before zoom
    const world = {
      x: (cursor.x - pan.x) / zoom,
      y: (cursor.y - pan.y) / zoom
    };

    const delta = e.deltaY;
    const nextZoom = clampZoom(delta > 0 ? zoom * 0.94 : zoom * 1.06);

    // keep the same world point under cursor
    const nextPan = {
      x: cursor.x - world.x * nextZoom,
      y: cursor.y - world.y * nextZoom
    };

    setZoom(Number(nextZoom.toFixed(3)));
    setPan(nextPan);
  }

  async function saveLayout() {
    if (!dirty || saving) return;
    setSaving(true);
    setSavedToast(false);

    try {
      const res = await fetch("/api/workflows/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: activeWorkflow.id,
          nodes,
          zoom,
          pan
        })
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Save failed");

      initialRef.current = {
        nodes: JSON.stringify(nodes),
        zoom,
        pan: JSON.stringify(pan)
      };

      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 1400);
    } catch (err) {
      console.error(err);
      alert(`Save failed: ${err?.message || "unknown error"}`);
    } finally {
      setSaving(false);
    }
  }

  const Diagram = () => {
    // ✅ maximize height (remove extra stacked UI)
    const diagramHeight = "calc(100vh - 132px)"; // topnav + workspace header + 1-row workflow header

    return (
      <div
        ref={wrapRef}
        className="relative rounded-2xl border border-zinc-200/80 bg-[#fbfbfa] overflow-hidden"
        style={{
          height: diagramHeight,
          // ✅ infinite grid that follows pan+zoom
          backgroundImage: `
            linear-gradient(to right, rgba(24,24,27,0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(24,24,27,0.06) 1px, transparent 1px)
          `,
          backgroundSize: `${grid * zoom}px ${grid * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`
        }}
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={onWheel}
      >
        {/* ✅ Transformed world */}
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0"
          }}
        >
          {/* edges layer */}
          <svg className="absolute inset-0 w-full h-full overflow-visible">
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(24,24,27,0.55)" />
              </marker>
            </defs>

            {edges.map((e) => {
              const fromNode = nodes.find((n) => n.id === e.from);
              const toNode = nodes.find((n) => n.id === e.to);
              if (!fromNode || !toNode) return null;

              const fromSide = choosePortSide(fromNode, toNode);
              const toSide = oppositeSide(fromSide);

              const p0 = portPoint(fromNode, fromSide);
              const p3 = portPoint(toNode, toSide);

              const { d, c1, c2 } = edgeBezier(p0, p3, fromSide, toSide);
              const mid = cubicAt(p0, c1, c2, p3, 0.5);

              return (
                <g key={e.id}>
                  <path
                    d={d}
                    fill="none"
                    stroke="rgba(24,24,27,0.45)"
                    strokeWidth="2"
                    markerEnd="url(#arrow)"
                  />

                  {/* port anchors */}
                  <circle
                    cx={p0.x}
                    cy={p0.y}
                    r="5.5"
                    fill="white"
                    stroke="rgba(24,24,27,0.45)"
                    strokeWidth="2"
                  />
                  <circle
                    cx={p3.x}
                    cy={p3.y}
                    r="5.5"
                    fill="white"
                    stroke="rgba(24,24,27,0.45)"
                    strokeWidth="2"
                  />

                  {/* ✅ label always upright */}
                  <g transform={`translate(${mid.x}, ${mid.y})`}>
                    <rect
                      x="-62"
                      y="-12"
                      width="124"
                      height="24"
                      rx="12"
                      fill="rgba(251,251,250,0.95)"
                      stroke="rgba(24,24,27,0.14)"
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fontSize="11"
                      fill="rgba(24,24,27,0.72)"
                      style={{ userSelect: "none" }}
                    >
                      {e.label}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {/* nodes layer */}
          {nodes.map((n) => {
            const isSelected = selectedNodeId === n.id;
            const isStart = n.type === "start";
            const isEnd = n.type === "end";

            return (
              <div
                key={n.id}
                onPointerDown={(e) => onNodePointerDown(e, n.id)}
                className={cx(
                  "absolute select-none cursor-grab active:cursor-grabbing",
                  "rounded-2xl border bg-white",
                  "shadow-[0_1px_0_rgba(0,0,0,0.05),0_10px_24px_rgba(0,0,0,0.06)]",
                  isSelected
                    ? "border-zinc-900 ring-2 ring-zinc-900/10"
                    : "border-zinc-200/80",
                  isStart && "ring-1 ring-emerald-500/25",
                  isEnd && "ring-1 ring-zinc-900/20"
                )}
                style={{
                  left: n.x,
                  top: n.y,
                  width: n.w,
                  height: n.h
                }}
              >
                {/* Start/End markers */}
                {(isStart || isEnd) && (
                  <div className="absolute right-2 top-2">
                    <span
                      className={cx(
                        "text-[10px] px-2 py-0.5 rounded-full border tracking-tight",
                        isStart
                          ? "bg-emerald-50 border-emerald-200/70 text-emerald-900"
                          : "bg-[#fbfbfa] border-zinc-200/80 text-zinc-800"
                      )}
                    >
                      {isStart ? "Start" : "End"}
                    </span>
                  </div>
                )}

                <div className="px-4 py-3">
                  <div className="text-[13px] font-semibold tracking-tight text-zinc-900">
                    {n.title}
                  </div>
                  <div className="mt-1 text-[11px] text-zinc-600 tracking-tight line-clamp-2">
                    {n.detail}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* zoom controls */}
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <div className="text-[11px] px-2 py-1 rounded-full bg-white border border-zinc-200/80 text-zinc-700">
            {Math.round(zoom * 100)}%
          </div>

          <button
            onClick={zoomOut}
            className="h-9 w-9 rounded-xl bg-white border border-zinc-200/80 grid place-items-center hover:bg-zinc-100 transition-colors"
            title="Zoom out"
          >
            <ZoomOut size={16} strokeWidth={1.8} className="text-zinc-700" />
          </button>

          <button
            onClick={zoomIn}
            className="h-9 w-9 rounded-xl bg-white border border-zinc-200/80 grid place-items-center hover:bg-zinc-100 transition-colors"
            title="Zoom in"
          >
            <ZoomIn size={16} strokeWidth={1.8} className="text-zinc-700" />
          </button>
        </div>
      </div>
    );
  };

  const TextView = () => (
    <div className="rounded-2xl border border-zinc-200/80 bg-white shadow-[0_1px_0_rgba(0,0,0,0.05),0_14px_40px_rgba(0,0,0,0.06)] p-6">
      <div className="text-[13px] font-semibold tracking-tight text-zinc-900">
        {activeWorkflow?.title}
      </div>
      <div className="mt-1 text-[12px] text-zinc-600 tracking-tight">
        {activeWorkflow?.summary}
      </div>

      <div className="mt-5">
        <div className="text-[11px] font-medium text-zinc-500 tracking-tight">
          Steps
        </div>

        <div className="mt-3 space-y-2">
          {(activeWorkflow?.textSteps ?? []).map((s, idx) => (
            <div key={idx} className="flex gap-3 text-[13px] tracking-tight text-zinc-800">
              <div className="text-zinc-400 w-5 text-right">{idx + 1}</div>
              <div>{s}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="px-6 pt-4 pb-8 w-full">
      {/* ✅ ONE-LINE TOP BAR */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-[18px] font-semibold tracking-tight text-zinc-900">
            Workflows
          </div>

          <select
            value={activeWorkflow?.id || ""}
            onChange={(e) => onSelectWorkflowId?.(e.target.value)}
            className="text-[13px] px-3 py-2 rounded-xl bg-white border border-zinc-200/80 outline-none min-w-[320px]"
          >
            {workflows.map((w) => (
              <option key={w.id} value={w.id}>
                {w.title}
              </option>
            ))}
          </select>

          <span className="hidden xl:inline text-[11px] px-2 py-1 rounded-full bg-[#fbfbfa] border border-zinc-200/80 text-zinc-700">
            {activeWorkflow?.owner === "team" ? "User-made" : "My workflow"}
          </span>

          {savedToast ? (
            <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-900">
              Saved ✓
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={addNode}
            className="text-[12px] px-3 py-2 rounded-xl bg-white border border-zinc-200/80 hover:bg-zinc-100 transition-colors inline-flex items-center gap-2"
          >
            <Plus size={16} strokeWidth={1.8} className="text-zinc-700" />
            Add step
          </button>

          <button
            onClick={saveLayout}
            disabled={!dirty || saving}
            className={cx(
              "text-[12px] px-3 py-2 rounded-xl inline-flex items-center gap-2 transition-colors",
              dirty && !saving
                ? "bg-zinc-900 text-white hover:bg-zinc-800"
                : "bg-zinc-200 text-zinc-500 cursor-not-allowed"
            )}
            title={dirty ? "Save layout + zoom" : "No changes to save"}
          >
            <Save size={16} strokeWidth={1.8} />
            {saving ? "Saving..." : "Save"}
          </button>

          <button
            onClick={() => setViewMode("diagram")}
            className={cx(
              "text-[12px] px-3 py-2 rounded-xl border transition-colors inline-flex items-center gap-2",
              viewMode === "diagram"
                ? "bg-zinc-900 text-white border-zinc-900"
                : "bg-white text-zinc-700 border-zinc-200/80 hover:bg-zinc-100"
            )}
          >
            <WorkflowIcon size={16} strokeWidth={1.8} />
            Diagram
          </button>

          <button
            onClick={() => setViewMode("text")}
            className={cx(
              "text-[12px] px-3 py-2 rounded-xl border transition-colors inline-flex items-center gap-2",
              viewMode === "text"
                ? "bg-zinc-900 text-white border-zinc-900"
                : "bg-white text-zinc-700 border-zinc-200/80 hover:bg-zinc-100"
            )}
          >
            <List size={16} strokeWidth={1.8} />
            Text
          </button>
        </div>
      </div>

      <div className="mt-3">
        {viewMode === "diagram" ? <Diagram /> : <TextView />}
      </div>
    </div>
  );
}
