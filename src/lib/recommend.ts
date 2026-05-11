/**
 * 추천 엔진
 * - 사용자가 답한 답변을 사용해 537개 직업 후보를 점진적으로 좁혀나간다.
 * - 시작 전에 성별/학력을 사전 입력으로 받아, 학력 충족 여부에 따라
 *   추천 결과를 "메인(요건 충족)"과 "서브(보완 필요)"로 분리한다.
 */
import jobsData from "@/data/jobs.json";

export type AnswerLevel = -2 | -1 | 0 | 1 | 2;

export type EducationLevel =
  | "제한없음"
  | "중졸이하"
  | "고졸이상"
  | "전문대졸"
  | "대졸"
  | "석사"
  | "박사";

export type GenderRestriction = "무관" | "남성" | "여성";

export type UserGender = "male" | "female" | "unspecified";

export type UserEducation =
  | "중졸이하"
  | "고졸"
  | "전문대졸"
  | "대졸"
  | "석사"
  | "박사"
  | "unspecified";

export interface UserProfile {
  gender: UserGender;
  education: UserEducation;
}

export interface Job {
  id: number;
  name: string;
  category: string;
  domain: string;
  tags: {
    work_environment: string;
    physical_intensity: string;
    people_interaction: string;
    creativity_level: string;
    analytical_level: string;
    tech_intensity: string;
    education_required: string;
    license_required: boolean;
    income_level: string;
    risk_level: string;
    // 새로 추가된 태그
    work_schedule?: string;
    remote_work?: string;
    employment_type?: string;
    growth_potential?: string;
    job_stability?: string;
    automation_risk?: string;
    work_autonomy?: string;
    teamwork_level?: string;
    communication_level?: string;
    repetition_level?: string;
    social_impact?: string;
    public_sector?: string;
  };
  traits: string[];
  short_desc: string;
  description?: string;
  pros?: string[];
  cons?: string[];
  certifications?: string[];
  source_url?: string;
  education_required?: EducationLevel;
  gender_restriction?: GenderRestriction;
}

export interface JobsData {
  jobs: Job[];
  categories: string[];
  domains: string[];
  total: number;
}

export const ALL_JOBS: Job[] = (jobsData as JobsData).jobs;
export const ALL_DOMAINS: string[] = (jobsData as JobsData).domains;
export const ALL_CATEGORIES: string[] = (jobsData as JobsData).categories;

/** 학력 요구 수준 비교용 순위 */
const EDU_REQ_RANK: Record<EducationLevel, number> = {
  제한없음: 0,
  중졸이하: 1,
  고졸이상: 2,
  전문대졸: 3,
  대졸: 4,
  석사: 5,
  박사: 6,
};

/** 사용자가 가진 학력 순위 */
const USER_EDU_RANK: Record<UserEducation, number> = {
  unspecified: 0,
  중졸이하: 1,
  고졸: 2,
  전문대졸: 3,
  대졸: 4,
  석사: 5,
  박사: 6,
};

/** 사용자가 직업의 학력 요건을 충족하는지 */
export function meetsEducation(job: Job, userEdu: UserEducation): boolean {
  if (userEdu === "unspecified") return true;
  const req = (job.education_required ?? "고졸이상") as EducationLevel;
  return USER_EDU_RANK[userEdu] >= EDU_REQ_RANK[req];
}

/** 사용자가 직업의 성별 제한을 충족하는지 */
export function meetsGender(job: Job, userGender: UserGender): boolean {
  const g = job.gender_restriction ?? "무관";
  if (g === "무관") return true;
  if (userGender === "unspecified") return true;
  if (g === "남성" && userGender === "male") return true;
  if (g === "여성" && userGender === "female") return true;
  return false;
}

/**
 * 각 질문은 "직업이 이 조건을 만족하면 +1, 아니면 -1" 식의 predicate를 가진다.
 */
export interface Question {
  id: string;
  text: string;
  predicate: (job: Job) => boolean;
  weight?: number;
}

const yes = (b: boolean) => b;

