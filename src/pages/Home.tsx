/**
 * Design philosophy: Minimal Light
 * 단계 흐름: intro → profile(성별·학력) → asking(질문) → result(메인/서브 추천)
 */
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ANSWER_OPTIONS,
  ALL_JOBS,
  MAX_QUESTIONS,
  EDUCATION_OPTIONS,
  GENDER_OPTIONS,
  currentCandidates,
  getRecommendations,
  meetsEducation,
  pickNextQuestion,
  type Answer,
  type Job,
  type Question,
  type UserEducation,
  type UserGender,
  type UserProfile,
} from "@/lib/recommend";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  GraduationCap,
  Info,
  RotateCcw,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

type Phase = "intro" | "profile" | "asking" | "result";

export default function Home() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [profile, setProfile] = useState<UserProfile>({
    gender: "unspecified",
    education: "unspecified",
  });
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [askedIds, setAskedIds] = useState<Set<string>>(new Set());
  const [askedOrder, setAskedOrder] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);

  const candidates = useMemo(
    () => currentCandidates(profile, answers),
    [profile, answers]
  );
  const recommendation = useMemo(
    () => getRecommendations(profile, answers, 5),
    [profile, answers]
  );

  useEffect(() => {
    if (phase !== "asking") return;
    if (askedIds.size >= MAX_QUESTIONS) {
      setPhase("result");
      return;
    }
    if (askedIds.size >= 6 && candidates.length <= 5) {
      setPhase("result");
      return;
    }
    const next = pickNextQuestion(candidates, askedIds);
    if (!next) {
      setPhase("result");
      return;
    }
    setCurrentQuestion(next);
  }, [phase, askedIds, candidates]);

  function startIntro() {
    setAnswers([]);
    setAskedIds(new Set());
    setAskedOrder([]);
    setCurrentQuestion(null);
    setPhase("profile");
  }

  function startQuestions() {
    setPhase("asking");
  }

  function answer(level: number) {
    if (!currentQuestion) return;
    setAnswers((prev) => [
      ...prev,
      { questionId: currentQuestion.id, level: level as -2 | -1 | 0 | 1 | 2 },
    ]);
    setAskedIds((prev) => new Set(prev).add(currentQuestion.id));
    setAskedOrder((prev) => [...prev, currentQuestion.id]);
  }

  function goBack() {
    if (askedOrder.length === 0) return;
    const lastId = askedOrder[askedOrder.length - 1];
    setAnswers((prev) => prev.slice(0, -1));
    setAskedOrder((prev) => prev.slice(0, -1));
    setAskedIds((prev) => {
      const s = new Set(prev);
      s.delete(lastId);
      return s;
    });
  }

  function reset() {
    setAnswers([]);
    setAskedIds(new Set());
    setAskedOrder([]);
    setCurrentQuestion(null);
    setProfile({ gender: "unspecified", education: "unspecified" });
    setPhase("intro");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header showReset={phase !== "intro"} onReset={reset} />

      <main className="max-w-3xl mx-auto px-5 sm:px-6 pt-10 sm:pt-16 pb-24">
        {phase === "intro" && <Intro onStart={startIntro} />}
        {phase === "profile" && (
          <Profile
            profile={profile}
            onChange={setProfile}
            onContinue={startQuestions}
          />
        )}
        {phase === "asking" && currentQuestion && (
          <Asking
            question={currentQuestion}
            answeredCount={askedIds.size}
            candidateCount={candidates.length}
            canGoBack={askedOrder.length > 0}
            onAnswer={answer}
            onBack={goBack}
          />
        )}
        {phase === "result" && (
          <Result
            profile={profile}
            main={recommendation.mainCandidates}
            sub={recommendation.subCandidates}
            onReset={reset}
          />
        )}
      </main>
    </div>
  );
}

/* ----------------------------- Header ----------------------------- */

function Header({
  showReset,
  onReset,
}: {
  showReset: boolean;
  onReset: () => void;
}) {
  return (
    <header className="border-b border-border">
      <div className="max-w-3xl mx-auto px-5 sm:px-6 h-14 flex items-center justify-between">
        <div className="text-sm font-semibold tracking-tight">
          나에게 맞는 직업 찾기
        </div>
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
    </header>
  );
}

