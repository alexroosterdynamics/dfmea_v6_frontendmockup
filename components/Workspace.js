// components/Workspace.js
"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { FileText, GitBranch, Search as SearchIcon, Workflow, CalendarDays } from "lucide-react";

import RequirementsViewport from "./RequirementsViewport";
import RequirementsManagerViewport from "./RequirementsManagerViewport";
import TasksTimelineViewport from "./TasksTimelineViewport"; // ✅ NEW
import ProcessDiagramViewport from "./ProcessDiagramViewport";
import RootCauseViewport from "./RootCauseViewport";
import Workflows from "./Workflows";
import AiDock from "./AiDock";

const cx = (...c) => c.filter(Boolean).join(" ");

export default function Workspace({
  tabData,
  onUpdateRequirements,
  requirementsUnlocked,
  onListViewUnlock,
  selectedWorkflowId,
  onSelectWorkflowId
}) {
  const isWorkflows = tabData.tabId === "workflows";

  const Viewport = useMemo(() => {
    if (tabData.tabId === "requirements") return RequirementsViewport;
    if (tabData.tabId === "requirementsManager") return RequirementsManagerViewport;
    if (tabData.tabId === "tasksTimeline") return TasksTimelineViewport; // ✅ NEW
    if (tabData.tabId === "processDiagram") return ProcessDiagramViewport;
    if (tabData.tabId === "workflows") return Workflows;
    return RootCauseViewport;
  }, [tabData.tabId]);

  const Icon = useMemo(() => {
    if (tabData.tabId === "requirements") return FileText;
    if (tabData.tabId === "requirementsManager") return FileText;
    if (tabData.tabId === "tasksTimeline") return CalendarDays; // ✅ NEW
    if (tabData.tabId === "processDiagram") return GitBranch;
    if (tabData.tabId === "workflows") return Workflow;
    return SearchIcon;
  }, [tabData.tabId]);

  const dockRef = useRef(null);
  const [dockHeight, setDockHeight] = useState(0);

  const [enter, setEnter] = useState(false);
  useEffect(() => {
    setEnter(false);
    const id = requestAnimationFrame(() => setEnter(true));
    return () => cancelAnimationFrame(id);
  }, [tabData.tabId]);

  useLayoutEffect(() => {
    if (!dockRef.current) return;
    const el = dockRef.current;

    const ro = new ResizeObserver((entries) => {
      const h = Math.ceil(entries[0].contentRect.height);
      setDockHeight(h);
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="flex-1 overflow-hidden bg-[#fbfbfa]">
      <div className="h-full flex flex-col">
        {/* header */}
        <div className="h-12 px-6 flex items-center justify-between bg-[#fbfbfa] border-b border-zinc-200/70">
          <div className="flex items-center gap-2 min-w-0">
            <Icon size={18} strokeWidth={1.6} className="text-zinc-700" />
            <div className="text-[13px] font-semibold tracking-tight text-zinc-900 truncate">
              {tabData.title}
            </div>
            <div className="text-[11px] text-zinc-500 whitespace-nowrap">
              • {tabData?.meta?.visibility ?? "private"}
            </div>
          </div>
          <div className="text-[11px] text-zinc-500 whitespace-nowrap">
            {tabData?.meta?.edited ?? "—"}
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden">
          {/* ✅ Workflows = NO scroll container */}
          {isWorkflows ? (
            <div className="h-full">
              <div
                className={cx(
                  "h-full transition-opacity duration-200",
                  enter ? "opacity-100" : "opacity-0"
                )}
              >
                <Viewport
                  data={tabData}
                  selectedWorkflowId={selectedWorkflowId}
                  onSelectWorkflowId={onSelectWorkflowId}
                />
              </div>
            </div>
          ) : (
            <>
              {/* normal scroll pages */}
              <div
                className="h-full overflow-y-auto"
                style={{ paddingBottom: dockHeight ? dockHeight + 28 : 320 }}
              >
                <div
                  className={cx(
                    "transition-opacity duration-200",
                    enter ? "opacity-100" : "opacity-0"
                  )}
                >
                  <Viewport
                    data={tabData}
                    onUpdateRequirements={onUpdateRequirements}
                    requirementsUnlocked={requirementsUnlocked}
                    onListViewUnlock={onListViewUnlock}
                  />
                </div>

                <div className="h-10" />
              </div>

              {/* fades only for normal pages */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-[#fbfbfa] to-transparent"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#fbfbfa] to-transparent"
              />
            </>
          )}

          {/* AI dock always pinned */}
          <div className="absolute left-0 right-0 bottom-0">
            <div className="px-8 pb-6">
              <div ref={dockRef}>
                <AiDock tabData={tabData} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
