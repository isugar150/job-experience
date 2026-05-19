import { Button } from "@/components/ui/button";
import { ANSWER_OPTIONS, ALL_JOBS, CANDIDATE_THRESHOLD, MAX_QUESTIONS, type Question } from "@/lib/recommend";
import { ArrowLeft, ArrowRight } from "lucide-react";
export function Asking({
  question,
  answeredCount,
  candidateCount,
  canGoBack,
  onAnswer,
  onBack,
}: {
  question: Question;
  answeredCount: number;
  candidateCount: number;
  canGoBack: boolean;
  onAnswer: (level: number) => void;
  onBack: () => void;
}) {
  // 후보 수가 줄어들수록 진행률이 올라가는 동적 방식 (로그 스케일)
  // 537 → 5개로 줄어드는 과정을 0~99%로 매핑
  const totalJobs = ALL_JOBS.length;
  const logTotal = Math.log(totalJobs);
  const logCurrent = Math.log(Math.max(candidateCount, CANDIDATE_THRESHOLD));
  const logMin = Math.log(CANDIDATE_THRESHOLD);
  const progress = Math.min(
    ((logTotal - logCurrent) / (logTotal - logMin)) * 100,
    99
  );
  return (
    <section>
      <div className="mb-10">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>질문 {answeredCount + 1} / 최대 {MAX_QUESTIONS}</span>
          <span>{totalJobs}개 중 후보 직업 {candidateCount}개</span>
        </div>
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-foreground transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-snug mb-3">
        {question.text}
      </h2>
      <p className="text-sm text-muted-foreground mb-8">
        현재 후보군을 가장 잘 나눌 수 있는 질문이에요. 판단하기 어렵다면 건너뛰기를 선택해도 됩니다.
      </p>

      <div className="grid gap-2.5">
        {ANSWER_OPTIONS.map((opt) => (
          <button
            key={`${question.id}-${opt.label}`}
            onClick={(e) => {
              // 모바일 sticky hover 방지용 포커스 해제
              (e.currentTarget as HTMLButtonElement).blur();
              onAnswer(opt.level);
            }}
            className="group flex items-center justify-between text-left rounded-md border border-border bg-card px-4 py-3.5 [@media(hover:hover)]:hover:border-foreground [@media(hover:hover)]:hover:bg-accent/50 transition-colors"
          >
            <span className="text-base font-medium">{opt.level === 0 ? "건너뛰기 / 잘 모르겠다" : opt.label}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground [@media(hover:hover)]:group-hover:text-foreground transition-colors" />
          </button>
        ))}
      </div>

      {canGoBack && (
        <div className="mt-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            이전 질문
          </Button>
        </div>
      )}
    </section>
  );
}

/* ----------------------------- Result ----------------------------- */

// 나무위키 다이렉트 링크
