"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";

const ForceGraph2D = dynamic(
  () => import("react-force-graph-2d").then((m) => m.default),
  { ssr: false }
);

const cx = (...c) => c.filter(Boolean).join(" ");

function useResizeObserver(ref, onResize) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver(() => onResize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, onResize]);
}

export default function ProcessForceGraph({ className = "" }) {
  const wrapRef = useRef(null);
  const fgRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);

  const graphData = useMemo(() => {
    const root = { id: "req", type: "root", label: "requirements" };

    const systems = [
      { id: "sys-1", type: "system", label: "System • Power" },
      { id: "sys-2", type: "system", label: "System • Control" },
      { id: "sys-3", type: "system", label: "System • Sensing" },
      { id: "sys-4", type: "system", label: "System • Actuation" }
    ];

    const functions = [
      { id: "fn-1", type: "function", label: "Regulate voltage", sub: "Stable supply", parent: "sys-1" },
      { id: "fn-2", type: "function", label: "Limit current", sub: "Safe operation", parent: "sys-1" },

      { id: "fn-3", type: "function", label: "State machine", sub: "Predictable flow", parent: "sys-2" },
      { id: "fn-4", type: "function", label: "Fault handling", sub: "Fail-safe behavior", parent: "sys-2" },

      { id: "fn-5", type: "function", label: "Read sensors", sub: "Accuracy target", parent: "sys-3" },
      { id: "fn-6", type: "function", label: "Filter noise", sub: "Signal quality", parent: "sys-3" },

      { id: "fn-7", type: "function", label: "Drive motor", sub: "Response time", parent: "sys-4" },
      { id: "fn-8", type: "function", label: "Position control", sub: "Tight tolerance", parent: "sys-4" }
    ];

    return {
      nodes: [root, ...systems, ...functions],
      links: [
        ...systems.map((s) => ({ source: root.id, target: s.id })),
        ...functions.map((f) => ({ source: f.parent, target: f.id }))
      ]
    };
  }, []);

  // Enhanced node drawing with clear differentiation and readable text
  const drawNode = (node, ctx, globalScale) => {
    const isRoot = node.type === "root";
    const isSystem = node.type === "system";
    const isFn = node.type === "function";
    const isHovered = hoveredNode?.id === node.id;

    // Larger sizes for better spacing - increased root size
    const r = isRoot ? 38 : isSystem ? 24 : 16;

    // Draw selection/hover indicator with color accent
    if (isHovered) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, r + 16, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(59, 130, 246, 0.06)"; // Blue tint
      ctx.fill();
      ctx.strokeStyle = "rgba(59, 130, 246, 0.3)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Node body with clear differentiation
    ctx.beginPath();

    if (isRoot) {
      // Root: solid black circle
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = "#000000";
      ctx.fill();

      // Subtle color ring around root
      ctx.beginPath();
      ctx.arc(node.x, node.y, r + 3, 0, 2 * Math.PI);
      ctx.strokeStyle = "rgba(59, 130, 246, 0.4)";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (isSystem) {
      // System: large white circle with LESS BOLD black border (was 4)
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.lineWidth = 2; // ✅ reduced from 4
      ctx.strokeStyle = "#000000";
      ctx.stroke();
    } else {
      // Function: smaller white circle with THIN border and subtle color dot
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#000000";
      ctx.stroke();

      // Small color accent dot inside function nodes
      ctx.beginPath();
      ctx.arc(node.x, node.y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(59, 130, 246, 0.5)";
      ctx.fill();
    }

    // Typography - positioned BELOW nodes to avoid overlap
    const title = node.label || "";
    const sub = node.sub || "";

    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    if (isRoot) {
      // Root: text inside circle
      ctx.textBaseline = "middle";
      const titleSize = 9 / globalScale;
      ctx.font = `700 ${titleSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(title.toUpperCase(), node.x, node.y);
    } else if (isSystem) {
      // System: smaller text below node
      const titleSize = 11.5 / globalScale;
      const yOffset = r + 14 / globalScale;

      ctx.font = `700 ${titleSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
      ctx.fillStyle = "#000000";
      ctx.fillText(title, node.x, node.y + yOffset);
    } else {
      // Function: regular weight title + subtitle below with MORE space
      const titleSize = 11 / globalScale;
      const subSize = 9 / globalScale;
      const yOffset = r + 12 / globalScale;

      // Title
      ctx.font = `500 ${titleSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
      ctx.fillStyle = "#000000";
      ctx.fillText(title, node.x, node.y + yOffset);

      // Subtitle
      const subYOffset = yOffset + 14 / globalScale;
      ctx.font = `400 ${subSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
      ctx.fillStyle = "#666666";
      ctx.fillText(sub, node.x, node.y + subYOffset);
    }
  };

  // Much larger hitbox for easier interaction
  const pointerPaint = (node, color, ctx) => {
    const baseR = node.type === "root" ? 38 : node.type === "system" ? 24 : 16;
    const hitboxR = baseR + 28; // Large hit area

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(node.x, node.y, hitboxR, 0, 2 * Math.PI);
    ctx.fill();
  };

  // Configure forces with longer edges and strong elastic behavior
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;

    // Much stronger charge for more separation
    fg.d3Force("charge").strength(-500);

    // Link force with MUCH longer distances and high strength
    const linkForce = fg.d3Force("link");
    linkForce.distance((l) => {
      const t = typeof l.target === "object" ? l.target.type : null;
      return t === "system" ? 200 : 150; // Significantly increased
    });
    linkForce.strength(1.5); // Very strong for elastic snapback

    // Start simulation
    fg.d3ReheatSimulation();

    // Fit once after initial settle
    const id = setTimeout(() => {
      try {
        fg.zoomToFit(500, 120);
      } catch {}
    }, 500);

    return () => clearTimeout(id);
  }, []);

  // Reheat on resize only
  useResizeObserver(wrapRef, () => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.d3ReheatSimulation();
  });

  const handleNodeDragEnd = (node) => {
    // Remove fixed position to allow elastic snapback
    node.fx = undefined;
    node.fy = undefined;

    // Reheat simulation for elastic effect
    const fg = fgRef.current;
    if (fg) fg.d3ReheatSimulation();
  };

  return (
    <div ref={wrapRef} className={cx("w-full h-full", className)}>
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        backgroundColor="#fbfbfa"
        linkColor={() => "rgba(0,0,0,0.12)"}
        linkWidth={1.5}
        linkLineDash={[6, 6]}   // ✅ dashed edges
        nodeRelSize={1}
        enableNodeDrag={true}
        warmupTicks={60}
        cooldownTicks={400}
        d3AlphaDecay={0.012}
        d3VelocityDecay={0.22}
        nodeCanvasObject={(node, ctx, globalScale) => drawNode(node, ctx, globalScale)}
        nodePointerAreaPaint={(node, color, ctx) => pointerPaint(node, color, ctx)}
        onNodeDragEnd={handleNodeDragEnd}
        onNodeHover={(node) => setHoveredNode(node)}
      />
    </div>
  );
}
