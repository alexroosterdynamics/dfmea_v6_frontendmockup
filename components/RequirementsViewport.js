// components/RequirementsViewport.js
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  LayoutGrid,
  List,
  Minus,
  Plus,
  ChevronRight,
  Cpu,
  Zap,
  Wrench,
  Trash2,
  PlusCircle
} from "lucide-react";
import { useDFMEA } from "../contexts/Context";

const cx = (...c) => c.filter(Boolean).join(" ");

/* ----------------------------- Shadows ----------------------------- */
const SH_SURFACE =
  "shadow-[0_1px_0_rgba(0,0,0,0.05),0_14px_40px_rgba(0,0,0,0.06)]";
const SH_TILE =
  "shadow-[0_1px_0_rgba(0,0,0,0.05),0_10px_24px_rgba(0,0,0,0.06)]";

const ICONS = { Software: Cpu, Electrical: Zap, Mechanical: Wrench };

/* ----------------------------- UI atoms ----------------------------- */
function Surface({ className = "", children, shadow = SH_SURFACE }) {
  return (
    <div className={cx("rounded-xl border border-zinc-200/80 bg-white", shadow, className)}>
      {children}
    </div>
  );
}

function Pill({ tone = "neutral", className = "", children }) {
  const cls =
    tone === "bad"
      ? "bg-amber-50 border-amber-200/70 text-amber-900"
      : tone === "good"
      ? "bg-emerald-50 border-emerald-200/70 text-emerald-900"
      : "bg-[#fbfbfa] border-zinc-200/80 text-zinc-700";

  return (
    <span
      className={cx(
        "text-[11px] px-2 py-1 rounded-full border tracking-tight",
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

function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-zinc-950/20 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 p-6 flex">
        <div className="m-auto w-full max-w-5xl">
          <div className="rounded-2xl border border-zinc-200/80 bg-white overflow-hidden shadow-[0_1px_0_rgba(0,0,0,0.05),0_30px_80px_rgba(0,0,0,0.20)]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function SmallBtn({ active, disabled, onClick, title, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cx(
        "inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-xl border tracking-tight transition-colors",
        active
          ? "bg-zinc-900 text-white border-zinc-900"
          : disabled
          ? "bg-white border-zinc-200/60 text-zinc-300 cursor-not-allowed"
          : "bg-white border-zinc-200/80 text-zinc-700 hover:bg-zinc-100"
      )}
    >
      {children}
    </button>
  );
}

/* ----------------------------- Helpers ----------------------------- */
const frozen = (r) => !!r.isComplete && !r.flagged;

function ReqTypePill({ reqType }) {
  return (
    <Pill className="w-[118px] inline-flex justify-center">
      <span className="inline-flex items-center gap-1.5">
        <div className="h-1.5 w-1.5 rounded-full bg-zinc-900/70" />
        {reqType}
      </span>
    </Pill>
  );
}

function StatusIcon({ r }) {
  return frozen(r) ? (
    <CheckCircle2 size={14} strokeWidth={2} className="text-zinc-900" />
  ) : r.flagged ? (
    <AlertTriangle size={14} strokeWidth={2} className="text-zinc-900" />
  ) : (
    <AlertTriangle size={14} strokeWidth={2} className="text-zinc-600" />
  );
}

function AiChecklist({ items }) {
  const list = items?.length
    ? items
    : [
        "Add numeric acceptance criteria (values + tolerances)",
        "Include units (dB, hours, °C, V, mA, ms)",
        "Define operating conditions (mode, load, environment)",
        "Specify test method (verification approach)",
        "Clarify boundaries / edge cases (min/max, startup, aging)"
      ];

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white p-4">
      <div className="text-[11px] text-zinc-500 tracking-tight">AI checklist</div>
      <div className="mt-2 space-y-2">
        {list.map((t, idx) => (
          <label
            key={idx}
            className="flex items-start gap-3 text-[13px] tracking-tight text-zinc-800"
          >
            <input
              type="checkbox"
              defaultChecked={idx < 2}
              className="mt-0.5 h-4 w-4 accent-zinc-900"
            />
            <span>{t}</span>
          </label>
        ))}
      </div>
      <div className="mt-3 text-[11px] text-zinc-500">(Stays visible even after typing.)</div>
    </div>
  );
}