export const QUESTIONS: Question[] = [
  // ── 양방향 축 질문 (긍정 → 실내/높음, 부정 → 실외/낮음) ──
  {
    id: "work_env",
    text: "주로 실내에서 일하는 환경을 선호하시나요?",
    predicate: (j) => yes(j.tags.work_environment === "실내중심"),
    // 부정 답변은 실외중심 직업에 가산점이 되도록 predicate 반전 활용
    weight: 1.2,
  },
  {
    id: "people_interaction",
    text: "사람들과 자주 소통하고 어울리는 일이 좋으신가요?",
    predicate: (j) => yes(j.tags.people_interaction === "높음"),
    weight: 1.3,
  },
  {
    id: "tech_usage",
    text: "컴퓨터·IT·디지털 도구를 적극 활용하는 일이 좋으신가요?",
    predicate: (j) => yes(j.tags.tech_intensity === "높음"),
    weight: 1.4,
  },
  {
    id: "physical_demand",
    text: "체력을 많이 쓰는 활동적인 일을 원하시나요?",
    predicate: (j) => yes(j.tags.physical_intensity === "높음"),
    weight: 1.0,
  },
  // ── 단독 특성 질문 ──
  {
    id: "creative",
    text: "창의적인 아이디어로 무언가를 만들어내는 일을 좋아하시나요?",
    predicate: (j) => yes(j.tags.creativity_level === "높음"),
    weight: 1.3,
  },
  {
    id: "analytical",
    text: "데이터·논리를 분석해서 문제를 푸는 일이 즐거우신가요?",
    predicate: (j) => yes(j.tags.analytical_level === "높음"),
    weight: 1.3,
  },
  {
    id: "license",
    text: "자격증·면허가 반드시 필요한 전문 직업이 좋은가요?",
    predicate: (j) => yes(j.tags.license_required === true),
    weight: 1.0,
  },
  {
    id: "income_high",
    text: "소득이 높은 편의 직업을 우선적으로 고려하시나요?",
    predicate: (j) =>
      yes(j.tags.income_level === "높음" || j.tags.income_level === "매우높음"),
    weight: 1.1,
  },
  {
    id: "risk_low",
    text: "위험이 적고 안전한 환경에서 일하고 싶으신가요?",
    predicate: (j) => yes(j.tags.risk_level === "낮음"),
    weight: 0.9,
  },
  // ── 새로 추가된 근무 조건 질문 ──
  {
    id: "remote_work",
    text: "재택·원격 근무가 가능한 직업을 선호하시나요?",
    predicate: (j) =>
      yes(j.tags.remote_work === "가능" || j.tags.remote_work === "부분가능"),
    weight: 1.2,
  },
  {
    id: "work_schedule_regular",
    text: "정해진 시간에 규칙적으로 일하는 환경을 원하시나요?",
    predicate: (j) => yes(j.tags.work_schedule === "정규직"),
    weight: 1.1,
  },
  {
    id: "employment_stable",
    text: "정규직처럼 고용이 안정적인 형태를 원하시나요?",
    predicate: (j) => yes(j.tags.employment_type === "정규직"),
    weight: 1.1,
  },
  // ── 새로 추가된 성장/커리어 질문 ──
  {
    id: "growth_potential",
    text: "앞으로 성장 가능성이 높은 직업을 원하시나요?",
    predicate: (j) => yes(j.tags.growth_potential === "높음"),
    weight: 1.2,
  },
  {
    id: "job_stability",
    text: "직업 안정성을 가장 중요하게 생각하시나요?",
    predicate: (j) => yes(j.tags.job_stability === "높음"),
    weight: 1.2,
  },
  {
    id: "automation_risk_low",
    text: "AI·자동화로 대체되기 어려운 직업을 원하시나요?",
    predicate: (j) => yes(j.tags.automation_risk === "낮음"),
    weight: 1.1,
  },
  // ── 새로 추가된 업무 성격 질문 ──
  {
    id: "work_autonomy",
    text: "스스로 계획하고 자율적으로 일하는 것을 좋아하시나요?",
    predicate: (j) => yes(j.tags.work_autonomy === "높음"),
    weight: 1.2,
  },
  {
    id: "solo_work",
    text: "혼자 집중해서 일하는 것을 더 좋아하시나요?",
    predicate: (j) => yes(j.tags.teamwork_level === "개인중심"),
    weight: 1.2,
  },
  {
    id: "communication_high",
    text: "말하거나 글 쓰는 커뮤니케이션이 많은 일을 원하시나요?",
    predicate: (j) => yes(j.tags.communication_level === "높음"),
    weight: 1.0,
  },
  {
    id: "repetition_low",
    text: "매일 다양하고 새로운 업무를 하는 것을 선호하시나요?",
    predicate: (j) => yes(j.tags.repetition_level === "낮음"),
    weight: 1.0,
  },
  // ── 새로 추가된 사회적 가치 질문 ──
  {
    id: "social_impact",
    text: "사회에 긍정적인 영향을 미치는 의미 있는 일을 원하시나요?",
    predicate: (j) => yes(j.tags.social_impact === "높음"),
    weight: 1.1,
  },
  {
    id: "public_sector",
    text: "공공기관·공무원처럼 공공 분야에서 일하고 싶으신가요?",
    predicate: (j) => yes(j.tags.public_sector === "공공"),
    weight: 1.2,
  },
  // 도메인 그룹
  {
    id: "domain_it",
    text: "IT·소프트웨어·데이터 분야의 일에 흥미가 있으신가요?",
    predicate: (j) => yes(j.domain === "IT/소프트웨어"),
    weight: 1.5,
  },
  {
    id: "domain_health",
    text: "사람의 건강을 돌보거나 치료하는 일에 끌리시나요?",
    predicate: (j) => yes(j.domain === "의료/보건"),
    weight: 1.4,
  },
  {
    id: "domain_art",
    text: "예술·디자인·콘텐츠 창작 쪽에 마음이 가시나요?",
    predicate: (j) =>
      yes(
        j.domain === "예술/문화" ||
          j.domain === "디자인" ||
          j.domain === "방송/미디어"
      ),
    weight: 1.4,
  },
  {
    id: "domain_edu",
    text: "가르치고 연구하는 교육·학문 분야가 좋으신가요?",
    predicate: (j) => yes(j.domain === "교육/연구"),
    weight: 1.3,
  },
  {
    id: "domain_make",
    text: "제품을 직접 만들거나 기계·설비를 다루는 일에 관심 있으신가요?",
    predicate: (j) =>
      yes(
        j.domain === "제조/생산" ||
          j.domain === "기계/정비" ||
          j.domain === "전기/전자"
      ),
    weight: 1.3,
  },
  {
    id: "domain_service",
    text: "고객을 직접 응대하는 서비스·접객 분야에 매력을 느끼시나요?",
    predicate: (j) =>
      yes(
        j.domain === "서비스/접객" ||
          j.domain === "음식/조리" ||
          j.domain === "미용/뷰티"
      ),
    weight: 1.2,
  },
  {
    id: "domain_finance",
    text: "숫자·돈·자산을 다루는 금융·회계 분야가 끌리시나요?",
    predicate: (j) => yes(j.domain === "금융/보험" || j.domain === "행정/사무"),
    weight: 1.2,
  },
  {
    id: "domain_law",
    text: "법·공공·행정 분야에서 사회 시스템을 다루고 싶으신가요?",
    predicate: (j) => yes(j.domain === "법률/공공"),
    weight: 1.2,
  },
  {
    id: "domain_outdoor_work",
    text: "건설 현장·자연·농림수산처럼 야외에서 직접 움직이는 일이 좋으신가요?",
    predicate: (j) =>
      yes(
        j.domain === "건설/건축" ||
          j.domain === "농림수산" ||
          j.domain === "운송/물류"
      ),
    weight: 1.2,
  },
  {
    id: "domain_safety",
    text: "사람과 사회의 안전을 지키는 일에 사명감을 느끼시나요?",
    predicate: (j) => yes(j.domain === "경비/안전" || j.domain === "사회복지"),
    weight: 1.2,
  },
  {
    id: "domain_sports",
    text: "운동·신체 활동을 직업으로 삼고 싶으신가요?",
    predicate: (j) => yes(j.domain === "스포츠"),
    weight: 1.3,
  },
  {
    id: "domain_lead",
    text: "조직을 이끌고 의사결정을 내리는 리더 역할을 원하시나요?",
    predicate: (j) => yes(j.domain === "관리/리더십"),
    weight: 1.2,
  },
];

