"use client";

import { X } from "lucide-react";

const cx = (...c) => c.filter(Boolean).join(" ");

function KV({ k, v }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <div className="text-[11px] text-zinc-500">{k}</div>
      <div className="text-[12px] text-zinc-800 text-right">{v ?? "—"}</div>
    </div>
  );
}

export default function NodeDetailsModal({ open, node, onClose }) {
  if (!open || !node) return null;

  const meta = node.meta ?? {};

  return (
    <div className="fixed inset-0 z-[80]">
      {/* backdrop */}
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 bg-black/20"
      />

      {/* modal */}
      <div className="absolute left-1/2 top-1/2 w-[640px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2">
        <div className="rounded-2xl border border-zinc-200/70 bg-white shadow-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-200/70 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[12px] text-zinc-500 tracking-tight">{node.kind}</div>
              <div className="text-[13px] font-semibold tracking-tight text-zinc-900 mt-0.5">
                {node.title}
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">{node.id}</div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className={cx(
                "h-9 w-9 rounded-xl border border-zinc-200/80 bg-white",
                "grid place-items-center hover:bg-zinc-100 transition-colors"
              )}
              title="Close"
            >
              <X size={16} strokeWidth={1.8} className="text-zinc-700" />
            </button>
          </div>

          <div className="px-4 py-4">
            <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/40 px-3 py-3">
              <div className="text-[11px] font-medium text-zinc-500 tracking-tight">Details</div>

              <div className="mt-2 border-t border-zinc-200/70">
                <KV k="Type" v={node.kind} />
                <KV k="ID" v={node.id} />
                <KV k="Title" v={node.title} />

                {/* Requirement */}
                {node.kind === "Requirement" ? <KV k="Priority" v={meta.priority} /> : null}

                {/* Failure Mode */}
                {node.kind === "Failure Mode" ? <KV k="RPN" v={meta.rpn} /> : null}

                {/* Cause */}
                {node.kind === "Cause" ? (
                  <>
                    <KV k="Occurrence" v={meta.occurrence} />
                    <KV k="Detection" v={meta.detection} />
                  </>
                ) : null}

                {/* Effect */}
                {node.kind === "Effect" ? <KV k="Severity" v={meta.severity} /> : null}

                {/* Control */}
                {node.kind === "Control" ? <KV k="Control Type" v={meta.controlType} /> : null}
              </div>
            </div>

            <div className="mt-3 text-[11px] text-zinc-500 leading-snug">
              Tip: This modal represents the “full sheet row” view. Next step we can allow editing these
              values and writing them back into DFMEA.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
