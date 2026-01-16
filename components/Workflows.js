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
import { List, Workflow as WorkflowIcon, Save, Plus, Trash2 } from "lucide-react";
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

// ✅ visual-only design system
import {
  WF_GRID,
  wfGetEdgeStroke,
  wfNodeShellClass,
  wfNodeLabelClass,
  wfNodeDeleteBtnClass,
  wfEdgeLabelPillClass,
  wfNodeConnectionIcons,
  wfNodeIconButtonClass,
  wfDecisionDiamond,
  wfConditionDiamond,
  wfHintOverlayClass,
  wfBackgroundGrid,

  // ✅ NEW: popover cosmetics moved here
  wfNodePopoverStyle,
  wfNodePopoverContainerClass,
  wfNodePopoverTitleClass,
  wfNodePopoverMetaTextClass,
  wfNodePopoverSectionLabelClass,
  wfNodePopoverInputClass,
  wfNodePopoverTextareaClass,
  wfNodePopoverHintClass,
  wfNodePopoverEmptyHintClass
} from "@/lib/workflowVisuals";

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

const GRID = WF_GRID;

const gridToPixel = (gridX, gridY) => ({
  x: gridX * GRID.CELL_WIDTH,
  y: gridY * GRID.CELL_HEIGHT
});

const pixelToGrid = (x, y) => ({
  gridX: Math.round((x ?? 0) / GRID.CELL_WIDTH),
  gridY: Math.round((y ?? 0) / GRID.CELL_HEIGHT)
});

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

