// app/page.js
"use client";

import { useMemo, useState } from "react";
import TopNav from "../components/TopNav";
import Sidebar from "../components/Sidebar";
import Workspace from "../components/Workspace";

import requirementsJson from "../data/requirements.json";
import processDiagram from "../data/processDiagram.json";
import rootCauseAnalysis from "../data/rootCauseAnalysis.json";
import workflowsJson from "../data/workflows.json";

import { DFMEAProvider, useDFMEA } from "../contexts/Context";

function AppShell({ requirementsData, setRequirementsData }) {
  const tabs = useMemo(
    () => [
      { id: "requirements", label: "Requirements" },
      { id: "processDiagram", label: "Process Diagram" },
      { id: "rootCauseAnalysis", label: "Root Cause Analysis" }
    ],
    []
  );

  const { activeTab, setActiveTab } = useDFMEA();

  const tabDataMap = useMemo(
    () => ({
      requirements: requirementsData,
      processDiagram,
      rootCauseAnalysis,
      workflows: workflowsJson
    }),
    [requirementsData]
  );

  const tabData = tabDataMap[activeTab] ?? tabDataMap.requirements;

  const [activeSheetTab, setActiveSheetTab] = useState("requirements");

  const requirementsUnlocked = useMemo(() => {
    const reqs = requirementsData?.content?.requirements ?? [];
    if (!reqs.length) return false;
    const allComplete = reqs.every((r) => !!r.isComplete);
    const noneFlagged = reqs.every((r) => !r.flagged);
    return allComplete && noneFlagged;
  }, [requirementsData]);

  // local dev gating (unchanged)
  const [devOverride, setDevOverride] = useState(false);
  const [listViewUnlocked, setListViewUnlocked] = useState(false);

  const canAccessOtherTabs = requirementsUnlocked || devOverride || listViewUnlocked;

  function handleChangeTab(nextTabId) {
    // ✅ Workflows always accessible and DOES NOT affect TopNav indicator
    if (nextTabId === "workflows") {
      setActiveTab("workflows");
      return;
    }

    if (nextTabId !== "requirements" && !canAccessOtherTabs) return;

    setActiveTab(nextTabId);
    setActiveSheetTab(nextTabId);
  }

  function onUpdateRequirements(nextRequirementsArray) {
    setRequirementsData((prev) => ({
      ...prev,
      content: {
        ...prev.content,
        requirements: nextRequirementsArray
      }
    }));
  }

  return (
    <div className="h-screen bg-[#fbfbfa] text-zinc-900 antialiased">
      <div className="lg:hidden h-screen flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="text-xl font-semibold tracking-tight">Desktop required</div>
          <div className="mt-2 text-sm text-zinc-600">
            This mock UI is designed strictly for desktop layouts.
          </div>
        </div>
      </div>

      <div className="hidden lg:flex h-full flex-col overflow-hidden">
        <TopNav
          tabs={tabs}
          activeTab={activeSheetTab}
          onChangeTab={handleChangeTab}
          unlockSheets={canAccessOtherTabs}
        />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar tasksTitle={tabData?.tasksTitle} tasks={tabData?.tasks} />

          <Workspace
            tabData={tabData}
            onUpdateRequirements={onUpdateRequirements}
            requirementsUnlocked={requirementsUnlocked}
            devOverride={devOverride}
            onDevSetOverride={setDevOverride}
            onListViewUnlock={() => setListViewUnlocked(true)}
          />
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const [requirementsData, setRequirementsData] = useState(requirementsJson);

  return (
    <DFMEAProvider initialWorkflows={workflowsJson?.content?.workflows ?? []}>
      <AppShell requirementsData={requirementsData} setRequirementsData={setRequirementsData} />
    </DFMEAProvider>
  );
}
