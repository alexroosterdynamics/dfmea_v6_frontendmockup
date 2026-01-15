// components/TopNav.js
"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Search, Bell, CheckCircle2, Loader2, X } from "lucide-react";
import { useDFMEA } from "../contexts/Context";

const cx = (...c) => c.filter(Boolean).join(" ");

function Pill({ tone = "neutral", children }) {
  const cls =
    tone === "good"
      ? "bg-emerald-50 border-emerald-200/70 text-emerald-900"
      : tone === "busy"
        ? "bg-[#fbfbfa] border-zinc-200/80 text-zinc-700"
        : "bg-[#fbfbfa] border-zinc-200/80 text-zinc-700";

  return (
    <span className={cx("text-[11px] px-2 py-1 rounded-full border tracking-tight", cls)}>
      {children}
    </span>
  );
}

/** Small skeleton helpers */
function SkeletonLine({ w = "w-full" }) {
  return <div className={cx("h-3 rounded-md bg-zinc-200/80", w)} />;
}

function SkeletonPill({ w = "w-20" }) {
  return <div className={cx("h-6 rounded-full bg-zinc-200/80", w)} />;
}

function ActiveNoticeSkeleton({ requestedBy, timestamp }) {
  return (
    <div className="min-w-0 flex-1 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="h-4 w-44 bg-zinc-200/80 rounded-md" />
          <div className="mt-2 space-y-2">
            <SkeletonLine w="w-[92%]" />
            <SkeletonLine w="w-[78%]" />
          </div>
        </div>

        <div className="h-8 w-8 rounded-xl bg-zinc-200/80" />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <SkeletonPill w="w-24" />
        <SkeletonPill w="w-20" />
        <SkeletonPill w="w-28" />
      </div>

      <div className="mt-3 rounded-xl border border-zinc-200/80 bg-[#fbfbfa] p-3">
        <div className="h-3 w-16 bg-zinc-200/80 rounded-md" />
        <div className="mt-2 space-y-2">
          <SkeletonLine w="w-[86%]" />
          <SkeletonLine w="w-[64%]" />
        </div>
      </div>

      {/* optional: keep real pills if you want, but skeletons already cover */}
      <div className="sr-only">
        {requestedBy} {timestamp}
      </div>
    </div>
  );
}

