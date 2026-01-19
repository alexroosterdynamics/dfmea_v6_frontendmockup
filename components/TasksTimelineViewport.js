"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  Flag,
  Link2,
  Sparkles,
  X,
  Save,
  LayoutPanelLeft,
  LayoutPanelTop,
  LayoutGrid,
  Maximize2
} from "lucide-react";

const cx = (...c) => c.filter(Boolean).join(" ");

/* ----------------------------- Surface styling ----------------------------- */
const SH_SURFACE =
  "shadow-[0_1px_0_rgba(0,0,0,0.05),0_14px_40px_rgba(0,0,0,0.06)]";

function Surface({ className = "", children }) {
  return (
    <div
      className={cx("rounded-2xl border border-zinc-200/80 bg-white", SH_SURFACE, className)}
    >
      {children}
    </div>
  );
}

function Pill({ tone = "neutral", children }) {
  const cls =
    tone === "good"
      ? "bg-emerald-50 border-emerald-200/70 text-emerald-900"
      : tone === "bad"
        ? "bg-amber-50 border-amber-200/70 text-amber-900"
        : "bg-[#fbfbfa] border-zinc-200/80 text-zinc-700";

  return (
    <span className={cx("text-[11px] px-2 py-1 rounded-full border tracking-tight", cls)}>
      {children}
    </span>
  );
}

function statusMeta(status) {
  if (status === "done") return { label: "Done", tone: "good", icon: CheckCircle2 };
  if (status === "blocked") return { label: "Blocked", tone: "bad", icon: AlertTriangle };
  if (status === "in_progress") return { label: "In progress", tone: "neutral", icon: Clock };
  return { label: "To do", tone: "neutral", icon: Clock };
}

