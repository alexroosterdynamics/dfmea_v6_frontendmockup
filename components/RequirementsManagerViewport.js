// components/RequirementsManagerViewport.js
"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Paperclip,
  Cpu,
  Zap,
  Wrench,
  ShieldCheck,
  Search,
  SlidersHorizontal,
  Lock
} from "lucide-react";

const cx = (...c) => c.filter(Boolean).join(" ");

const SH_SURFACE =
  "shadow-[0_1px_0_rgba(0,0,0,0.05),0_14px_40px_rgba(0,0,0,0.06)]";
const SH_TILE =
  "shadow-[0_1px_0_rgba(0,0,0,0.05),0_10px_24px_rgba(0,0,0,0.06)]";

const ICONS = { Software: Cpu, Electrical: Zap, Mechanical: Wrench };

const frozen = (r) => !!r.isComplete && !r.flagged;

function Surface({ className = "", children }) {
  return (
    <div className={cx("rounded-xl border border-zinc-200/80 bg-white", SH_SURFACE, className)}>
      {children}
    </div>
  );
}

function Pill({ tone = "neutral", children, className = "" }) {
  const cls =
    tone === "good"
      ? "bg-emerald-50 border-emerald-200/70 text-emerald-900"
      : tone === "bad"
        ? "bg-amber-50 border-amber-200/70 text-amber-900"
        : "bg-[#fbfbfa] border-zinc-200/80 text-zinc-700";

  return (
    <span
      className={cx(
        "text-[11px] px-2 py-1 rounded-full border tracking-tight inline-flex items-center gap-1.5",
        cls,
        className
      )}
    >
      {children}
    </span>
  );
}

function PageTitle({ title, subtitle, rightSlot }) {
  return (
    <div className="max-w-6xl mx-auto px-10 pt-12 pb-5">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="text-[40px] leading-[1.12] font-semibold tracking-tight">
            {title}
          </div>
          {subtitle ? (
            <div className="mt-2 text-[13px] text-zinc-600 tracking-tight">{subtitle}</div>
          ) : null}
        </div>
        {rightSlot ? <div className="pt-2">{rightSlot}</div> : null}
      </div>
    </div>
  );
}

function FrozenBadge() {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-zinc-200/80 bg-white px-3 py-2">
      <div className="h-8 w-8 rounded-xl bg-white border border-zinc-200/80 grid place-items-center">
        <ShieldCheck size={16} strokeWidth={1.8} className="text-zinc-800" />
      </div>
      <div className="min-w-0">
        <div className="text-[12px] font-semibold tracking-tight text-zinc-900">
          Manager View
        </div>
        <div className="text-[11px] text-zinc-500 tracking-tight">
          Read-only • Frozen requirements only
        </div>
      </div>
      <Pill tone="good" className="ml-2">
        <Lock size={12} strokeWidth={2} />
        Locked
      </Pill>
    </div>
  );
}

