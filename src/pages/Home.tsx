/**
 * Design philosophy: Minimal Light
 * 단계 흐름: intro → profile(성별·학력) → asking(질문) → result(메인/서브 추천)
 */
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useModalBackHandler } from "@/hooks/useModalBackHandler";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useRecentJobs } from "@/hooks/useRecentJobs";
import { Button } from "@/components/ui/button";
import {
  ANSWER_OPTIONS,
  ALL_JOBS,
  CANDIDATE_THRESHOLD,
  MIN_QUESTIONS,
  EDUCATION_OPTIONS,
  GENDER_OPTIONS,
  QUESTIONS,
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
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  GraduationCap,
  Info,
  Link2,
  RotateCcw,
  Share2,
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

import { TagInput } from "@/components/TagInput";
import { JobThumb } from "@/components/JobThumb";
import { ALL_CERTIFICATIONS, ALL_LANGUAGES } from "@/data/profileData";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  buildShareUrl,
  decodeShareParams,
  generateSeed,
  shareUrl,
} from "@/lib/share";

type Phase = "intro" | "profile" | "asking" | "result";

// URL 경로 <-> Phase 매핑
const PATH_TO_PHASE: Record<string, Phase> = {
  "/": "intro",
  "/profile": "profile",
  "/quiz": "asking",
  "/result": "result",
};
const PHASE_TO_PATH: Record<Phase, string> = {
  intro: "/",
  profile: "/profile",
  asking: "/quiz",
  result: "/result",
};

