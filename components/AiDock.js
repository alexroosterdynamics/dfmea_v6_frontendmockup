"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Maximize2,
  Expand,
  Plus,
  ArrowUp,
  X,
  PanelRightOpen,
  PanelRightClose,
  Sparkles
} from "lucide-react";

const cx = (...c) => c.filter(Boolean).join(" ");

/* ----------------------------- Shadows ----------------------------- */
const SH_DOCK =
  "shadow-[0_1px_0_rgba(0,0,0,0.06),0_30px_70px_rgba(0,0,0,0.16)]";

/* ----------------------------- Snap thresholds ----------------------------- */
const SNAP_RIGHT_EDGE_PX = 36; // near right edge = sidebar
const SNAP_CORNER_PX = 120; // near bottom-right corner = orb
const ORB_SIZE = 72;
const FLOAT_W = 560; // floating width
const BOTTOM_W = 860; // bottom dock width
const SIDEBAR_W = 420; // right sidebar width

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

export default function AiDock({ tabData }) {
  /* ----------------------------- safe tabData ----------------------------- */
  const safeTitle = tabData?.title ?? "Workspace";
  const welcome =
    tabData?.assistant?.welcome ??
    "Hey — I’m your AI assistant. Ask me about requirements, risks, DFMEA, or the current sheet.";

  const suggestedPrompts = tabData?.assistant?.suggestedPrompts ?? [];
  const tabId = tabData?.tabId ?? "unknown";

  /* ----------------------------- chat state ----------------------------- */
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

  const [dockOpen, setDockOpen] = useState(false);
  const [dockSize, setDockSize] = useState("sm"); // sm | md | lg
  const [fullscreen, setFullscreen] = useState(false);

  const listRef = useRef(null);

  /* -----------------------------
    layout modes:
    - bottom: your current default pinned bottom center
    - floating: draggable free window
    - sidebar: snapped right panel
    - orb: tiny assistant circle
  ----------------------------- */
  const [mode, setMode] = useState("bottom");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // where floating / orb live
  const [pos, setPos] = useState({ x: 0, y: 0 });

  // drag system
  const drag = useRef({
    active: false,
    pointerId: null,
    offsetX: 0,
    offsetY: 0,
    preview: null, // "floating" | "sidebar" | "orb"
    startMode: "bottom"
  });

  const [isDragging, setIsDragging] = useState(false);
  const [previewMode, setPreviewMode] = useState(null);

  /* ----------------------------- init welcome per tab ----------------------------- */
  useEffect(() => {
    setInput("");
    setMessages([{ role: "assistant", text: welcome }]);
    // do not auto-open when switching tabs; only change welcome message
  }, [tabId, welcome]);

  /* ----------------------------- autoscroll chat ----------------------------- */
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, dockOpen, dockSize, fullscreen, mode, sidebarOpen]);

  /* ----------------------------- send mock message ----------------------------- */
  function send(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed) return;

    setMessages((m) => [
      ...m,
      { role: "user", text: trimmed },
      {
        role: "assistant",
        text:
          "Mock response. Wire this to your LLM later (and pass selected DFMEA context / viewport data)."
      }
    ]);

    setInput("");
    setDockOpen(true);
    if (mode === "orb") {
      // clicking orb should open normally -> become floating
      snapToFloatingNearCorner();
    }
    if (mode === "sidebar") setSidebarOpen(true);
  }

  function cycleSize() {
    setDockSize((s) => (s === "sm" ? "md" : s === "md" ? "lg" : "sm"));
    setDockOpen(true);
  }

  const heightClass =
    dockSize === "sm" ? "h-44" : dockSize === "lg" ? "h-[520px]" : "h-64";

  /* ----------------------------- shell component ----------------------------- */
  const Shell = ({ children, className = "" }) => (
    <div
      className={cx(
        "border border-zinc-200/80 bg-white overflow-hidden",
        SH_DOCK,
        "transition-[border-radius,width,height,transform,opacity] duration-300 ease-out",
        className
      )}
    >
      {children}
    </div>
  );

  const PromptChips = () =>
    suggestedPrompts.length ? (
      <div className="px-4 pb-3 bg-white">
        <div className="flex flex-wrap gap-2">
          {suggestedPrompts.map((p) => (
            <button
              key={p}
              onClick={() => send(p)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200/70 border border-zinc-200/80 text-zinc-700 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    ) : null;

  const Messages = () => (
    <div
      ref={listRef}
      className={cx("overflow-y-auto px-4 py-4 space-y-3 bg-[#fbfbfa]", heightClass)}
    >
      {messages.map((m, idx) => (
        <div
          key={idx}
          className={cx(
            "max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed tracking-tight",
            m.role === "user"
              ? "ml-auto bg-zinc-900 text-white"
              : "bg-white border border-zinc-200/80 text-zinc-800"
          )}
        >
          {m.text}
        </div>
      ))}
    </div>
  );

  const CompactComposer = ({ compact }) => (
    <div className={cx("bg-white", compact ? "p-3" : "p-3 border-t border-zinc-200/70")}>
      <div className="flex items-center gap-2 rounded-2xl border border-zinc-200/80 bg-white px-3 py-2">
        <button
          type="button"
          className="h-8 w-8 rounded-full grid place-items-center hover:bg-zinc-100 transition-colors"
          aria-label="Attach"
        >
          <Plus size={16} strokeWidth={1.8} className="text-zinc-700" />
        </button>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          className="flex-1 text-[13px] tracking-tight outline-none placeholder:text-zinc-400"
          placeholder="Ask anything…"
        />

        <button
          type="button"
          onClick={() => send(input)}
          className={cx(
            "h-8 w-8 rounded-full grid place-items-center",
            input.trim()
              ? "bg-zinc-900 hover:bg-zinc-800"
              : "bg-zinc-200 cursor-not-allowed",
            "transition-colors"
          )}
          aria-label="Send"
          disabled={!input.trim()}
        >
          <ArrowUp size={16} strokeWidth={2.2} className="text-white" />
        </button>
      </div>

      {compact ? (
        <div className="mt-2 flex items-center justify-between">
          <button
            onClick={() => {
              setDockOpen(true);
              if (mode === "orb") snapToFloatingNearCorner();
              if (mode === "sidebar") setSidebarOpen(true);
            }}
            className="text-[11px] text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            Open chat
          </button>

          <div className="text-[11px] text-zinc-500">AI Assistant • {safeTitle}</div>
        </div>
      ) : (
        <div className="mt-2 text-[11px] text-zinc-500">
          Tip: later you can add “Send selection to AI” from the viewport.
        </div>
      )}
    </div>
  );

  /* ----------------------------- fullscreen overlay ----------------------------- */
  const Fullscreen = () => {
    if (!fullscreen) return null;

    return (
      <div className="fixed inset-0 z-[80]">
        <div
          className="absolute inset-0 bg-zinc-950/25 backdrop-blur-sm"
          onClick={() => setFullscreen(false)}
        />
        <div className="absolute inset-0 p-6 flex">
          <div className="m-auto w-full max-w-4xl h-[80vh]">
            <Shell className="rounded-2xl h-full">
              <div className="px-4 py-3 flex items-center justify-between bg-white border-b border-zinc-200/70">
                <div>
                  <div className="text-[13px] font-semibold tracking-tight text-zinc-900">
                    AI Assistant
                  </div>
                  <div className="text-[11px] text-zinc-500">Full window • mock</div>
                </div>

                <button
                  onClick={() => setFullscreen(false)}
                  className="text-[11px] px-2 py-1 rounded-xl bg-zinc-100 hover:bg-zinc-200/70 border border-zinc-200/80 text-zinc-700 transition-colors"
                >
                  Close
                </button>
              </div>

              <PromptChips />
              <div className="h-[calc(80vh-170px)]">
                <div
                  ref={listRef}
                  className="h-full overflow-y-auto px-4 py-4 space-y-3 bg-[#fbfbfa]"
                >
                  {messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={cx(
                        "max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed tracking-tight",
                        m.role === "user"
                          ? "ml-auto bg-zinc-900 text-white"
                          : "bg-white border border-zinc-200/80 text-zinc-800"
                      )}
                    >
                      {m.text}
                    </div>
                  ))}
                </div>
              </div>

              <CompactComposer compact={false} />
            </Shell>
          </div>
        </div>
      </div>
    );
  };

  /* -----------------------------
    Drag logic:
    - drag from header area near "AI Assistant"
    - while dragging, compute preview snap:
        * near right edge -> sidebar
        * near bottom-right corner -> orb
        * otherwise -> floating
  ----------------------------- */

  const canDragFrom = (el) => {
    if (!el) return true;
    // don't start drag from buttons/inputs
    const tag = el.tagName?.toLowerCase?.();
    if (tag === "button" || tag === "input" || tag === "textarea" || tag === "select") return false;
    // also ignore icons inside buttons etc
    if (el.closest?.("button, input, textarea, select")) return false;
    return true;
  };

  function getViewport() {
    if (typeof window === "undefined") return { w: 1200, h: 800 };
    return { w: window.innerWidth, h: window.innerHeight };
  }

  function computePreview(clientX, clientY) {
    const { w, h } = getViewport();

    const nearRight = w - clientX <= SNAP_RIGHT_EDGE_PX;
    const nearCorner = w - clientX <= SNAP_CORNER_PX && h - clientY <= SNAP_CORNER_PX;

    if (nearCorner) return "orb";
    if (nearRight) return "sidebar";
    return "floating";
  }

  function snapToOrb() {
    const { w, h } = getViewport();
    const margin = 18;
    setMode("orb");
    setDockOpen(false);
    setSidebarOpen(true);
    setPos({
      x: w - ORB_SIZE - margin,
      y: h - ORB_SIZE - margin
    });
  }

  function snapToSidebar() {
    setMode("sidebar");
    setSidebarOpen(true);
    setDockOpen(true);
  }

  function snapToBottom() {
    setMode("bottom");
  }

  function snapToFloatingNearCorner() {
    const { w, h } = getViewport();
    const margin = 18;
    const panelW = FLOAT_W;
    const panelH = dockOpen ? 420 : 150;
    setMode("floating");
    setPos({
      x: w - panelW - margin,
      y: h - panelH - margin - 60
    });
    setDockOpen(true);
  }

  function onPointerDownHeader(e) {
    if (!canDragFrom(e.target)) return;

    // Only allow drag if click is on the header "handle" area
    // We'll allow drag from this top bar region (near AI Assistant label)
    e.preventDefault();

    const { w, h } = getViewport();

    drag.current.active = true;
    drag.current.pointerId = e.pointerId ?? null;
    drag.current.startMode = mode;

    setIsDragging(true);

    // Convert current "mode" into a starting position if needed
    // bottom/sidebar don't have pos -> start from cursor anchored
    const startX = e.clientX;
    const startY = e.clientY;

    let baseX = pos.x;
    let baseY = pos.y;

    if (mode === "bottom") {
      // start floating roughly from the bottom center
      baseX = clamp((w - FLOAT_W) / 2, 12, w - FLOAT_W - 12);
      baseY = clamp(h - 260, 12, h - 220);
      setPos({ x: baseX, y: baseY });
      setMode("floating");
    }

    if (mode === "sidebar") {
      // pull out from sidebar to floating under cursor
      baseX = clamp(w - FLOAT_W - 18, 12, w - FLOAT_W - 12);
      baseY = clamp(140, 12, h - 220);
      setPos({ x: baseX, y: baseY });
      setMode("floating");
    }

    if (mode === "orb") {
      // if somehow dragging from orb header (not typical), we treat as floating
      baseX = clamp(w - FLOAT_W - 18, 12, w - FLOAT_W - 12);
      baseY = clamp(h - 260, 12, h - 220);
      setPos({ x: baseX, y: baseY });
      setMode("floating");
    }

    drag.current.offsetX = startX - baseX;
    drag.current.offsetY = startY - baseY;

    setPreviewMode(null);

    // capture pointer (more stable dragging)
    try {
      e.currentTarget?.setPointerCapture?.(e.pointerId);
    } catch {}
  }

  function onPointerMoveWindow(e) {
    if (!drag.current.active) return;

    const { w, h } = getViewport();
    const nextX = clamp(e.clientX - drag.current.offsetX, 10, w - FLOAT_W - 10);
    const nextY = clamp(e.clientY - drag.current.offsetY, 10, h - 110);

    setPos({ x: nextX, y: nextY });

    const p = computePreview(e.clientX, e.clientY);
    drag.current.preview = p;
    setPreviewMode(p);
  }

  function onPointerUpWindow() {
    if (!drag.current.active) return;

    drag.current.active = false;
    drag.current.pointerId = null;

    setIsDragging(false);

    // snap based on preview
    const p = drag.current.preview;
    setPreviewMode(null);
    drag.current.preview = null;

    if (p === "orb") {
      snapToOrb();
      return;
    }
    if (p === "sidebar") {
      snapToSidebar();
      return;
    }

    // otherwise keep floating at pos
    setMode("floating");
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    const move = (e) => onPointerMoveWindow(e);
    const up = () => onPointerUpWindow();

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);

    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, dockOpen]);

  /* ----------------------------- visuals based on mode ----------------------------- */
  const frameStyle = useMemo(() => {
    if (mode === "floating") {
      return {
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: FLOAT_W,
        zIndex: 60
      };
    }

    if (mode === "orb") {
      return {
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: ORB_SIZE,
        height: ORB_SIZE,
        zIndex: 65
      };
    }

    if (mode === "sidebar") {
      return {
        position: "fixed",
        right: 16,
        top: 16,
        bottom: 16,
        width: SIDEBAR_W,
        zIndex: 60
      };
    }

    // bottom (default)
    return {};
  }, [mode, pos.x, pos.y]);

  const frameClass = useMemo(() => {
    if (mode === "bottom") return "max-w-[860px] mx-auto";
    if (mode === "floating") {
      const morph =
        previewMode === "orb"
          ? "scale-[0.95] opacity-90"
          : previewMode === "sidebar"
            ? "scale-[0.98] opacity-95"
            : "opacity-100";
      return cx(morph);
    }
    return "";
  }, [mode, previewMode]);

  /* ----------------------------- Orb UI ----------------------------- */
  const Orb = () => {
    if (mode !== "orb") return null;

    return (
      <div style={frameStyle}>
        <button
          onClick={() => {
            // click orb -> open normally
            snapToFloatingNearCorner();
          }}
          className={cx(
            "w-full h-full rounded-full border border-zinc-200/70",
            "bg-white/90 backdrop-blur",
            "shadow-[0_14px_40px_rgba(0,0,0,0.18)]",
            "hover:scale-[1.02] active:scale-[0.98] transition-transform",
            "grid place-items-center relative overflow-hidden"
          )}
          title="AI Assistant"
        >
          {/* fun pulse ring */}
          <div className="absolute inset-0">
            <div className="absolute inset-[-40%] bg-[radial-gradient(circle,rgba(24,24,27,0.18),transparent_55%)] animate-[spin_9s_linear_infinite]" />
          </div>

          <div className="relative">
            <div className="h-11 w-11 rounded-2xl bg-zinc-900 text-white grid place-items-center shadow-sm">
              <Sparkles size={18} strokeWidth={2} />
            </div>
          </div>
        </button>

        {/* tiny hint */}
        <div className="mt-2 text-center text-[10px] text-zinc-500 select-none">
          AI
        </div>
      </div>
    );
  };

  /* ----------------------------- Sidebar UI ----------------------------- */
  const Sidebar = () => {
    if (mode !== "sidebar") return null;

    return (
      <div style={frameStyle}>
        <Shell className={cx("rounded-2xl h-full flex flex-col")}>
          {/* HEADER (DRAG HANDLE) */}
          <div
            onPointerDown={onPointerDownHeader}
            className={cx(
              "px-4 py-3 flex items-center justify-between bg-white border-b border-zinc-200/70",
              "cursor-grab active:cursor-grabbing select-none"
            )}
            title="Drag me"
          >
            <div className="min-w-0">
              <div className="text-[13px] font-semibold tracking-tight text-zinc-900">
                AI Assistant
              </div>
              <div className="text-[11px] text-zinc-500 truncate">
                Docked sidebar • {safeTitle}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSidebarOpen((v) => !v);
                }}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-xl bg-zinc-100 hover:bg-zinc-200/70 border border-zinc-200/80 text-zinc-700 transition-colors"
                title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              >
                {sidebarOpen ? (
                  <>
                    <PanelRightClose size={14} strokeWidth={1.7} />
                    Hide
                  </>
                ) : (
                  <>
                    <PanelRightOpen size={14} strokeWidth={1.7} />
                    Show
                  </>
                )}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  snapToOrb();
                }}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 transition-colors"
                title="Turn into orb"
              >
                <Sparkles size={14} strokeWidth={1.7} />
                Orb
              </button>
            </div>
          </div>

          {/* BODY */}
          {sidebarOpen ? (
            <>
              <PromptChips />
              <div className="flex-1 min-h-0">
                <div
                  ref={listRef}
                  className="h-full overflow-y-auto px-4 py-4 space-y-3 bg-[#fbfbfa]"
                >
                  {messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={cx(
                        "max-w-[90%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed tracking-tight",
                        m.role === "user"
                          ? "ml-auto bg-zinc-900 text-white"
                          : "bg-white border border-zinc-200/80 text-zinc-800"
                      )}
                    >
                      {m.text}
                    </div>
                  ))}
                </div>
              </div>
              <CompactComposer compact={false} />
            </>
          ) : (
            <div className="p-3">
              <Shell className="rounded-[22px]">
                <CompactComposer compact />
              </Shell>
              <div className="mt-2 text-[11px] text-zinc-500">
                Sidebar collapsed • click “Show”
              </div>
            </div>
          )}
        </Shell>
      </div>
    );
  };

  /* ----------------------------- Bottom/Floating dock UI ----------------------------- */
  const DockPanel = () => {
    // NOT in bottom/floating
    if (mode !== "bottom" && mode !== "floating") return null;

    const floating = mode === "floating";

    // morph preview styles
    const previewShape =
      previewMode === "orb"
        ? "rounded-full scale-[0.88] opacity-90"
        : previewMode === "sidebar"
          ? "rounded-2xl scale-[0.96] opacity-95"
          : "rounded-2xl";

    // When floating, you can “minimize into orb” or “dock right”
    const TopActions = () => (
      <div className="flex items-center gap-1.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setDockOpen(false);
          }}
          className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-xl bg-zinc-100 hover:bg-zinc-200/70 border border-zinc-200/80 text-zinc-700 transition-colors"
          title="Collapse"
        >
          <ChevronDown size={14} strokeWidth={1.7} />
          Collapse
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            cycleSize();
          }}
          className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-xl bg-zinc-100 hover:bg-zinc-200/70 border border-zinc-200/80 text-zinc-700 transition-colors"
          title="Resize"
        >
          <Expand size={14} strokeWidth={1.7} />
          Size
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setFullscreen(true);
          }}
          className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 transition-colors"
          title="Full window"
        >
          <Maximize2 size={14} strokeWidth={1.7} />
          Full
        </button>
      </div>
    );

    // HEADER WITH DRAG HANDLE
    const Header = () => (
      <div
        onPointerDown={onPointerDownHeader}
        className={cx(
          "px-4 py-3 flex items-center justify-between bg-white border-b border-zinc-200/70",
          "cursor-grab active:cursor-grabbing select-none"
        )}
        title="Drag me (snap right for sidebar, drag to corner for orb)"
      >
        <div className="min-w-0">
          <div className="text-[13px] font-semibold tracking-tight text-zinc-900 flex items-center gap-2">
            AI Assistant
            {floating ? (
              <span className="text-[10px] px-2 py-1 rounded-full border border-zinc-200/80 bg-[#fbfbfa] text-zinc-600">
                floating
              </span>
            ) : (
              <span className="text-[10px] px-2 py-1 rounded-full border border-zinc-200/80 bg-[#fbfbfa] text-zinc-600">
                docked
              </span>
            )}
          </div>
          <div className="text-[11px] text-zinc-500 truncate">
            Context-aware chat (mock) • {safeTitle}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {floating ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  snapToSidebar();
                }}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-xl bg-zinc-100 hover:bg-zinc-200/70 border border-zinc-200/80 text-zinc-700 transition-colors"
                title="Dock to right sidebar"
              >
                <PanelRightOpen size={14} strokeWidth={1.7} />
                Dock
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  snapToOrb();
                }}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 transition-colors"
                title="Turn into orb"
              >
                <Sparkles size={14} strokeWidth={1.7} />
                Orb
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  snapToBottom();
                }}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-xl bg-zinc-100 hover:bg-zinc-200/70 border border-zinc-200/80 text-zinc-700 transition-colors"
                title="Return to bottom dock"
              >
                <ChevronDown size={14} strokeWidth={1.7} className="rotate-180" />
                Bottom
              </button>
            </>
          ) : null}

          <TopActions />
        </div>
      </div>
    );

    // collapsed header for bottom/floating
    const CollapsedHeader = () => (
      <div
        onPointerDown={onPointerDownHeader}
        className={cx(
          "px-4 py-2 flex items-center justify-between bg-white",
          "cursor-grab active:cursor-grabbing select-none"
        )}
        title="Drag me"
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setDockOpen(true);
          }}
          className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-xl bg-zinc-100 hover:bg-zinc-200/70 border border-zinc-200/80 text-zinc-700 transition-colors"
          title="Expand"
        >
          <ChevronDown size={14} strokeWidth={1.7} className="rotate-180" />
          Expand
        </button>

        <div className="text-[11px] text-zinc-500">AI Assistant</div>

        <div className="flex items-center gap-1.5">
          {floating ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                snapToOrb();
              }}
              className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 transition-colors"
              title="Turn into orb"
            >
              <Sparkles size={14} strokeWidth={1.7} />
              Orb
            </button>
          ) : null}

          <button
            onClick={(e) => {
              e.stopPropagation();
              setFullscreen(true);
            }}
            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 transition-colors"
            title="Full window"
          >
            <Maximize2 size={14} strokeWidth={1.7} />
            Full
          </button>
        </div>
      </div>
    );

    // wrapper container
    const wrapperProps =
      mode === "floating"
        ? {
            style: frameStyle,
            className: frameClass
          }
        : {
            className: cx("max-w-[860px] mx-auto", frameClass)
          };

    return (
      <div {...wrapperProps}>
        {/* if floating, allow “ghost morphing” while dragging */}
        <div
          className={cx(
            "transition-transform duration-200 ease-out",
            isDragging ? "scale-[1.01]" : "scale-100"
          )}
        >
          {!dockOpen ? (
            <Shell className={cx("rounded-[26px]", previewShape)}>
              <CollapsedHeader />
              <CompactComposer compact />
            </Shell>
          ) : (
            <Shell className={cx("rounded-2xl", previewShape)}>
              <Header />
              <PromptChips />
              <Messages />
              <CompactComposer compact={false} />
            </Shell>
          )}
        </div>

        {/* subtle snap hint while dragging */}
        {isDragging ? (
          <div className="mt-2 text-center text-[11px] text-zinc-500 select-none">
            {previewMode === "orb"
              ? "Release → Orb (bottom-right)"
              : previewMode === "sidebar"
                ? "Release → Sidebar (right edge)"
                : "Release → Floating"}
          </div>
        ) : null}
      </div>
    );
  };

  /* ----------------------------- Render ----------------------------- */
  return (
    <>
      <Fullscreen />

      {/* Orb state */}
      <Orb />

      {/* Sidebar snapped state */}
      <Sidebar />

      {/* Bottom or floating panel */}
      <DockPanel />
    </>
  );
}
