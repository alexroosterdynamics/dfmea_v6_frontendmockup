// components/Workflows.js
"use client";

import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from "react";
import { List, Workflow as WorkflowIcon, Save, Plus } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  MarkerType,
  Position,
  Handle,
  EdgeLabelRenderer,
  useReactFlow
} from "@xyflow/react";

import { useDFMEA } from "@/contexts/Context";

const cx = (...c) => c.filter(Boolean).join(" ");

/* ============================== TYPES / CONSTANTS ============================== */
const CONNECTION_TYPES = {
  SERIES: "series",
  DECISION: "decision",
  PARALLEL: "parallel",
  SUBSTEP: "substep",
  ROUTE: "route",
  CONDITION: "condition"
};

const GRID = {
  CELL_WIDTH: 180,
  CELL_HEIGHT: 90,
  NODE_WIDTH: 120,
  NODE_HEIGHT: 40
};

const gridToPixel = (gridX, gridY) => ({
  x: gridX * GRID.CELL_WIDTH,
  y: gridY * GRID.CELL_HEIGHT
});

const pixelToGrid = (x, y) => ({
  gridX: Math.round((x ?? 0) / GRID.CELL_WIDTH),
  gridY: Math.round((y ?? 0) / GRID.CELL_HEIGHT)
});

const colorByType = {
  [CONNECTION_TYPES.SERIES]: "#3b82f6",
  [CONNECTION_TYPES.DECISION]: "#f59e0b",
  [CONNECTION_TYPES.PARALLEL]: "#10b981",
  [CONNECTION_TYPES.SUBSTEP]: "#8b5cf6",
  [CONNECTION_TYPES.ROUTE]: "#f97316",
  [CONNECTION_TYPES.CONDITION]: "#06b6d4"
};

function getHandlesForType(type) {
  switch (type) {
    case CONNECTION_TYPES.ROUTE:
      return { sourceHandle: "l", targetHandle: "r" };
    case CONNECTION_TYPES.SUBSTEP:
      return { sourceHandle: "b", targetHandle: "l" };
    case CONNECTION_TYPES.PARALLEL:
      return { sourceHandle: "b", targetHandle: "t" };
    default:
      return { sourceHandle: "r", targetHandle: "l" };
  }
}

