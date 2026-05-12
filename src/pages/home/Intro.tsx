import { Button } from "@/components/ui/button";
import { ALL_JOBS } from "@/lib/recommend";
import { ArrowRight, Bookmark, Clock } from "lucide-react";
import type { BookmarksHook, RecentJobsHook } from "./types";
import { JobListBrowser } from "./JobListBrowser";
export function Intro({ onStart, bookmarks, recentJobs }: { onStart: () => void; bookmarks?: BookmarksHook; recentJobs?: RecentJobsHook }) {
  return (
    <section className="pt-4">
      {/* 헤로 영역 - 좌우 2단 레이아웃 */}
      <div className="flex flex-col sm:flex-row items-start gap-6 mb-10">

        {/* 왼쪽: 텍스트 영역 */}
        <div className="flex-1 min-w-0">
          {/* 스탬프 느낌 배지 */}
          <div className="inline-block mb-4">
            <span className="stamp-badge text-xs text-primary/70 border-primary/40">
              {ALL_JOBS.length}개 직업 데이터베이스
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight mb-5" style={{wordBreak: 'keep-all'}}>
            나에게 맞는 직업,
            <br />
            <span className="pencil-underline">찾아드립니다.</span>
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed mb-8" style={{wordBreak: 'keep-all'}}>
            간단한 질문들에 직감대로 답해보세요.
            당신의 성향과 선호도를 분석해, 가장 잘 어울리는 직업들을 찾아 제안해 드립니다.
          </p>

          <Button size="lg" onClick={onStart} className="h-11 px-7 rounded-sm font-semibold" style={{boxShadow: '2px 3px 0 rgba(60,40,10,0.25)'}}>
            시작하기
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* 오른쪽: 문구류 일러스트 */}
        <div className="hidden sm:flex flex-col items-center gap-4 shrink-0 w-[260px]">
          <img
            src="/job-experience/stationery_objects.png"
            alt=""
            className="w-full drop-shadow-md"
            style={{ opacity: 0.95 }}
          />
          <img
            src="/job-experience/pencil.png"
            alt=""
            className="w-[140px] drop-shadow-md"
            style={{ opacity: 0.9, transform: 'rotate(-15deg) translateX(20px)' }}
          />
        </div>
      </div>


      {/* 전체 직업 리스트 */}
      <div className="mt-16 pt-12 border-t border-border">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            전체 직업 목록
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          {ALL_JOBS.length}개의 직업을 검색하고 필터링할 수 있습니다.
        </p>
        <JobListBrowser bookmarks={bookmarks} recentJobs={recentJobs} />
      </div>
    </section>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="paper-card rounded-sm border border-border px-4 py-3 text-center">
      <div className="text-2xl font-bold tracking-tight">{k}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{v}</div>
    </div>
  );
}

/* ----------------------------- Profile (성별/학력) ----------------------------- */
