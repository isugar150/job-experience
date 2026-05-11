import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "job_bookmarks";
const MAX_BOOKMARKS = 30;

export function useBookmarks() {
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return new Set<number>();
      return new Set<number>(JSON.parse(raw) as number[]);
    } catch {
      return new Set<number>();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...bookmarkedIds]));
    } catch {
      // ignore
    }
  }, [bookmarkedIds]);

  const toggle = useCallback((id: number) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_BOOKMARKS) return prev; // 30개 초과 시 무시
        next.add(id);
      }
      return next;
    });
  }, []);

  const isBookmarked = useCallback(
    (id: number) => bookmarkedIds.has(id),
    [bookmarkedIds]
  );

  return { bookmarkedIds, toggle, isBookmarked, max: MAX_BOOKMARKS };
}