export default function Home() {
  const [location, navigate] = useLocation();
  const phase: Phase = PATH_TO_PHASE[location] ?? "intro";

  // 프로필은 localStorage에 자동 저장·복원되어 새로고침·재방문 시 이전 입력값이 유지된다
  const { profile, setProfile, resetProfile } = useUserProfile();
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [askedIds, setAskedIds] = useState<Set<string>>(new Set());
  const [askedOrder, setAskedOrder] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  // 결과 추천 재현 가능성을 위한 시드 (공유 링크 지원)
  const [seed, setSeed] = useState<number>(() => generateSeed());
  // URL에서 복원된 세션인지 여부 (공유 링크로 진입시 true) - 향후 확장용
  const [, setRestoredFromUrl] = useState(false);
  // 이전 질문 복원 직후 useEffect에서 pickNextQuestion이 트리거되어 랜덤으로 아닌 다른 질문을 고르는 것을 막는 가드
  const skipNextPickRef = useRef(false);

  const candidates = useMemo(
    () => currentCandidates(profile, answers),
    [profile, answers]
  );
  const recommendation = useMemo(
    () => getRecommendations(profile, answers, 5, seed),
    [profile, answers, seed]
  );

  // 최초 마운트 시 URL 쿼리 파라미터를 검사해 추천 상태를 복원·결과 화면으로 이동
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (!sp.has("s")) return;
    const restored = decodeShareParams(sp);
    if (!restored) return;
    setProfile(restored.profile);
    setAnswers(restored.answers);
    setAskedIds(new Set(restored.answers.map((a) => a.questionId)));
    setAskedOrder(restored.answers.map((a) => a.questionId));
    setSeed(restored.seed);
    setRestoredFromUrl(true);
    // 결과 화면으로 강제 이동
    if (PATH_TO_PHASE[location] !== "result") {
      navigate(PHASE_TO_PATH["result"]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== "asking") return;
    // 이전 질문으로 몉 돌아갈 직후에는 다음 질문을 새로 고르지 않는다 (popstate에서 이미 복원함)
    if (skipNextPickRef.current) {
      skipNextPickRef.current = false;
      return;
    }
    // 현재 질문이 이미 설정되어 있고 아직 답변되지 않은 상태라면 그대로 유지
    if (currentQuestion && !askedIds.has(currentQuestion.id)) {
      return;
    }
    // 최소 질문 수 이상 답한 상태에서 후보가 CANDIDATE_THRESHOLD 이하로 좌혀지면 조기 종료
    if (askedIds.size >= MIN_QUESTIONS && candidates.length <= CANDIDATE_THRESHOLD + 3) {
      navigate(PHASE_TO_PATH["result"]);
      return;
    }
    // 더 이상 유효한 질문이 없으면 종료
    const next = pickNextQuestion(candidates, askedIds);
    if (!next) {
      navigate(PHASE_TO_PATH["result"]);
      return;
    }
    setCurrentQuestion(next);
  }, [phase, askedIds, candidates, currentQuestion]);

  // 브라우저 뒤로가기 대응: intro로 돌아오면 퀴즈 상태는 초기화하되, 프로필은 유지한다
  useEffect(() => {
    if (phase === "intro") {
      setAnswers([]);
      setAskedIds(new Set());
      setAskedOrder([]);
      setCurrentQuestion(null);
      // profile은 의도적으로 유지 (localStorage 에서 복원됨)
    }
  }, [phase]);

  // 결과 화면 진입 시 URL을 공유 가능한 상태로 동기화
  useEffect(() => {
    if (phase !== "result") return;
    if (typeof window === "undefined") return;
    const url = buildShareUrl({ profile, answers, seed });
    const newSearch = url.split("?")[1] ?? "";
    if (window.location.search !== `?${newSearch}`) {
      window.history.replaceState({}, "", `${window.location.pathname}?${newSearch}`);
    }
  }, [phase, profile, answers, seed]);

  function startIntro() {
    setAnswers([]);
    setAskedIds(new Set());
    setAskedOrder([]);
    setCurrentQuestion(null);
    setSeed(generateSeed());
    setRestoredFromUrl(false);
    navigate(PHASE_TO_PATH["profile"]);
  }

  function startQuestions() {
    navigate(PHASE_TO_PATH["asking"]);
  }

  function answer(level: number) {
    if (!currentQuestion) return;
    // 답변할 때마다 히스토리 항목을 쌓아서 브라우저 뒤로가기로 이전 질문으로 돌아갈 수 있게 함
    history.pushState({ quizStep: true, questionId: currentQuestion.id }, "");
    setAnswers((prev) => [
      ...prev,
      { questionId: currentQuestion.id, level: level as -2 | -1 | 0 | 1 | 2 },
    ]);
    setAskedIds((prev) => new Set(prev).add(currentQuestion.id));
    setAskedOrder((prev) => [...prev, currentQuestion.id]);
  }

  // quiz 단계에서 popstate 이벤트 처리
  useEffect(() => {
    if (phase !== "asking") return;

    function handlePopState(e: PopStateEvent) {
      if (e.state?.quizStep) {
        // 이전 질문으로 돌아가기: 방금 답한 질문 ID를 askedOrder에서 꺼내고,
        // 해당 ID의 Question 객체를 QUESTIONS에서 찾아 현재 질문으로 되돌린다.
        // 이렇게 되돌려야 pickNextQuestion의 랜덤 선택으로 이전 질문이 다른 걸로 바뀌지 않는다.
        const lastId = askedOrder[askedOrder.length - 1];
        if (lastId) {
          const prevQuestion = QUESTIONS.find((q) => q.id === lastId);
          // 다음 주기에 useEffect가 askedIds 변경에 반응해 새 질문을 고르는 것을 방지
          skipNextPickRef.current = true;
          setAnswers((prev) => prev.slice(0, -1));
          setAskedOrder((prev) => prev.slice(0, -1));
          setAskedIds((prev) => {
            const s = new Set(prev);
            s.delete(lastId);
            return s;
          });
          if (prevQuestion) {
            setCurrentQuestion(prevQuestion);
          }
        }
      }
      // quizStep이 없으면 wouter가 /profile로 이동시킨다 → 그대로 두기
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [phase, askedOrder]);

  function goBack() {
    if (askedOrder.length === 0) {
      navigate(PHASE_TO_PATH["profile"]);
      return;
    }
    // 히스토리에서 한 단계 뒤로 (하드코딩 버튼 사용 시)
    history.back();
  }

  function reset() {
    setAnswers([]);
    setAskedIds(new Set());
    setAskedOrder([]);
    setCurrentQuestion(null);
    setSeed(generateSeed());
    setRestoredFromUrl(false);
    // 다시 시작 때 profile은 유지 (사용자가 동일인과다)
    // URL에 남아있는 공유 파라미터가 있으면 제거
    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState({}, "", window.location.pathname);
    }
    navigate(PHASE_TO_PATH["intro"]);
  }

  const bookmarks = useBookmarks();
  const recentJobs = useRecentJobs();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header showReset={phase !== "intro"} onReset={reset} bookmarks={bookmarks} recentJobs={recentJobs} />

      <main className="max-w-3xl mx-auto px-5 sm:px-6 pt-10 sm:pt-16 pb-24">
        {phase === "intro" && <Intro onStart={startIntro} bookmarks={bookmarks} recentJobs={recentJobs} />}
        {phase === "profile" && (
          <Profile
            profile={profile}
            onChange={setProfile}
            onReset={resetProfile}
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
            answers={answers}
            seed={seed}
            onReset={reset}
            bookmarks={bookmarks}
            recentJobs={recentJobs}
          />
        )}
      </main>
    </div>
  );
}

