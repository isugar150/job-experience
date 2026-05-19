import { useEffect, useMemo, useRef, useState } from "react";
import { useModalBackHandler } from "@/hooks/useModalBackHandler";
import { Button } from "@/components/ui/button";
import { ALL_JOBS, type Job } from "@/lib/recommend";
import { Bookmark, BookmarkCheck, Clock, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { JobThumb } from "@/components/JobThumb";
import { cssUrlWithBase, withBase } from "@/lib/assets";
import type { BookmarksHook, RecentJobsHook } from "./types";
import { JobDetailDialog } from "./JobDetailDialog";

export function Header({
  showReset,
  onReset,
  bookmarks,
  recentJobs,
}: {
  showReset: boolean;
  onReset: () => void;
  bookmarks: BookmarksHook;
  recentJobs: RecentJobsHook;
}) {
  const [bookmarkOpen, setBookmarkOpen] = useState(false);
  const [recentOpen, setRecentOpen] = useState(false);
  const bookmarkCount = bookmarks.bookmarkedIds.size;
  const recentCount = recentJobs.recentIds.length;

  return (
    <>
      <header
        className="border-b border-border sticky top-0 z-10"
        style={{
          backgroundColor: "#f7f3eb",
          backgroundImage: cssUrlWithBase("/paper_texture.png"),
          backgroundRepeat: "repeat",
          backgroundSize: "400px 400px",
          boxShadow: "0 2px 6px rgba(100,80,50,0.15)",
        }}
      >
        <div className="max-w-3xl mx-auto px-5 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src={withBase("/logo_icon.png")}
              alt="로고"
              className="h-8 w-8 object-contain"
            />
            <span
              className="text-sm font-bold tracking-tight"
              style={{
                fontFamily: '"Pretendard Variable", sans-serif',
                letterSpacing: "-0.01em",
              }}
            >
              나에게 맞는 직업 찾기
            </span>
          </div>
          <div className="flex items-center gap-1">
            {/* 최근 본 직업 */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setRecentOpen(true)}
              className="relative text-muted-foreground hover:text-foreground"
              title="최근 본 직업"
            >
              <Clock className="h-4 w-4" />
              {recentCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-muted-foreground text-background text-[10px] font-bold">
                  {recentCount}
                </span>
              )}
            </Button>
            {/* 체갈피 */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setBookmarkOpen(true)}
              className="relative text-muted-foreground hover:text-foreground"
              title="저장한 직업"
            >
              <Bookmark className="h-4 w-4" />
              {bookmarkCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background text-[10px] font-bold">
                  {bookmarkCount}
                </span>
              )}
            </Button>
            {showReset && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onReset}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                처음부터
              </Button>
            )}
          </div>
        </div>
      </header>
      <BookmarkModal
        open={bookmarkOpen}
        onOpenChange={setBookmarkOpen}
        bookmarks={bookmarks}
        recentJobs={recentJobs}
      />
      <RecentModal
        open={recentOpen}
        onOpenChange={setRecentOpen}
        recentJobs={recentJobs}
        bookmarks={bookmarks}
      />
    </>
  );
}

/* ----------------------------- BookmarkModal ----------------------------- */

function BookmarkModal({
  open,
  onOpenChange,
  bookmarks,
  recentJobs,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookmarks: BookmarksHook;
  recentJobs?: RecentJobsHook;
}) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);
  useModalBackHandler(open && !detailOpen, () => onOpenChange(false));

  // Save scroll position when detail dialog opens
  useEffect(() => {
    if (detailOpen && scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-slot="scroll-area-viewport"]');
      if (viewport) {
        scrollPositionRef.current = (viewport as HTMLElement).scrollTop;
      }
    }
  }, [detailOpen]);

  // Restore scroll position when detail dialog closes
  useEffect(() => {
    if (!detailOpen && scrollAreaRef.current && scrollPositionRef.current > 0) {
      // Use requestAnimationFrame to ensure the DOM is updated before restoring scroll position
      const restoreScroll = () => {
        const viewport = scrollAreaRef.current?.querySelector('[data-slot="scroll-area-viewport"]');
        if (viewport) {
          (viewport as HTMLElement).scrollTop = scrollPositionRef.current;
        }
      };
      
      // Try to restore scroll position after the next paint
      const rafId = requestAnimationFrame(restoreScroll);
      return () => cancelAnimationFrame(rafId);
    }
  }, [detailOpen]);

  // 다이얼로그가 닫혀 있는 동안에는 ALL_JOBS(536개) 필터링을 수행하지 않는다.
  // open이 true일 때만 계산해 다이얼로그 열림 직전의 부모 렌더를 가볍게 유지한다.
  const bookmarkedJobs = useMemo(
    () => (open ? ALL_JOBS.filter((j) => bookmarks.bookmarkedIds.has(j.id)) : []),
    [open, bookmarks.bookmarkedIds]
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bookmark className="h-4 w-4" />
              저장한 직업
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {bookmarkedJobs.length > 0
                ? `${bookmarkedJobs.length}개의 직업을 저장했습니다. (최대 ${bookmarks.max}개)`
                : "아직 저장한 직업이 없습니다. 직업 카드의 책갈피 아이콘을 눈러 저장하세요."}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea ref={scrollAreaRef} className="max-h-[60vh] pr-2">
            {bookmarkedJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Bookmark className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">저장된 직업이 없습니다</p>
              </div>
            ) : (
              <div className="grid gap-2 pb-2">
                {bookmarkedJobs.map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => { setSelectedJob(job); setDetailOpen(true); }}
                    className="text-left w-full rounded-md border border-border bg-card p-3 hover:border-foreground transition-colors group"
                  >
                    <div className="flex gap-3">
                      <JobThumb job={job} size={48} rounded="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-baseline gap-2 min-w-0">
                            <span className="font-medium text-sm truncate">{job.name}</span>
                            <span className="text-xs text-muted-foreground shrink-0">{job.domain}</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); bookmarks.toggle(job.id); }}
                            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <BookmarkCheck className="h-4 w-4 fill-foreground" />
                          </button>
                        </div>
                        {(job.description || job.short_desc) && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {job.description || job.short_desc}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
      <JobDetailDialog
        job={selectedJob}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        bookmarks={bookmarks}
        onView={recentJobs?.addRecent}
      />
    </>
  );
}

