// components/AiDock.js
"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Maximize2,
  Expand,
  Plus,
  ArrowUp,
  Loader2
} from "lucide-react";

const cx = (...c) => c.filter(Boolean).join(" ");

/* ----------------------------- Shadows (different recipes) ----------------------------- */
const SH_DOCK =
  "shadow-[0_1px_0_rgba(0,0,0,0.06),0_30px_70px_rgba(0,0,0,0.16)]";

export default function AiDock({ tabData }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [dockOpen, setDockOpen] = useState(false);
  const [dockSize, setDockSize] = useState("sm"); // sm | md | lg
  const [fullscreen, setFullscreen] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    setInput("");
    setMessages([{ role: "assistant", text: tabData.assistant.welcome }]);
  }, [tabData.tabId, tabData.assistant.welcome]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, dockOpen, dockSize, fullscreen]);

  function send(text) {
    const trimmed = text.trim();
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
    setDockOpen(true); // when you send, show the conversation
  }

  function cycleSize() {
    setDockSize((s) => (s === "sm" ? "md" : s === "md" ? "lg" : "sm"));
    setDockOpen(true);
  }

  const heightClass =
    dockSize === "sm" ? "h-44" : dockSize === "lg" ? "h-[520px]" : "h-64";

  const Shell = ({ children, className = "" }) => (
    <div
      className={cx(
        "rounded-2xl border border-zinc-200/80 bg-white overflow-hidden",
        SH_DOCK,
        className
      )}
    >
      {children}
    </div>
  );

  const PromptChips = () =>
    tabData.assistant?.suggestedPrompts?.length ? (
      <div className="px-4 pb-3 bg-white">
        <div className="flex flex-wrap gap-2">
          {tabData.assistant.suggestedPrompts.map((p) => (
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

  // ChatGPT-like composer: centered, small, always usable
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
            onClick={() => setDockOpen(true)}
            className="text-[11px] text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            Open chat
          </button>
          <div className="text-[11px] text-zinc-500">
            AI Assistant • {tabData.title}
          </div>
        </div>
      ) : (
        <div className="mt-2 text-[11px] text-zinc-500">
          Tip: later you can add “Send selection to AI” from the viewport.
        </div>
      )}
    </div>
  );

  const Fullscreen = () => {
    if (!fullscreen) return null;

    return (
      <div className="fixed inset-0 z-50">
        <div
          className="absolute inset-0 bg-zinc-950/20 backdrop-blur-sm"
          onClick={() => setFullscreen(false)}
        />
        <div className="absolute inset-0 p-6 flex">
          <div className="m-auto w-full max-w-4xl h-[80vh]">
            <Shell>
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

  return (
    <>
      <Fullscreen />

      {/* CENTERED dock width (ChatGPT-ish) */}
      <div className="max-w-[860px] mx-auto">
        {/* Collapsed state = compact composer only, still typeable */}
        {!dockOpen ? (
          <Shell className="rounded-[26px]">
            <div className="px-4 py-2 flex items-center justify-between bg-white">
              <button
                onClick={() => setDockOpen(true)}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-xl bg-zinc-100 hover:bg-zinc-200/70 border border-zinc-200/80 text-zinc-700 transition-colors"
                title="Expand"
              >
                <ChevronDown size={14} strokeWidth={1.7} className="rotate-180" />
                Expand
              </button>

              <div className="text-[11px] text-zinc-500">AI Assistant</div>

              <button
                onClick={() => setFullscreen(true)}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 transition-colors"
                title="Full window"
              >
                <Maximize2 size={14} strokeWidth={1.7} />
                Full
              </button>
            </div>

            <CompactComposer compact />
          </Shell>
        ) : (
          <Shell>
            <div className="px-4 py-3 flex items-center justify-between bg-white border-b border-zinc-200/70">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold tracking-tight text-zinc-900">
                  AI Assistant
                </div>
                <div className="text-[11px] text-zinc-500 truncate">
                  Context-aware chat (mock) • {tabData.title}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setDockOpen(false)}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-xl bg-zinc-100 hover:bg-zinc-200/70 border border-zinc-200/80 text-zinc-700 transition-colors"
                  title="Collapse"
                >
                  <ChevronDown size={14} strokeWidth={1.7} />
                  Collapse
                </button>

                <button
                  onClick={cycleSize}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-xl bg-zinc-100 hover:bg-zinc-200/70 border border-zinc-200/80 text-zinc-700 transition-colors"
                  title="Resize"
                >
                  <Expand size={14} strokeWidth={1.7} />
                  Size
                </button>

                <button
                  onClick={() => setFullscreen(true)}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 transition-colors"
                  title="Full window"
                >
                  <Maximize2 size={14} strokeWidth={1.7} />
                  Full
                </button>
              </div>
            </div>

            <PromptChips />
            <Messages />
            <CompactComposer compact={false} />
          </Shell>
        )}
      </div>
    </>
  );
}