/* ----------------------------- Header ----------------------------- */

type BookmarksHook = ReturnType<typeof useBookmarks>;
type RecentJobsHook = ReturnType<typeof useRecentJobs>;

function Header({
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
      <header className="border-b border-border sticky top-0 z-10" style={{backgroundColor: '#f7f3eb', backgroundImage: "url('/job-experience/paper_texture.png')", backgroundRepeat: 'repeat', backgroundSize: '400px 400px', boxShadow: '0 2px 6px rgba(100,80,50,0.15)'}}>
        <div className="max-w-3xl mx-auto px-5 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/job-experience/logo_icon.png" alt="로고" className="h-8 w-8 object-contain" />
            <span className="text-sm font-bold tracking-tight" style={{fontFamily: '"Pretendard Variable", sans-serif', letterSpacing: '-0.01em'}}>
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
  useModalBackHandler(open && !detailOpen, () => onOpenChange(false));

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
          <ScrollArea className="max-h-[60vh] pr-2">
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
  useModalBackHandler(open && !detailOpen, () => onOpenChange(false));

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
          <ScrollArea className="max-h-[60vh] pr-2">
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
        onView={recentJobs.addRecent}
      />
    </>
  );
}

/* ----------------------------- Intro ----------------------------- */

function Intro({ onStart, bookmarks, recentJobs }: { onStart: () => void; bookmarks?: BookmarksHook; recentJobs?: RecentJobsHook }) {
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

function Profile({
  profile,
  onChange,
  onReset,
  onContinue,
}: {
  profile: UserProfile;
  onChange: (p: UserProfile) => void;
  onReset: () => void;
  onContinue: () => void;
}) {
  const hasSavedData =
    profile.gender !== "unspecified" ||
    profile.education !== "unspecified" ||
    (profile.certifications?.length ?? 0) > 0 ||
    (profile.languages?.length ?? 0) > 0;
  return (
    <section>
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
        먼저 간단한 프로필을 알려주세요.
      </h2>
      <p className="text-sm text-muted-foreground mb-10 max-w-xl">
        입력한 정보는 추천 결과를 더 정확하게 맞추는 데 사용됩니다.
        모든 항목은 선택 사항이며, 응답하기 어려운 항목은 <span className="font-medium">응답 안함</span>으로 두셔도 됩니다.
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
              요건 충족 여부에 따라 메인/보완 추천으로 나뉘니다.
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

        {/* 자격증 (선택) */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold">보유 자격증</h3>
            <span className="text-xs text-muted-foreground">
              입력한 자격증을 요구하는 직업에 가산점이 부여됩니다.
            </span>
          </div>
          <TagInput
            value={profile.certifications ?? []}
            onChange={(certs) => onChange({ ...profile, certifications: certs })}
            suggestions={ALL_CERTIFICATIONS}
            placeholder="예: 정보처리기사, 운전면허 ..."
          />
        </div>

        {/* 언어 능력 (선택) */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold">구사 언어</h3>
            <span className="text-xs text-muted-foreground">
              통번역·외국어 관련 직업에 가산점이 부여됩니다.
            </span>
          </div>
          <TagInput
            value={profile.languages ?? []}
            onChange={(langs) => onChange({ ...profile, languages: langs })}
            suggestions={ALL_LANGUAGES}
            placeholder="예: 영어, 일본어 ..."
          />
        </div>
      </div>

      <div className="mt-12 flex flex-wrap gap-3">
        <Button size="lg" onClick={onContinue} className="h-11 px-6 rounded-md">
          질문 시작
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
        {hasSavedData && (
          <Button
            variant="ghost"
            size="lg"
            onClick={onReset}
            className="h-11 px-4 rounded-md text-muted-foreground hover:text-foreground"
          >
            프로필 초기화
          </Button>
        )}
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
          <span>질문 {answeredCount + 1}번째</span>
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
            key={`${question.id}-${opt.label}`}
            onClick={(e) => {
              // 모바일 sticky hover 방지용 포커스 해제
              (e.currentTarget as HTMLButtonElement).blur();
              onAnswer(opt.level);
            }}
            className="group flex items-center justify-between text-left rounded-md border border-border bg-card px-4 py-3.5 [@media(hover:hover)]:hover:border-foreground [@media(hover:hover)]:hover:bg-accent/50 transition-colors"
          >
            <span className="text-base font-medium">{opt.label}</span>
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
const namuwikiUrl = (name: string) =>
  `https://namu.wiki/w/${encodeURIComponent(name)}`;

function Result({
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
  const runners = main.slice(1, 5);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "shared">("idle");

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

  return (
    <section>
      <div className="text-xs text-muted-foreground mb-2">
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
          <h3 className="text-sm font-semibold mb-3">유리한 자격증쀌면허</h3>
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

      {/* Actions */}
      <div className="flex flex-wrap gap-3 mb-12">
        <Button onClick={onReset} className="rounded-md">
          <RotateCcw className="h-4 w-4 mr-2" />
          다시 찾아보기
        </Button>
        {bookmarks && (
          <Button
            variant="outline"
            className="rounded-md"
            onClick={() => bookmarks.toggle(winner.id)}
          >
            {isBookmarked ? (
              <><BookmarkCheck className="h-4 w-4 mr-2 fill-foreground" />저장됨</>
            ) : (
              <><Bookmark className="h-4 w-4 mr-2" />저장하기</>
            )}
          </Button>
        )}
        <Button
          variant="outline"
          className="rounded-md"
          onClick={handleShare}
        >
          {shareStatus === "copied" ? (
            <><Link2 className="h-4 w-4 mr-2" />링크 복사됨</>
          ) : shareStatus === "shared" ? (
            <><Check className="h-4 w-4 mr-2" />공유됨</>
          ) : (
            <><Share2 className="h-4 w-4 mr-2" />공유하기</>
          )}
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
          <h3 className="text-sm font-semibold mb-2">함께 추천된 직업</h3>
          <p className="text-xs text-muted-foreground mb-4 max-w-lg">
            답변과 프로필에 잘 맞는 직업들입니다.
          </p>
          <JobList items={runners} userEdu={profile.education} bookmarks={bookmarks} recentJobs={recentJobs} />
        </div>
      )}

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
                  {highlightRequirement || !ok ? (
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

/* ----------------------------- JobDetailMetaGrid ----------------------------- */
// 러너 다이얼로그용: 기본 9개 + 더보기 토글
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
const JobDetailDialog = memo(function JobDetailDialog({
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

/* ----------------------------- JobListBrowser ----------------------------- */

// 한 번에 렌더할 기본 아이템 수. 최초 진입 시 536개 카드를 한꺼번에 창으롌
// JobListBrowser 자체가 무거워져 다이얼로그를 염 때의 React 커밋도 느려졌다.
// 100개 단위로 점진적으로 표시하고 "더 보기" 버튼으로 확장한다.
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

function JobListBrowser({ bookmarks, recentJobs }: { bookmarks?: BookmarksHook; recentJobs?: RecentJobsHook }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  // 점진적 렌더링을 위한 표시 개수 (검색어/카테고리 변경 시 리셋)
  const [visibleCount, setVisibleCount] = useState(JOB_LIST_PAGE_SIZE);

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
        <div className="grid gap-2 max-h-[600px] overflow-y-auto border border-border rounded-md p-3 bg-card/50">
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
