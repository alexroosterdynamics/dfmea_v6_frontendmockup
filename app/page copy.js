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

import { DFMEAProvider } from "../contexts/Context";

export default function Page() {
  // ✅ Removed "Workflows" from TopNav tabs (no sheet exposure)
  const tabs = useMemo(
    () => [
      { id: "requirements", label: "Requirements" },
      { id: "processDiagram", label: "Process Diagram" },
      { id: "rootCauseAnalysis", label: "Root Cause Analysis" }
    ],
    []
  );

  const [requirementsData, setRequirementsData] = useState(requirementsJson);

  // ✅ Make workflows stateful so Sidebar can create/select workflows
  const [workflowsData, setWorkflowsData] = useState(workflowsJson);

  // ✅ Which workflow is selected (from sidebar)
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(
    workflowsJson?.content?.workflows?.[0]?.id ?? ""
  );

  const tabDataMap = useMemo(
    () => ({
      requirements: requirementsData,
      processDiagram,
      rootCauseAnalysis,
      workflows: workflowsData
    }),
    [requirementsData, workflowsData]
  );

  const [activeTab, setActiveTab] = useState("requirements");

  // ✅ DEV: override gating anytime
  const [devOverride, setDevOverride] = useState(false);

  // ✅ QUICK DEV: once you click List view once, tabs become accessible
  const [listViewUnlocked, setListViewUnlocked] = useState(false);

  const requirementsUnlocked = useMemo(() => {
    const reqs = requirementsData?.content?.requirements ?? [];
    if (!reqs.length) return false;
    const allComplete = reqs.every((r) => !!r.isComplete);
    const noneFlagged = reqs.every((r) => !r.flagged);
    return allComplete && noneFlagged;
  }, [requirementsData]);

  const canAccessOtherTabs = requirementsUnlocked || devOverride || listViewUnlocked;

  function handleChangeTab(nextTabId) {
    // ✅ Workflows accessible always
    if (nextTabId === "workflows") {
      setActiveTab("workflows");
      return;
    }

    if (nextTabId !== "requirements" && !canAccessOtherTabs) return;
    setActiveTab(nextTabId);
  }

  function onDevJumpTo(tabId) {
    setActiveTab(tabId);
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

  // ✅ Add new workflow from sidebar (local mock create)
  function onCreateWorkflow() {
    const newId = `wf-my-${Math.random().toString(16).slice(2, 7)}`;

    const newWorkflow = {
      id: newId,
      category: "design",
      owner: "me",
      title: "My Workflow • New SOP",
      summary: "A personal workflow template you can build step-by-step.",
      textSteps: ["Start", "Add steps to define your SOP", "End"],
      diagram: {
        grid: 20,
        zoom: 1,
        nodes: [
          {
            id: "m0",
            type: "start",
            x: 80,
            y: 80,
            w: 200,
            h: 70,
            title: "Start",
            detail: "Kick off workflow"
          },
          {
            id: "m1",
            type: "end",
            x: 420,
            y: 80,
            w: 220,
            h: 80,
            title: "End",
            detail: "Close workflow"
          }
        ],
        edges: [{ id: "me0", from: "m0", to: "m1", label: "finish" }]
      }
    };

    setWorkflowsData((prev) => ({
      ...prev,
      content: {
        ...prev.content,
        workflows: [...(prev?.content?.workflows ?? []), newWorkflow]
      }
    }));

    setSelectedWorkflowId(newId);
    setActiveTab("workflows");
  }

  return (
    <DFMEAProvider>
      <div className="h-screen bg-[#fbfbfa] text-zinc-900 antialiased">
        {/* desktop-only gate */}
        <div className="lg:hidden h-screen flex items-center justify-center p-8">
          <div className="max-w-md text-center">
            <div className="text-xl font-semibold tracking-tight">Desktop required</div>
            <div className="mt-2 text-sm text-zinc-600">
              This mock UI is designed strictly for desktop layouts.
            </div>
          </div>
        </div>

        <div className="hidden lg:flex h-full flex-col overflow-hidden">
          <TopNav tabs={tabs} activeTab={activeTab} onChangeTab={handleChangeTab} />

          <div className="flex flex-1 overflow-hidden">
            <Sidebar
              tasksTitle={tabDataMap[activeTab].tasksTitle}
              tasks={tabDataMap[activeTab].tasks}
              activeTab={activeTab}
              onChangeTab={handleChangeTab}
              workflows={workflowsData?.content?.workflows ?? []}
              selectedWorkflowId={selectedWorkflowId}
              onSelectWorkflowId={setSelectedWorkflowId}
              onCreateWorkflow={onCreateWorkflow}
            />

            <Workspace
              tabData={tabDataMap[activeTab]}
              onUpdateRequirements={onUpdateRequirements}
              requirementsUnlocked={requirementsUnlocked}
              devOverride={devOverride}
              onDevSetOverride={setDevOverride}
              onDevJumpTo={onDevJumpTo}
              onListViewUnlock={() => setListViewUnlocked(true)}
              selectedWorkflowId={selectedWorkflowId}
              onSelectWorkflowId={setSelectedWorkflowId}
            />
          </div>
        </div>
      </div>
    </DFMEAProvider>
  );
}