/* ============================== NODE ============================== */
function ProcessNode({ id, data, selected }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.label);

  useEffect(() => setEditValue(data.label), [data.label]);

  const commit = () => {
    setIsEditing(false);
    const next = editValue.trim();
    if (next) data.onUpdateLabel(id, next);
    else setEditValue(data.label);
  };

  const cancel = () => {
    setIsEditing(false);
    setEditValue(data.label);
  };

  const icons = [
    {
      type: CONNECTION_TYPES.ROUTE,
      symbol: "←",
      label: "Route",
      color: "#f97316",
      className: "left-[-34px] top-1/2 -translate-y-1/2"
    },
    {
      type: CONNECTION_TYPES.SERIES,
      symbol: "→",
      label: "Series",
      color: "#3b82f6",
      className: "right-[-34px] top-[35%] -translate-y-1/2"
    },
    {
      type: CONNECTION_TYPES.CONDITION,
      symbol: "◇",
      label: "Condition",
      color: "#06b6d4",
      className: "right-[-34px] bottom-[-34px]"
    },
    {
      type: CONNECTION_TYPES.SUBSTEP,
      symbol: "↳",
      label: "SubStep",
      color: "#8b5cf6",
      className: "left-[10px] bottom-[-34px]"
    },
    {
      type: CONNECTION_TYPES.PARALLEL,
      symbol: "⇊",
      label: "Parallel",
      color: "#10b981",
      className: "left-1/2 bottom-[-34px] -translate-x-1/2"
    }
  ];

  return (
    <div className="group relative" style={{ width: GRID.NODE_WIDTH }}>
      {/* Hidden handles */}
      <Handle id="l" type="source" position={Position.Left} style={{ opacity: 0 }} />
      <Handle id="r" type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle id="t" type="source" position={Position.Top} style={{ opacity: 0 }} />
      <Handle id="b" type="source" position={Position.Bottom} style={{ opacity: 0 }} />

      <Handle id="l" type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle id="r" type="target" position={Position.Right} style={{ opacity: 0 }} />
      <Handle id="t" type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle id="b" type="target" position={Position.Bottom} style={{ opacity: 0 }} />

      <div
        onDoubleClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        className={cx(
          "relative h-10 w-[120px] rounded-xl border px-3 flex items-center justify-center",
          "bg-zinc-950/70 text-zinc-100",
          selected
            ? "border-blue-400 shadow-[0_0_0_2px_rgba(59,130,246,0.30)]"
            : "border-zinc-700"
        )}
      >
        {isEditing ? (
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") cancel();
            }}
            className="w-full bg-transparent text-center outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="text-sm font-semibold">{data.label}</span>
        )}

        {!data.isStart && (
          <button
            title="Delete node"
            onClick={(e) => {
              e.stopPropagation();
              data.onDeleteNode(id);
            }}
            className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-full
                       bg-zinc-900/80 text-zinc-200 hover:bg-zinc-800 group-hover:flex"
          >
            ×
          </button>
        )}

        {icons.map((ic) => (
          <button
            key={ic.type}
            title={ic.label}
            className={cx(
              "absolute flex h-7 w-7 items-center justify-center rounded-full border",
              "bg-zinc-950/80 text-sm font-semibold text-white shadow",
              "opacity-0 scale-95 transition group-hover:opacity-100 group-hover:scale-100",
              ic.className
            )}
            style={{
              borderColor: ic.color,
              boxShadow: `0 0 0 1px ${ic.color}33`
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              data.onAddConnection(id, ic.type);
            }}
          >
            <span style={{ color: ic.color }}>{ic.symbol}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================== EDGES ============================== */
function SeriesEdge({ id, sourceX, sourceY, targetX, targetY, markerEnd }) {
  const stroke = colorByType[CONNECTION_TYPES.SERIES];
  return (
    <path
      id={id}
      d={`M ${sourceX} ${sourceY} L ${targetX} ${targetY}`}
      stroke={stroke}
      strokeWidth="2"
      fill="none"
      markerEnd={markerEnd}
    />
  );
}

function RouteEdge({ sourceX, sourceY, targetX, targetY, markerEnd }) {
  const stroke = colorByType[CONNECTION_TYPES.ROUTE];
  const bendX = sourceX - 35;
  const d = `M ${sourceX} ${sourceY} L ${bendX} ${sourceY} L ${bendX} ${targetY} L ${targetX} ${targetY}`;
  return <path d={d} stroke={stroke} strokeWidth="2" fill="none" markerEnd={markerEnd} />;
}

function SubStepEdge({ sourceX, sourceY, targetX, targetY, markerEnd }) {
  const stroke = colorByType[CONNECTION_TYPES.SUBSTEP];
  const d = `M ${sourceX} ${sourceY} L ${sourceX} ${targetY} L ${targetX} ${targetY}`;
  return (
    <path
      d={d}
      stroke={stroke}
      strokeWidth="2"
      strokeDasharray="6,4"
      fill="none"
      markerEnd={markerEnd}
    />
  );
}

function ParallelEdge({ sourceX, sourceY, targetY }) {
  const stroke = colorByType[CONNECTION_TYPES.PARALLEL];
  const offset = 6;
  return (
    <>
      <path
        d={`M ${sourceX - offset} ${sourceY} L ${sourceX - offset} ${targetY}`}
        stroke={stroke}
        strokeWidth="2"
        fill="none"
      />
      <path
        d={`M ${sourceX + offset} ${sourceY} L ${sourceX + offset} ${targetY}`}
        stroke={stroke}
        strokeWidth="2"
        fill="none"
      />
    </>
  );
}

function DecisionEdge({ id, sourceX, sourceY, targetX, targetY, data, markerEnd }) {
  const stroke = colorByType[CONNECTION_TYPES.DECISION];
  const diamondX = sourceX + 35;
  const diamondY = sourceY;
  const diamondSize = 16;
  const bendX = diamondX + diamondSize + 25;

  const toDiamond = `M ${sourceX} ${sourceY} L ${diamondX - diamondSize} ${diamondY}`;
  const fromDiamond = `M ${diamondX + diamondSize} ${diamondY} L ${bendX} ${diamondY} L ${bendX} ${targetY} L ${targetX} ${targetY}`;

  return (
    <>
      <path d={toDiamond} stroke={stroke} strokeWidth="2" fill="none" />
      {data?.showDiamond && (
        <polygon
          points={`${diamondX},${diamondY - diamondSize} ${diamondX + diamondSize},${diamondY} ${diamondX},${diamondY + diamondSize} ${diamondX - diamondSize},${diamondY}`}
          fill={stroke}
          stroke="#b45309"
          strokeWidth="2"
        />
      )}
      <path d={fromDiamond} stroke={stroke} strokeWidth="2" fill="none" markerEnd={markerEnd} />

      {data?.label ? (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${bendX + 46}px, ${targetY - 12}px)`,
              pointerEvents: "all"
            }}
            className="cursor-pointer select-none"
            onClick={(e) => {
              e.stopPropagation();
              data.setEditingEdgeId(id);
            }}
          >
            <div
              className="rounded bg-zinc-950/90 px-2 py-0.5 text-[11px] font-semibold"
              style={{ color: stroke }}
            >
              {data.label}
            </div>
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

function ConditionEdge({ sourceX, sourceY, targetX, targetY, markerEnd }) {
  const stroke = colorByType[CONNECTION_TYPES.CONDITION];

  const diamondX = sourceX + 35;
  const diamondY = sourceY;
  const diamondSize = 14;

  const bendX = diamondX + diamondSize + 20;

  const toDiamond = `M ${sourceX} ${sourceY} L ${diamondX - diamondSize} ${diamondY}`;
  const fromDiamond = `M ${diamondX + diamondSize} ${diamondY} L ${bendX} ${diamondY} L ${bendX} ${targetY} L ${targetX} ${targetY}`;

  return (
    <>
      <path d={toDiamond} stroke={stroke} strokeWidth="2" fill="none" />
      <polygon
        points={`${diamondX},${diamondY - diamondSize} ${diamondX + diamondSize},${diamondY} ${diamondX},${diamondY + diamondSize} ${diamondX - diamondSize},${diamondY}`}
        fill={stroke}
        stroke="#0e7490"
        strokeWidth="2"
      />
      <text
        x={diamondX}
        y={diamondY + 4}
        textAnchor="middle"
        fill="white"
        fontSize="10"
        fontWeight="bold"
      >
        ?
      </text>

      <path d={fromDiamond} stroke={stroke} strokeWidth="2" fill="none" markerEnd={markerEnd} />
    </>
  );
}

/* ============================== JSON <-> INTERNAL ============================== */
/**
 * Internal node format used here:
 * {
 *   id,
 *   type: "process",
 *   position: {x,y},
 *   data: {
 *     label,
 *     detail,
 *     gridX, gridY,
 *     connections: [{targetId, type, label}],
 *     isStart, isEnd,
 *     w,h
 *   }
 * }
 */
function buildInternalFromDiagram(diagram) {
  const rawNodes = Array.isArray(diagram?.nodes) ? diagram.nodes : [];
  const rawEdges = Array.isArray(diagram?.edges) ? diagram.edges : [];

  // First create nodes
  const internal = rawNodes.map((n) => {
    const { gridX, gridY } = pixelToGrid(n.x ?? 0, n.y ?? 0);
    const pos = gridToPixel(gridX, gridY);

    return {
      id: n.id,
      type: "process",
      position: pos,
      data: {
        label: n.title || "Step",
        detail: n.detail || "",
        gridX,
        gridY,
        connections: [],
        isStart: n.type === "start",
        isEnd: n.type === "end",
        w: n.w ?? 260,
        h: n.h ?? 80
      }
    };
  });

  const byId = new Map(internal.map((n) => [n.id, n]));

  // Then attach connections
  rawEdges.forEach((e) => {
    const from = byId.get(e.from);
    if (!from) return;
    from.data.connections.push({
      targetId: e.to,
      type: e.type || CONNECTION_TYPES.SERIES,
      label: e.label || ""
    });
  });

  return internal;
}

function exportDiagramFromInternal(internalNodes, viewport) {
  const nodes = internalNodes.map((n) => ({
    id: n.id,
    type: n.data.isStart ? "start" : n.data.isEnd ? "end" : undefined,
    x: Math.round(n.position.x),
    y: Math.round(n.position.y),
    w: n.data.w ?? 260,
    h: n.data.h ?? 80,
    title: n.data.label || "Step",
    detail: n.data.detail || ""
  }));

  const edges = [];
  internalNodes.forEach((n) => {
    (n.data.connections || []).forEach((c) => {
      edges.push({
        id: `${n.id}-${c.targetId}`,
        from: n.id,
        to: c.targetId,
        type: c.type || CONNECTION_TYPES.SERIES,
        label: c.label || ""
      });
    });
  });

  return {
    nodes,
    edges,
    zoom: viewport?.zoom ?? 1,
    pan: { x: viewport?.x ?? 60, y: viewport?.y ?? 60 }
  };
}

/* ============================== EDITOR (STRICT LAYOUT, NO DRAG) ============================== */
const WorkflowFlowEditor = forwardRef(function WorkflowFlowEditor(
  { workflowId, initialDiagram },
  ref
) {
  const rf = useReactFlow();

  const [nodes, setNodes] = useState(() => buildInternalFromDiagram(initialDiagram));
  const [editingEdgeId, setEditingEdgeId] = useState(null);
  const [editingValue, setEditingValue] = useState("");

  // ✅ Reset ONLY when switching workflows
  useEffect(() => {
    setNodes(buildInternalFromDiagram(initialDiagram));
    setEditingEdgeId(null);

    const z = initialDiagram?.zoom ?? 1;
    const p = initialDiagram?.pan ?? { x: 60, y: 60 };
    rf.setViewport({ x: p.x ?? 60, y: p.y ?? 60, zoom: z }, { duration: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId]);

  const onUpdateLabel = useCallback((nodeId, label) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, label } } : n))
    );
  }, []);

  const onDeleteNode = useCallback((nodeId) => {
    setNodes((prev) => {
      const filtered = prev.filter((n) => n.id !== nodeId);
      return filtered.map((n) => ({
        ...n,
        data: {
          ...n.data,
          connections: (n.data.connections || []).filter((c) => c.targetId !== nodeId)
        }
      }));
    });
  }, []);

  // ✅ pushDown logic (same as your reference)
  const pushNodesDown = useCallback((fromGridY, excludeIds = []) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (excludeIds.includes(n.id)) return n;
        const gy = n.data.gridY ?? 0;
        const gx = n.data.gridX ?? 0;
        if (gy >= fromGridY) {
          const nextGY = gy + 1;
          return {
            ...n,
            position: gridToPixel(gx, nextGY),
            data: { ...n.data, gridY: nextGY }
          };
        }
        return n;
      })
    );
  }, []);

  // ✅ strict directional addNode (exact behavior you pasted)
  const addConnection = useCallback(
    (sourceNodeId, connectionType) => {
      const source = nodes.find((n) => n.id === sourceNodeId);
      if (!source) return;

      const newNodeId = uuidv4();
      const existing = source.data.connections || [];

      const countByType = (type) =>
        existing.filter(
          (c) =>
            c.type === type ||
            (type === CONNECTION_TYPES.SERIES && c.type === CONNECTION_TYPES.DECISION)
        ).length;

      let gridX = source.data.gridX ?? 0;
      let gridY = source.data.gridY ?? 0;
      let pushFrom = null;

      switch (connectionType) {
        case CONNECTION_TYPES.ROUTE: {
          const routeCount = countByType(CONNECTION_TYPES.ROUTE);
          gridX = (source.data.gridX ?? 0) - 2;
          gridY = (source.data.gridY ?? 0) + routeCount;
          if (routeCount > 0) pushFrom = gridY;
          break;
        }

        case CONNECTION_TYPES.CONDITION: {
          const conditionCount = countByType(CONNECTION_TYPES.CONDITION);
          gridX = (source.data.gridX ?? 0) + 2;
          gridY = (source.data.gridY ?? 0) + 1 + conditionCount;
          pushFrom = gridY;
          break;
        }

        case CONNECTION_TYPES.SUBSTEP: {
          const subCount = countByType(CONNECTION_TYPES.SUBSTEP);
          gridX = (source.data.gridX ?? 0) + 1;
          gridY = (source.data.gridY ?? 0) + 1 + subCount;
          pushFrom = gridY;
          break;
        }

        case CONNECTION_TYPES.SERIES: {
          const seriesCount = countByType(CONNECTION_TYPES.SERIES);
          gridX = (source.data.gridX ?? 0) + 2;

          if (seriesCount === 0) {
            gridY = source.data.gridY ?? 0;
          } else {
            gridY = (source.data.gridY ?? 0) + seriesCount;
            pushFrom = gridY;
          }
          break;
        }

        case CONNECTION_TYPES.PARALLEL: {
          const parCount = countByType(CONNECTION_TYPES.PARALLEL);
          const substepCount = countByType(CONNECTION_TYPES.SUBSTEP);

          gridX = source.data.gridX ?? 0;
          gridY = (source.data.gridY ?? 0) + 1 + substepCount + parCount;
          pushFrom = gridY;
          break;
        }

        default:
          break;
      }

      const existingSeriesConnections = existing.filter(
        (c) => c.type === CONNECTION_TYPES.SERIES || c.type === CONNECTION_TYPES.DECISION
      );

      let actualType = connectionType;
      let connectionLabel = "";

      if (connectionType === CONNECTION_TYPES.SERIES && existingSeriesConnections.length > 0) {
        actualType = CONNECTION_TYPES.DECISION;
        connectionLabel = `Option ${existingSeriesConnections.length + 1}`;
      }

      if (pushFrom !== null) pushNodesDown(pushFrom, [sourceNodeId]);

      const newPos = gridToPixel(gridX, gridY);

      setNodes((prev) => {
        let updated = [...prev];

        // Convert existing SERIES to DECISION if branching
        if (connectionType === CONNECTION_TYPES.SERIES && existingSeriesConnections.length > 0) {
          updated = updated.map((n) => {
            if (n.id !== sourceNodeId) return n;
            return {
              ...n,
              data: {
                ...n.data,
                connections: (n.data.connections || []).map((c) =>
                  c.type === CONNECTION_TYPES.SERIES
                    ? {
                        ...c,
                        type: CONNECTION_TYPES.DECISION,
                        label: c.label || "Option 1"
                      }
                    : c
                )
              }
            };
          });
        }

        // Add connection
        updated = updated.map((n) => {
          if (n.id !== sourceNodeId) return n;
          return {
            ...n,
            data: {
              ...n.data,
              connections: [
                ...(n.data.connections || []),
                { targetId: newNodeId, type: actualType, label: connectionLabel }
              ]
            }
          };
        });

        // Add new node
        updated.push({
          id: newNodeId,
          type: "process",
          position: newPos,
          data: {
            label: "Step",
            detail: "",
            gridX,
            gridY,
            connections: [],
            isStart: false,
            isEnd: false,
            w: 260,
            h: 80
          }
        });

        return updated;
      });
    },
    [nodes, pushNodesDown]
  );

  const edges = useMemo(() => {
    const all = [];
    const bySourceDecisionCount = new Map();

    nodes.forEach((n) => {
      (n.data.connections || []).forEach((conn) => {
        const id = `${n.id}-${conn.targetId}`;
        const stroke = colorByType[conn.type] || "#64748b";
        const { sourceHandle, targetHandle } = getHandlesForType(conn.type);

        const markerEnd =
          conn.type === CONNECTION_TYPES.PARALLEL
            ? undefined
            : { type: MarkerType.ArrowClosed, width: 16, height: 16, color: stroke };

        let showDiamond = false;
        if (conn.type === CONNECTION_TYPES.DECISION) {
          const c = bySourceDecisionCount.get(n.id) ?? 0;
          showDiamond = c === 0;
          bySourceDecisionCount.set(n.id, c + 1);
        }

        all.push({
          id,
          source: n.id,
          target: conn.targetId,
          sourceHandle,
          targetHandle,
          type: conn.type,
          markerEnd,
          data: {
            label: conn.label || "",
            showDiamond,
            setEditingEdgeId
          }
        });
      });
    });

    return all;
  }, [nodes]);

  const updateEdgeLabel = useCallback((edgeId, newLabel) => {
    const parts = edgeId.split("-");
    const sourceId = parts[0];
    const targetId = parts.slice(1).join("-");

    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== sourceId) return n;
        return {
          ...n,
          data: {
            ...n.data,
            connections: (n.data.connections || []).map((c) =>
              c.targetId === targetId ? { ...c, label: newLabel } : c
            )
          }
        };
      })
    );
  }, []);

  useEffect(() => {
    if (!editingEdgeId) return;
    const edge = edges.find((e) => e.id === editingEdgeId);
    setEditingValue(edge?.data?.label ?? "");
  }, [editingEdgeId, edges]);

  const nodeTypes = useMemo(() => ({ process: ProcessNode }), []);
  const edgeTypes = useMemo(
    () => ({
      [CONNECTION_TYPES.SERIES]: SeriesEdge,
      [CONNECTION_TYPES.DECISION]: DecisionEdge,
      [CONNECTION_TYPES.ROUTE]: RouteEdge,
      [CONNECTION_TYPES.SUBSTEP]: SubStepEdge,
      [CONNECTION_TYPES.PARALLEL]: ParallelEdge,
      [CONNECTION_TYPES.CONDITION]: ConditionEdge
    }),
    []
  );

  const nodesWithCallbacks = useMemo(() => {
    return nodes.map((n) => ({
      ...n,
      style: { width: GRID.NODE_WIDTH, height: GRID.NODE_HEIGHT },
      data: {
        ...n.data,
        onAddConnection: addConnection,
        onUpdateLabel,
        onDeleteNode
      }
    }));
  }, [nodes, addConnection, onUpdateLabel, onDeleteNode]);

  useImperativeHandle(ref, () => ({
    ensureStartNodeIfEmpty() {
      setNodes((prev) => {
        if (prev.length) return prev;
        const startGX = 3;
        const startGY = 1;
        return [
          {
            id: "start",
            type: "process",
            position: gridToPixel(startGX, startGY),
            data: {
              label: "Start",
              detail: "",
              gridX: startGX,
              gridY: startGY,
              connections: [],
              isStart: true,
              isEnd: false,
              w: 260,
              h: 80
            }
          }
        ];
      });
    },
    exportDiagram() {
      const vp = rf.getViewport();
      return exportDiagramFromInternal(nodesWithCallbacks, vp);
    }
  }));

  return (
    <>
      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={false} // ✅ NO DRAG
        nodesConnectable={false}
        elementsSelectable={true}
        fitView={false}
        defaultViewport={{ x: 60, y: 60, zoom: 1 }}
        panOnDrag={[1, 2]}
        panActivationKeyCode="Alt"
        selectionOnDrag={false}
        className="bg-transparent"
      >
        <Background gap={24} size={1} color="rgba(24,24,27,0.12)" />

        {editingEdgeId ? (
          <EdgeLabelRenderer>
            <div
              className="absolute left-4 top-4 z-[999] rounded-xl border border-zinc-200/80 bg-white p-3 shadow-[0_1px_0_rgba(0,0,0,0.05),0_20px_50px_rgba(0,0,0,0.12)]"
              style={{ pointerEvents: "all" }}
            >
              <div className="mb-2 text-xs font-semibold text-zinc-800">
                Edit decision label
              </div>
              <input
                autoFocus
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    updateEdgeLabel(editingEdgeId, editingValue);
                    setEditingEdgeId(null);
                  }
                  if (e.key === "Escape") setEditingEdgeId(null);
                }}
                onBlur={() => {
                  updateEdgeLabel(editingEdgeId, editingValue);
                  setEditingEdgeId(null);
                }}
                className="w-64 rounded-xl border border-zinc-200/80 bg-white px-3 py-2 text-sm text-zinc-900 outline-none"
              />
              <div className="mt-2 text-[11px] text-zinc-500">
                Enter to save • Esc to cancel
              </div>
            </div>
          </EdgeLabelRenderer>
        ) : null}
      </ReactFlow>

      <div className="absolute bottom-3 left-3 rounded-xl border border-zinc-200/80 bg-white/90 px-3 py-2 text-xs text-zinc-700">
        💡 Click icons to add connections • Click decision labels to edit • Alt+drag to pan
      </div>
    </>
  );
});

/* ============================== MEMOIZED DIAGRAM CONTAINER ============================== */
const DiagramContainer = memo(
  forwardRef(function DiagramContainer({ workflowId, initialDiagram, height }, ref) {
    return (
      <div
        className="relative rounded-2xl border border-zinc-200/80 bg-[#fbfbfa] overflow-hidden"
        style={{ height }}
      >
        <ReactFlowProvider>
          <WorkflowFlowEditor
            ref={ref}
            workflowId={workflowId}
            initialDiagram={initialDiagram}
          />
        </ReactFlowProvider>
      </div>
    );
  }),
  (prevProps, nextProps) => {
    // Only re-render if workflowId changes
    // This prevents remounting when parent state updates (like title input)
    return prevProps.workflowId === nextProps.workflowId;
  }
);

/* ============================== MAIN WORKFLOWS VIEW ============================== */
export default function Workflows() {
  const { workflows, selectedWorkflowId, setSelectedWorkflowId, createWorkflow, updateWorkflowLocal } =
    useDFMEA();

  const activeWorkflow = useMemo(
    () => workflows.find((w) => w.id === selectedWorkflowId) || null,
    [workflows, selectedWorkflowId]
  );

  const [viewMode, setViewMode] = useState("diagram");
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  const editorRef = useRef(null);

  useEffect(() => {
    setViewMode("diagram");
    setSavedToast(false);
  }, [activeWorkflow?.id]);

  async function saveLayout() {
    if (!activeWorkflow || saving) return;

    setSaving(true);
    setSavedToast(false);

    try {
      const diagram = editorRef.current?.exportDiagram?.();
      if (!diagram) throw new Error("No diagram export available");

      // ✅ optimistic update
      updateWorkflowLocal(activeWorkflow.id, { diagram });

      const res = await fetch("/api/workflows/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: activeWorkflow.id,
          diagram,
          meta: {
            title: activeWorkflow.title,
            summary: activeWorkflow.summary,
            category: activeWorkflow.category,
            owner: activeWorkflow.owner,
            textSteps: activeWorkflow.textSteps
          }
        })
      });

      const j = await res.json();
      if (!j?.ok) throw new Error(j?.error || "Save failed");

      if (j?.workflow?.id) {
        updateWorkflowLocal(j.workflow.id, j.workflow);
      }

      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 1400);
    } catch (err) {
      console.error(err);
      alert(`Save failed: ${err?.message || "unknown error"}`);
    } finally {
      setSaving(false);
    }
  }

  function addStep() {
    editorRef.current?.ensureStartNodeIfEmpty?.();
  }

  const diagramHeight = "calc(100vh - 170px)";

  const EmptyState = () => (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-10 shadow-[0_1px_0_rgba(0,0,0,0.05),0_14px_40px_rgba(0,0,0,0.06)]">
      <div className="text-[16px] font-semibold tracking-tight text-zinc-900">
        No workflow selected
      </div>
      <div className="mt-1 text-[13px] text-zinc-600">
        Create a workflow from the sidebar, then start building your diagram.
      </div>

      <button
        onClick={() => createWorkflow()}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-zinc-800"
      >
        <Plus size={16} strokeWidth={1.8} />
        Create workflow
      </button>
    </div>
  );

  const TextView = () => (
    <div className="rounded-2xl border border-zinc-200/80 bg-white shadow-[0_1px_0_rgba(0,0,0,0.05),0_14px_40px_rgba(0,0,0,0.06)] p-6">
      <div className="text-[13px] font-semibold tracking-tight text-zinc-900">
        {activeWorkflow?.title || "Untitled workflow"}
      </div>
      <div className="mt-1 text-[12px] text-zinc-600 tracking-tight">
        {activeWorkflow?.summary || "No summary yet."}
      </div>
    </div>
  );

  return (
    <div className="px-6 pt-4 pb-8 w-full">
      {/* top bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-[18px] font-semibold tracking-tight text-zinc-900">
            Workflows
          </div>

          <select
            value={selectedWorkflowId || ""}
            onChange={(e) => setSelectedWorkflowId(e.target.value || "")}
            className="text-[13px] px-3 py-2 rounded-xl bg-white border border-zinc-200/80 outline-none min-w-[320px]"
          >
            <option value="">Select workflow…</option>
            {workflows.map((w) => (
              <option key={w.id} value={w.id}>
                {w.title?.trim() ? w.title : "Untitled workflow"}
              </option>
            ))}
          </select>

          {savedToast ? (
            <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-900">
              Saved ✓
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={addStep}
            disabled={!activeWorkflow}
            className={cx(
              "text-[12px] px-3 py-2 rounded-xl border transition-colors inline-flex items-center gap-2",
              activeWorkflow
                ? "bg-white border-zinc-200/80 hover:bg-zinc-100 text-zinc-800"
                : "bg-zinc-100 border-zinc-200/80 text-zinc-400 cursor-not-allowed"
            )}
            title="Creates Start node only if empty"
          >
            <Plus size={16} strokeWidth={1.8} />
            Add step
          </button>

          <button
            onClick={saveLayout}
            disabled={!activeWorkflow || saving}
            className={cx(
              "text-[12px] px-3 py-2 rounded-xl inline-flex items-center gap-2 transition-colors",
              activeWorkflow && !saving
                ? "bg-zinc-900 text-white hover:bg-zinc-800"
                : "bg-zinc-200 text-zinc-500 cursor-not-allowed"
            )}
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

      {/* rename inputs */}
      {activeWorkflow ? (
        <div className="mt-3 grid grid-cols-12 gap-3">
          <div className="col-span-7">
            <div className="text-[11px] text-zinc-500 tracking-tight">Workflow title</div>
            <input
              value={activeWorkflow.title || ""}
              onChange={(e) => updateWorkflowLocal(activeWorkflow.id, { title: e.target.value })}
              className="mt-1 w-full rounded-xl border border-zinc-200/80 bg-white px-3 py-2
                         text-[13px] tracking-tight text-zinc-900 outline-none
                         focus:ring-2 focus:ring-zinc-300"
              placeholder="e.g. DFMEA release gate workflow"
            />
          </div>

          <div className="col-span-5">
            <div className="text-[11px] text-zinc-500 tracking-tight">Summary</div>
            <input
              value={activeWorkflow.summary || ""}
              onChange={(e) =>
                updateWorkflowLocal(activeWorkflow.id, { summary: e.target.value })
              }
              className="mt-1 w-full rounded-xl border border-zinc-200/80 bg-white px-3 py-2
                         text-[13px] tracking-tight text-zinc-900 outline-none
                         focus:ring-2 focus:ring-zinc-300"
              placeholder="Short description..."
            />
          </div>
        </div>
      ) : null}

      <div className="mt-3">
        {!activeWorkflow ? (
          <EmptyState />
        ) : viewMode === "diagram" ? (
          <DiagramContainer
            ref={editorRef}
            workflowId={activeWorkflow.id}
            initialDiagram={
              activeWorkflow.diagram || {
                nodes: [],
                edges: [],
                zoom: 1,
                pan: { x: 60, y: 60 }
              }
            }
            height={diagramHeight}
          />
        ) : (
          <TextView />
        )}
      </div>
    </div>
  );
}