export interface Answer {
  questionId: string;
  level: AnswerLevel;
}

/** 성별 제한에 어김나는 직업은 사전 제외 */
export function filterByGender(jobs: Job[], userGender: UserGender): Job[] {
  return jobs.filter((j) => meetsGender(j, userGender));
}

/** 후보 직업의 점수를 계산한다. */
export function scoreJobs(
  jobs: Job[],
  answers: Answer[]
): Array<{ job: Job; score: number }> {
  const qMap = new Map(QUESTIONS.map((q) => [q.id, q]));
  return jobs.map((job) => {
    let score = 0;
    for (const ans of answers) {
      const q = qMap.get(ans.questionId);
      if (!q || ans.level === 0) continue;
      const matches = q.predicate(job);
      const w = q.weight ?? 1;
      score += (matches ? 1 : -1) * ans.level * w;
    }
    return { job, score };
  });
}

/** 다음 질문 선택 — 후보군을 50:50으로 가르는 질문을 우선 */
export function pickNextQuestion(
  candidates: Job[],
  asked: Set<string>
): Question | null {
  const remaining = QUESTIONS.filter((q) => !asked.has(q.id));
  if (remaining.length === 0) return null;
  if (candidates.length === 0) return remaining[0];

  let best: { q: Question; gain: number } | null = null;
  for (const q of remaining) {
    let yesCount = 0;
    for (const j of candidates) {
      if (q.predicate(j)) yesCount++;
    }
    const noCount = candidates.length - yesCount;
    if (yesCount === 0 || noCount === 0) continue;
    const balance = -Math.abs(yesCount - noCount);
    const gain = balance + (q.weight ?? 1) * 0.5;
    if (best === null || gain > best.gain) {
      best = { q, gain };
    }
  }
  return best?.q ?? remaining[0];
}