/* ----------------------------- Editor block ----------------------------- */
function Editor({
  r,
  draft,
  setDraft,
  onSave,
  saving,
  running,
  addMode,
  addText,
  setAddText,
  addError
}) {
  const busy = !!running[r.id];

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-7">
        <AiChecklist items={r.aiChecklist} />

        {addMode ? (
          <>
            <div className="mt-4 text-[11px] text-zinc-500">Requirement text</div>
            <input
              value={addText}
              onChange={(e) => setAddText(e.target.value)}
              className={cx(
                "mt-2 w-full",
                "rounded-xl border border-zinc-200/80 bg-white",
                "px-3 py-2 text-[13px] tracking-tight text-zinc-800",
                "outline-none focus:ring-2 focus:ring-zinc-300"
              )}
              placeholder="e.g. The ECU shall recover from a brownout within 200 ms at 9–16 V…"
            />
            {addError ? (
              <div className="mt-2 text-[12px] text-amber-900 bg-amber-50 border border-amber-200/70 rounded-xl px-3 py-2">
                {addError}
              </div>
            ) : null}
          </>
        ) : null}

        <div className="mt-4 text-[11px] text-zinc-500">Add missing details</div>

        <textarea
          value={draft[r.id] ?? ""}
          onChange={(e) => setDraft((p) => ({ ...p, [r.id]: e.target.value }))}
          className={cx(
            "mt-2 w-full min-h-[120px] resize-none",
            "rounded-xl border border-zinc-200/80 bg-white",
            "px-3 py-2 text-[13px] tracking-tight text-zinc-800",
            "outline-none focus:ring-2 focus:ring-zinc-300"
          )}
          placeholder="Add test method, numeric targets, conditions, tolerances, temperature range, power mode, etc…"
        />

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => onSave(r)}
            className={cx(
              "text-[12px] font-medium tracking-tight px-3 py-2 rounded-xl",
              "bg-zinc-900 text-white hover:bg-zinc-800 transition-colors",
              saving[r.id] && "opacity-70 cursor-not-allowed"
            )}
            disabled={!!saving[r.id]}
          >
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={14} strokeWidth={2} className="animate-spin" />
                {addMode ? "Adding + Risk Analysis…" : "Saving + Risk Analysis…"}
              </span>
            ) : addMode ? (
              "Add requirement"
            ) : (
              "Save"
            )}
          </button>

          <button
            className="text-[12px] font-medium tracking-tight px-3 py-2 rounded-xl bg-white border border-zinc-200/80 text-zinc-700 hover:bg-zinc-100 transition-colors cursor-not-allowed"
            disabled
            title="Mock upload"
          >
            Add file
          </button>
        </div>
      </div>

      <div className="col-span-5">
        <div className="text-[11px] text-zinc-500">Risk Analysis output</div>

        <div className="mt-2 rounded-xl border border-zinc-200/80 bg-white p-4">
          {busy ? (
            <div>
              <div className="flex items-center gap-2">
                <Loader2 size={14} strokeWidth={2} className="animate-spin text-zinc-700" />
                <div className="text-[13px] font-medium tracking-tight text-zinc-900">
                  Running Risk Analysis…
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <div className="h-2.5 w-44 bg-zinc-200/70 rounded animate-pulse" />
                <div className="h-2.5 w-[92%] bg-zinc-200/70 rounded animate-pulse" />
                <div className="h-2.5 w-[80%] bg-zinc-200/70 rounded animate-pulse" />
              </div>
            </div>
          ) : r?.risk?.status ? (
            <div>
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-semibold tracking-tight text-zinc-900">
                  {r.risk.title}
                </div>
                {r.risk.status === "good" ? (
                  <Pill tone="good">
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 size={12} strokeWidth={2} />
                      Good
                    </span>
                  </Pill>
                ) : (
                  <Pill tone="bad">
                    <span className="inline-flex items-center gap-1.5">
                      <AlertTriangle size={12} strokeWidth={2} />
                      Flagged
                    </span>
                  </Pill>
                )}
              </div>

              <div className="mt-2 text-[13px] leading-relaxed tracking-tight text-zinc-700">
                {r.risk.reasoning}
              </div>

              <div className="mt-3 text-[11px] text-zinc-500">Last run: {r.risk.lastRun}</div>
            </div>
          ) : (
            <div>
              <div className="text-[13px] font-medium tracking-tight text-zinc-900">
                Not run yet
              </div>
              <div className="mt-2 text-[13px] leading-relaxed tracking-tight text-zinc-700">
                Add details and press <span className="font-medium">{addMode ? "Add" : "Save"}</span>.
              </div>
            </div>
          )}
        </div>

        {r.flagged && r.aiAdvice ? (
          <div className="mt-4 rounded-xl border border-zinc-200/80 bg-white p-4">
            <div className="text-[11px] text-zinc-500">AI guidance</div>
            <div className="mt-2 text-[13px] text-zinc-800 leading-relaxed tracking-tight">
              {r.aiAdvice}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ----------------------------- Component ----------------------------- */
export default function RequirementsViewport({
  data,
  onUpdateRequirements,
  requirementsUnlocked,
  onListViewUnlock
}) {
  const projectName = data?.content?.projectName ?? "DFMEA Project";
  const requirements = data?.content?.requirements ?? [];
  const changeNotices = data?.content?.changeNotices ?? [];

  const [viewMode, setViewMode] = useState("cards"); // cards | list
  const [cardSize, setCardSize] = useState("md"); // lg(2) md(3) sm(4) xs(5)
  const [showMode, setShowMode] = useState("all"); // all | unfrozen | frozen
  const [expandedId, setExpandedId] = useState(null);

  const [modalId, setModalId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addText, setAddText] = useState("");
  const [addError, setAddError] = useState("");

  const [draft, setDraft] = useState(() => {
    const m = {};
    requirements.forEach((r) => (m[r.id] = r.details ?? ""));
    return m;
  });

  const [saving, setSaving] = useState({});
  const [running, setRunning] = useState({});

  // ✅ ONLY keep pushing notices to context (no UI here)
  const { pushChangeNotice, cleanupTimers } = useDFMEA();

  // reset per tab
  useEffect(() => {
    setExpandedId(null);
    setModalId(null);
    setAddOpen(false);
    setAddText("");
    setAddError("");

    const m = {};
    requirements.forEach((r) => (m[r.id] = r.details ?? ""));
    setDraft(m);
    setSaving({});
    setRunning({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.tabId]);

  // push notices (context handles active + history)
  useEffect(() => {
    if (!changeNotices.length) return;

    let idx = 0;
    const id = setInterval(() => {
      if (idx >= Math.min(3, changeNotices.length)) {
        clearInterval(id);
        return;
      }
      pushChangeNotice(changeNotices[idx]);
      idx += 1;
    }, 3000);

    return () => {
      clearInterval(id);
      cleanupTimers?.();
    };
  }, [changeNotices, pushChangeNotice, cleanupTimers]);

  function analyze(text, details) {
    const full = `${text} ${details || ""}`.trim();
    const ok =
      /\d/.test(full) &&
      /(ms|°c|celsius|v|ma|db|hz|mm|cm|m|%|hours|hour|hr)/i.test(full) &&
      /(at|under|within|during|range|min|max|temperature|humidity|mode|load|power)/i.test(full) &&
      full.length >= 55 &&
      !/(good|nice|fast|reliable|robust|best|user friendly|should|might)/i.test(full);

    return ok
      ? {
          pass: true,
          title: "Low ambiguity • traceable",
          reasoning:
            "Requirement includes measurable targets and testable constraints (values + conditions). This reduces interpretation risk and supports DFMEA linkage."
        }
      : {
          pass: false,
          title: "High ambiguity • risk flagged",
          reasoning:
            "Risk Analysis indicates this requirement is not sufficiently testable/traceable. Add numeric targets + units + operating conditions and a clear test method."
        };
  }

  function updateAll(next) {
    onUpdateRequirements?.(next);
  }

  function updateRequirement(id, patch) {
    updateAll(requirements.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRequirement(id) {
    updateAll(requirements.filter((r) => r.id !== id));
  }

  function getNextId() {
    // Try to generate REQ-### if existing IDs match; fallback to timestamp.
    const nums = requirements
      .map((r) => String(r.id || ""))
      .map((s) => {
        const m = s.match(/REQ-(\d+)/i);
        return m ? Number(m[1]) : null;
      })
      .filter((n) => Number.isFinite(n));
    if (nums.length) {
      const next = Math.max(...nums) + 1;
      return `REQ-${String(next).padStart(3, "0")}`;
    }
    return `REQ-${String(Date.now()).slice(-6)}`;
  }

  // SAVE existing requirement (edit)
  function handleSave(req) {
    const id = req.id;
    const details = draft[id] ?? "";

    setSaving((p) => ({ ...p, [id]: true }));
    setRunning((p) => ({ ...p, [id]: true }));

    updateRequirement(id, { details, lastUpdated: "Just now" });

    setTimeout(() => {
      const res = analyze(req.text, details);

      updateRequirement(id, {
        isComplete: res.pass,
        flagged: !res.pass,
        risk: {
          status: res.pass ? "good" : "bad",
          title: res.title,
          reasoning: res.reasoning,
          lastRun: "Just now"
        }
      });

      setRunning((p) => ({ ...p, [id]: false }));
      setSaving((p) => ({ ...p, [id]: false }));
    }, 2000);
  }

  // ADD new requirement (must be complete before insert)
  function handleAddSave(tempReq) {
    const tempId = tempReq.id; // stable key for running/saving state + draft
    const details = draft[tempId] ?? "";
    const text = (addText || "").trim();

    setAddError("");

    // Must pass the same ambiguity/testability check BEFORE we add it
    const res = analyze(text, details);

    if (!text || text.length < 8) {
      setAddError("Add a clear requirement sentence (not just a fragment).");
      return;
    }
    if (!res.pass) {
      setAddError(
        "You can’t add an incomplete requirement. Add measurable targets + units + operating conditions + test method until Risk Analysis turns Good."
      );
      return;
    }

    setSaving((p) => ({ ...p, [tempId]: true }));
    setRunning((p) => ({ ...p, [tempId]: true }));

    const newId = getNextId();
    const newReq = {
      id: newId,
      text,
      details,
      domainCategory: "Software",
      reqType: "Functional",
      priority: "Medium",
      ownerRole: "System",
      ownerName: "You",
      files: [],
      lastUpdated: "Just now",
      isComplete: true,
      flagged: false,
      risk: {
        status: "good",
        title: res.title,
        reasoning: res.reasoning,
        lastRun: "Just now"
      }
    };

    // simulate the same “save + analysis” feel
    setTimeout(() => {
      updateAll([newReq, ...requirements]);

      // cleanup the temp editor state
      setDraft((p) => {
        const next = { ...p };
        delete next[tempId];
        next[newId] = details;
        return next;
      });

      setSaving((p) => ({ ...p, [tempId]: false }));
      setRunning((p) => ({ ...p, [tempId]: false }));

      setAddOpen(false);
      setAddText("");
      setAddError("");
    }, 1200);
  }

  const stats = useMemo(() => {
    const total = requirements.length;
    const ok = requirements.filter((r) => frozen(r)).length;
    const flagged = requirements.filter((r) => r.flagged).length;
    return { total, frozen: ok, flagged, unfrozen: total - ok };
  }, [requirements]);

  const buckets = useMemo(() => {
    const map = { Software: [], Electrical: [], Mechanical: [] };

    requirements.forEach((r) => {
      const d = r.domainCategory || "Software";
      (map[d] ??= []).push(r);
    });

    const sortReqs = (list) =>
      list.slice().sort((a, b) => {
        const au = frozen(a) ? 0 : 1;
        const bu = frozen(b) ? 0 : 1;
        if (au !== bu) return bu - au;
        const af = a.flagged ? 1 : 0;
        const bf = b.flagged ? 1 : 0;
        if (af !== bf) return bf - af;
        return String(a.id).localeCompare(String(b.id));
      });

    const meta = ["Software", "Electrical", "Mechanical"].map((d) => {
      const list = map[d] || [];
      const unfrozen = list.filter((x) => !frozen(x)).length;
      const flagged = list.filter((x) => x.flagged).length;
      return { d, unfrozen, flagged, total: list.length };
    });

    const order = meta
      .sort((a, b) => {
        if (b.unfrozen !== a.unfrozen) return b.unfrozen - a.unfrozen;
        if (b.flagged !== a.flagged) return b.flagged - a.flagged;
        return b.total - a.total;
      })
      .map((x) => x.d);

    order.forEach((d) => (map[d] = sortReqs(map[d] || [])));

    return { map, order };
  }, [requirements]);

  const filtered = useMemo(() => {
    const out = {};
    buckets.order.forEach((d) => {
      const list = buckets.map[d] || [];
      out[d] =
        showMode === "all"
          ? list
          : showMode === "frozen"
          ? list.filter((r) => frozen(r))
          : list.filter((r) => !frozen(r));
    });
    return out;
  }, [buckets, showMode]);

  const gridClass =
    cardSize === "xs"
      ? "grid grid-cols-5 gap-3"
      : cardSize === "sm"
      ? "grid grid-cols-4 gap-3"
      : cardSize === "lg"
      ? "grid grid-cols-2 gap-4"
      : "grid grid-cols-3 gap-4";

  const cardPad =
    cardSize === "xs"
      ? "p-3"
      : cardSize === "sm"
      ? "p-3.5"
      : cardSize === "lg"
      ? "p-5"
      : "p-4";

  function smaller() {
    setCardSize((s) => (s === "lg" ? "md" : s === "md" ? "sm" : "xs"));
  }
  function bigger() {
    setCardSize((s) => (s === "xs" ? "sm" : s === "sm" ? "md" : "lg"));
  }

  const modalReq = modalId ? requirements.find((r) => r.id === modalId) : null;

  // temp add "requirement object" for editor compatibility (stable id for state keys)
  const addTemp = useMemo(
    () => ({
      id: "__NEW__",
      text: addText,
      details: draft["__NEW__"] ?? "",
      reqType: "Functional",
      priority: "Medium",
      ownerRole: "System",
      ownerName: "You",
      domainCategory: "Software",
      files: [],
      flagged: false,
      isComplete: false
    }),
    [addText, draft]
  );

  return (
    <div className="pb-24">
      <PageTitle
        title="Requirements"
        subtitle={
          <>
            Project • <span className="text-zinc-900 font-medium">{projectName}</span>
          </>
        }
        rightSlot={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setAddOpen(true);
                setAddError("");
                setAddText("");
                setDraft((p) => ({ ...p, ["__NEW__"]: "" }));
              }}
              className={cx(
                "inline-flex items-center gap-2 rounded-xl px-3 py-2",
                "bg-zinc-900 text-white hover:bg-zinc-800 transition-colors",
                "text-[12px] font-medium tracking-tight"
              )}
              title="Add a new requirement (must be complete to be added)"
            >
              <PlusCircle size={16} strokeWidth={2} />
              Add
            </button>

            <Pill tone={requirementsUnlocked ? "good" : "bad"}>
              <span className="inline-flex items-center gap-1.5">
                {requirementsUnlocked ? (
                  <CheckCircle2 size={12} strokeWidth={2} />
                ) : (
                  <AlertTriangle size={12} strokeWidth={2} />
                )}
                {stats.frozen}/{stats.total} frozen
              </span>
            </Pill>

            <Pill tone={stats.flagged ? "bad" : "good"}>
              <span className="inline-flex items-center gap-1.5">
                <AlertTriangle size={12} strokeWidth={2} />
                {stats.flagged} flagged
              </span>
            </Pill>

            <div className="ml-2 flex items-center gap-1.5">
              {[
                ["all", "All"],
                ["unfrozen", "Unfrozen"],
                ["frozen", "Frozen"]
              ].map(([m, label]) => (
                <SmallBtn
                  key={m}
                  active={showMode === m}
                  onClick={() => setShowMode(m)}
                  title={label}
                >
                  {label}
                </SmallBtn>
              ))}
            </div>

            <div className="ml-2 flex items-center gap-1.5">
              <SmallBtn
                active={viewMode === "cards"}
                onClick={() => setViewMode("cards")}
                title="Card view"
              >
                <LayoutGrid size={14} strokeWidth={1.9} />
                Cards
              </SmallBtn>

              <SmallBtn
                active={viewMode === "list"}
                onClick={() => {
                  setViewMode("list");
                  onListViewUnlock?.();
                }}
                title="List view"
              >
                <List size={14} strokeWidth={1.9} />
                List
              </SmallBtn>

              <div className="w-px h-6 bg-zinc-200/80 mx-1" />

              <SmallBtn
                onClick={smaller}
                disabled={viewMode !== "cards"}
                title={
                  viewMode === "cards"
                    ? "Smaller cards (click twice to reach 5×)"
                    : "Card sizing disabled in list view"
                }
              >
                <Minus size={14} strokeWidth={2} />
              </SmallBtn>

              <SmallBtn
                onClick={bigger}
                disabled={viewMode !== "cards"}
                title={viewMode === "cards" ? "Larger cards" : "Card sizing disabled in list view"}
              >
                <Plus size={14} strokeWidth={2} />
              </SmallBtn>
            </div>
          </div>
        }
      />

      {/* Category cards only */}
      <div className="max-w-6xl mx-auto px-10 space-y-5">
        {buckets.order.map((domainKey) => {
          const list = filtered[domainKey] || [];
          if (!list.length) return null;

          const full = buckets.map[domainKey] || [];
          const unfrozenCount = full.filter((r) => !frozen(r)).length;
          const flaggedCount = full.filter((r) => r.flagged).length;

          const Icon = ICONS[domainKey] || Wrench;

          return (
            <div
              key={domainKey}
              className={cx("rounded-xl border border-zinc-200/80 bg-white", SH_SURFACE)}
            >
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
                      {unfrozenCount} unfrozen • {flaggedCount} flagged • {full.length} total
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Pill tone={unfrozenCount ? "bad" : "good"}>{unfrozenCount} unfrozen</Pill>
                  <Pill tone={flaggedCount ? "bad" : "good"}>{flaggedCount} flagged</Pill>
                </div>
              </div>

              {/* CARDS */}
              {viewMode === "cards" ? (
                <div className={cx("p-4", gridClass)}>
                  {list.map((r) => {
                    const filesCount = Array.isArray(r.files) ? r.files.length : 0;

                    return (
                      <button
                        key={r.id}
                        onClick={() => setModalId(r.id)}
                        className={cx(
                          "text-left rounded-2xl border border-zinc-200/80 bg-white hover:bg-[#fbfbfa] transition-colors",
                          SH_TILE
                        )}
                      >
                        <div className={cardPad}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="text-[11px] text-zinc-500 tracking-tight">
                                  {r.id}
                                </div>
                                <StatusIcon r={r} />
                              </div>

                              <div className="mt-1 text-[13px] font-semibold tracking-tight text-zinc-900 line-clamp-2">
                                {r.text}
                              </div>
                            </div>

                            <ChevronRight size={16} strokeWidth={1.8} className="text-zinc-400 mt-1" />
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {r.reqType ? <ReqTypePill reqType={r.reqType} /> : null}

                            {frozen(r) ? (
                              <Pill tone="good">Frozen</Pill>
                            ) : r.flagged ? (
                              <Pill tone="bad">Flagged</Pill>
                            ) : (
                              <Pill>Incomplete</Pill>
                            )}

                            <Pill>{r.priority}</Pill>
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            <div className="text-[11px] text-zinc-500">
                              {r.ownerRole} • {r.ownerName}
                            </div>

                            <div className="text-[11px] text-zinc-600 inline-flex items-center gap-2">
                              <Paperclip size={14} strokeWidth={1.7} className="text-zinc-500" />
                              {filesCount}
                            </div>
                          </div>

                          {r.flagged && r.aiAdvice ? (
                            <div className="mt-3 text-[11px] text-zinc-500 tracking-tight line-clamp-2">
                              AI: <span className="text-zinc-700">{r.aiAdvice}</span>
                            </div>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* LIST */
                <div className="overflow-hidden">
                  <div className="grid grid-cols-12 text-[11px] font-medium text-zinc-500 bg-[#fbfbfa] border-b border-zinc-200/70">
                    <div className="col-span-2 px-5 py-3">ID</div>
                    <div className="col-span-5 px-5 py-3">Requirement</div>
                    <div className="col-span-2 px-5 py-3">Owner</div>
                    <div className="col-span-2 px-5 py-3">Status</div>
                    <div className="col-span-1 px-5 py-3 text-right">Files</div>
                  </div>

                  {list.map((r) => {
                    const open = expandedId === r.id;
                    const filesCount = Array.isArray(r.files) ? r.files.length : 0;

                    return (
                      <div key={r.id} className="border-b last:border-b-0 border-zinc-200/60">
                        <button
                          onClick={() => setExpandedId((p) => (p === r.id ? null : r.id))}
                          className="w-full text-left grid grid-cols-12 text-[13px] hover:bg-[#fbfbfa] transition-colors"
                        >
                          <div className="col-span-2 px-5 py-3 text-zinc-600">
                            <div className="flex items-center gap-2">
                              <span>{r.id}</span>
                              <StatusIcon r={r} />
                            </div>
                          </div>

                          <div className="col-span-5 px-5 py-3">
                            <div className="text-zinc-900 leading-snug">{r.text}</div>

                            <div className="mt-2 flex flex-wrap gap-2 items-center">
                              {r.reqType ? <ReqTypePill reqType={r.reqType} /> : null}

                              {frozen(r) ? (
                                <Pill tone="good">Frozen</Pill>
                              ) : r.flagged ? (
                                <Pill tone="bad">Flagged</Pill>
                              ) : (
                                <Pill>Incomplete</Pill>
                              )}

                              {r.lastUpdated ? <Pill>{r.lastUpdated}</Pill> : null}
                            </div>

                            {r.flagged && r.aiAdvice ? (
                              <div className="mt-2 text-[11px] text-zinc-500 tracking-tight">
                                AI advice: <span className="text-zinc-700">{r.aiAdvice}</span>
                              </div>
                            ) : null}
                          </div>

                          <div className="col-span-2 px-5 py-3 text-zinc-600">
                            <div className="text-zinc-900">{r.ownerRole}</div>
                            <div className="mt-0.5 text-[11px] text-zinc-500">
                              Added by {r.ownerName}
                            </div>
                          </div>

                          <div className="col-span-2 px-5 py-3 text-zinc-600">
                            <div className="text-zinc-900">{r.priority}</div>
                            <div className="mt-0.5 text-[11px] text-zinc-500">
                              {frozen(r) ? "Frozen" : r.flagged ? "Flagged" : "Incomplete"}
                            </div>
                          </div>

                          <div className="col-span-1 px-5 py-3 text-right text-zinc-600">
                            <span className="inline-flex items-center justify-end gap-2">
                              <Paperclip size={14} strokeWidth={1.7} className="text-zinc-500" />
                              {filesCount}
                            </span>
                          </div>
                        </button>

                        {open ? (
                          <div className="px-5 pb-5">
                            <div className="rounded-xl border border-zinc-200/80 bg-[#fbfbfa] p-4">
                              <Editor
                                r={r}
                                draft={draft}
                                setDraft={setDraft}
                                onSave={handleSave}
                                saving={saving}
                                running={running}
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ADD Modal */}
      <Modal
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          setAddText("");
          setAddError("");
        }}
      >
        <div className="px-5 py-4 flex items-start justify-between border-b border-zinc-200/70 bg-white">
          <div className="min-w-0">
            <div className="text-[11px] text-zinc-500 tracking-tight">New requirement</div>
            <div className="mt-1 text-[16px] font-semibold tracking-tight text-zinc-900">
              Add a complete, testable requirement
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Pill>Must be “Good” to add</Pill>
              <Pill tone="good">Frozen on add</Pill>
            </div>
          </div>

          <button
            onClick={() => {
              setAddOpen(false);
              setAddText("");
              setAddError("");
            }}
            className="h-9 w-9 rounded-xl grid place-items-center hover:bg-zinc-100 transition-colors"
            aria-label="Close"
          >
            <span className="sr-only">Close</span>
            <span className="text-zinc-700">✕</span>
          </button>
        </div>

        <div className="p-5 bg-[#fbfbfa]">
          <Surface className="p-4" shadow={SH_TILE}>
            <Editor
              r={addTemp}
              draft={draft}
              setDraft={setDraft}
              onSave={handleAddSave}
              saving={saving}
              running={running}
              addMode
              addText={addText}
              setAddText={setAddText}
              addError={addError}
            />
          </Surface>
        </div>
      </Modal>

      {/* EDIT Modal */}
      <Modal open={!!modalReq} onClose={() => setModalId(null)}>
        {modalReq ? (
          <>
            <div className="px-5 py-4 flex items-start justify-between border-b border-zinc-200/70 bg-white">
              <div className="min-w-0">
                <div className="text-[11px] text-zinc-500 tracking-tight">
                  {modalReq.id} • {modalReq.reqType}
                </div>
                <div className="mt-1 text-[16px] font-semibold tracking-tight text-zinc-900">
                  {modalReq.text}
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <Pill>{modalReq.priority}</Pill>
                  {modalReq.reqType ? <ReqTypePill reqType={modalReq.reqType} /> : null}
                  {frozen(modalReq) ? (
                    <Pill tone="good">Frozen</Pill>
                  ) : modalReq.flagged ? (
                    <Pill tone="bad">Flagged</Pill>
                  ) : (
                    <Pill>Incomplete</Pill>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const ok = window.confirm(`Delete ${modalReq.id}? This cannot be undone.`);
                    if (!ok) return;
                    removeRequirement(modalReq.id);
                    setModalId(null);
                  }}
                  className="h-9 px-3 rounded-xl inline-flex items-center gap-2 hover:bg-amber-50 text-amber-900 transition-colors"
                  title="Delete requirement"
                >
                  <Trash2 size={16} strokeWidth={2} />
                  <span className="text-[12px] font-medium tracking-tight">Delete</span>
                </button>

                <button
                  onClick={() => setModalId(null)}
                  className="h-9 w-9 rounded-xl grid place-items-center hover:bg-zinc-100 transition-colors"
                  aria-label="Close"
                >
                  <span className="sr-only">Close</span>
                  <span className="text-zinc-700">✕</span>
                </button>
              </div>
            </div>

            <div className="p-5 bg-[#fbfbfa]">
              <Surface className="p-4" shadow={SH_TILE}>
                <Editor
                  r={modalReq}
                  draft={draft}
                  setDraft={setDraft}
                  onSave={handleSave}
                  saving={saving}
                  running={running}
                />
              </Surface>
            </div>
          </>
        ) : null}
      </Modal>
    </div>
  );
}
