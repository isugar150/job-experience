/**
 * Design philosophy: Minimal Light
 * 단계 흐름: intro → profile(성별·학력) → asking(질문) → result(메인/서브 추천)
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useRecentJobs } from "@/hooks/useRecentJobs";
import {
  CANDIDATE_THRESHOLD,
  MAX_QUESTIONS,
  MIN_QUESTIONS,
  QUESTIONS,
  currentCandidates,
  getRecommendations,
  pickNextQuestion,
  type Answer,
  type Question,
} from "@/lib/recommend";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  buildShareUrl,
  decodeShareParams,
  generateSeed,
} from "@/lib/share";
import {
  Header,
  Intro,
  Profile,
  Asking,
  Result,
} from "@/pages/home/HomeComponents";

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
  // 이전 질문 복원 직후 useEffect에서 pickNextQuestion이 트리거되어 다른 질문을 고르는 것을 막는 가드
  const restoringPreviousRef = useRef(false);

  const candidates = useMemo(
    () => currentCandidates(profile, answers),
    [profile, answers]
  );
  const recommendation = useMemo(
    () => getRecommendations(profile, answers, 12, seed),
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
    // 이전 질문으로 돌아간 직후에는 복원된 질문을 그대로 보여준다.
    if (restoringPreviousRef.current) {
      restoringPreviousRef.current = false;
      return;
    }
    // 현재 질문이 이미 설정되어 있고 아직 답변되지 않은 상태라면 그대로 유지
    if (currentQuestion && !askedIds.has(currentQuestion.id)) {
      return;
    }
    if (askedIds.size >= MAX_QUESTIONS) {
      navigate(PHASE_TO_PATH["result"]);
      return;
    }
    // 최소 질문 수 이상 답한 상태에서 후보가 CANDIDATE_THRESHOLD 이하로 좌혀지면 조기 종료
    if (askedIds.size >= MIN_QUESTIONS && candidates.length <= CANDIDATE_THRESHOLD + 3) {
      navigate(PHASE_TO_PATH["result"]);
      return;
    }
    // 더 이상 유효한 질문이 없으면 종료
    const next = pickNextQuestion(candidates, askedIds, askedOrder);
    if (!next) {
      navigate(PHASE_TO_PATH["result"]);
      return;
    }
    setCurrentQuestion(next);
  }, [phase, askedIds, askedOrder, candidates, currentQuestion]);

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
    setAnswers((prev) => [
      ...prev,
      { questionId: currentQuestion.id, level: level as -2 | -1 | 0 | 1 | 2 },
    ]);
    setAskedIds((prev) => new Set(prev).add(currentQuestion.id));
    setAskedOrder((prev) => [...prev, currentQuestion.id]);
  }

  function restorePreviousQuestion() {
    const lastId = askedOrder[askedOrder.length - 1];
    if (!lastId) return false;
    const prevQuestion = QUESTIONS.find((q) => q.id === lastId);
    if (!prevQuestion) return false;
    restoringPreviousRef.current = true;
    setAnswers((prev) => prev.slice(0, -1));
    setAskedOrder((prev) => prev.slice(0, -1));
    setAskedIds((prev) => {
      const s = new Set(prev);
      s.delete(lastId);
      return s;
    });
    setCurrentQuestion(prevQuestion);
    return true;
  }

  function goBack() {
    if (askedOrder.length === 0) {
      navigate(PHASE_TO_PATH["profile"]);
      return;
    }
    restorePreviousQuestion();
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
