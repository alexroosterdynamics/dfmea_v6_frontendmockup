// contexts/Context.js
"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { v4 as uuidv4 } from "uuid";

const DFMEAContext = createContext(null);

export function DFMEAProvider({ children, initialWorkflows = [] }) {
  /* ----------------------------- App shell ----------------------------- */
  const [activeTab, setActiveTab] = useState("requirements");

  /* ----------------------------- Workflows ----------------------------- */
  const [workflows, setWorkflows] = useState(() =>
    Array.isArray(initialWorkflows) ? initialWorkflows : []
  );

  const [selectedWorkflowId, setSelectedWorkflowId] = useState(() => {
    const first = Array.isArray(initialWorkflows) ? initialWorkflows[0] : null;
    return first?.id || "";
  });

  const updateWorkflowLocal = useCallback((workflowId, patch) => {
    if (!workflowId) return;
    setWorkflows((prev) =>
      prev.map((w) => (w.id === workflowId ? { ...w, ...patch } : w))
    );
  }, []);

  const createWorkflow = useCallback(() => {
    const id = uuidv4();
    const wf = {
      id,
      category: "custom",
      owner: "me",
      title: "Untitled workflow",
      summary: "",
      textSteps: [],
      diagram: {
        nodes: [],
        edges: [],
        zoom: 1,
        pan: { x: 60, y: 60 }
      }
    };

    setWorkflows((prev) => [wf, ...prev]);
    setSelectedWorkflowId(id);
    setActiveTab("workflows");

    return wf;
  }, []);

  async function deleteWorkflow(workflowId) {
    const id = String(workflowId || "").trim();
    if (!id) return;

    // optimistic local delete
    setWorkflows((prev) => prev.filter((w) => w.id !== id));

    setSelectedWorkflowId((prevSelected) => {
      if (prevSelected !== id) return prevSelected;
      // pick the next available workflow (best effort)
      const remaining = workflows.filter((w) => w.id !== id);
      return remaining[0]?.id || "";
    });

    try {
      const res = await fetch("/api/workflows/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: id })
      });

      const j = await res.json();
      if (!j?.ok) throw new Error(j?.error || "Delete failed");
    } catch (err) {
      console.error(err);

      // If delete fails, refresh from disk to re-sync truth
      try {
        const res = await fetch("/api/workflows", { cache: "no-store" });
        const j = await res.json();
        const next = j?.data?.content?.workflows ?? [];
        setWorkflows(Array.isArray(next) ? next : []);
      } catch (e) {
        console.error("Failed to resync workflows after delete error", e);
      }

      alert(`Delete failed: ${err?.message || "unknown error"}`);
    }
  }

  /* ----------------------------- Requirements unlock ----------------------------- */
  const [requirementsComplete, setRequirementsComplete] = useState(false);
  const [requirementsDevUnlocked, setRequirementsDevUnlocked] = useState(false);

  const unlockFromRequirementsListView = useCallback(() => {
    setRequirementsDevUnlocked(true);
  }, []);

  /* ----------------------------- Change notices (mock) ----------------------------- */
  const [activeNotice, setActiveNotice] = useState(null);
  const [noticeHistory, setNoticeHistory] = useState([]);
  const [noticeAnalyzing, setNoticeAnalyzing] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);

  const timersRef = useRef([]);

  const cleanupTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }, []);

  const pushChangeNotice = useCallback(
    (notice) => {
      const n = {
        noticeId: notice.noticeId || uuidv4(),
        reqId: notice.reqId || "REQ-???",
        summary: notice.summary || "Change requested",
        impact: notice.impact || "Impact unknown",
        requestedBy: notice.requestedBy || "Someone",
        timestamp: notice.timestamp || "Just now"
      };

      setNoticeHistory((prev) => [n, ...prev]);
      setActiveNotice(n);
      setUnreadCount((c) => c + 1);

      setNoticeAnalyzing((prev) => ({ ...prev, [n.noticeId]: true }));

      const t = setTimeout(() => {
        setNoticeAnalyzing((prev) => ({ ...prev, [n.noticeId]: false }));
      }, 2200);

      timersRef.current.push(t);
    },
    [setNoticeHistory]
  );

  const markAllRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const dismissActiveNotice = useCallback(() => {
    setActiveNotice(null);
  }, []);

  /* ----------------------------- Context value ----------------------------- */
  const value = useMemo(
    () => ({
      // tabs
      activeTab,
      setActiveTab,

      // workflows
      workflows,
      selectedWorkflowId,
      setSelectedWorkflowId,
      createWorkflow,
      updateWorkflowLocal,
      deleteWorkflow,

      // requirements gating
      requirementsComplete,
      setRequirementsComplete,
      unlockFromRequirementsListView,
      requirementsDevUnlocked,

      // change notices
      activeNotice,
      noticeHistory,
      noticeAnalyzing,
      unreadCount,
      pushChangeNotice,
      cleanupTimers,
      markAllRead,
      dismissActiveNotice
    }),
    [
      activeTab,
      workflows,
      selectedWorkflowId,
      createWorkflow,
      updateWorkflowLocal,
      requirementsComplete,
      unlockFromRequirementsListView,
      requirementsDevUnlocked,
      activeNotice,
      noticeHistory,
      noticeAnalyzing,
      unreadCount,
      pushChangeNotice,
      cleanupTimers,
      markAllRead,
      dismissActiveNotice
    ]
  );

  return <DFMEAContext.Provider value={value}>{children}</DFMEAContext.Provider>;
}

export function useDFMEA() {
  const ctx = useContext(DFMEAContext);
  if (!ctx) throw new Error("useDFMEA must be used inside DFMEAProvider");
  return ctx;
}
