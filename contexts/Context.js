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

export function DFMEAProvider({ children }) {
  // Active “floating card” notice (ONLY ONE at a time)
  const [activeNotice, setActiveNotice] = useState(null);

  // History for TopNav “toast” panel (keep last 6)
  const [noticeHistory, setNoticeHistory] = useState([]);

  // Track per-notice AI background analysis state
  const [noticeAnalyzing, setNoticeAnalyzing] = useState({}); // { [noticeId]: boolean }

  // Badge count in TopNav
  const [unreadCount, setUnreadCount] = useState(0);

  const timersRef = useRef([]);

  const cleanupTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }, []);

  const pushChangeNotice = useCallback((notice) => {
    if (!notice?.noticeId) return;

    // Set as the only active card
    setActiveNotice(notice);

    // Add to TopNav history (dedupe)
    setNoticeHistory((prev) => {
      const next = [notice, ...prev.filter((n) => n.noticeId !== notice.noticeId)];
      return next.slice(0, 6);
    });

    // Increase badge count (mock “unread”)
    setUnreadCount((c) => Math.min(c + 1, 9));

    // Begin background AI analysis (5s mock)
    setNoticeAnalyzing((p) => ({ ...p, [notice.noticeId]: true }));

    const t = setTimeout(() => {
      setNoticeAnalyzing((p) => ({ ...p, [notice.noticeId]: false }));
    }, 5000);

    timersRef.current.push(t);
  }, []);

  const dismissActiveNotice = useCallback(() => {
    setActiveNotice(null);
  }, []);

  const markAllRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const value = useMemo(
    () => ({
      activeNotice,
      noticeHistory,
      noticeAnalyzing,
      unreadCount,
      pushChangeNotice,
      dismissActiveNotice,
      markAllRead,
      cleanupTimers
    }),
    [
      activeNotice,
      noticeHistory,
      noticeAnalyzing,
      unreadCount,
      pushChangeNotice,
      dismissActiveNotice,
      markAllRead,
      cleanupTimers
    ]
  );

  return <DFMEAContext.Provider value={value}>{children}</DFMEAContext.Provider>;
}

export function useDFMEA() {
  const ctx = useContext(DFMEAContext);
  if (!ctx) throw new Error("useDFMEA must be used within DFMEAProvider");
  return ctx;
}