/* ============================== NODE POPOVER (VIEW + EDIT) ============================== */
function NodePopover({
  pinned,
  title,
  subtitle,
  detail,
  onChangeTitle,
  onChangeSubtitle,
  onChangeDetail
}) {
  const hasExtra = Boolean((subtitle || "").trim() || (detail || "").trim());

  return (
    <div
      className={wfNodePopoverContainerClass({ pinned })}
      style={wfNodePopoverStyle}
    >
      <div className={wfNodePopoverTitleClass}>{title || "Step"}</div>

      {pinned ? (
        <div className="mt-2 grid gap-2">
          <div>
            <div className={wfNodePopoverSectionLabelClass}>Title</div>
            <input
              value={title || ""}
              onChange={(e) => onChangeTitle?.(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className={wfNodePopoverInputClass}
              placeholder="Step title..."
            />
          </div>

          <div>
            <div className={wfNodePopoverSectionLabelClass}>Subtitle</div>
            <input
              value={subtitle || ""}
              onChange={(e) => onChangeSubtitle?.(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className={wfNodePopoverInputClass}
              placeholder="Short subtitle..."
            />
          </div>

          <div>
            <div className={wfNodePopoverSectionLabelClass}>Description</div>
            <textarea
              value={detail || ""}
              onChange={(e) => onChangeDetail?.(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              rows={4}
              className={wfNodePopoverTextareaClass}
              placeholder="Explain what this step does, output, notes..."
            />
          </div>

          <div className={wfNodePopoverHintClass}>Tip: click outside to close</div>
        </div>
      ) : (
        <>
          {subtitle?.trim() ? (
            <div className={wfNodePopoverMetaTextClass}>{subtitle}</div>
          ) : null}

          {detail?.trim() ? (
            <div className={wfNodePopoverMetaTextClass} style={{ whiteSpace: "pre-wrap" }}>
              {detail}
            </div>
          ) : null}

          {!hasExtra ? (
            <div className={wfNodePopoverEmptyHintClass}>Click node to add details</div>
          ) : null}
        </>
      )}
    </div>
  );
}

/* ============================== NODE ============================== */
function ProcessNode({ id, data, selected }) {
  const [isEditingInlineTitle, setIsEditingInlineTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(data.label);

  const [hovered, setHovered] = useState(false);

  useEffect(() => setTitleValue(data.label), [data.label]);

  const commitInlineTitle = () => {
    setIsEditingInlineTitle(false);
    const next = titleValue.trim();
    if (next) data.onUpdateLabel?.(id, next);
    else setTitleValue(data.label);
  };

  const cancelInlineTitle = () => {
    setIsEditingInlineTitle(false);
    setTitleValue(data.label);
  };

  const pinned = Boolean(data.isPinned);
  const showPopover = hovered || pinned;

  return (
    <div
      className="group relative"
      style={{ width: GRID.NODE_WIDTH }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Hidden handles */}
      <Handle id="l" type="source" position={Position.Left} style={{ opacity: 0 }} />
      <Handle id="r" type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle id="t" type="source" position={Position.Top} style={{ opacity: 0 }} />
      <Handle id="b" type="source" position={Position.Bottom} style={{ opacity: 0 }} />

      <Handle id="l" type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle id="r" type="target" position={Position.Right} style={{ opacity: 0 }} />
      <Handle id="t" type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle id="b" type="target" position={Position.Bottom} style={{ opacity: 0 }} />

      {/* ✅ Hover + pinned popover */}
      {showPopover ? (
        <NodePopover
          pinned={pinned}
          title={data.label}
          subtitle={data.subtitle}
          detail={data.detail}
          onChangeTitle={(v) => data.onUpdateLabel?.(id, v)}
          onChangeSubtitle={(v) => data.onUpdateSubtitle?.(id, v)}
          onChangeDetail={(v) => data.onUpdateDetail?.(id, v)}
        />
      ) : null}

      <div
        onDoubleClick={(e) => {
          e.stopPropagation();
          setIsEditingInlineTitle(true);
        }}
        className={wfNodeShellClass({ selected: selected || pinned })}
      >
        {isEditingInlineTitle ? (
          <input
            autoFocus
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={commitInlineTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitInlineTitle();
              if (e.key === "Escape") cancelInlineTitle();
            }}
            className="w-full bg-transparent text-center outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={wfNodeLabelClass}>{data.label}</span>
        )}

        {!data.isStart && (
          <button
            title="Delete node"
            onClick={(e) => {
              e.stopPropagation();
              data.onDeleteNode(id);
            }}
            className={wfNodeDeleteBtnClass}
          >
            ×
          </button>
        )}

        {wfNodeConnectionIcons.map((ic) => {
          const stroke = wfGetEdgeStroke(ic.type);

          return (
            <button
              key={ic.type}
              title={ic.label}
              className={cx(wfNodeIconButtonClass(), ic.className)}
              style={{
                borderColor: stroke,
                boxShadow: `0 0 0 1px ${stroke}33`
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                data.onAddConnection(id, ic.type);
              }}
            >
              <span style={{ color: stroke }}>{ic.symbol}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================== EDGES ============================== */
function SeriesEdge({ id, sourceX, sourceY, targetX, targetY, markerEnd }) {
  const stroke = wfGetEdgeStroke(CONNECTION_TYPES.SERIES);
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
  const stroke = wfGetEdgeStroke(CONNECTION_TYPES.ROUTE);
  const bendX = sourceX - 35;
  const d = `M ${sourceX} ${sourceY} L ${bendX} ${sourceY} L ${bendX} ${targetY} L ${targetX} ${targetY}`;
  return <path d={d} stroke={stroke} strokeWidth="2" fill="none" markerEnd={markerEnd} />;
}

function SubStepEdge({ sourceX, sourceY, targetX, targetY, markerEnd }) {
  const stroke = wfGetEdgeStroke(CONNECTION_TYPES.SUBSTEP);
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
  const stroke = wfGetEdgeStroke(CONNECTION_TYPES.PARALLEL);
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
  const stroke = wfGetEdgeStroke(CONNECTION_TYPES.DECISION);
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
          stroke={wfDecisionDiamond.stroke}
          strokeWidth={wfDecisionDiamond.strokeWidth}
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
            <div className={wfEdgeLabelPillClass()} style={{ color: stroke }}>
              {data.label}
            </div>
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

function ConditionEdge({ sourceX, sourceY, targetX, targetY, markerEnd }) {
  const stroke = wfGetEdgeStroke(CONNECTION_TYPES.CONDITION);

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
        stroke={wfConditionDiamond.stroke}
        strokeWidth={wfConditionDiamond.strokeWidth}
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
function buildInternalFromDiagram(diagram) {
  const rawNodes = Array.isArray(diagram?.nodes) ? diagram.nodes : [];
  const rawEdges = Array.isArray(diagram?.edges) ? diagram.edges : [];

  const internal = rawNodes.map((n) => {
    const { gridX, gridY } = pixelToGrid(n.x ?? 0, n.y ?? 0);
    const pos = gridToPixel(gridX, gridY);

    return {
      id: n.id,
      type: "process",
      position: pos,
      data: {
        label: n.title || "Step",
        subtitle: n.subtitle || "",
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

    // ✅ persisted node fields
    title: n.data.label || "Step",
    subtitle: n.data.subtitle || "",
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

  // ✅ pinned popover id
  const [pinnedNodeId, setPinnedNodeId] = useState(null);

  useEffect(() => {
    setNodes(buildInternalFromDiagram(initialDiagram));
    setEditingEdgeId(null);
    setPinnedNodeId(null);

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

  const onUpdateSubtitle = useCallback((nodeId, subtitle) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, subtitle } } : n))
    );
  }, []);

  const onUpdateDetail = useCallback((nodeId, detail) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, detail } } : n))
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

    setPinnedNodeId((cur) => (cur === nodeId ? null : cur));
  }, []);

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

        if (connectionType === CONNECTION_TYPES.SERIES && existingSeriesConnections.length > 0) {
          updated = updated.map((n) => {
            if (n.id !== sourceNodeId) return n;
            return {
              ...n,
              data: {
                ...n.data,
                connections: (n.data.connections || []).map((c) =>
                  c.type === CONNECTION_TYPES.SERIES
                    ? { ...c, type: CONNECTION_TYPES.DECISION, label: c.label || "Option 1" }
                    : c
                )
              }
            };
          });
        }

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

        updated.push({
          id: newNodeId,
          type: "process",
          position: newPos,
          data: {
            label: "Step",
            subtitle: "",
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
        const stroke = wfGetEdgeStroke(conn.type);
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

        // ✅ pin logic
        isPinned: pinnedNodeId === n.id,

        // ✅ callbacks
        onAddConnection: addConnection,
        onUpdateLabel,
        onUpdateSubtitle,
        onUpdateDetail,
        onDeleteNode
      }
    }));
  }, [nodes, pinnedNodeId, addConnection, onUpdateLabel, onUpdateSubtitle, onUpdateDetail, onDeleteNode]);

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
              subtitle: "",
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
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false} // ✅ we control "selection" via pinned state
        fitView={false}
        defaultViewport={{ x: 60, y: 60, zoom: 1 }}

        // ✅ LEFT CLICK panning
        panOnDrag={true}
        panActivationKeyCode={null}
        selectionOnDrag={false}

        // ✅ pin / unpin behavior
        onNodeClick={(_, node) => setPinnedNodeId(node?.id || null)}
        onPaneClick={() => setPinnedNodeId(null)}

        className="bg-transparent"
      >
        <Background
          gap={wfBackgroundGrid.gap}
          size={wfBackgroundGrid.size}
          color={wfBackgroundGrid.color}
        />

        {editingEdgeId ? (
          <EdgeLabelRenderer>
            <div
              className="absolute left-4 top-4 z-[999] rounded-xl border border-zinc-200/80 bg-white p-3 shadow-[0_1px_0_rgba(0,0,0,0.05),0_20px_50px_rgba(0,0,0,0.12)]"
              style={{ pointerEvents: "all" }}
            >
              <div className="mb-2 text-xs font-semibold text-zinc-800">Edit decision label</div>
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
              <div className="mt-2 text-[11px] text-zinc-500">Enter to save • Esc to cancel</div>
            </div>
          </EdgeLabelRenderer>
        ) : null}
      </ReactFlow>

      <div className={wfHintOverlayClass}>
        💡 Click a node to edit details • Click icons to add connections • Drag to pan
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
  (prevProps, nextProps) => prevProps.workflowId === nextProps.workflowId
);

/* ============================== MAIN WORKFLOWS VIEW ============================== */
export default function Workflows() {
  const {
    workflows,
    selectedWorkflowId,
    setSelectedWorkflowId,
    createWorkflow,
    updateWorkflowLocal,
    deleteWorkflow
  } = useDFMEA();

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

  function handleDeleteActiveWorkflow() {
    if (!activeWorkflow) return;

    const ok = window.confirm(
      `Delete workflow "${activeWorkflow.title?.trim() ? activeWorkflow.title : "Untitled workflow"}"?`
    );
    if (!ok) return;

    deleteWorkflow?.(activeWorkflow.id);
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
            onClick={handleDeleteActiveWorkflow}
            disabled={!activeWorkflow}
            className={cx(
              "text-[12px] px-3 py-2 rounded-xl border transition-colors inline-flex items-center gap-2",
              activeWorkflow
                ? "bg-white border-zinc-200/80 hover:bg-amber-50 text-amber-900"
                : "bg-zinc-100 border-zinc-200/80 text-zinc-400 cursor-not-allowed"
            )}
            title="Delete selected workflow"
          >
            <Trash2 size={16} strokeWidth={2} />
            Delete
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
              onChange={(e) =>
                updateWorkflowLocal(activeWorkflow.id, { title: e.target.value })
              }
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
