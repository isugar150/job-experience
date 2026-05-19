import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import {
  ANSWER_OPTIONS,
  EDUCATION_OPTIONS,
  GENDER_OPTIONS,
  QUESTIONS,
  meetsEducation,
  type Answer,
  type Job,
  type Question,
  type UserEducation,
  type UserGender,
  type UserProfile,
} from "@/lib/recommend";
import { buildShareUrl, shareUrl } from "@/lib/share";
import { explainRecommendation } from "@/lib/recommendation-insights";
import { JobThumb } from "@/components/JobThumb";
import {
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Info,
  Link2,
  RotateCcw,
  Share2,
  X,
} from "lucide-react";
import type { BookmarksHook, RecentJobsHook } from "./types";
import { JobDetailDialog } from "./JobDetailDialog";

const answerLabel = (level: Answer["level"]) =>
  ANSWER_OPTIONS.find((opt) => opt.level === level)?.label ?? "응답 없음";

const answerToneClass = (level: Answer["level"]) => {
  if (level === 2) {
    return "border-emerald-300 bg-emerald-100 text-emerald-900";
  }
  if (level === 1) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (level === -1) {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }
  if (level === -2) {
    return "border-rose-300 bg-rose-100 text-rose-900";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
};

const genderLabel = (gender: UserGender) =>
  GENDER_OPTIONS.find((opt) => opt.value === gender)?.label ?? "응답 안함";

const educationLabel = (education: UserEducation) =>
  EDUCATION_OPTIONS.find((opt) => opt.value === education)?.label ??
  (education === "unspecified" ? "응답 안함" : education);

export function Result({
  profile,
  main,
  sub,
  answers,
  seed,
  onReset,
  bookmarks,
  recentJobs,
}: {
  profile: UserProfile;
  main: Array<{ job: Job; score: number }>;
  sub: Array<{ job: Job; score: number }>;
  answers: Answer[];
  seed: number;
  onReset: () => void;
  bookmarks?: BookmarksHook;
  recentJobs?: RecentJobsHook;
}) {
  const winner = main[0]?.job ?? sub[0]?.job;
  const runners = main.filter((item) => item.job.id !== winner?.id);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "shared">("idle");
  const compareOptions = [...main, ...sub].filter((item, index, arr) =>
    item.job.id !== winner?.id && arr.findIndex((other) => other.job.id === item.job.id) === index
  );
  const [compareJobId, setCompareJobId] = useState<number | null>(null);
  const compareTarget = compareOptions.find((item) => item.job.id === compareJobId) ?? null;

  // 결과 페이지 진입 시 winner를 최근 본 직업에 자동 추가
  useEffect(() => {
    if (winner) recentJobs?.addRecent(winner.id);
  }, [winner?.id]);

  async function handleShare() {
    const url = buildShareUrl({ profile, answers, seed });
    const result = await shareUrl(url, winner ? `나에게 맞는 직업: ${winner.name}` : "나에게 맞는 직업 추천");
    setShareStatus(result);
    window.setTimeout(() => setShareStatus("idle"), 2200);
  }


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
  const isBookmarked = bookmarks?.isBookmarked(winner.id) ?? false;
  const insights = explainRecommendation(winner, answers, profile);
  const answeredQuestions = answers
    .map((answer) => ({
      answer,
      question: QUESTIONS.find((q) => q.id === answer.questionId),
    }))
    .filter((item): item is { answer: Answer; question: Question } =>
      Boolean(item.question)
    );

  return (
    <section>
      <div className="mb-8 flex flex-wrap gap-3">
        <Button onClick={onReset} className="rounded-md">
          <RotateCcw className="h-4 w-4 mr-2" />
          다시찾아보기
        </Button>
        {bookmarks && (
          <Button
            variant="outline"
            className="rounded-md"
            onClick={() => bookmarks.toggle(winner.id)}
          >
            {isBookmarked ? (
              <>
                <BookmarkCheck className="h-4 w-4 mr-2 fill-foreground" />
                저장됨
              </>
            ) : (
              <>
                <Bookmark className="h-4 w-4 mr-2" />
                저장하기
              </>
            )}
          </Button>
        )}
        <Button variant="outline" className="rounded-md" onClick={handleShare}>
          {shareStatus === "copied" ? (
            <>
              <Link2 className="h-4 w-4 mr-2" />
              링크 복사됨
            </>
          ) : shareStatus === "shared" ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              공유됨
            </>
          ) : (
            <>
              <Share2 className="h-4 w-4 mr-2" />
              공유하기
            </>
          )}
        </Button>

      </div>

      {/* Runners (메인 추천 나머지) */}
      {runners.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold mb-3">함께 추천된 직업</h3>
          <RecommendedJobGrid
            items={runners}
            bookmarks={bookmarks}
            recentJobs={recentJobs}
          />
        </div>
      )}

      <div className="text-lg font-bold tracking-tight mb-3">
        {winnerInMain ? "추천 직업" : "보완이 필요한 추천 직업"}
      </div>

      {winner.image && (
        <div className="mb-5 flex justify-center">
          <JobThumb
            job={winner}
            rounded="2xl"
            loading="eager"
            className="w-full max-w-[320px] aspect-square shadow-md"
          />
        </div>
      )}
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

      <section className="rounded-xl border border-border bg-card p-4 mb-10">
        <h3 className="text-sm font-semibold mb-2">왜 이 직업이 추천됐나요?</h3>
        <p className="text-sm text-muted-foreground mb-4">{insights.summary}</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <ReasonList title="잘 맞는 답변" items={insights.matched.slice(0, 5).map((item) => item.label)} empty="뚜렷하게 맞는 답변은 아직 적어요." />
          <ReasonList title="선호와 다른 부분" items={insights.mismatched.slice(0, 4).map((item) => item.label)} empty="큰 불일치 항목이 없습니다." />
        </div>
        {insights.profileReasons.length > 0 && (
          <div className="mt-4 border-t border-border pt-3">
            <div className="text-xs font-semibold mb-2">프로필 반영</div>
            <ul className="grid gap-1.5 text-sm text-muted-foreground">
              {insights.profileReasons.map((reason) => <li key={reason}>• {reason}</li>)}
            </ul>
          </div>
        )}
      </section>


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

      {/* Traits */}
      {winner.traits?.length ? (
        <div className="mb-10">
          <h3 className="text-sm font-semibold mb-3">이런 성향의 사람에게 잘 맞아요</h3>
          <div className="flex flex-wrap gap-2">
            {winner.traits.map((t) => (
              <span
                key={t}
                className="px-3 py-1.5 rounded-full border border-border bg-muted text-sm"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      ) : null}

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
      <WinnerMetaGrid winner={winner} />

      {compareOptions.length > 0 && (
        <RecommendationCompare
          winner={{ job: winner, score: main.find((item) => item.job.id === winner.id)?.score ?? sub.find((item) => item.job.id === winner.id)?.score ?? 0 }}
          options={compareOptions}
          selected={compareTarget}
          onSelect={(id) => setCompareJobId(id)}
        />
      )}

      <ResultInputSummary
        profile={profile}
        answeredQuestions={answeredQuestions}
      />

      {/* 서브 추천: 도전해볼 만한 직업 (랜덤 5개) */}
      {sub.length > 0 && (
        <div className="border-t border-border pt-8 mt-10">
          <h3 className="text-sm font-semibold mb-2">
            이런 직업도 어떨까요?
          </h3>
          <p className="text-xs text-muted-foreground mb-4 max-w-lg">
            답변과 일부 다른 면이 있지만, 그만큼 새로운 선택으로 고려해볼 만한 직업입니다.
          </p>
          <JobList
            items={sub.slice(0, 5)}
            userEdu={profile.education}
            bookmarks={bookmarks}
            recentJobs={recentJobs}
          />
        </div>
      )}
    </section>
  );
}

function RecommendationCompare({
  winner,
  options,
  selected,
  onSelect,
}: {
  winner: { job: Job; score: number };
  options: Array<{ job: Job; score: number }>;
  selected: { job: Job; score: number } | null;
  onSelect: (id: number | null) => void;
}) {
  const target = selected ?? options[0];

  return (
    <section className="border-t border-border pt-8 mb-10">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold mb-1">추천 직업 비교</h3>
          <p className="text-xs text-muted-foreground">
            1순위 추천과 다른 후보를 나란히 비교해보세요.
          </p>
        </div>
        <label className="grid gap-1 text-xs text-muted-foreground sm:min-w-52">
          <span>비교할 직업 선택</span>
          <select
            aria-label="비교할 직업 선택"
            value={target?.job.id ?? ""}
            onChange={(e) => onSelect(e.target.value ? Number(e.target.value) : null)}
            className="rounded-md border border-border bg-background px-2 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
          >
            {options.map((item) => (
              <option key={item.job.id} value={item.job.id}>
                {item.job.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {target && (
        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="w-28 px-4 py-3 text-left text-xs font-medium text-muted-foreground">항목</th>
                <th className="px-4 py-3 text-left font-semibold">{winner.job.name}</th>
                <th className="px-4 py-3 text-left font-semibold">{target.job.name}</th>
              </tr>
            </thead>
            <tbody>
              <CompareMetricRow label="추천 점수" left={winner.score.toFixed(1)} right={target.score.toFixed(1)} />
              <CompareMetricRow label="분야" left={`${winner.job.domain} · ${winner.job.category}`} right={`${target.job.domain} · ${target.job.category}`} />
              <CompareMetricRow label="학력" left={winner.job.education_required ?? "고졸이상"} right={target.job.education_required ?? "고졸이상"} />
              <CompareMetricRow label="소득" left={winner.job.tags.income_level} right={target.job.tags.income_level} />
              <CompareMetricRow label="성장성" left={winner.job.tags.growth_potential ?? "보통"} right={target.job.tags.growth_potential ?? "보통"} />
              <CompareMetricRow label="자동화 위험" left={winner.job.tags.automation_risk ?? "보통"} right={target.job.tags.automation_risk ?? "보통"} />
              <CompareMetricRow label="근무 환경" left={winner.job.tags.work_environment} right={target.job.tags.work_environment} />
              <CompareMetricRow label="자격증" left={winner.job.tags.license_required ? "필요" : "불필요"} right={target.job.tags.license_required ? "필요" : "불필요"} />
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function CompareMetricRow({ label, left, right }: { label: string; left: string; right: string }) {
  return (
    <tr className="border-b border-border/70 align-top last:border-0">
      <td className="px-4 py-3 text-xs font-medium text-muted-foreground">{label}</td>
      <td className="px-4 py-3 leading-relaxed">{left}</td>
      <td className="px-4 py-3 leading-relaxed">{right}</td>
    </tr>
  );
}

function JobList({
  items,
  userEdu,
  highlightRequirement,
  bookmarks,
  recentJobs,
}: {
  items: Array<{ job: Job; score: number }>;
  userEdu: UserEducation;
  highlightRequirement?: boolean;
  bookmarks?: BookmarksHook;
  recentJobs?: RecentJobsHook;
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
              <div className="flex gap-4">
                <JobThumb job={r.job} size={72} rounded="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="font-medium truncate">{r.job.name}</div>
                    <div className="text-xs text-muted-foreground shrink-0">
                      {r.job.domain}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1.5 line-clamp-2">
                    {r.job.description || r.job.short_desc}
                  </div>
                  {highlightRequirement ? (
                    <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-foreground/80 px-2 py-1 rounded bg-muted">
                      <GraduationCap className="h-3.5 w-3.5" />
                      필요 학력: {r.job.education_required ?? "고졸이상"}
                    </div>
                  ) : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <JobDetailDialog
        job={selectedJob}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        bookmarks={bookmarks}
        onView={recentJobs?.addRecent}
      />
    </>
  );
}

function RecommendedJobGrid({
  items,
  bookmarks,
  recentJobs,
}: {
  items: Array<{ job: Job; score: number }>;
  bookmarks?: BookmarksHook;
  recentJobs?: RecentJobsHook;
}) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Carousel
        opts={{
          align: "start",
          containScroll: "trimSnaps",
          dragFree: true,
          slidesToScroll: 1,
        }}
        className="relative"
      >
        <CarouselContent className="-ml-3 cursor-grab select-none active:cursor-grabbing">
          {items.map((r) => (
            <CarouselItem
              key={r.job.id}
              className="basis-[40%] pl-3 sm:basis-[42%] lg:basis-[28.571%]"
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedJob(r.job);
                  setDialogOpen(true);
                }}
                className="group h-full w-full select-none overflow-hidden rounded-md border border-border bg-card text-left transition-colors hover:border-foreground"
              >
                <div className="p-3">
                  <JobThumb
                    job={r.job}
                    rounded="md"
                    className="pointer-events-none mb-3 aspect-square w-full select-none"
                  />
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                      {r.job.category}
                    </span>
                    {bookmarks?.isBookmarked(r.job.id) ? (
                      <BookmarkCheck
                        className="h-4 w-4 shrink-0 fill-foreground text-foreground"
                        aria-label="저장됨"
                      />
                    ) : null}
                  </div>
                  <div className="mt-1 truncate text-sm font-semibold">
                    {r.job.name}
                  </div>
                </div>
              </button>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      <JobDetailDialog
        job={selectedJob}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        bookmarks={bookmarks}
        onView={recentJobs?.addRecent}
      />
    </>
  );
}

function ResultInputSummary({
  profile,
  answeredQuestions,
}: {
  profile: UserProfile;
  answeredQuestions: Array<{ answer: Answer; question: Question }>;
}) {
  const certifications = profile.certifications?.filter(Boolean) ?? [];
  const languages = profile.languages?.filter(Boolean) ?? [];
  const [expanded, setExpanded] = useState(false);
  const visibleQuestions = expanded
    ? answeredQuestions
    : answeredQuestions.slice(0, 3);
  const hiddenCount = Math.max(answeredQuestions.length - visibleQuestions.length, 0);

  return (
    <div className="border-t border-border pt-8 mb-10">
      <h3 className="text-sm font-semibold mb-4">입력한 정보</h3>

      <div className="grid gap-3 sm:grid-cols-2 mb-6">
        <div className="rounded-md border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-1">성별</div>
          <div className="text-sm font-medium">{genderLabel(profile.gender)}</div>
        </div>
        <div className="rounded-md border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-1">학력</div>
          <div className="text-sm font-medium">
            {educationLabel(profile.education)}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <ProfileTagGroup title="보유 자격증" items={certifications} />
        <ProfileTagGroup title="구사 언어" items={languages} />
      </div>

      {answeredQuestions.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-3">
            질문과 답변
          </h4>
          <ol className="grid gap-2.5">
            {visibleQuestions.map(({ answer, question }, index) => (
              <li
                key={`${answer.questionId}-${index}`}
                className="rounded-md border border-border bg-card px-4 py-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground mb-1">
                      질문 {index + 1}
                    </div>
                    <div className="text-sm leading-relaxed">
                      {question.text}
                    </div>
                  </div>
                  <div
                    className={
                      "shrink-0 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm " +
                      answerToneClass(answer.level)
                    }
                  >
                    {answerLabel(answer.level)}
                  </div>
                </div>
              </li>
            ))}
          </ol>
          {answeredQuestions.length > 3 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((v) => !v)}
              className="mt-3 px-2 text-muted-foreground hover:text-foreground"
            >
              {expanded ? (
                <>
                  접기
                  <ChevronUp className="ml-1.5 h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  {hiddenCount}개 더보기
                  <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function ProfileTagGroup({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-2">{title}</div>
      <div className="flex flex-wrap gap-2">
        {items.length > 0 ? (
          items.map((item) => (
            <span
              key={item}
              className="rounded-md border border-border bg-card px-2.5 py-1 text-xs"
            >
              {item}
            </span>
          ))
        ) : (
          <span
            className="rounded-md border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground"
          >
            해당 없음
          </span>
        )}
      </div>
    </div>
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

function ReasonList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div>
      <div className="text-xs font-semibold mb-2">{title}</div>
      {items.length > 0 ? (
        <ul className="grid gap-1.5 text-sm text-muted-foreground">
          {items.map((item) => <li key={item}>• {item}</li>)}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{empty}</p>
      )}
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

/* ----------------------------- WinnerMetaGrid ----------------------------- */
// 메인 결과 카드용: 기본 9개 + 더보기 토글
function WinnerMetaGrid({ winner }: { winner: Job }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border-t border-border pt-6 mb-10">
      <h3 className="text-sm font-semibold mb-4">직업 특성</h3>
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 text-sm">
        <Meta k="필요 학력" v={winner.education_required ?? "고졸이상"} />
        <Meta k="근무 환경" v={winner.tags.work_environment} />
        <Meta k="소득 수준" v={winner.tags.income_level} />
        <Meta k="기술 활용" v={winner.tags.tech_intensity} />
        <Meta k="대인 접촉" v={winner.tags.people_interaction} />
        <Meta k="체력 부담" v={winner.tags.physical_intensity} />
        <Meta k="고용 안정성" v={winner.tags.job_stability ?? "-"} />
        <Meta k="원격 근무" v={winner.tags.remote_work ?? "-"} />
        <Meta k="성별 제한" v={winner.gender_restriction ?? "무관"} />
        {expanded && (
          <>
            <Meta k="창의성" v={winner.tags.creativity_level} />
            <Meta k="분석력" v={winner.tags.analytical_level} />
            <Meta k="위험도" v={winner.tags.risk_level} />
            <Meta k="근무 형태" v={winner.tags.work_schedule ?? "-"} />
            <Meta k="고용 형태" v={winner.tags.employment_type ?? "-"} />
            <Meta k="성장 가능성" v={winner.tags.growth_potential ?? "-"} />
            <Meta k="자동화 위험" v={winner.tags.automation_risk ?? "-"} />
            <Meta k="업무 자율성" v={winner.tags.work_autonomy ?? "-"} />
            <Meta k="팀워크" v={winner.tags.teamwork_level ?? "-"} />
            <Meta k="소통 비중" v={winner.tags.communication_level ?? "-"} />
            <Meta k="반복 업무" v={winner.tags.repetition_level ?? "-"} />
            <Meta k="사회적 기여" v={winner.tags.social_impact ?? "-"} />
            <Meta k="공공/민간" v={winner.tags.public_sector ?? "-"} />
            <Meta k="자격증 필수" v={winner.tags.license_required ? "필수" : "불필요"} />
            <Meta k="진입 난이도" v={winner.tags.entry_difficulty ?? "-"} />
            <Meta k="취업 경쟁률" v={winner.tags.competition_level ?? "-"} />
            <Meta k="경력 요구" v={winner.tags.experience_required ?? "-"} />
          </>
        )}
      </dl>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-4 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? (
          <><ChevronUp className="h-3.5 w-3.5" />접기</>
        ) : (
          <><ChevronDown className="h-3.5 w-3.5" />더보기 (+17개)</>
        )}
      </button>
    </div>
  );
}
