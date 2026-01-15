"use client";

import { useState } from "react";
import {
  Home,
  CalendarDays,
  Sparkles,
  Inbox,
  Settings,
  Trash2,
  Search
} from "lucide-react";

const cx = (...c) => c.filter(Boolean).join(" ");

function NavItem({ icon: Icon, label, active }) {
  return (
    <div
      className={cx(
        "px-2 py-1.5 rounded-md cursor-default flex items-center gap-2",
        "text-[13px] tracking-tight",
        "hover:bg-zinc-200/40 transition-colors",
        active ? "bg-zinc-200/50 text-zinc-900" : "text-zinc-700"
      )}
    >
      <Icon size={16} strokeWidth={1.7} className="text-zinc-700" />
      <span className="truncate font-medium">{label}</span>
    </div>
  );
}

function ModernCheckbox({ defaultChecked }) {
  const [checked, setChecked] = useState(!!defaultChecked);

  const tick =
    "data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27white%27%20stroke-width%3D%272.8%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Cpolyline%20points%3D%2720%206%209%2017%204%2012%27/%3E%3C/svg%3E";

  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => setChecked(e.target.checked)}
      className={cx(
        "h-4 w-4 rounded-[6px] appearance-none",
        "bg-white border border-zinc-300/80",
        "focus:outline-none focus:ring-2 focus:ring-zinc-300",
        "transition bg-no-repeat bg-center"
      )}
      style={{
        backgroundSize: "14px 14px",
        backgroundImage: checked ? `url("${tick}")` : "none",
        backgroundColor: checked ? "#18181b" : "#ffffff"
      }}
      aria-checked={checked}
    />
  );
}

export default function Sidebar({ tasksTitle, tasks = [] }) {
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

        {/* search (Notion-ish) */}
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
          <NavItem icon={Home} label="Home" />
          <NavItem icon={CalendarDays} label="Meetings" />
          <NavItem icon={Sparkles} label="Notion AI" />
          <NavItem icon={Inbox} label="Inbox" />
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
                <ModernCheckbox defaultChecked={t.done} />
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
              <div className="text-[12px] text-zinc-500 px-2 py-2">
                No tasks in this tab.
              </div>
            ) : null}
          </div>
        </div>

        {/* footer */}
        <div className="mt-auto px-2 pt-4 space-y-0.5">
          <NavItem icon={Settings} label="Settings" />
          <NavItem icon={Trash2} label="Trash" />
        </div>
      </div>
    </aside>
  );
}