/* ----------------------------- Intro ----------------------------- */

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <section className="pt-4">
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight mb-4">
        나에게 맞는 직업, 찾아드립니다.
      </h1>
      <p className="text-base text-muted-foreground leading-relaxed mb-8 max-w-xl">
        몇 가지 질문에 답해 주세요. 답변에 따라 {ALL_JOBS.length}개의 직업 중에서
        당신과 잘 맞는 직업을 추려서 보여드립니다. 정답은 없으니 직감대로 답하면 됩니다.
      </p>

      <Button size="lg" onClick={onStart} className="h-11 px-6 rounded-md">
        시작하기
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>

      <div className="mt-12 grid grid-cols-3 gap-6 max-w-md">
        <Stat k={`${ALL_JOBS.length}`} v="직업 데이터" />
        <Stat k="34" v="중분류" />
        <Stat k={`최대 ${MAX_QUESTIONS}`} v="질문 수" />
      </div>

      {/* 전체 직업 리스트 */}
      <div className="mt-16 pt-16 border-t border-border">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
          전체 직업 목록
        </h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xl">
          {ALL_JOBS.length}개의 직업을 검색하고 필터링할 수 있습니다.
        </p>
        <JobListBrowser />
      </div>
    </section>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-2xl font-semibold tracking-tight">{k}</div>
      <div className="text-xs text-muted-foreground mt-1">{v}</div>
    </div>
  );
}

/* ----------------------------- Profile (성별/학력) ----------------------------- */