function priorityRank(p) {
  const x = String(p || "").toLowerCase();
  if (x.includes("high")) return 0;
  if (x.includes("medium")) return 1;
  if (x.includes("low")) return 2;
  return 3;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

/* ----------------------------- Timeline helpers ----------------------------- */
function toDate(d) {
  const [y, m, day] = String(d).split("-").map(Number);
  return new Date(y, (m || 1) - 1, day || 1);
}
function diffDays(a, b) {
  const ms = toDate(b).getTime() - toDate(a).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/* ----------------------------- Modal ----------------------------- */
function Modal({ open, title, subtitle, onClose, children, footer }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <div
        className="absolute inset-0 bg-zinc-950/35 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute inset-0 p-6 flex">
        <div className="m-auto w-full max-w-3xl">
          <Surface className="overflow-hidden">
            <div className="px-5 py-4 bg-white border-b border-zinc-200/70 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[14px] font-semibold tracking-tight text-zinc-900 truncate">
                  {title}
                </div>
                {subtitle ? (
                  <div className="mt-1 text-[12px] text-zinc-500 tracking-tight truncate">
                    {subtitle}
                  </div>
                ) : null}
              </div>

              <button
                onClick={onClose}
                className="h-9 w-9 rounded-xl grid place-items-center border border-zinc-200/80 bg-white hover:bg-zinc-100 transition-colors"
                aria-label="Close"
              >
                <X size={16} strokeWidth={2} className="text-zinc-700" />
              </button>
            </div>

            <div className="px-5 py-5 bg-white">{children}</div>

            {footer ? (
              <div className="px-5 py-4 bg-[#fbfbfa] border-t border-zinc-200/70">
                {footer}
              </div>
            ) : null}
          </Surface>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Main Component ----------------------------- */
export default function TasksTimelineViewport({ data }) {
  // incoming data (from tasks.json sheet)
  const projectName = data?.content?.projectName ?? "DFMEA Project";
  const lanes = data?.content?.lanes ?? [];
  const milestones = data?.content?.milestones ?? [];
  const range = data?.content?.range ?? { start: "2026-01-01", end: "2026-02-01" };

  // IMPORTANT: we keep tasks in local state so edits can show instantly in mock UI
  const [tasks, setTasks] = useState(() => data?.content?.tasks ?? []);

  // view modes (Monday/Salesforce-ish switching)
  // timeline: timeline huge, tasks compact
  // split: balanced
  // tasks: tasks big
  // timelineOnly: full width timeline
  const [viewMode, setViewMode] = useState("timeline"); // timeline | split | tasks | timelineOnly

  // filters
  const [query, setQuery] = useState("");
  const [laneFilter, setLaneFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortMode, setSortMode] = useState("priority"); // priority | start | owner

  // modal editing
  const [editId, setEditId] = useState(null);

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "done").length;
    const blocked = tasks.filter((t) => t.status === "blocked").length;
    const ip = tasks.filter((t) => t.status === "in_progress").length;
    const todo = tasks.filter((t) => t.status === "todo").length;
    return { total, done, blocked, ip, todo };
  }, [tasks]);

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    let list = tasks.slice();

    if (laneFilter !== "all") list = list.filter((t) => t.laneId === laneFilter);
    if (statusFilter !== "all") list = list.filter((t) => t.status === statusFilter);

    if (q) {
      list = list.filter((t) => {
        const hay = `${t.id} ${t.title} ${t.description} ${t.priority} ${t.owner?.role} ${t.owner?.name} ${t.tags?.join(
          " "
        )}`.toLowerCase();
        return hay.includes(q);
      });
    }

    if (sortMode === "priority") {
      list.sort((a, b) => {
        const ap = priorityRank(a.priority);
        const bp = priorityRank(b.priority);
        if (ap !== bp) return ap - bp;
        return String(a.id).localeCompare(String(b.id));
      });
    } else if (sortMode === "start") {
      list.sort((a, b) => String(a.start).localeCompare(String(b.start)));
    } else {
      list.sort((a, b) => String(a.owner?.name || "").localeCompare(String(b.owner?.name || "")));
    }

    return list;
  }, [tasks, laneFilter, statusFilter, sortMode, q]);

  // lane grouping for timeline rows
  const byLane = useMemo(() => {
    const map = {};
    lanes.forEach((l) => (map[l.id] = []));
    filtered.forEach((t) => {
      (map[t.laneId] ??= []).push(t);
    });
    return map;
  }, [filtered, lanes]);

  const editTask = useMemo(() => tasks.find((t) => t.id === editId) || null, [tasks, editId]);

  // timeline sizing
  const totalDays = Math.max(1, diffDays(range.start, range.end));
  const pxPerDay = 16; // bigger for readability
  const timelineWidth = totalDays * pxPerDay;

  // split sizing based on viewMode
  const split = useMemo(() => {
    if (viewMode === "timeline") return { left: 32, right: 68 };
    if (viewMode === "split") return { left: 42, right: 58 };
    if (viewMode === "tasks") return { left: 60, right: 40 };
    return { left: 0, right: 100 }; // timelineOnly
  }, [viewMode]);

  function openEditor(taskId) {
    setEditId(taskId);
  }

  function closeEditor() {
    setEditId(null);
  }

  function updateTask(patch) {
    if (!editTask) return;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === editTask.id
          ? {
              ...t,
              ...patch,
              updatedAt: "2026-01-19" // mock “just now”
            }
          : t
      )
    );
  }

  // editor form local draft (so we can cancel)
  const [draft, setDraft] = useState(null);

  // whenever editTask changes, prepare draft
  useMemo(() => {
    if (!editTask) {
      setDraft(null);
      return null;
    }
    setDraft({
      id: editTask.id,
      title: editTask.title || "",
      description: editTask.description || "",
      status: editTask.status || "todo",
      priority: editTask.priority || "",
      laneId: editTask.laneId || "",
      ownerRole: editTask.owner?.role || "",
      ownerName: editTask.owner?.name || "",
      start: editTask.start || range.start,
      end: editTask.end || range.end,
      percentComplete: Number(editTask.percentComplete || 0),
      tags: (editTask.tags || []).join(", "),
      dependencies: (editTask.dependencies || []).join(", ")
    });
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  function saveDraft() {
    if (!draft) return;

    updateTask({
      title: draft.title,
      description: draft.description,
      status: draft.status,
      priority: draft.priority,
      laneId: draft.laneId,
      start: draft.start,
      end: draft.end,
      percentComplete: clamp(Number(draft.percentComplete || 0), 0, 100),
      owner: {
        role: draft.ownerRole,
        name: draft.ownerName
      },
      tags: draft.tags
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      dependencies: draft.dependencies
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
    });

    closeEditor();
  }

  /* ----------------------------- Header ----------------------------- */
  return (
    <div className="h-full">
      {/* page header (FULL WIDTH, no max-w clamp) */}
      <div className="px-10 pt-10 pb-5">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="text-[40px] leading-[1.12] font-semibold tracking-tight">
              Tasks
            </div>
            <div className="mt-2 text-[13px] text-zinc-600 tracking-tight">
              Planning sheet •{" "}
              <span className="text-zinc-900 font-medium">{projectName}</span>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2 flex-wrap justify-end">
            <Pill tone="good">
              <CheckCircle2 size={12} strokeWidth={2} className="inline" /> {stats.done} done
            </Pill>
            <Pill tone={stats.blocked ? "bad" : "neutral"}>
              <AlertTriangle size={12} strokeWidth={2} className="inline" /> {stats.blocked} blocked
            </Pill>
            <Pill>
              <Clock size={12} strokeWidth={2} className="inline" /> {stats.ip} active
            </Pill>
            <Pill>
              <CalendarDays size={12} strokeWidth={2} className="inline" /> {range.start} →{" "}
              {range.end}
            </Pill>
          </div>
        </div>
      </div>

      {/* controls */}
      <div className="px-10">
        <Surface className="p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* search */}
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <div className="rounded-2xl bg-[#fbfbfa] border border-zinc-200/80 px-3 py-2 flex items-center gap-2 min-w-[420px]">
                <Search size={16} strokeWidth={1.7} className="text-zinc-600" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full text-[13px] tracking-tight outline-none placeholder:text-zinc-400 bg-transparent"
                  placeholder="Search tasks (ID, title, owner, tags)…"
                />
              </div>

              <div className="text-[11px] text-zinc-500 tracking-tight">
                Showing <span className="text-zinc-900 font-medium">{filtered.length}</span> of{" "}
                <span className="text-zinc-900 font-medium">{tasks.length}</span>
              </div>

              <Pill>
                <Sparkles size={12} strokeWidth={2} className="inline" /> AI-ready
              </Pill>
            </div>

            {/* filters + view mode */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <div className="text-[11px] text-zinc-500 tracking-tight inline-flex items-center gap-1">
                <Filter size={12} strokeWidth={2} /> Filters
              </div>

              <select
                value={laneFilter}
                onChange={(e) => setLaneFilter(e.target.value)}
                className="text-[12px] px-3 py-2 rounded-2xl bg-white border border-zinc-200/80 outline-none"
              >
                <option value="all">All lanes</option>
                {lanes.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-[12px] px-3 py-2 rounded-2xl bg-white border border-zinc-200/80 outline-none"
              >
                <option value="all">All status</option>
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="blocked">Blocked</option>
                <option value="done">Done</option>
              </select>

              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value)}
                className="text-[12px] px-3 py-2 rounded-2xl bg-white border border-zinc-200/80 outline-none"
              >
                <option value="priority">Sort: priority</option>
                <option value="start">Sort: start date</option>
                <option value="owner">Sort: owner</option>
              </select>

              {/* view mode toggles */}
              <div className="ml-1 flex items-center gap-1.5 rounded-2xl border border-zinc-200/80 bg-white p-1">
                <button
                  onClick={() => setViewMode("timeline")}
                  className={cx(
                    "px-2.5 py-1.5 rounded-xl text-[11px] tracking-tight inline-flex items-center gap-1.5",
                    viewMode === "timeline"
                      ? "bg-zinc-900 text-white"
                      : "hover:bg-zinc-100 text-zinc-700"
                  )}
                  title="Timeline focus"
                >
                  <LayoutPanelTop size={14} strokeWidth={2} />
                  Timeline
                </button>

                <button
                  onClick={() => setViewMode("split")}
                  className={cx(
                    "px-2.5 py-1.5 rounded-xl text-[11px] tracking-tight inline-flex items-center gap-1.5",
                    viewMode === "split"
                      ? "bg-zinc-900 text-white"
                      : "hover:bg-zinc-100 text-zinc-700"
                  )}
                  title="Balanced split"
                >
                  <LayoutGrid size={14} strokeWidth={2} />
                  Split
                </button>

                <button
                  onClick={() => setViewMode("tasks")}
                  className={cx(
                    "px-2.5 py-1.5 rounded-xl text-[11px] tracking-tight inline-flex items-center gap-1.5",
                    viewMode === "tasks"
                      ? "bg-zinc-900 text-white"
                      : "hover:bg-zinc-100 text-zinc-700"
                  )}
                  title="Tasks focus"
                >
                  <LayoutPanelLeft size={14} strokeWidth={2} />
                  Tasks
                </button>

                <button
                  onClick={() => setViewMode("timelineOnly")}
                  className={cx(
                    "px-2.5 py-1.5 rounded-xl text-[11px] tracking-tight inline-flex items-center gap-1.5",
                    viewMode === "timelineOnly"
                      ? "bg-zinc-900 text-white"
                      : "hover:bg-zinc-100 text-zinc-700"
                  )}
                  title="Timeline only"
                >
                  <Maximize2 size={14} strokeWidth={2} />
                  Full
                </button>
              </div>
            </div>
          </div>
        </Surface>
      </div>

      {/* Main layout (FULL WIDTH) */}
      <div className="px-10 pb-24 mt-5">
        <div className="flex gap-5 items-stretch">
          {/* Left: tasks panel (can disappear) */}
          {viewMode !== "timelineOnly" && split.left > 0 ? (
            <div
              className="min-w-[320px]"
              style={{
                width: `${split.left}%`
              }}
            >
              <Surface className="h-[calc(100vh-320px)] flex flex-col overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-200/70 bg-[#fbfbfa] flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-semibold tracking-tight text-zinc-900">
                      Task list
                    </div>
                    <div className="text-[11px] text-zinc-500 tracking-tight">
                      Click a task to edit • shorter list • built for scanning
                    </div>
                  </div>

                  <Pill>
                    <Flag size={12} strokeWidth={2} className="inline" /> {filtered.length} shown
                  </Pill>
                </div>

                {/* table-like list */}
                <div className="flex-1 overflow-y-auto">
                  {filtered.map((t) => {
                    const meta = statusMeta(t.status);
                    const Icon = meta.icon;

                    return (
                      <button
                        key={t.id}
                        onClick={() => openEditor(t.id)}
                        className={cx(
                          "w-full text-left px-4 py-3 border-b last:border-b-0 border-zinc-200/60",
                          "hover:bg-[#fbfbfa] transition-colors"
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="text-[11px] text-zinc-500 tracking-tight">
                                {t.id}
                              </div>

                              <Pill tone={meta.tone}>
                                <span className="inline-flex items-center gap-1.5">
                                  <Icon size={12} strokeWidth={2} />
                                  {meta.label}
                                </span>
                              </Pill>

                              {t.priority ? <Pill>{t.priority}</Pill> : null}
                              <Pill>{t.start} → {t.end}</Pill>
                            </div>

                            <div className="mt-1 text-[13px] font-semibold tracking-tight text-zinc-900 truncate">
                              {t.title}
                            </div>

                            <div className="mt-2 text-[11px] text-zinc-500 tracking-tight truncate">
                              {t.owner?.role || "—"} • {t.owner?.name || "—"} • Updated {t.updatedAt}
                            </div>

                            {/* progress */}
                            <div className="mt-2">
                              <div className="h-2 rounded-full bg-zinc-200/80 overflow-hidden">
                                <div
                                  className="h-full bg-zinc-900 rounded-full"
                                  style={{
                                    width: `${clamp(Number(t.percentComplete || 0), 0, 100)}%`
                                  }}
                                />
                              </div>
                              <div className="mt-1 text-[11px] text-zinc-500 tracking-tight">
                                {t.percentComplete ?? 0}% complete
                              </div>
                            </div>

                            {/* tags */}
                            <div className="mt-2 flex flex-wrap gap-2">
                              {(t.tags || []).slice(0, 3).map((tag) => (
                                <Pill key={tag}>{tag}</Pill>
                              ))}
                              {(t.tags || []).length > 3 ? (
                                <Pill>+{t.tags.length - 3} more</Pill>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {!filtered.length ? (
                    <div className="px-4 py-6 text-[12px] text-zinc-500">
                      No tasks match your filters.
                    </div>
                  ) : null}
                </div>

                <div className="px-4 py-3 border-t border-zinc-200/70 bg-white">
                  <div className="text-[11px] text-zinc-500 tracking-tight">
                    Tip: This list stays intentionally compact — timeline is the primary planning view.
                  </div>
                </div>
              </Surface>
            </div>
          ) : null}

          {/* Right: timeline (dominant) */}
          <div style={{ width: `${split.right}%` }} className="min-w-0 flex-1">
            <Surface className="h-[calc(100vh-320px)] flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-200/70 bg-[#fbfbfa] flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold tracking-tight text-zinc-900">
                    Timeline
                  </div>
                  <div className="text-[11px] text-zinc-500 tracking-tight truncate">
                    Monday/Salesforce-style planning • click bars to edit task
                  </div>
                </div>

                <Pill>
                  {totalDays} days • {pxPerDay}px/day
                </Pill>
              </div>

              <div className="flex-1 relative overflow-hidden bg-white">
                <div className="absolute inset-0 overflow-x-auto">
                  {/* wider canvas */}
                  <div className="relative" style={{ width: timelineWidth + 260 }}>
                    {/* sticky header */}
                    <div className="sticky top-0 z-10 bg-white border-b border-zinc-200/70">
                      <div className="flex">
                        <div className="w-[260px] px-4 py-2 text-[11px] font-medium text-zinc-500">
                          Lane
                        </div>

                        <div className="flex-1 px-2 py-2 text-[11px] font-medium text-zinc-500">
                          {range.start} → {range.end}
                        </div>
                      </div>
                    </div>

                    {/* grid lines */}
                    <div
                      className="absolute left-[260px] top-[38px] bottom-0"
                      style={{ width: timelineWidth }}
                    >
                      {Array.from({ length: totalDays + 1 }).map((_, i) => (
                        <div
                          key={i}
                          className={cx(
                            "absolute top-0 bottom-0",
                            i % 7 === 0 ? "bg-zinc-200/60" : "bg-zinc-100/60"
                          )}
                          style={{
                            left: i * pxPerDay,
                            width: 1
                          }}
                        />
                      ))}
                    </div>

                    {/* milestones */}
                    <div
                      className="absolute left-[260px] top-[38px] bottom-0 pointer-events-none"
                      style={{ width: timelineWidth }}
                    >
                      {milestones.map((m) => {
                        const x = diffDays(range.start, m.date) * pxPerDay;
                        const tone =
                          m.tone === "good"
                            ? "bg-emerald-600"
                            : m.tone === "bad"
                              ? "bg-amber-600"
                              : "bg-zinc-500";
                        return (
                          <div key={m.id} className="absolute top-0 bottom-0" style={{ left: x }}>
                            <div className="w-[2px] h-full bg-zinc-900/25" />
                            <div
                              className={cx(
                                "absolute top-2 -translate-x-1/2 px-2 py-1 rounded-xl text-[10px] text-white whitespace-nowrap",
                                tone
                              )}
                            >
                              {m.title}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* lanes */}
                    <div className="divide-y divide-zinc-200/60">
                      {lanes.map((lane) => {
                        const laneTasks = byLane[lane.id] || [];

                        return (
                          <div key={lane.id} className="flex items-stretch">
                            {/* lane label */}
                            <div className="w-[260px] px-4 py-3 bg-[#fbfbfa]">
                              <div className="text-[12px] font-semibold tracking-tight text-zinc-900">
                                {lane.title}
                              </div>
                              <div className="mt-0.5 text-[11px] text-zinc-500 tracking-tight">
                                {lane.ownerGroup} • {laneTasks.length} tasks
                              </div>
                            </div>

                            {/* lane timeline area */}
                            <div className="relative flex-1 py-3" style={{ width: timelineWidth }}>
                              <div className="relative h-[96px]">
                                {laneTasks.map((t, idx) => {
                                  const startX = diffDays(range.start, t.start) * pxPerDay;
                                  const endX = diffDays(range.start, t.end) * pxPerDay;
                                  const w = Math.max(10, endX - startX);

                                  const meta = statusMeta(t.status);
                                  const barTone =
                                    meta.tone === "good"
                                      ? "bg-emerald-500/85"
                                      : meta.tone === "bad"
                                        ? "bg-amber-500/85"
                                        : "bg-zinc-900/75";

                                  // stack within lane
                                  const y = (idx % 4) * 22;

                                  return (
                                    <button
                                      key={t.id}
                                      onClick={() => openEditor(t.id)}
                                      className={cx(
                                        "absolute rounded-xl border border-zinc-200/60",
                                        "hover:opacity-95 transition-opacity",
                                        "text-left focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                                      )}
                                      style={{
                                        left: startX,
                                        top: y,
                                        width: w,
                                        height: 18
                                      }}
                                      title={`${t.id} • ${t.title}`}
                                    >
                                      <div className={cx("h-full rounded-xl", barTone)} />

                                      {/* progress overlay */}
                                      <div
                                        className="absolute inset-0 rounded-xl bg-white/25"
                                        style={{
                                          clipPath: `inset(0 ${
                                            100 - clamp(Number(t.percentComplete || 0), 0, 100)
                                          }% 0 0)`
                                        }}
                                      />

                                      {/* label if wide enough */}
                                      {w > 140 ? (
                                        <div className="absolute inset-0 px-2 flex items-center">
                                          <div className="text-[10px] text-white/95 font-medium truncate">
                                            {t.id} • {t.title}
                                          </div>
                                        </div>
                                      ) : null}
                                    </button>
                                  );
                                })}

                                {!laneTasks.length ? (
                                  <div className="px-3 text-[12px] text-zinc-400">
                                    No tasks in this lane.
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="px-4 py-3 text-[11px] text-zinc-500 bg-white border-t border-zinc-200/70">
                      Click a bar to open task editor • Milestones are vertical markers • Mock UI
                    </div>
                  </div>
                </div>
              </div>
            </Surface>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      <Modal
        open={!!editTask}
        title={draft?.title?.trim() ? draft.title : "Edit task"}
        subtitle={editTask ? `${editTask.id} • ${editTask.laneId}` : ""}
        onClose={closeEditor}
        footer={
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] text-zinc-500">
              This is a mock editor. Hook `setTasks(...)` into your real persistence later.
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={closeEditor}
                className="px-3 py-2 rounded-2xl text-[12px] border border-zinc-200/80 bg-white hover:bg-zinc-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveDraft}
                className="px-3 py-2 rounded-2xl text-[12px] bg-zinc-900 text-white hover:bg-zinc-800 transition-colors inline-flex items-center gap-2"
              >
                <Save size={14} strokeWidth={2} />
                Save changes
              </button>
            </div>
          </div>
        }
      >
        {!draft ? null : (
          <div className="grid grid-cols-12 gap-4">
            {/* title */}
            <div className="col-span-12">
              <div className="text-[11px] text-zinc-500 tracking-tight">Title</div>
              <input
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded-2xl border border-zinc-200/80 outline-none text-[13px]"
              />
            </div>

            {/* description */}
            <div className="col-span-12">
              <div className="text-[11px] text-zinc-500 tracking-tight">Description</div>
              <textarea
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                rows={4}
                className="mt-1 w-full px-3 py-2 rounded-2xl border border-zinc-200/80 outline-none text-[13px] resize-none"
              />
            </div>

            {/* status */}
            <div className="col-span-4">
              <div className="text-[11px] text-zinc-500 tracking-tight">Status</div>
              <select
                value={draft.status}
                onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded-2xl border border-zinc-200/80 outline-none text-[13px] bg-white"
              >
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="blocked">Blocked</option>
                <option value="done">Done</option>
              </select>
            </div>

            {/* priority */}
            <div className="col-span-4">
              <div className="text-[11px] text-zinc-500 tracking-tight">Priority</div>
              <select
                value={draft.priority}
                onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded-2xl border border-zinc-200/80 outline-none text-[13px] bg-white"
              >
                <option value="">—</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            {/* lane */}
            <div className="col-span-4">
              <div className="text-[11px] text-zinc-500 tracking-tight">Lane</div>
              <select
                value={draft.laneId}
                onChange={(e) => setDraft((d) => ({ ...d, laneId: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded-2xl border border-zinc-200/80 outline-none text-[13px] bg-white"
              >
                {lanes.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </select>
            </div>

            {/* owner */}
            <div className="col-span-6">
              <div className="text-[11px] text-zinc-500 tracking-tight">Owner role</div>
              <input
                value={draft.ownerRole}
                onChange={(e) => setDraft((d) => ({ ...d, ownerRole: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded-2xl border border-zinc-200/80 outline-none text-[13px]"
              />
            </div>
            <div className="col-span-6">
              <div className="text-[11px] text-zinc-500 tracking-tight">Owner name</div>
              <input
                value={draft.ownerName}
                onChange={(e) => setDraft((d) => ({ ...d, ownerName: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded-2xl border border-zinc-200/80 outline-none text-[13px]"
              />
            </div>

            {/* dates */}
            <div className="col-span-6">
              <div className="text-[11px] text-zinc-500 tracking-tight">Start</div>
              <input
                value={draft.start}
                onChange={(e) => setDraft((d) => ({ ...d, start: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded-2xl border border-zinc-200/80 outline-none text-[13px]"
                placeholder="YYYY-MM-DD"
              />
            </div>
            <div className="col-span-6">
              <div className="text-[11px] text-zinc-500 tracking-tight">End</div>
              <input
                value={draft.end}
                onChange={(e) => setDraft((d) => ({ ...d, end: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded-2xl border border-zinc-200/80 outline-none text-[13px]"
                placeholder="YYYY-MM-DD"
              />
            </div>

            {/* progress */}
            <div className="col-span-12">
              <div className="flex items-center justify-between">
                <div className="text-[11px] text-zinc-500 tracking-tight">% complete</div>
                <div className="text-[11px] text-zinc-500 tracking-tight">
                  {clamp(Number(draft.percentComplete || 0), 0, 100)}%
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={clamp(Number(draft.percentComplete || 0), 0, 100)}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, percentComplete: Number(e.target.value) }))
                }
                className="mt-2 w-full"
              />
            </div>

            {/* tags */}
            <div className="col-span-12">
              <div className="text-[11px] text-zinc-500 tracking-tight">Tags (comma separated)</div>
              <input
                value={draft.tags}
                onChange={(e) => setDraft((d) => ({ ...d, tags: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded-2xl border border-zinc-200/80 outline-none text-[13px]"
                placeholder="traceability, numeric targets, power"
              />
            </div>

            {/* deps */}
            <div className="col-span-12">
              <div className="text-[11px] text-zinc-500 tracking-tight">
                Dependencies (comma separated task IDs)
              </div>
              <input
                value={draft.dependencies}
                onChange={(e) => setDraft((d) => ({ ...d, dependencies: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded-2xl border border-zinc-200/80 outline-none text-[13px]"
                placeholder="TSK-001, TSK-002"
              />

              {/* small dependency chips preview */}
              <div className="mt-2 flex flex-wrap gap-2">
                {draft.dependencies
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean)
                  .slice(0, 8)
                  .map((d) => (
                    <span
                      key={d}
                      className="text-[11px] px-2 py-1 rounded-full border border-zinc-200/80 bg-[#fbfbfa] text-zinc-700 inline-flex items-center gap-1.5"
                    >
                      <Link2 size={12} strokeWidth={2} />
                      {d}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