export default function RequirementsManagerViewport({ data }) {
  const projectName = data?.content?.projectName ?? "DFMEA Project";
  const requirements = data?.content?.requirements ?? [];

  const frozenReqs = useMemo(() => requirements.filter((r) => frozen(r)), [requirements]);

  const stats = useMemo(() => {
    const total = requirements.length;
    const f = frozenReqs.length;
    return { total, frozen: f, unfrozen: total - f };
  }, [requirements.length, frozenReqs.length]);

  // lightweight manager-only controls
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState("id"); // id | priority | updated

  const buckets = useMemo(() => {
    const map = { Software: [], Electrical: [], Mechanical: [] };

    frozenReqs.forEach((r) => {
      const d = r.domainCategory || "Software";
      (map[d] ??= []).push(r);
    });

    const byPriority = (p) => {
      const x = String(p || "").toLowerCase();
      if (x.includes("high")) return 0;
      if (x.includes("medium")) return 1;
      if (x.includes("low")) return 2;
      return 3;
    };

    const sorter = (a, b) => {
      if (sortMode === "priority") {
        const ap = byPriority(a.priority);
        const bp = byPriority(b.priority);
        if (ap !== bp) return ap - bp;
        return String(a.id).localeCompare(String(b.id));
      }

      if (sortMode === "updated") {
        // mostly mock strings; keep stable fallback
        const au = String(a.lastUpdated || "");
        const bu = String(b.lastUpdated || "");
        if (au !== bu) return bu.localeCompare(au);
        return String(a.id).localeCompare(String(b.id));
      }

      return String(a.id).localeCompare(String(b.id));
    };

    Object.keys(map).forEach((k) => {
      map[k] = (map[k] || []).slice().sort(sorter);
    });

    // show most populated first
    const order = Object.keys(map).sort((a, b) => (map[b]?.length || 0) - (map[a]?.length || 0));
    return { map, order };
  }, [frozenReqs, sortMode]);

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return buckets.map;

    const out = {};
    buckets.order.forEach((d) => {
      const list = buckets.map[d] || [];
      out[d] = list.filter((r) => {
        const hay = `${r.id} ${r.text} ${r.reqType} ${r.ownerRole} ${r.ownerName} ${r.priority}`.toLowerCase();
        return hay.includes(q);
      });
    });
    return out;
  }, [buckets.map, buckets.order, q]);

  return (
    <div className="pb-24">
      <PageTitle
        title="Requirements"
        subtitle={
          <>
            Manager sheet • <span className="text-zinc-900 font-medium">{projectName}</span>
          </>
        }
        rightSlot={
          <div className="flex items-center gap-2">
            <FrozenBadge />

            <Pill tone={stats.frozen ? "good" : "bad"}>
              <CheckCircle2 size={12} strokeWidth={2} />
              {stats.frozen}/{stats.total} frozen
            </Pill>

            <Pill>
              <SlidersHorizontal size={12} strokeWidth={2} />
              View-only
            </Pill>
          </div>
        }
      />

      <div className="max-w-6xl mx-auto px-10">
        <Surface className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="rounded-xl bg-[#fbfbfa] border border-zinc-200/80 px-3 py-2 flex items-center gap-2 min-w-[420px]">
                <Search size={16} strokeWidth={1.7} className="text-zinc-600" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full text-[13px] tracking-tight outline-none placeholder:text-zinc-400 bg-transparent"
                  placeholder="Search frozen requirements (ID, text, owner, type, priority)…"
                />
              </div>

              <div className="text-[11px] text-zinc-500 tracking-tight">
                Showing frozen only • {frozenReqs.length} items
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-[11px] text-zinc-500 tracking-tight">Sort</div>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value)}
                className="text-[12px] px-3 py-2 rounded-xl bg-white border border-zinc-200/80 outline-none"
              >
                <option value="id">ID</option>
                <option value="priority">Priority</option>
                <option value="updated">Last updated</option>
              </select>

              <button
                className="text-[12px] font-medium tracking-tight px-3 py-2 rounded-xl bg-white border border-zinc-200/80 text-zinc-300 cursor-not-allowed"
                disabled
                title="Mock action"
              >
                Export
              </button>
            </div>
          </div>
        </Surface>

        {/* groups */}
        <div className="mt-5 space-y-5">
          {buckets.order.map((domainKey) => {
            const list = filtered[domainKey] || [];
            if (!list.length) return null;

            const Icon = ICONS[domainKey] || Wrench;

            return (
              <div key={domainKey} className={cx("rounded-xl border border-zinc-200/80 bg-white", SH_SURFACE)}>
                <div className="px-4 py-3 border-b border-zinc-200/70 bg-[#fbfbfa] flex items-center justify-between">
                  <div className="min-w-0 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-xl border border-zinc-200/80 bg-white grid place-items-center">
                      <Icon size={16} strokeWidth={1.8} className="text-zinc-800" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold tracking-tight text-zinc-900">
                        {domainKey}
                      </div>
                      <div className="text-[11px] text-zinc-500 tracking-tight">
                        {list.length} frozen requirements
                      </div>
                    </div>
                  </div>

                  <Pill tone="good">
                    <CheckCircle2 size={12} strokeWidth={2} />
                    Frozen
                  </Pill>
                </div>

                {/* compact manager table */}
                <div className="overflow-hidden">
                  <div className="grid grid-cols-12 text-[11px] font-medium text-zinc-500 bg-white border-b border-zinc-200/70">
                    <div className="col-span-2 px-5 py-3">ID</div>
                    <div className="col-span-6 px-5 py-3">Requirement</div>
                    <div className="col-span-2 px-5 py-3">Owner</div>
                    <div className="col-span-1 px-5 py-3">Type</div>
                    <div className="col-span-1 px-5 py-3 text-right">Files</div>
                  </div>

                  {list.map((r) => {
                    const filesCount = Array.isArray(r.files) ? r.files.length : 0;

                    return (
                      <div
                        key={r.id}
                        className={cx(
                          "grid grid-cols-12 text-[13px] border-b last:border-b-0 border-zinc-200/60",
                          "bg-white hover:bg-[#fbfbfa] transition-colors"
                        )}
                      >
                        <div className="col-span-2 px-5 py-3 text-zinc-600">
                          <div className="flex items-center gap-2">
                            <span>{r.id}</span>
                            <CheckCircle2 size={14} strokeWidth={2} className="text-zinc-900" />
                          </div>
                          {r.priority ? (
                            <div className="mt-1 text-[11px] text-zinc-500">{r.priority}</div>
                          ) : null}
                        </div>

                        <div className="col-span-6 px-5 py-3">
                          <div className="text-zinc-900 leading-snug font-medium">
                            {r.text}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2">
                            {r.reqType ? <Pill>{r.reqType}</Pill> : null}
                            {r.lastUpdated ? <Pill>{r.lastUpdated}</Pill> : null}
                            <Pill tone="good">
                              <Lock size={12} strokeWidth={2} />
                              Read-only
                            </Pill>
                          </div>
                        </div>

                        <div className="col-span-2 px-5 py-3 text-zinc-600">
                          <div className="text-zinc-900">{r.ownerRole || "—"}</div>
                          <div className="mt-0.5 text-[11px] text-zinc-500">
                            {r.ownerName || "—"}
                          </div>
                        </div>

                        <div className="col-span-1 px-5 py-3 text-zinc-600">
                          <div className="text-zinc-900">{r.reqType ? "F" : "—"}</div>
                          <div className="mt-0.5 text-[11px] text-zinc-500">Frozen</div>
                        </div>

                        <div className="col-span-1 px-5 py-3 text-right text-zinc-600">
                          <span className="inline-flex items-center justify-end gap-2">
                            <Paperclip size={14} strokeWidth={1.7} className="text-zinc-500" />
                            {filesCount}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* subtle footer */}
                <div className="px-5 py-3 bg-white">
                  <div className="text-[11px] text-zinc-500 tracking-tight">
                    This is a manager-only surface. Requirements are frozen and cannot be edited here.
                  </div>
                </div>
              </div>
            );
          })}

          {!frozenReqs.length ? (
            <Surface className="p-8">
              <div className="text-[14px] font-semibold tracking-tight text-zinc-900">
                No frozen requirements yet
              </div>
              <div className="mt-1 text-[13px] text-zinc-600 tracking-tight">
                Complete requirements (Good + not flagged) to have them appear in this manager view.
              </div>
            </Surface>
          ) : null}
        </div>
      </div>
    </div>
  );
}
