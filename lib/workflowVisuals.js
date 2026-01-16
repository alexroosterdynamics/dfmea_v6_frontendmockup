// lib/workflowVisuals.js
// Visual-only styling helpers/constants for Workflows.js.
// (No business logic, no diagram mutation. Just how things LOOK.)

export const WF_GRID = {
  CELL_WIDTH: 180,
  CELL_HEIGHT: 90,
  NODE_WIDTH: 120,
  NODE_HEIGHT: 40
};

export const WF_CANVAS = {
  background: "#fbfbfa"
};

/** Edge color theme by connection type */
export const wfEdgeColors = {
  series: "#3b82f6",
  decision: "#f59e0b",
  parallel: "#10b981",
  substep: "#8b5cf6",
  route: "#f97316",
  condition: "#06b6d4"
};

export function wfGetEdgeStroke(type) {
  return wfEdgeColors[type] || "#64748b";
}

/** Node chrome */
export function wfNodeShellClass({ selected } = {}) {
  return [
    "relative h-10 w-[120px] rounded-xl border px-3 flex items-center justify-center",
    "bg-zinc-950/70 text-zinc-100",
    selected
      ? "border-blue-400 shadow-[0_0_0_2px_rgba(59,130,246,0.30)]"
      : "border-zinc-700"
  ].join(" ");
}

export const wfNodeLabelClass = "text-sm font-semibold";

/** Delete button on node */
export const wfNodeDeleteBtnClass =
  "absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-full " +
  "bg-zinc-900/80 text-zinc-200 hover:bg-zinc-800 group-hover:flex";

/** Edge label pill style */
export function wfEdgeLabelPillClass() {
  return "rounded bg-zinc-950/90 px-2 py-0.5 text-[11px] font-semibold";
}

/** Icon buttons around node (purely visual config) */
export const wfNodeConnectionIcons = [
  {
    type: "route",
    symbol: "←",
    label: "Route",
    className: "left-[-34px] top-1/2 -translate-y-1/2"
  },
  {
    type: "series",
    symbol: "→",
    label: "Series",
    className: "right-[-34px] top-[35%] -translate-y-1/2"
  },
  {
    type: "condition",
    symbol: "◇",
    label: "Condition",
    className: "right-[-34px] bottom-[-34px]"
  },
  {
    type: "substep",
    symbol: "↳",
    label: "SubStep",
    className: "left-[10px] bottom-[-34px]"
  },
  {
    type: "parallel",
    symbol: "⇊",
    label: "Parallel",
    className: "left-1/2 bottom-[-34px] -translate-x-1/2"
  }
];

export function wfNodeIconButtonClass() {
  return [
    "absolute flex h-7 w-7 items-center justify-center rounded-full border",
    "bg-zinc-950/80 text-sm font-semibold text-white shadow",
    "opacity-0 scale-95 transition group-hover:opacity-100 group-hover:scale-100"
  ].join(" ");
}

/** Decision diamond styling */
export const wfDecisionDiamond = {
  stroke: "#b45309",
  strokeWidth: 2
};

export const wfConditionDiamond = {
  stroke: "#0e7490",
  strokeWidth: 2
};

/** Small hint overlay */
export const wfHintOverlayClass =
  "absolute bottom-3 left-3 rounded-xl border border-zinc-200/80 bg-white/90 " +
  "px-3 py-2 text-xs text-zinc-700";

/** Background grid styling */
export const wfBackgroundGrid = {
  gap: 24,
  size: 1,
  color: "rgba(24,24,27,0.12)"
};
