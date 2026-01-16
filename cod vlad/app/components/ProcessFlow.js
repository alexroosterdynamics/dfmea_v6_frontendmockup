'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import {
    ReactFlow,
    Background,
    MarkerType,
    Position,
    Handle,
    EdgeLabelRenderer,
} from '@xyflow/react';

const CONNECTION_TYPES = {
    SERIES: 'series',
    DECISION: 'decision',
    PARALLEL: 'parallel',
    SUBSTEP: 'substep',
    ROUTE: 'route',
    CONDITION: 'condition',
};

/**
 * --- GRID SETTINGS ---
 */
const GRID = {
    CELL_WIDTH: 180,
    CELL_HEIGHT: 90,
    NODE_WIDTH: 120,
    NODE_HEIGHT: 40,
};

const gridToPixel = (gridX, gridY) => ({
    x: gridX * GRID.CELL_WIDTH,
    y: gridY * GRID.CELL_HEIGHT,
});

const colorByType = {
    [CONNECTION_TYPES.SERIES]: '#3b82f6',
    [CONNECTION_TYPES.DECISION]: '#f59e0b',
    [CONNECTION_TYPES.PARALLEL]: '#10b981',
    [CONNECTION_TYPES.SUBSTEP]: '#8b5cf6',
    [CONNECTION_TYPES.ROUTE]: '#f97316',
    [CONNECTION_TYPES.CONDITION]: '#06b6d4',
};

function getHandlesForType(type) {
    // Match your original geometry:
    // SERIES/DECISION/CONDITION: start from right, go into target left
    // ROUTE: start from left, land on target right
    // SUBSTEP: start bottom, land left
    // PARALLEL: start bottom, land top
    switch (type) {
        case CONNECTION_TYPES.ROUTE:
            return { sourceHandle: 'l', targetHandle: 'r' };
        case CONNECTION_TYPES.SUBSTEP:
            return { sourceHandle: 'b', targetHandle: 'l' };
        case CONNECTION_TYPES.PARALLEL:
            return { sourceHandle: 'b', targetHandle: 't' };
        case CONNECTION_TYPES.CONDITION:
        case CONNECTION_TYPES.SERIES:
        case CONNECTION_TYPES.DECISION:
        default:
            return { sourceHandle: 'r', targetHandle: 'l' };
    }
}

/**
 * ============================================================
 *  Custom Node (Reproduces your ProcessNode behavior)
 * ============================================================
 */