/* ----------------------------- RecentModal ----------------------------- */

function RecentModal({
  open,
  onOpenChange,
  recentJobs,
  bookmarks,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recentJobs: RecentJobsHook;
  bookmarks: BookmarksHook;
}) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);
  useModalBackHandler(open && !detailOpen, () => onOpenChange(false));

  // Save scroll position when detail dialog opens
  useEffect(() => {
    if (detailOpen && scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-slot="scroll-area-viewport"]');
      if (viewport) {
        scrollPositionRef.current = (viewport as HTMLElement).scrollTop;
      }
    }
  }, [detailOpen]);

  // Restore scroll position when detail dialog closes
  useEffect(() => {
    if (!detailOpen && scrollAreaRef.current && scrollPositionRef.current > 0) {
      // Use requestAnimationFrame to ensure the DOM is updated before restoring scroll position
      const restoreScroll = () => {
        const viewport = scrollAreaRef.current?.querySelector('[data-slot="scroll-area-viewport"]');
        if (viewport) {
          (viewport as HTMLElement).scrollTop = scrollPositionRef.current;
        }
      };
      
      // Try to restore scroll position after the next paint
      const rafId = requestAnimationFrame(restoreScroll);
      return () => cancelAnimationFrame(rafId);
    }
  }, [detailOpen]);

  // open=false일 때는 recentIds 순회를 수행하지 않아 닫힌 상태의 부모 렌더를 가볍게 유지한다.
  const jobs = useMemo(
    () =>
      open
        ? recentJobs.recentIds
            .map((id) => ALL_JOBS.find((j) => j.id === id))
            .filter((j): j is Job => j !== undefined)
        : [],
    [open, recentJobs.recentIds]
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              최근 본 직업
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {jobs.length > 0
                ? `최근에 본 ${jobs.length}개의 직업입니다. (최대 ${recentJobs.max}개)`
                : "아직 본 직업이 없습니다. 직업 카드를 눌러보세요."}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea ref={scrollAreaRef} className="max-h-[60vh] pr-2">
            {jobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Clock className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">최근 본 직업이 없습니다</p>
              </div>
            ) : (
              <div className="grid gap-2 pb-2">
                {jobs.map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => { setSelectedJob(job); setDetailOpen(true); }}
                    className="text-left w-full rounded-md border border-border bg-card p-3 hover:border-foreground transition-colors"
                  >
                    <div className="flex gap-3">
                      <JobThumb job={job} size={48} rounded="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-baseline gap-2 min-w-0">
                            <span className="font-medium text-sm truncate">{job.name}</span>
                            <span className="text-xs text-muted-foreground shrink-0">{job.domain}</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); bookmarks.toggle(job.id); }}
                            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                            title={bookmarks.isBookmarked(job.id) ? "저장 취소" : "저장"}
                          >
                            {bookmarks.isBookmarked(job.id)
                              ? <BookmarkCheck className="h-4 w-4 fill-foreground" />
                              : <Bookmark className="h-4 w-4" />}
                          </button>
                        </div>
                        {(job.description || job.short_desc) && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {job.description || job.short_desc}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
      <JobDetailDialog
        job={selectedJob}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        bookmarks={bookmarks}
      />
    </>
  );
}

/* ----------------------------- Intro ----------------------------- */
