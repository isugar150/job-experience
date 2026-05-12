import { memo, useEffect, useState } from "react";
import { useModalBackHandler } from "@/hooks/useModalBackHandler";
import type { Job } from "@/lib/recommend";
import { Bookmark, BookmarkCheck, Check, ChevronDown, ChevronUp, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { JobThumb } from "@/components/JobThumb";
import type { BookmarksHook } from "./types";
function JobDetailMetaGrid({ job }: { job: Job }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border-t border-border pt-4">
      <h4 className="text-xs font-semibold mb-3">직업 특성</h4>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
        <div><dt className="text-muted-foreground">필요 학력</dt><dd className="font-medium mt-0.5">{job.education_required ?? "고졸이상"}</dd></div>
        <div><dt className="text-muted-foreground">근무 환경</dt><dd className="font-medium mt-0.5">{job.tags.work_environment}</dd></div>
        <div><dt className="text-muted-foreground">소득 수준</dt><dd className="font-medium mt-0.5">{job.tags.income_level}</dd></div>
        <div><dt className="text-muted-foreground">기술 활용</dt><dd className="font-medium mt-0.5">{job.tags.tech_intensity}</dd></div>
        <div><dt className="text-muted-foreground">대인 접촉</dt><dd className="font-medium mt-0.5">{job.tags.people_interaction}</dd></div>
        <div><dt className="text-muted-foreground">체력 부담</dt><dd className="font-medium mt-0.5">{job.tags.physical_intensity}</dd></div>
        <div><dt className="text-muted-foreground">고용 안정성</dt><dd className="font-medium mt-0.5">{job.tags.job_stability ?? "-"}</dd></div>
        <div><dt className="text-muted-foreground">원격 근무</dt><dd className="font-medium mt-0.5">{job.tags.remote_work ?? "-"}</dd></div>
        {expanded && (
          <>
            <div><dt className="text-muted-foreground">성별 제한</dt><dd className="font-medium mt-0.5">{job.gender_restriction ?? "무관"}</dd></div>
            <div><dt className="text-muted-foreground">창의성</dt><dd className="font-medium mt-0.5">{job.tags.creativity_level}</dd></div>
            <div><dt className="text-muted-foreground">분석력</dt><dd className="font-medium mt-0.5">{job.tags.analytical_level}</dd></div>
            <div><dt className="text-muted-foreground">위험도</dt><dd className="font-medium mt-0.5">{job.tags.risk_level}</dd></div>
            <div><dt className="text-muted-foreground">근무 형태</dt><dd className="font-medium mt-0.5">{job.tags.work_schedule ?? "-"}</dd></div>
            <div><dt className="text-muted-foreground">고용 형태</dt><dd className="font-medium mt-0.5">{job.tags.employment_type ?? "-"}</dd></div>
            <div><dt className="text-muted-foreground">성장 가능성</dt><dd className="font-medium mt-0.5">{job.tags.growth_potential ?? "-"}</dd></div>
            <div><dt className="text-muted-foreground">자동화 위험</dt><dd className="font-medium mt-0.5">{job.tags.automation_risk ?? "-"}</dd></div>
            <div><dt className="text-muted-foreground">업무 자율성</dt><dd className="font-medium mt-0.5">{job.tags.work_autonomy ?? "-"}</dd></div>
            <div><dt className="text-muted-foreground">팀워크</dt><dd className="font-medium mt-0.5">{job.tags.teamwork_level ?? "-"}</dd></div>
            <div><dt className="text-muted-foreground">소통 비중</dt><dd className="font-medium mt-0.5">{job.tags.communication_level ?? "-"}</dd></div>
            <div><dt className="text-muted-foreground">반복 업무</dt><dd className="font-medium mt-0.5">{job.tags.repetition_level ?? "-"}</dd></div>
            <div><dt className="text-muted-foreground">사회적 기여</dt><dd className="font-medium mt-0.5">{job.tags.social_impact ?? "-"}</dd></div>
            <div><dt className="text-muted-foreground">공공/민간</dt><dd className="font-medium mt-0.5">{job.tags.public_sector ?? "-"}</dd></div>
            <div><dt className="text-muted-foreground">자격증 필수</dt><dd className="font-medium mt-0.5">{job.tags.license_required ? "필수" : "불필요"}</dd></div>
            <div><dt className="text-muted-foreground">진입 난이도</dt><dd className="font-medium mt-0.5">{job.tags.entry_difficulty ?? "-"}</dd></div>
            <div><dt className="text-muted-foreground">취업 경쟁률</dt><dd className="font-medium mt-0.5">{job.tags.competition_level ?? "-"}</dd></div>
            <div><dt className="text-muted-foreground">경력 요구</dt><dd className="font-medium mt-0.5">{job.tags.experience_required ?? "-"}</dd></div>
          </>
        )}
      </dl>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? (
          <><ChevronUp className="h-3 w-3" />접기</>
        ) : (
          <><ChevronDown className="h-3 w-3" />더보기 (+18개)</>
        )}
      </button>
    </div>
  );
}

