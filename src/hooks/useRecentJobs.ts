import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "job_recent";
const MAX_RECENT = 50;

export function useRecentJobs() {
  // 최신 순서로 저장 (앞이 최신)
  const [recentIds, setRecentIds] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as number[];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentIds));
    } catch {
      // ignore
    }
  }, [recentIds]);

  const addRecent = useCallback((id: number) => {
    setRecentIds((prev) => {
      const filtered = prev.filter((v) => v !== id); // 중복 제거
      const next = [id, ...filtered];
      return next.slice(0, MAX_RECENT); // 최대 20개
    });
  }, []);

  return { recentIds, addRecent, max: MAX_RECENT };
}
