// components/RootCauseViewport.js
"use client";

const cx = (...c) => c.filter(Boolean).join(" ");

/* ----------------------------- Shadows (different recipes) ----------------------------- */
const SH_SURFACE =
  "shadow-[0_1px_0_rgba(0,0,0,0.05),0_14px_40px_rgba(0,0,0,0.06)]";
const SH_TILE =
  "shadow-[0_1px_0_rgba(0,0,0,0.05),0_10px_24px_rgba(0,0,0,0.06)]";

function PageTitle({ title, subtitle }) {
  return (
    <div className="max-w-5xl mx-auto px-10 pt-14 pb-6">
      <div className="text-[40px] leading-[1.12] font-semibold tracking-tight">
        {title}
      </div>
      {subtitle ? (
        <div className="mt-2 text-[13px] text-zinc-600 tracking-tight">{subtitle}</div>
      ) : null}
    </div>
  );
}

function Surface({ className = "", children, shadow = SH_SURFACE }) {
  return (
    <div
      className={cx(
        "rounded-xl border border-zinc-200/80 bg-white",
        shadow,
        className
      )}
    >
      {children}
    </div>
  );
}

export default function RootCauseViewport({ data }) {
  const { focusItem, categories, fiveWhys } = data.content;

  return (
    <div className="pb-24">
      <PageTitle title="Root Cause Analysis" />

      <div className="max-w-6xl mx-auto px-10">
        <Surface className="p-6">
          <div className="text-[13px] font-medium tracking-tight text-zinc-900">
            Focus item
          </div>

          <div className="mt-4 grid grid-cols-12 gap-4 text-[13px] tracking-tight">
            <div className="col-span-6">
              <div className="text-[11px] text-zinc-500">Failure mode</div>
              <div className="mt-1 text-zinc-900">{focusItem.failureMode}</div>
            </div>
            <div className="col-span-6">
              <div className="text-[11px] text-zinc-500">Effect</div>
              <div className="mt-1 text-zinc-900">{focusItem.effect}</div>
            </div>

            <div className="col-span-12">
              <div className="text-[11px] text-zinc-500">Current controls</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {focusItem.currentControls.map((c, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] px-2 py-1 rounded-full border border-zinc-200/80 bg-[#fbfbfa] text-zinc-700"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Surface>

        <div className="mt-6 grid grid-cols-12 gap-6">
          <div className="col-span-7">
            <div className="text-[13px] font-medium tracking-tight">
              Fishbone categories
            </div>
            <div className="mt-3 space-y-3">
              {categories.map((cat) => (
                <Surface key={cat.name} shadow={SH_TILE} className="overflow-hidden">
                  <div className="px-5 py-4 flex items-center justify-between border-b border-zinc-200/70 bg-[#fbfbfa]">
                    <div className="text-[13px] font-medium tracking-tight">
                      {cat.name}
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      {cat.items.length} items
                    </div>
                  </div>
                  <div className="px-5 py-4 space-y-2">
                    {cat.items.map((it, idx) => (
                      <div key={idx} className="text-[13px] text-zinc-800 flex gap-2">
                        <span className="text-zinc-300">•</span>
                        <span>{it}</span>
                      </div>
                    ))}
                  </div>
                </Surface>
              ))}
            </div>
          </div>

          <div className="col-span-5">
            <div className="text-[13px] font-medium tracking-tight">5 Whys</div>
            <Surface className="mt-3 overflow-hidden" shadow={SH_TILE}>
              {fiveWhys.map((w, idx) => (
                <div
                  key={idx}
                  className={cx(
                    "px-5 py-4",
                    idx !== 0 && "border-t border-zinc-200/70"
                  )}
                >
                  <div className="text-[11px] text-zinc-500">Why {w.why}</div>
                  <div className="mt-1 text-[13px] text-zinc-800">{w.text}</div>
                </div>
              ))}
            </Surface>
          </div>
        </div>
      </div>
    </div>
  );
}
