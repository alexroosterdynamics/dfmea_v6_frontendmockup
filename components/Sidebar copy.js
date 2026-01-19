// components/Sidebar.js
"use client";

import { useMemo, useState } from "react";
import {
  Home,
  CalendarDays,
  Sparkles,
  Inbox,
  Settings,
  Trash2,
  Search,
  ChevronDown,
  GitBranch,
  Plus
} from "lucide-react";

import { useDFMEA } from "@/contexts/Context";

const cx = (...c) => c.filter(Boolean).join(" ");

function NavItem({ icon: Icon, label, active, onClick, right }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "w-full px-2 py-1.5 rounded-md cursor-default flex items-center gap-2",
        "text-[13px] tracking-tight text-left",
        "hover:bg-zinc-200/40 transition-colors",
        active ? "bg-zinc-200/50 text-zinc-900" : "text-zinc-700"
      )}
    >
      <Icon size={16} strokeWidth={1.7} className="text-zinc-700" />
      <span className="truncate font-medium flex-1">{label}</span>
      {right}
    </button>
  );
}

/**
 * ✅ SubItem must NOT be a <button> if it contains another <button>.
 * Otherwise you get: <button> cannot be a descendant of <button>.
 *
 * So this is a div with role="button" (keyboard accessible).
 */
function SubItem({ label, onClick, active, right }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cx(
        "group w-full px-2 py-1.5 rounded-md text-left",
        "text-[12px] tracking-tight",
        "hover:bg-zinc-200/40 transition-colors",
        "flex items-center gap-2 select-none cursor-pointer",
        active ? "text-zinc-900 bg-zinc-200/40" : "text-zinc-700"
      )}
    >
      <span className="truncate flex-1">{label}</span>
      {right}
    </div>
  );
}