export default function TopNav({ tabs, activeTab, onChangeTab }) {
  const containerRef = useRef(null);
  const tabRefs = useRef({});
  const [indicator, setIndicator] = useState({ x: 0, w: 0, ready: false });

  const {
    activeNotice,
    noticeHistory,
    noticeAnalyzing,
    unreadCount,
    markAllRead,
    dismissActiveNotice
  } = useDFMEA();

  const [toastOpen, setToastOpen] = useState(false);

  const activeLabel = useMemo(
    () => tabs.find((t) => t.id === activeTab)?.label ?? "",
    [tabs, activeTab]
  );

  const measure = () => {
    const wrap = containerRef.current;
    const el = tabRefs.current[activeTab];
    if (!wrap || !el) return;

    const x = el.offsetLeft;
    const w = el.offsetWidth;

    setIndicator((prev) => {
      if (prev.ready && prev.x === x && prev.w === w) return prev;
      return { x, w, ready: true };
    });
  };

  useLayoutEffect(() => {
    measure();

    const wrap = containerRef.current;
    if (!wrap) return;

    const ro = new ResizeObserver(() => measure());
    ro.observe(wrap);

    const activeEl = tabRefs.current[activeTab];
    if (activeEl) ro.observe(activeEl);

    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, tabs.length]);

  const activeBusy = activeNotice ? !!noticeAnalyzing?.[activeNotice.noticeId] : false;

  return (
    <div className="h-14 px-5 flex items-center justify-between bg-[#fbfbfa] border-b border-zinc-200/70">
      {/* Left: brand + tabs */}
      <div className="grid grid-cols-[280px_1fr] items-center gap-4 min-w-0">
        <div className="flex items-center gap-3 w-[280px] min-w-[280px]">
          <div className="h-8 w-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center text-xs font-semibold">
            DF
          </div>

          <div className="min-w-0 leading-tight">
            <div className="text-[13px] font-semibold tracking-tight text-zinc-900 truncate">
              DFMEA Studio
            </div>
            <div className="text-[11px] text-zinc-500 truncate">
              Desktop mock • <span className="text-zinc-700">{activeLabel}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center min-w-0">
          <div
            ref={containerRef}
            className={cx(
              "relative hidden lg:flex items-center gap-1",
              "bg-white rounded-xl p-1",
              "border border-zinc-200/80"
            )}
          >
            {/* sliding indicator */}
            <div
              aria-hidden="true"
              className={cx(
                "pointer-events-none absolute top-1 bottom-1 rounded-lg bg-zinc-900",
                "transition-[transform,width,opacity] duration-300 ease-out will-change-transform"
              )}
              style={{
                width: indicator.w,
                transform: `translate3d(${indicator.x}px,0,0)`,
                opacity: indicator.ready ? 1 : 0
              }}
            />

            {tabs.map((t) => {
              const isActive = t.id === activeTab;

              // ✅ TODO: replace this with your real state from Context
              // Example: const { requirementsComplete } = useDFMEA();
              const requirementsComplete = false;

              // ✅ Lock everything except Requirements when it's not complete
              const isRequirementsTab = t.id === "requirements";
              const locked = !requirementsComplete && !isRequirementsTab;

              const lockedTooltip =
                "Locked — finish Requirements first to unlock this sheet. Dev option: open Requirements → “List view” to unlock early.";

              return (
                <button
                  key={t.id}
                  ref={(node) => {
                    if (node) tabRefs.current[t.id] = node;
                  }}
                  disabled={locked}
                  aria-disabled={locked}
                  title={locked ? lockedTooltip : undefined}
                  onClick={() => {
                    if (locked) return;        // ✅ prevents click
                    onChangeTab(t.id);
                  }}
                  className={cx(
                    "relative z-10 text-[13px] px-3 py-1.5 rounded-lg",
                    "font-medium tracking-tight transition-colors duration-200",
                    isActive ? "text-white" : "text-zinc-700",

                    // ✅ normal hover only when unlocked
                    !locked && !isActive ? "hover:text-zinc-900" : "",

                    // ✅ locked styling (makes it VERY obvious)
                    locked ? "opacity-45 cursor-not-allowed" : "cursor-pointer"
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3 relative">
        <div className="hidden xl:flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-zinc-200/80">
          <Search size={18} strokeWidth={1.6} className="text-zinc-600" />
          <input
            className="w-64 text-[13px] outline-none placeholder:text-zinc-400 bg-transparent"
            placeholder="Search (mock)"
            disabled
          />
        </div>

        {/* 🔔 Change notice (active card + toast history) */}
        <div className="relative">
          <button
            onClick={() => {
              setToastOpen((v) => !v);
              markAllRead();
            }}
            className={cx(
              "h-10 w-10 rounded-xl bg-white border border-zinc-200/80",
              "grid place-items-center hover:bg-zinc-100 transition-colors"
            )}
            title="Change notices"
            aria-label="Change notices"
          >
            <Bell size={18} strokeWidth={1.6} className="text-zinc-700" />

            {unreadCount ? (
              <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-zinc-900 text-white text-[10px] grid place-items-center">
                {unreadCount}
              </span>
            ) : null}
          </button>

          {/* ✅ Active notice card (ONLY ONE, with X close)
              Appears even when dropdown closed. */}
          {activeNotice && !toastOpen ? (
            <div
              className={cx(
                "absolute right-0 mt-2 w-[380px] z-50",
                "rounded-2xl border border-zinc-200/80 bg-white overflow-hidden",
                "shadow-[0_1px_0_rgba(0,0,0,0.05),0_20px_50px_rgba(0,0,0,0.12)]"
              )}
            >
              <div className="px-4 py-3 flex items-start gap-3">
                <div className="mt-0.5 h-8 w-8 rounded-xl bg-white border border-zinc-200/80 grid place-items-center">
                  <Bell size={16} strokeWidth={1.8} className="text-zinc-700" />
                </div>

                {/* ✅ Skeleton while AI is analyzing */}
                {activeBusy ? (
                  <ActiveNoticeSkeleton
                    requestedBy={activeNotice.requestedBy}
                    timestamp={activeNotice.timestamp}
                  />
                ) : (
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold tracking-tight text-zinc-900">
                          Change notice • {activeNotice.reqId}
                        </div>
                        <div className="mt-0.5 text-[11px] text-zinc-500 tracking-tight line-clamp-2">
                          {activeNotice.summary}
                        </div>
                      </div>

                      <button
                        onClick={dismissActiveNotice}
                        className="h-8 w-8 rounded-xl grid place-items-center hover:bg-zinc-100 transition-colors"
                        aria-label="Close"
                        title="Close"
                      >
                        <X size={16} strokeWidth={1.8} className="text-zinc-600" />
                      </button>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <Pill>{activeNotice.requestedBy}</Pill>
                      <Pill>{activeNotice.timestamp}</Pill>

                      <Pill tone="good">
                        <span className="inline-flex items-center gap-1.5">
                          <CheckCircle2 size={12} strokeWidth={2} />
                          Done
                        </span>
                      </Pill>
                    </div>

                    <div className="mt-3 rounded-xl border border-zinc-200/80 bg-[#fbfbfa] p-3">
                      <div className="text-[11px] text-zinc-500">Impact</div>
                      <div className="mt-1 text-[13px] text-zinc-800">
                        {activeNotice.impact}
                      </div>
                    </div>
                  </div>
                )}

                {/* ✅ If busy, still show close X (optional)
                    If you want the X even while analyzing, move it outside skeleton */}
                {activeBusy ? (
                  <button
                    onClick={dismissActiveNotice}
                    className="h-8 w-8 rounded-xl grid place-items-center hover:bg-zinc-100 transition-colors"
                    aria-label="Close"
                    title="Close"
                  >
                    <X size={16} strokeWidth={1.8} className="text-zinc-600" />
                  </button>
                ) : null}
              </div>

              {/* ✅ Keep the busy pill visible under skeleton */}
              {activeBusy ? (
                <div className="px-4 pb-3 -mt-1">
                  <div className="flex items-center gap-2">
                    <Pill>{activeNotice.requestedBy}</Pill>
                    <Pill>{activeNotice.timestamp}</Pill>
                    <Pill tone="busy">
                      <span className="inline-flex items-center gap-1.5">
                        <Loader2 size={12} strokeWidth={2} className="animate-spin" />
                        AI analyzing…
                      </span>
                    </Pill>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Dropdown history */}
          {toastOpen ? (
            <div
              className={cx(
                "absolute right-0 mt-2 w-[360px] z-50",
                "rounded-2xl border border-zinc-200/80 bg-white overflow-hidden",
                "shadow-[0_1px_0_rgba(0,0,0,0.05),0_20px_50px_rgba(0,0,0,0.12)]"
              )}
            >
              <div className="px-4 py-3 border-b border-zinc-200/70 bg-[#fbfbfa] flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-semibold tracking-tight text-zinc-900">
                    Change notices
                  </div>
                  <div className="text-[11px] text-zinc-500 tracking-tight">
                    Auto risk analysis runs in background (mock)
                  </div>
                </div>

                <button
                  onClick={() => setToastOpen(false)}
                  className="text-[11px] px-2 py-1 rounded-xl bg-white border border-zinc-200/80 text-zinc-700 hover:bg-zinc-100 transition-colors"
                >
                  Close
                </button>
              </div>

              <div className="max-h-[360px] overflow-y-auto">
                {!noticeHistory.length ? (
                  <div className="px-4 py-4 text-[12px] text-zinc-500">No notices yet.</div>
                ) : (
                  noticeHistory.map((n) => {
                    const busy = !!noticeAnalyzing[n.noticeId];
                    return (
                      <div
                        key={n.noticeId}
                        className="px-4 py-3 border-b last:border-b-0 border-zinc-200/60 hover:bg-[#fbfbfa] transition-colors"
                      >
                        <div className="text-[13px] font-semibold tracking-tight text-zinc-900">
                          {n.reqId} • change notice
                        </div>

                        {/* ✅ Skeleton for summary while analyzing */}
                        {busy ? (
                          <div className="mt-1.5 space-y-2 animate-pulse">
                            <SkeletonLine w="w-[92%]" />
                            <SkeletonLine w="w-[78%]" />
                          </div>
                        ) : (
                          <div className="mt-0.5 text-[11px] text-zinc-500 tracking-tight line-clamp-2">
                            {n.summary}
                          </div>
                        )}

                        <div className="mt-2 flex items-center gap-2">
                          <Pill>{n.requestedBy}</Pill>
                          <Pill>{n.timestamp}</Pill>
                          {busy ? (
                            <Pill tone="busy">
                              <span className="inline-flex items-center gap-1.5">
                                <Loader2 size={12} strokeWidth={2} className="animate-spin" />
                                AI analyzing…
                              </span>
                            </Pill>
                          ) : (
                            <Pill tone="good">
                              <span className="inline-flex items-center gap-1.5">
                                <CheckCircle2 size={12} strokeWidth={2} />
                                Done
                              </span>
                            </Pill>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}
        </div>

        <button className="text-[13px] font-medium tracking-tight px-3.5 py-2 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 transition-colors">
          Share
        </button>
      </div>
    </div>
  );
}