export interface RecommendStep {
  remainingCount: number;
  topCandidates: Array<{ job: Job; score: number }>;
  /** 학력 충족 직업 (메인 추천) */
  mainCandidates: Array<{ job: Job; score: number }>;
  /** 학력 미달 직업 (서브 추천) */
  subCandidates: Array<{ job: Job; score: number }>;
}

/**
 * 사용자 프로필을 반영해 추천 결과를 생성한다.
 * - 성별 제한에 맞지 않는 직업은 사전 제거
 * - 학력 조건 충족 여부에 따라 메인/서브로 나눈다
 * - 학력 unspecified 인 경우 둘을 합쳐서 반환
 */
export function getRecommendations(
  profile: UserProfile,
  answers: Answer[],
  topN = 5
): RecommendStep {
  const pool = filterByGender(ALL_JOBS, profile.gender);
  const scored = scoreJobs(pool, answers);
  scored.sort((a, b) => b.score - a.score);

  if (profile.education === "unspecified") {
    return {
      remainingCount: scored.length,
      topCandidates: scored.slice(0, topN),
      mainCandidates: scored.slice(0, topN),
      subCandidates: [],
    };
  }

  const main: Array<{ job: Job; score: number }> = [];
  const sub: Array<{ job: Job; score: number }> = [];
  for (const s of scored) {
    if (meetsEducation(s.job, profile.education)) {
      if (main.length < topN) main.push(s);
    } else {
      if (sub.length < topN) sub.push(s);
    }
    if (main.length >= topN && sub.length >= topN) break;
  }
  return {
    remainingCount: scored.length,
    topCandidates: main.length ? main : sub,
    mainCandidates: main,
    subCandidates: sub,
  };
}

/**
 * 현재 후보군 (다음 질문 선택용) — 학력은 필터링하지 않음
 * 답변이 쌓일수록 상위 N개로 후보를 점진적으로 줄여 종료 조건이 발동하도록 한다.
 */
export function currentCandidates(
  profile: UserProfile,
  answers: Answer[]
): Job[] {
  const pool = filterByGender(ALL_JOBS, profile.gender);
  const scored = scoreJobs(pool, answers);
  scored.sort((a, b) => b.score - a.score);

  const n = answers.length;

  // 답변 수에 따라 상위 N개로 점진적 좀힌
  // 0-2개: 전체 풀 유지
  // 3개: 상위 150개
  // 5개: 상위 60개
  // 8개: 상위 20개
  // 12개: 상위 8개
  // 15개+: 상위 5개
  let limit: number;
  if (n < 3) {
    limit = scored.length;
  } else if (n < 5) {
    limit = 150;
  } else if (n < 8) {
    limit = 60;
  } else if (n < 12) {
    limit = 20;
  } else if (n < 15) {
    limit = 8;
  } else {
    limit = CANDIDATE_THRESHOLD;
  }

  return scored.slice(0, limit).map((s) => s.job);
}

export const ANSWER_OPTIONS: Array<{ label: string; level: AnswerLevel }> = [
  { label: "매우 그렇다", level: 2 },
  { label: "그렇다", level: 1 },
  { label: "잘 모르겠다", level: 0 },
  { label: "아니다", level: -1 },
  { label: "전혀 아니다", level: -2 },
];

/** 후보가 이 수 이하로 좁혀지면 질문을 조기 종료한다 */
export const CANDIDATE_THRESHOLD = 5;
/** 최소 질문 수 — 이 수 이상 답해야 조기 종료 조건이 발동한다 */
export const MIN_QUESTIONS = 5;

export const GENDER_OPTIONS: Array<{ value: UserGender; label: string }> = [
  { value: "male", label: "남성" },
  { value: "female", label: "여성" },
  { value: "unspecified", label: "응답 안함" },
];

export const EDUCATION_OPTIONS: Array<{
  value: UserEducation;
  label: string;
}> = [
  { value: "중졸이하", label: "중졸 이하" },
  { value: "고졸", label: "고졸" },
  { value: "전문대졸", label: "전문대졸" },
  { value: "대졸", label: "대졸" },
  { value: "석사", label: "석사" },
  { value: "박사", label: "박사" },
  { value: "unspecified", label: "응답 안함" },
];