/* ----------------------------- JobDetailDialog ----------------------------- */

// 다양한 부모(JobList / BookmarkModal / RecentModal / JobListBrowser)에서
// 항상 마운트되는 다이얼로그이다. 부모의 state가 바뀔 때마다 닫힌 다이얼로그의
// 자식 트리가 매번 재렌더되어 비용이 컸으므로, React.memo로 감싸고
// 닫혀 있으면 자식 트리 자체를 빌드하지 않도록 한다.
export const JobDetailDialog = memo(function JobDetailDialog({
  job,
  open,
  onOpenChange,
  bookmarks,
  onView,
}: {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookmarks?: BookmarksHook;
  onView?: (id: number) => void;
}) {
  useModalBackHandler(open, () => onOpenChange(false));
  useEffect(() => {
    if (open && job) {
      onView?.(job.id);
    }
  }, [open, job?.id]);

  // 다이얼로그가 닫혀 있거나 job이 없으면 자식 트리를 빌드하지 않는다.
  // (Radix Dialog는 open=false에서 Portal 내부를 마운트하지 않지만, JSX 자식의
  // React element 자체는 매 렌더마다 만들어진다. 닫힌 상태에서는 그 비용도
  // 아끼고, 다이얼로그가 처음 열리는 프레임의 작업량을 최소화한다.)
  if (!open || !job) return null;
  const isBookmarked = bookmarks?.isBookmarked(job.id) ?? false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 pr-6">
            <div>
              <DialogTitle className="text-xl font-bold">{job.name}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                {job.domain} · {job.category}
              </DialogDescription>
            </div>
            {bookmarks && (
              <button
                type="button"
                onClick={() => bookmarks.toggle(job.id)}
                className="shrink-0 mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
                title={isBookmarked ? "저장 취소" : "저장"}
              >
                {isBookmarked
                  ? <BookmarkCheck className="h-5 w-5 fill-foreground" />
                  : <Bookmark className="h-5 w-5" />}
              </button>
            )}
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="space-y-5 pb-2">
            {/* Hero thumbnail */}
            {job.image && (
              <div className="-mt-1 mb-1 flex justify-center">
                <JobThumb
                  job={job}
                  rounded="xl"
                  loading="eager"
                  className="w-full max-w-[260px] aspect-square shadow-sm"
                />
              </div>
            )}

            {/* Description */}
            {(job.description || job.short_desc) && (
              <p className="text-sm leading-relaxed">
                {job.description || job.short_desc}
              </p>
            )}

            {/* Pros / Cons */}
            {(job.pros?.length || job.cons?.length) ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {job.pros?.length ? (
                  <div className="rounded-md border border-border bg-card p-4">
                    <h4 className="text-xs font-semibold mb-2">장점</h4>
                    <ul className="space-y-1.5">
                      {job.pros.map((item) => (
                        <li key={item} className="flex gap-2 text-xs leading-relaxed">
                          <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {job.cons?.length ? (
                  <div className="rounded-md border border-border bg-card p-4">
                    <h4 className="text-xs font-semibold mb-2">단점</h4>
                    <ul className="space-y-1.5">
                      {job.cons.map((item) => (
                        <li key={item} className="flex gap-2 text-xs leading-relaxed">
                          <X className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Traits */}
            {job.traits?.length ? (
              <div>
                <h4 className="text-xs font-semibold mb-2">이런 성향의 사람에게 잘 맞아요</h4>
                <div className="flex flex-wrap gap-1.5">
                  {job.traits.map((t) => (
                    <span
                      key={t}
                      className="px-2.5 py-1 rounded-full border border-border bg-muted text-xs"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Certifications */}
            {job.certifications?.length ? (
              <div>
                <h4 className="text-xs font-semibold mb-2">유리한 자격증·면허</h4>
                <div className="flex flex-wrap gap-1.5">
                  {job.certifications.map((c) => (
                    <span
                      key={c}
                      className="px-2.5 py-1 rounded-md border border-border bg-card text-xs"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Meta grid */}
            <JobDetailMetaGrid job={job} />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
});
