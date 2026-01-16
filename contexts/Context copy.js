// contexts/Context.js
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState
} from "react";

const DFMEAContext = createContext(null);

function makeId() {
  return `wf-${Math.random().toString(16).slice(2, 8)}`;
}

export function DFMEAProvider({ children, initialWorkflows = [] }) {
  // -----------------------------
  // ✅ Tab navigation
  // -----------------------------
  const [activeTab, setActiveTab] = useState("requirements");

  // -----------------------------
  // ✅ Workflows
  // -----------------------------
  const [workflows, setWorkflows] = useState(initialWorkflows);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(
    initialWorkflows?.[0]?.id ?? ""
  );

  const createWorkflow = useCallback(() => {
    const id = makeId();

    const wf = {
      id,
      title: "Untitled workflow",
      summary: "",
      category: "custom",
      owner: "me",
      textSteps: [],
      diagram: {
        grid: 20,
        zoom: 1,
        pan: { x: 60, y: 60 },
        nodes: [],
        edges: []
      }
    };

    setWorkflows((prev) => [...prev, wf]);
    setSelectedWorkflowId(id);
    setActiveTab("workflows");
  }, []);

  // ✅ accepts: (id, patch) OR (workflowObject)
  const updateWorkflowLocal = useCallback((a, b) => {
    // case 1: updateWorkflowLocal(workflowObject)
    if (a && typeof a === "object" && a.id && b === undefined) {
      const wf = a;
      setWorkflows((prev) => prev.map((w) => (w.id === wf.id ? { ...w, ...wf } : w)));
      return;
    }

    // case 2: updateWorkflowLocal(id, patch)
    const workflowId = a;
    const patch = b;

    if (!workflowId || !patch) return;

    setWorkflows((prev) =>
      prev.map((w) => (w.id === workflowId ? { ...w, ...patch } : w))
    );
  }, []);

  // -----------------------------
  // ✅ Your existing notice system
  // -----------------------------
  const [activeNotice, setActiveNotice] = useState(null);
  const [noticeHistory, setNoticeHistory] = useState([]);
  const [noticeAnalyzing, setNoticeAnalyzing] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);
  const timersRef = useRef([]);

  const [requirementsComplete, setRequirementsComplete] = useState(false);
  const [requirementsDevUnlocked, setRequirementsDevUnlocked] = useState(false);

  const cleanupTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }, []);

  const pushChangeNotice = useCallback((notice) => {
    if (!notice?.noticeId) return;

    setActiveNotice(notice);

    setNoticeHistory((prev) => {
      const next = [notice, ...prev.filter((n) => n.noticeId !== notice.noticeId)];
      return next.slice(0, 6);
    });

    setUnreadCount((c) => Math.min(c + 1, 9));
    setNoticeAnalyzing((p) => ({ ...p, [notice.noticeId]: true }));

    const t = setTimeout(() => {
      setNoticeAnalyzing((p) => ({ ...p, [notice.noticeId]: false }));
    }, 5000);

    timersRef.current.push(t);
  }, []);

  const dismissActiveNotice = useCallback(() => setActiveNotice(null), []);
  const markAllRead = useCallback(() => setUnreadCount(0), []);

  const unlockFromRequirementsListView = useCallback(() => {
    setRequirementsDevUnlocked(true);
  }, []);

  const resetRequirementsUnlocks = useCallback(() => {
    setRequirementsComplete(false);
    setRequirementsDevUnlocked(false);
  }, []);

  const value = useMemo(
    () => ({
      // ✅ tabs
      activeTab,
      setActiveTab,

      // ✅ workflows
      workflows,
      setWorkflows,
      selectedWorkflowId,
      setSelectedWorkflowId,
      createWorkflow,
      updateWorkflowLocal,

      // ✅ notices
      activeNotice,
      noticeHistory,
      noticeAnalyzing,
      unreadCount,
      pushChangeNotice,
      dismissActiveNotice,
      markAllRead,
      cleanupTimers,

      // ✅ gating
      requirementsComplete,
      setRequirementsComplete,
      requirementsDevUnlocked,
      unlockFromRequirementsListView,
      resetRequirementsUnlocks
    }),
    [
      activeTab,
      workflows,
      selectedWorkflowId,
      createWorkflow,
      updateWorkflowLocal,
      activeNotice,
      noticeHistory,
      noticeAnalyzing,
      unreadCount,
      pushChangeNotice,
      dismissActiveNotice,
      markAllRead,
      cleanupTimers,
      requirementsComplete,
      requirementsDevUnlocked,
      unlockFromRequirementsListView,
      resetRequirementsUnlocks
    ]
  );

  return <DFMEAContext.Provider value={value}>{children}</DFMEAContext.Provider>;
}

export function useDFMEA() {
  const ctx = useContext(DFMEAContext);
  if (!ctx) throw new Error("useDFMEA must be used within DFMEAProvider");
  return ctx;
}