function Profile({
  profile,
  onChange,
  onContinue,
}: {
  profile: UserProfile;
  onChange: (p: UserProfile) => void;
  onContinue: () => void;
}) {
  return (
    <section>
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
        먼저 두 가지만 알려주세요.
      </h2>
      <p className="text-sm text-muted-foreground mb-10 max-w-xl">
        성별과 학력은 추천 결과를 더 정확하게 좁히는 데 사용됩니다.
        응답하기 어려운 항목은 <span className="font-medium">응답 안함</span>으로 두셔도 됩니다.
      </p>

      <div className="space-y-10">
        {/* 성별 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold">성별</h3>
            <span className="text-xs text-muted-foreground">
              일부 직업의 성별 제한 필터링에만 사용됩니다.
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {GENDER_OPTIONS.map((o) => (
              <OptionButton
                key={o.value}
                selected={profile.gender === o.value}
                onClick={() => onChange({ ...profile, gender: o.value as UserGender })}
                label={o.label}
              />
            ))}
          </div>
        </div>

        {/* 학력 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold">학력</h3>
            <span className="text-xs text-muted-foreground">
              요건 충족 여부에 따라 메인/보완 추천으로 나뉩니다.
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {EDUCATION_OPTIONS.map((o) => (
              <OptionButton
                key={o.value}
                selected={profile.education === o.value}
                onClick={() =>
                  onChange({ ...profile, education: o.value as UserEducation })
                }
                label={o.label}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-12 flex flex-wrap gap-3">
        <Button size="lg" onClick={onContinue} className="h-11 px-6 rounded-md">
          질문 시작
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </section>
  );
}

function OptionButton({
  selected,
  onClick,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-md border px-4 py-3 text-sm font-medium transition-colors text-left " +
        (selected
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-card hover:border-foreground")
      }
    >
      {label}
    </button>
  );
}

/* ----------------------------- Asking ----------------------------- */

function Asking({
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
  const progress = (answeredCount / MAX_QUESTIONS) * 100;
  return (
    <section>
      <div className="mb-10">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>
            질문 {answeredCount + 1} / {MAX_QUESTIONS}
          </span>
          <span>후보 직업 {candidateCount}개</span>
        </div>
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-foreground transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-snug mb-8">
        {question.text}
      </h2>

      <div className="grid gap-2.5">
        {ANSWER_OPTIONS.map((opt) => (
          <button
            key={opt.label}
            onClick={() => onAnswer(opt.level)}
            className="group flex items-center justify-between text-left rounded-md border border-border bg-card px-4 py-3.5 hover:border-foreground hover:bg-accent/50 transition-colors"
          >
            <span className="text-base font-medium">{opt.label}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
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
const namuwikiUrl = (name: string) =>
  `https://namu.wiki/w/${encodeURIComponent(name)}`;

function Result({
  profile,
  main,
  sub,
  onReset,
}: {
  profile: UserProfile;
  main: Array<{ job: Job; score: number }>;
  sub: Array<{ job: Job; score: number }>;
  onReset: () => void;
}) {
  const winner = main[0]?.job ?? sub[0]?.job;
  const runners = main.slice(1, 5);
  const isUnspecifiedEdu = profile.education === "unspecified";

  if (!winner) {
    return (
      <section>
        <p className="text-muted-foreground">추천할 직업을 찾지 못했어요.</p>
        <Button onClick={onReset} className="mt-4">
          다시 시도
        </Button>
      </section>
    );
  }

  const winnerInMain = main[0]?.job?.id === winner.id;

  return (
    <section>
      <div className="text-xs text-muted-foreground mb-2">
        {winnerInMain ? "추천 직업" : "보완이 필요한 추천 직업"}
      </div>
      <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
        {winner.name}
      </h2>
      <div className="text-sm text-muted-foreground mb-4">
        {winner.domain} · {winner.category}
      </div>

      {!winnerInMain && (
        <EducationGapNotice
          required={winner.education_required ?? "고졸이상"}
          userEdu={profile.education}
        />
      )}

      {/* Description */}
      {winner.description ? (
        <p className="text-base leading-relaxed mb-10">{winner.description}</p>
      ) : (
        <p className="text-base leading-relaxed mb-10 text-muted-foreground">
          {winner.short_desc}
        </p>
      )}

      {/* Pros / Cons */}
      {(winner.pros?.length || winner.cons?.length) && (
        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          {winner.pros?.length ? (
            <ListCard title="장점" items={winner.pros} icon="check" />
          ) : null}
          {winner.cons?.length ? (
            <ListCard title="단점" items={winner.cons} icon="x" />
          ) : null}
        </div>
      )}

      {/* Certifications */}
      {winner.certifications?.length ? (
        <div className="mb-10">
          <h3 className="text-sm font-semibold mb-3">유리한 자격증·면허</h3>
          <div className="flex flex-wrap gap-2">
            {winner.certifications.map((c) => (
              <span
                key={c}
                className="px-3 py-1.5 rounded-md border border-border bg-card text-sm"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Meta grid */}
      <div className="border-t border-border pt-6 mb-10">
        <h3 className="text-sm font-semibold mb-4">직업 특성</h3>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 text-sm">
          <Meta k="필요 학력" v={winner.education_required ?? "고졸이상"} />
          <Meta k="근무 환경" v={winner.tags.work_environment} />
          <Meta k="대인 접촉" v={winner.tags.people_interaction} />
          <Meta k="창의성" v={winner.tags.creativity_level} />
          <Meta k="분석력" v={winner.tags.analytical_level} />
          <Meta k="기술 활용" v={winner.tags.tech_intensity} />
          <Meta k="체력 부담" v={winner.tags.physical_intensity} />
          <Meta k="소득 수준" v={winner.tags.income_level} />
          <Meta k="성별 제한" v={winner.gender_restriction ?? "무관"} />
        </dl>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 mb-12">
        <Button onClick={onReset} className="rounded-md">
          <RotateCcw className="h-4 w-4 mr-2" />
          다시 찾아보기
        </Button>
        <a
          href={namuwikiUrl(winner.name)}
          target="_blank"
          rel="noreferrer"
        >
          <Button variant="outline" className="rounded-md">
            더 알아보기
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        </a>
      </div>

      {/* Runners (메인 추천 나머지) */}
      {runners.length > 0 && (
        <div className="border-t border-border pt-8">
          <h3 className="text-sm font-semibold mb-4">
            {isUnspecifiedEdu ? "함께 추천된 직업" : "함께 추천된 직업 (학력 충족)"}
          </h3>
          <JobList items={runners} userEdu={profile.education} />
        </div>
      )}

      {/* 서브 추천: 학력 보완 필요 */}
      {!isUnspecifiedEdu && sub.length > 0 && (
        <div className="border-t border-border pt-8 mt-10">
          <div className="flex items-center gap-2 mb-2">
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">
              학력 보완이 필요한 추천
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4 max-w-lg">
            점수상으로는 잘 맞지만 현재 학력으로는 요건을 충족하지 못하는 직업입니다.
            추가 학위·과정을 거치면 도전할 수 있습니다.
          </p>
          <JobList
            items={sub.slice(0, 5)}
            userEdu={profile.education}
            highlightRequirement
          />
        </div>
      )}
    </section>
  );
}

function JobList({
  items,
  userEdu,
  highlightRequirement,
}: {
  items: Array<{ job: Job; score: number }>;
  userEdu: UserEducation;
  highlightRequirement?: boolean;
}) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <div className="grid gap-3">
        {items.map((r) => {
          const ok = meetsEducation(r.job, userEdu);
          return (
            <button
              key={r.job.id}
              type="button"
              onClick={() => { setSelectedJob(r.job); setDialogOpen(true); }}
              className="text-left w-full rounded-md border border-border bg-card p-4 hover:border-foreground transition-colors cursor-pointer"
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="font-medium">{r.job.name}</div>
                <div className="text-xs text-muted-foreground shrink-0">
                  {r.job.domain}
                </div>
              </div>
              <div className="text-sm text-muted-foreground mt-1.5 line-clamp-2">
                {r.job.description || r.job.short_desc}
              </div>
              {highlightRequirement || !ok ? (
                <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-foreground/80 px-2 py-1 rounded bg-muted">
                  <GraduationCap className="h-3.5 w-3.5" />
                  필요 학력: {r.job.education_required ?? "고졸이상"}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
      <JobDetailDialog
        job={selectedJob}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}

function EducationGapNotice({
  required,
  userEdu,
}: {
  required: string;
  userEdu: UserEducation;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/60 p-4 mb-8 flex items-start gap-2.5">
      <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
      <div className="text-sm leading-relaxed">
        이 직업은 일반적으로 <span className="font-semibold">{required}</span> 학력을 요구합니다.
        현재 입력하신 학력(<span className="font-semibold">{userEdu}</span>)으로는
        진입 요건이 부족할 수 있어, 추가 학업·자격 취득을 고려해야 합니다.
      </div>
    </div>
  );
}

function ListCard({
  title,
  items,
  icon,
}: {
  title: string;
  items: string[];
  icon: "check" | "x";
}) {
  const Icon = icon === "check" ? Check : X;
  return (
    <div className="rounded-md border border-border bg-card p-5">
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5 text-sm leading-relaxed">
            <Icon className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd className="text-sm font-medium mt-0.5">{v}</dd>
    </div>
  );
}

/* ----------------------------- JobDetailDialog ----------------------------- */

function JobDetailDialog({
  job,
  open,
  onOpenChange,
}: {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!job) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{job.name}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {job.domain} · {job.category}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="space-y-5 pb-2">
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
            <div className="border-t border-border pt-4">
              <h4 className="text-xs font-semibold mb-3">직업 특성</h4>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                <div><dt className="text-muted-foreground">필요 학력</dt><dd className="font-medium mt-0.5">{job.education_required ?? "고졸이상"}</dd></div>
                <div><dt className="text-muted-foreground">근무 환경</dt><dd className="font-medium mt-0.5">{job.tags.work_environment}</dd></div>
                <div><dt className="text-muted-foreground">대인 접촉</dt><dd className="font-medium mt-0.5">{job.tags.people_interaction}</dd></div>
                <div><dt className="text-muted-foreground">창의성</dt><dd className="font-medium mt-0.5">{job.tags.creativity_level}</dd></div>
                <div><dt className="text-muted-foreground">분석력</dt><dd className="font-medium mt-0.5">{job.tags.analytical_level}</dd></div>
                <div><dt className="text-muted-foreground">기술 활용</dt><dd className="font-medium mt-0.5">{job.tags.tech_intensity}</dd></div>
                <div><dt className="text-muted-foreground">체력 부담</dt><dd className="font-medium mt-0.5">{job.tags.physical_intensity}</dd></div>
                <div><dt className="text-muted-foreground">소득 수준</dt><dd className="font-medium mt-0.5">{job.tags.income_level}</dd></div>
                <div><dt className="text-muted-foreground">성별 제한</dt><dd className="font-medium mt-0.5">{job.gender_restriction ?? "무관"}</dd></div>
              </dl>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------- JobListBrowser ----------------------------- */

function JobListBrowser() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // 고유한 중분류 목록
  const categories = useMemo(
    () => Array.from(new Set(ALL_JOBS.map((j) => j.category))).sort(),
    []
  );

  // 필터링된 직업
  const filtered = useMemo(() => {
    return ALL_JOBS.filter((job) => {
      const matchesSearch =
        searchTerm === "" ||
        job.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (job.description || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === null || job.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

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
        {categories.map((cat) => {
          const count = ALL_JOBS.filter((j) => j.category === cat).length;
          return (
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
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* 결과 */}
      <div className="mt-6">
        <p className="text-xs text-muted-foreground mb-3">
          {filtered.length}개 직업 표시
        </p>
        <div className="grid gap-2 max-h-96 overflow-y-auto">
          {filtered.map((job) => (
            <button
              key={job.id}
              type="button"
              onClick={() => { setSelectedJob(job); setDialogOpen(true); }}
              className="text-left w-full rounded-md border border-border bg-card p-3 hover:border-foreground transition-colors cursor-pointer"
            >
              <div className="flex items-baseline justify-between gap-2">
                <div className="font-medium text-sm">{job.name}</div>
                <div className="text-xs text-muted-foreground shrink-0">
                  {job.domain}
                </div>
              </div>
              {(job.description || job.short_desc) && (
                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {job.description || job.short_desc}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <JobDetailDialog
        job={selectedJob}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