export default function Sidebar({ tasksTitle, tasks = [], onOpenRequirementsManager }) {
  const {
    activeTab,
    setActiveTab,
    workflows,
    selectedWorkflowId,
    setSelectedWorkflowId,
    createWorkflow,
    deleteWorkflow
  } = useDFMEA();

  // ✅ collapsed by default
  const [workflowsOpen, setWorkflowsOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false); // ✅ NEW

  const rightChevron = useMemo(
    () => (
      <ChevronDown
        size={16}
        strokeWidth={1.8}
        className={cx(
          "text-zinc-500 transition-transform",
          workflowsOpen ? "rotate-0" : "-rotate-90"
        )}
      />
    ),
    [workflowsOpen]
  );

  const inboxChevron = useMemo(
    () => (
      <ChevronDown
        size={16}
        strokeWidth={1.8}
        className={cx(
          "text-zinc-500 transition-transform",
          inboxOpen ? "rotate-0" : "-rotate-90"
        )}
      />
    ),
    [inboxOpen]
  );

  return (
    <aside className="w-[280px] h-full bg-[#f5f5f3] border-r border-zinc-200/70">
      <div className="h-full flex flex-col px-3 py-3">
        {/* header */}
        <div className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-zinc-200/40 transition-colors">
          <div className="h-8 w-8 rounded-xl bg-white border border-zinc-200/80 flex items-center justify-center text-xs font-semibold text-zinc-800">
            IA
          </div>
          <div className="min-w-0 leading-tight">
            <div className="text-[13px] font-semibold tracking-tight text-zinc-900 truncate">
              Engineering Space
            </div>
            <div className="text-[11px] text-zinc-500 truncate">Workspace • mock</div>
          </div>
        </div>

        {/* search */}
        <div className="mt-2 px-2">
          <div className="rounded-md bg-white border border-zinc-200/80 px-2.5 py-2 flex items-center gap-2">
            <Search size={16} strokeWidth={1.7} className="text-zinc-600" />
            <input
              className="w-full text-[13px] tracking-tight outline-none placeholder:text-zinc-400 bg-transparent"
              placeholder="Search"
              disabled
            />
          </div>
        </div>

        {/* nav */}
        <div className="mt-3 px-2 space-y-0.5">
          <NavItem
            icon={Home}
            label="Home"
            active={activeTab === "home"}
            onClick={() => setActiveTab("home")}
          />
          <NavItem
            icon={CalendarDays}
            label="Meetings"
            active={activeTab === "meetings"}
            onClick={() => setActiveTab("meetings")}
          />
          <NavItem
            icon={Sparkles}
            label="Notion AI"
            active={activeTab === "ai"}
            onClick={() => setActiveTab("ai")}
          />

          {/* ✅ Inbox group with manager view */}
          <NavItem
            icon={Inbox}
            label="Inbox"
            active={inboxOpen}
            right={inboxChevron}
            onClick={() => setInboxOpen((v) => !v)}
          />

          {inboxOpen ? (
            <div className="pl-6 mt-0.5 space-y-0.5">
              <SubItem
                label="Manager view"
                active={activeTab === "requirementsManager"}
                onClick={() => onOpenRequirementsManager?.()}
                right={
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-zinc-200/70 bg-white text-zinc-500">
                    Read-only
                  </span>
                }
              />
            </div>
          ) : null}

          {/* ✅ Workflows: expand/collapse menu */}
          <NavItem
            icon={GitBranch}
            label="Workflows"
            active={workflowsOpen}
            right={rightChevron}
            onClick={() => setWorkflowsOpen((v) => !v)}
          />

          {workflowsOpen ? (
            <div className="pl-6 mt-0.5 space-y-0.5">
              {workflows.length ? (
                workflows.map((w) => (
                  <SubItem
                    key={w.id}
                    label={w.title?.trim() ? w.title : "Untitled workflow"}
                    active={selectedWorkflowId === w.id && activeTab === "workflows"}
                    onClick={() => {
                      setActiveTab("workflows");
                      setSelectedWorkflowId(w.id);
                    }}
                    right={
                      <button
                        type="button"
                        title="Delete workflow"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();

                          const ok = window.confirm(
                            `Delete workflow "${
                              w.title?.trim() ? w.title : "Untitled workflow"
                            }"?`
                          );
                          if (!ok) return;

                          deleteWorkflow?.(w.id);
                        }}
                        className={cx(
                          "opacity-0 group-hover:opacity-100 transition",
                          "h-7 w-7 rounded-md grid place-items-center",
                          "hover:bg-amber-50 text-amber-900"
                        )}
                      >
                        <Trash2 size={14} strokeWidth={2} />
                      </button>
                    }
                  />
                ))
              ) : (
                <div className="px-2 py-2 text-[12px] text-zinc-500">No workflows yet.</div>
              )}

              <button
                type="button"
                onClick={() => createWorkflow()}
                className="mt-1 w-full px-2 py-1.5 rounded-md text-left text-[12px] tracking-tight
                           hover:bg-zinc-200/40 transition-colors flex items-center gap-2 text-zinc-700"
              >
                <Plus size={14} strokeWidth={1.8} className="text-zinc-600" />
                Add new workflow
              </button>
            </div>
          ) : null}
        </div>

        {/* tasks */}
        <div className="mt-5 px-2">
          <div className="text-[11px] font-medium text-zinc-500 tracking-tight">
            {tasksTitle || "Tasks"}
          </div>

          <div className="mt-2 space-y-1">
            {tasks.map((t) => (
              <div
                key={t.id}
                className={cx(
                  "px-2 py-1.5 rounded-md",
                  "hover:bg-zinc-200/40 transition-colors",
                  "flex items-center gap-2"
                )}
              >
                <div
                  className={cx(
                    "text-[13px] tracking-tight",
                    t.done ? "text-zinc-400 line-through" : "text-zinc-800"
                  )}
                >
                  {t.label}
                </div>
              </div>
            ))}

            {!tasks.length ? (
              <div className="text-[12px] text-zinc-500 px-2 py-2">No tasks in this tab.</div>
            ) : null}
          </div>
        </div>

        {/* footer */}
        <div className="mt-auto px-2 pt-4 space-y-0.5">
          <NavItem icon={Settings} label="Settings" onClick={() => {}} />
          <NavItem icon={Trash2} label="Trash" onClick={() => {}} />
        </div>
      </div>
    </aside>
  );
}