function ProcessNode({ id, data, selected }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(data.label);

    useEffect(() => setEditValue(data.label), [data.label]);

    const onDoubleClick = (e) => {
        e.stopPropagation();
        setIsEditing(true);
    };

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

    const iconBtn =
        'absolute flex h-7 w-7 items-center justify-center rounded-full border ' +
        'bg-zinc-950/80 text-sm font-semibold text-white shadow ' +
        'opacity-0 scale-95 transition ' +
        'group-hover:opacity-100 group-hover:scale-100';

    const iconRing =
        'hover:brightness-125 active:scale-95 focus:outline-none';

    // Icon layout matching your diagram positions:
    const icons = [
        {
            type: CONNECTION_TYPES.ROUTE,
            symbol: '←',
            label: 'Route',
            color: '#f97316',
            className: 'left-[-34px] top-1/2 -translate-y-1/2',
        },
        {
            type: CONNECTION_TYPES.SERIES,
            symbol: '→',
            label: 'Series',
            color: '#3b82f6',
            className: 'right-[-34px] top-[35%] -translate-y-1/2',
        },
        {
            type: CONNECTION_TYPES.CONDITION,
            symbol: '◇',
            label: 'Condition',
            color: '#06b6d4',
            className: 'right-[-34px] bottom-[-34px]',
        },
        {
            type: CONNECTION_TYPES.SUBSTEP,
            symbol: '↳',
            label: 'SubStep',
            color: '#8b5cf6',
            className: 'left-[10px] bottom-[-34px]',
        },
        {
            type: CONNECTION_TYPES.PARALLEL,
            symbol: '⇊',
            label: 'Parallel',
            color: '#10b981',
            className: 'left-1/2 bottom-[-34px] -translate-x-1/2',
        },
    ];

    return (
        <div className="group relative" style={{ width: GRID.NODE_WIDTH }}>
            {/* Hidden handles (we route edges using handle IDs) */}
            <Handle id="l" type="source" position={Position.Left} style={{ opacity: 0 }} />
            <Handle id="r" type="source" position={Position.Right} style={{ opacity: 0 }} />
            <Handle id="t" type="source" position={Position.Top} style={{ opacity: 0 }} />
            <Handle id="b" type="source" position={Position.Bottom} style={{ opacity: 0 }} />

            <Handle id="l" type="target" position={Position.Left} style={{ opacity: 0 }} />
            <Handle id="r" type="target" position={Position.Right} style={{ opacity: 0 }} />
            <Handle id="t" type="target" position={Position.Top} style={{ opacity: 0 }} />
            <Handle id="b" type="target" position={Position.Bottom} style={{ opacity: 0 }} />

            <div
                onDoubleClick={onDoubleClick}
                className={[
                    'relative h-10 w-[120px] rounded-xl border px-3',
                    'flex items-center justify-center',
                    'bg-zinc-950/70 text-zinc-100',
                    selected ? 'border-blue-400 shadow-[0_0_0_2px_rgba(59,130,246,0.35)]' : 'border-zinc-700',
                ].join(' ')}
            >
                {isEditing ? (
                    <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commit}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') commit();
                            if (e.key === 'Escape') cancel();
                        }}
                        className="w-full bg-transparent text-center outline-none"
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <span className="text-sm font-semibold">{data.label}</span>
                )}

                {id !== 'start' && (
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

                {/* Spawn icons */}
                {icons.map((ic) => (
                    <button
                        key={ic.type}
                        title={ic.label}
                        className={`${iconBtn} ${iconRing} ${ic.className}`}
                        style={{ borderColor: ic.color, boxShadow: `0 0 0 1px ${ic.color}33` }}
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

/**
 * ============================================================
 *  Custom Edges (match your SVG paths)
 * ============================================================
 */

function SeriesEdge({ id, sourceX, sourceY, targetX, targetY, data, markerEnd }) {
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

function DecisionEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    data,
    markerEnd,
}) {
    const stroke = colorByType[CONNECTION_TYPES.DECISION];

    const diamondX = sourceX + 35;
    const diamondY = sourceY;
    const diamondSize = 16;

    const bendX = diamondX + diamondSize + 25;
    const dotRadius = 4;

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
            <circle cx={bendX} cy={targetY} r={dotRadius} fill={stroke} />

            {/* Click-to-edit label like your current UI */}
            {data?.label ? (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${bendX + 46}px, ${targetY - 12}px)`,
                            pointerEvents: 'all',
                        }}
                        className="cursor-pointer select-none"
                        onClick={(e) => {
                            e.stopPropagation();
                            data.setEditingEdgeId(id);
                        }}
                    >
                        <div className="rounded bg-zinc-950/90 px-2 py-0.5 text-[11px] font-semibold"
                            style={{ color: stroke }}>
                            {data.label}
                        </div>
                    </div>
                </EdgeLabelRenderer>
            ) : null}
        </>
    );
}

function RouteEdge({ id, sourceX, sourceY, targetX, targetY, markerEnd }) {
    const stroke = colorByType[CONNECTION_TYPES.ROUTE];
    const bendX = sourceX - 35;
    const dotRadius = 4;

    const d = `M ${sourceX} ${sourceY} L ${bendX} ${sourceY} L ${bendX} ${targetY} L ${targetX} ${targetY}`;

    return (
        <>
            <path d={d} stroke={stroke} strokeWidth="2" fill="none" markerEnd={markerEnd} />
            <circle cx={bendX} cy={targetY} r={dotRadius} fill={stroke} />
        </>
    );
}

function ConditionEdge({ id, sourceX, sourceY, targetX, targetY, markerEnd }) {
    const stroke = colorByType[CONNECTION_TYPES.CONDITION];

    const diamondX = sourceX + 35;
    const diamondY = sourceY;
    const diamondSize = 14;

    const bendX = diamondX + diamondSize + 20;
    const dotRadius = 4;

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
            <circle cx={bendX} cy={targetY} r={dotRadius} fill={stroke} />
        </>
    );
}

function SubStepEdge({ id, sourceX, sourceY, targetX, targetY, markerEnd }) {
    const stroke = colorByType[CONNECTION_TYPES.SUBSTEP];
    const dotRadius = 4;

    const d = `M ${sourceX} ${sourceY} L ${sourceX} ${targetY} L ${targetX} ${targetY}`;

    return (
        <>
            <path
                d={d}
                stroke={stroke}
                strokeWidth="2"
                strokeDasharray="6,4"
                fill="none"
                markerEnd={markerEnd}
            />
            <circle cx={sourceX} cy={targetY} r={dotRadius} fill={stroke} />
        </>
    );
}

function ParallelEdge({ sourceX, sourceY, targetY }) {
    const stroke = colorByType[CONNECTION_TYPES.PARALLEL];
    const offset = 6;

    return (
        <>
            <path d={`M ${sourceX - offset} ${sourceY} L ${sourceX - offset} ${targetY}`} stroke={stroke} strokeWidth="2" fill="none" />
            <path d={`M ${sourceX + offset} ${sourceY} L ${sourceX + offset} ${targetY}`} stroke={stroke} strokeWidth="2" fill="none" />
        </>
    );
}

/**
 * ============================================================
 *  MAIN FLOW (Reproduces your ProcessCanvas)
 * ============================================================
 */
export default function ProcessFlow() {
    const [nodes, setNodes] = useState(() => {
        const startPos = gridToPixel(3, 1);
        return [
            {
                id: 'start',
                type: 'process',
                position: startPos,
                data: {
                    label: 'Start',
                    gridX: 3,
                    gridY: 1,
                    connections: [],
                },
            },
        ];
    });

    const [editingEdgeId, setEditingEdgeId] = useState(null);
    const [editingValue, setEditingValue] = useState('');

    // Update node label
    const onUpdateLabel = useCallback((nodeId, label) => {
        setNodes((prev) =>
            prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, label } } : n))
        );
    }, []);

    // Delete node
    const onDeleteNode = useCallback((nodeId) => {
        if (nodeId === 'start') return;
        setNodes((prev) => {
            const filtered = prev.filter((n) => n.id !== nodeId);
            return filtered.map((n) => ({
                ...n,
                data: {
                    ...n.data,
                    connections: (n.data.connections || []).filter((c) => c.targetId !== nodeId),
                },
            }));
        });
    }, []);

    // Push down to make room (your logic)
    const pushNodesDown = useCallback((fromGridY, excludeIds = []) => {
        setNodes((prev) =>
            prev.map((n) => {
                if (excludeIds.includes(n.id)) return n;
                if ((n.data.gridY ?? 0) >= fromGridY) {
                    const nextGY = n.data.gridY + 1;
                    const nextPos = gridToPixel(n.data.gridX, nextGY);
                    return {
                        ...n,
                        position: nextPos,
                        data: { ...n.data, gridY: nextGY },
                    };
                }
                return n;
            })
        );
    }, []);

    const addNode = useCallback(
        (sourceNodeId, connectionType, label = 'Step') => {
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

            let gridX = source.data.gridX;
            let gridY = source.data.gridY;
            let pushFrom = null;

            switch (connectionType) {
                case CONNECTION_TYPES.ROUTE: {
                    const routeCount = countByType(CONNECTION_TYPES.ROUTE);
                    gridX = source.data.gridX - 2;
                    gridY = source.data.gridY + routeCount;
                    if (routeCount > 0) pushFrom = gridY;
                    break;
                }
                case CONNECTION_TYPES.CONDITION: {
                    const conditionCount = countByType(CONNECTION_TYPES.CONDITION);
                    gridX = source.data.gridX + 2;
                    gridY = source.data.gridY + 1 + conditionCount;
                    pushFrom = gridY;
                    break;
                }
                case CONNECTION_TYPES.SUBSTEP: {
                    const subCount = countByType(CONNECTION_TYPES.SUBSTEP);
                    gridX = source.data.gridX + 1;
                    gridY = source.data.gridY + 1 + subCount;
                    pushFrom = gridY;
                    break;
                }
                case CONNECTION_TYPES.SERIES: {
                    const seriesCount = countByType(CONNECTION_TYPES.SERIES);
                    gridX = source.data.gridX + 2;
                    if (seriesCount === 0) gridY = source.data.gridY;
                    else {
                        gridY = source.data.gridY + seriesCount;
                        pushFrom = gridY;
                    }
                    break;
                }
                case CONNECTION_TYPES.PARALLEL: {
                    // PARALLEL:
                    // Always sits BELOW any existing SUBSTEP nodes from the same source.
                    // This guarantees SUBSTEP nodes always remain between source and parallel target.
                    const parCount = countByType(CONNECTION_TYPES.PARALLEL);
                    const substepCount = countByType(CONNECTION_TYPES.SUBSTEP);

                    gridX = source.data.gridX;

                    // 👇 critical fix:
                    // if substeps already exist, parallel must be pushed further down
                    gridY = source.data.gridY + 1 + substepCount + parCount;

                    // push everything below this point down (won't affect substeps above)
                    pushFrom = gridY;
                    break;
                }
            }

            // Series → Decision conversion like your code
            const existingSeriesConnections = existing.filter(
                (c) => c.type === CONNECTION_TYPES.SERIES || c.type === CONNECTION_TYPES.DECISION
            );

            let actualType = connectionType;
            let connectionLabel = '';

            if (connectionType === CONNECTION_TYPES.SERIES && existingSeriesConnections.length > 0) {
                actualType = CONNECTION_TYPES.DECISION;
                connectionLabel = `Option ${existingSeriesConnections.length + 1}`;
            }

            // Push down if needed
            if (pushFrom !== null) pushNodesDown(pushFrom, [sourceNodeId]);

            // Create the new node
            const newPos = gridToPixel(gridX, gridY);

            setNodes((prev) => {
                let updated = [...prev];

                // Convert any existing SERIES to DECISION on source node
                if (connectionType === CONNECTION_TYPES.SERIES && existingSeriesConnections.length > 0) {
                    updated = updated.map((n) => {
                        if (n.id !== sourceNodeId) return n;
                        return {
                            ...n,
                            data: {
                                ...n.data,
                                connections: (n.data.connections || []).map((c) =>
                                    c.type === CONNECTION_TYPES.SERIES
                                        ? { ...c, type: CONNECTION_TYPES.DECISION, label: c.label || 'Option 1' }
                                        : c
                                ),
                            },
                        };
                    });
                }

                // Add the new connection on source node
                updated = updated.map((n) => {
                    if (n.id !== sourceNodeId) return n;
                    return {
                        ...n,
                        data: {
                            ...n.data,
                            connections: [
                                ...(n.data.connections || []),
                                { targetId: newNodeId, type: actualType, label: connectionLabel },
                            ],
                        },
                    };
                });

                // Append the new node
                updated.push({
                    id: newNodeId,
                    type: 'process',
                    position: newPos,
                    data: {
                        label,
                        gridX,
                        gridY,
                        connections: [],
                    },
                });

                return updated;
            });

            return newNodeId;
        },
        [nodes, pushNodesDown]
    );

    // Build ReactFlow edges from node connections (like your useEffect)
    const edges = useMemo(() => {
        const all = [];

        const bySourceDecisionCount = new Map(); // used for showDiamond only on first

        nodes.forEach((n) => {
            (n.data.connections || []).forEach((conn) => {
                const id = `${n.id}-${conn.targetId}`;
                const stroke = colorByType[conn.type] || '#64748b';

                const { sourceHandle, targetHandle } = getHandlesForType(conn.type);

                const markerEnd =
                    conn.type === CONNECTION_TYPES.PARALLEL
                        ? undefined
                        : {
                            type: MarkerType.ArrowClosed,
                            width: 16,
                            height: 16,
                            color: stroke,
                        };

                // showDiamond only once per source for decision branches
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
                    type: conn.type, // edgeTypes uses this
                    markerEnd,
                    data: {
                        label: conn.label || '',
                        showDiamond,
                        setEditingEdgeId,
                    },
                });
            });
        });

        return all;
    }, [nodes]);

    // Update edge label (edits the connection object)
    const updateEdgeLabel = useCallback((edgeId, newLabel) => {
        const [sourceId, targetId] = edgeId.split('-');

        setNodes((prev) =>
            prev.map((n) => {
                if (n.id !== sourceId) return n;
                return {
                    ...n,
                    data: {
                        ...n.data,
                        connections: (n.data.connections || []).map((c) =>
                            c.targetId === targetId ? { ...c, label: newLabel } : c
                        ),
                    },
                };
            })
        );
    }, []);

    // When you click a decision label: open inline editor
    useEffect(() => {
        if (!editingEdgeId) return;
        const edge = edges.find((e) => e.id === editingEdgeId);
        setEditingValue(edge?.data?.label ?? '');
    }, [editingEdgeId, edges]);

    const nodeTypes = useMemo(
        () => ({
            process: ProcessNode,
        }),
        []
    );

    const edgeTypes = useMemo(
        () => ({
            [CONNECTION_TYPES.SERIES]: SeriesEdge,
            [CONNECTION_TYPES.DECISION]: DecisionEdge,
            [CONNECTION_TYPES.ROUTE]: RouteEdge,
            [CONNECTION_TYPES.CONDITION]: ConditionEdge,
            [CONNECTION_TYPES.SUBSTEP]: SubStepEdge,
            [CONNECTION_TYPES.PARALLEL]: ParallelEdge,
        }),
        []
    );

    // Inject callbacks into every node via data (clean Next.js approach)
    const nodesWithCallbacks = useMemo(() => {
        return nodes.map((n) => ({
            ...n,
            style: { width: GRID.NODE_WIDTH, height: GRID.NODE_HEIGHT },
            data: {
                ...n.data,
                onAddConnection: addNode,
                onUpdateLabel,
                onDeleteNode,
            },
        }));
    }, [nodes, addNode, onUpdateLabel, onDeleteNode]);

    return (
        <div className="flex h-[calc(100vh-40px)] w-full flex-col bg-zinc-950">
            {/* Toolbar */}
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
                <h1 className="text-lg font-bold text-zinc-100">Process Builder</h1>

                <div className="flex flex-wrap gap-3 text-xs font-semibold">
                    <span className="flex items-center gap-1 text-[#f97316]">● Route</span>
                    <span className="flex items-center gap-1 text-[#06b6d4]">● Condition</span>
                    <span className="flex items-center gap-1 text-[#8b5cf6]">● SubStep</span>
                    <span className="flex items-center gap-1 text-[#3b82f6]">● Series</span>
                    <span className="flex items-center gap-1 text-[#f59e0b]">● Decision</span>
                    <span className="flex items-center gap-1 text-[#10b981]">● Parallel</span>
                </div>
            </div>

            <div className="relative flex-1">
                <ReactFlow
                    nodes={nodesWithCallbacks}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable={true}
                    fitView={false}
                    defaultViewport={{ x: 50, y: 50, zoom: 1 }}
                    panOnDrag={[1, 2]}              // middle/right mouse drag
                    panActivationKeyCode="Alt"      // Alt + left drag panning :contentReference[oaicite:1]{index=1}
                    selectionOnDrag={false}
                    className="bg-zinc-950"
                >
                    {/* grid dots */}
                    <Background gap={24} size={1} />

                    {/* Decision label editor (inline, flow-synced) */}
                    {editingEdgeId ? (
                        <EdgeLabelRenderer>
                            <div
                                className="absolute left-4 top-4 z-[999] rounded-xl border border-zinc-700 bg-zinc-950/90 p-3 shadow-lg"
                                style={{ pointerEvents: 'all' }}
                            >
                                <div className="mb-2 text-xs font-semibold text-zinc-200">
                                    Edit decision label
                                </div>
                                <input
                                    autoFocus
                                    value={editingValue}
                                    onChange={(e) => setEditingValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            updateEdgeLabel(editingEdgeId, editingValue);
                                            setEditingEdgeId(null);
                                        }
                                        if (e.key === 'Escape') setEditingEdgeId(null);
                                    }}
                                    onBlur={() => {
                                        updateEdgeLabel(editingEdgeId, editingValue);
                                        setEditingEdgeId(null);
                                    }}
                                    className="w-64 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none"
                                />
                                <div className="mt-2 text-[11px] text-zinc-400">Enter to save • Esc to cancel</div>
                            </div>
                        </EdgeLabelRenderer>
                    ) : null}
                </ReactFlow>

                {/* Instructions */}
                <div className="absolute bottom-3 left-3 rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-xs text-zinc-200">
                    💡 Click icons around nodes to add connections • Click decision labels to edit • Alt+drag to pan
                </div>
            </div>
        </div>
    );
}
