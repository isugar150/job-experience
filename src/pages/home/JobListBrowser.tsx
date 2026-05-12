import { useEffect, useMemo, useRef, useState } from "react";
import { ALL_JOBS, type Job } from "@/lib/recommend";
import { JobThumb } from "@/components/JobThumb";
import type { BookmarksHook, RecentJobsHook } from "./types";
import { JobDetailDialog } from "./JobDetailDialog";
const JOB_LIST_PAGE_SIZE = 100;

// 사전 계산 가능한 값들은 모듈 레벨에서 한 번만 계산한다.
const JOB_CATEGORIES: string[] = Array.from(
  new Set(ALL_JOBS.map((j) => j.category)),
).sort();
const JOB_CATEGORY_COUNTS: Record<string, number> = ALL_JOBS.reduce(
  (acc, j) => {
    acc[j.category] = (acc[j.category] ?? 0) + 1;
    return acc;
  },
  {} as Record<string, number>,
);
// 검색을 위한 lowercase 메타도 미리 계산해둔다 (매 렌더마다 toLowerCase를
// 3×536=1608회 호출하던 것을 제거).
interface JobSearchEntry {
  job: Job;
  haystack: string;
}
const JOB_SEARCH_INDEX: JobSearchEntry[] = ALL_JOBS.map((j) => ({
  job: j,
  haystack: (
    j.name +
    "\u0000" +
    j.domain +
    "\u0000" +
    (j.description || "")
  ).toLowerCase(),
}));

export function JobListBrowser({ bookmarks, recentJobs }: { bookmarks?: BookmarksHook; recentJobs?: RecentJobsHook }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);
  // 점진적 렌더링을 위한 표시 개수 (검색어/카테고리 변경 시 리셋)
  const [visibleCount, setVisibleCount] = useState(JOB_LIST_PAGE_SIZE);

  // Save scroll position when detail dialog opens
  useEffect(() => {
    if (dialogOpen && scrollAreaRef.current) {
      scrollPositionRef.current = scrollAreaRef.current.scrollTop;
    }
  }, [dialogOpen]);

  // Restore scroll position when detail dialog closes
  useEffect(() => {
    if (!dialogOpen && scrollAreaRef.current && scrollPositionRef.current > 0) {
      // Use requestAnimationFrame to ensure the DOM is updated before restoring scroll position
      const restoreScroll = () => {
        if (scrollAreaRef.current) {
          scrollAreaRef.current.scrollTop = scrollPositionRef.current;
        }
      };
      
      // Try to restore scroll position after the next paint
      const rafId = requestAnimationFrame(restoreScroll);
      return () => cancelAnimationFrame(rafId);
    }
  }, [dialogOpen]);

  // 마운트 시 한 번만 셔플된 이덱스 순서 (페이지 진입마다 순서 달라짐).
  // 대용량 배열을 다시 쉍으로 셔플하는 대신, 인덱스 배열만 셔플해 초기 작업을 줄인다.
  const shuffledIndices = useMemo(() => {
    const arr = new Int32Array(JOB_SEARCH_INDEX.length);
    for (let i = 0; i < arr.length; i++) arr[i] = i;
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }, []);

  // 필터링된 직업 (전체 결과 수만 알 수 있으면 되므로 전체를 순회하되, 설계상
  // toLowerCase·includes 호출 횟수를 줄이고 렌더 자체는 아래의 visibleCount로 제한).
  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const out: Job[] = [];
    for (let i = 0; i < shuffledIndices.length; i++) {
      const entry = JOB_SEARCH_INDEX[shuffledIndices[i]];
      const job = entry.job;
      if (selectedCategory !== null && job.category !== selectedCategory) continue;
      if (q !== "" && !entry.haystack.includes(q)) continue;
      out.push(job);
    }
    return out;
  }, [shuffledIndices, searchTerm, selectedCategory]);

  // 검색어/카테고리가 바뀌면 표시 개수를 리셋한다.
  useEffect(() => {
    setVisibleCount(JOB_LIST_PAGE_SIZE);
  }, [searchTerm, selectedCategory]);

  const visibleJobs = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );

  return (
    <div className="space-y-4">
      {/* 검색 입력 */}
      <input
        type="text"
        placeholder="직업명, 도메인, 설명으로 검색..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-4 py-2.5 rounded-md border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
      />

      {/* 중분류 필터 */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={
            "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors " +
            (selectedCategory === null
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-card hover:border-foreground")
          }
        >
          전체 ({ALL_JOBS.length})
        </button>
        {JOB_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={
              "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors " +
              (selectedCategory === cat
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card hover:border-foreground")
            }
          >
            {cat} ({JOB_CATEGORY_COUNTS[cat] ?? 0})
          </button>
        ))}
      </div>

      {/* 결과 */}
      <div className="mt-6">
        <p className="text-xs text-muted-foreground mb-3">
          {filtered.length}개 직업 중 {Math.min(visibleCount, filtered.length)}개 표시
        </p>
        <div ref={scrollAreaRef} className="grid gap-2 max-h-[600px] overflow-y-auto border border-border rounded-md p-3 bg-card/50">
          {visibleJobs.map((job) => (
            <button
              key={job.id}
              type="button"
              onClick={() => { setSelectedJob(job); setDialogOpen(true); }}
              className="text-left w-full rounded-md border border-border bg-card p-3 hover:border-foreground transition-colors cursor-pointer"
            >
              <div className="flex gap-3">
                <JobThumb job={job} size={56} rounded="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="font-medium text-sm truncate">{job.name}</div>
                    <div className="text-xs text-muted-foreground shrink-0">
                      {job.domain}
                    </div>
                  </div>
                  {(job.description || job.short_desc) && (
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {job.description || job.short_desc}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
          {visibleCount < filtered.length && (
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + JOB_LIST_PAGE_SIZE)}
              className="mt-1 w-full rounded-md border border-dashed border-border bg-card/30 px-3 py-3 text-sm text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
            >
              {Math.min(JOB_LIST_PAGE_SIZE, filtered.length - visibleCount)}개 더 보기 ({filtered.length - visibleCount}개 남음)
            </button>
          )}
        </div>
      </div>

      <JobDetailDialog
        job={selectedJob}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        bookmarks={bookmarks}
        onView={recentJobs?.addRecent}
      />
    </div>
  );
}
