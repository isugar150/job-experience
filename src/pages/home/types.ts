import { useBookmarks } from "@/hooks/useBookmarks";
import { useRecentJobs } from "@/hooks/useRecentJobs";

export type BookmarksHook = ReturnType<typeof useBookmarks>;
export type RecentJobsHook = ReturnType<typeof useRecentJobs>;