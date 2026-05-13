/**
 * 추천 엔진
 * - 사용자가 답한 답변을 사용해 직업 후보를 점진적으로 좁혀나간다.
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
  /** 사용자가 보유한 자격증 목록 (선택) */
  certifications?: string[];
  /** 사용자가 구사하는 언어 목록 (선택) */
  languages?: string[];
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
    entry_difficulty?: string;
    competition_level?: string;
    experience_required?: string;
  };
  traits: string[];
  short_desc: string;
  /** 직업 썸네일 일러스트의 상대 경로 (예: "/jobs/1.webp"). UI에서 import.meta.env.BASE_URL을 prefix로 결합한다. */
  image?: string;
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
 * 각 질문은 predicate로 긍정 방향을 정의하고, 필요하면 score로 보통/혼합/부분일치 값을 보정한다.
 */
export interface Question {
  id: string;
  text: string;
  kind?: "core" | "domain" | "detail" | "condition";
  group?: string;
  targetDomains?: string[];
  minAnswers?: number;
  predicate: (job: Job) => boolean;
  weight?: number;
  score?: (job: Job) => number;
  mismatchPenalty?: number;
}

const yes = (b: boolean) => b;

const jobText = (j: Job) =>
  [
    j.name,
    j.category,
    j.domain,
    j.short_desc,
    j.description,
    ...(j.traits ?? []),
  ]
    .filter(Boolean)
    .join(" ");

const jobMatches = (j: Job, pattern: RegExp) => pattern.test(jobText(j));
const jobTitleText = (j: Job) => [j.name, j.category, j.domain].join(" ");
const jobTitleMatches = (j: Job, pattern: RegExp) =>
  pattern.test(jobTitleText(j));

const levelScore = (
  value: string | undefined,
  positive: string,
  negative: string
) => {
  if (value === positive) return 1;
  if (value === negative) return -1;
  return 0;
};

const oneOfScore = (
  value: string | undefined,
  positive: string[],
  negative: string[],
  neutralScore = 0
) => {
  if (value && positive.includes(value)) return 1;
  if (value && negative.includes(value)) return -1;
  return neutralScore;
};

const softenGenericItAffinity = (job: Job, score: number) =>
  job.domain === "IT/소프트웨어" && score > 0 ? score * 0.55 : score;

export const QUESTIONS: Question[] = [
  // ── 양방향 축 질문 (긍정 → 실내/높음, 부정 → 실외/낮음) ──
  {
    id: "work_env",
    text: "주로 실내에서 일하는 환경을 선호하시나요?",
    predicate: (j) => yes(j.tags.work_environment === "실내중심"),
    score: (j) => levelScore(j.tags.work_environment, "실내중심", "실외중심"),
    weight: 1.2,
  },
  {
    id: "people_interaction",
    text: "사람들과 자주 소통하고 어울리는 업무를 선호하시나요?",
    predicate: (j) => yes(j.tags.people_interaction === "높음"),
    score: (j) => levelScore(j.tags.people_interaction, "높음", "낮음"),
    weight: 1.3,
  },
  {
    id: "tech_usage",
    text: "컴퓨터·디지털 도구를 적극 활용하는 업무를 선호하시나요?",
    predicate: (j) => yes(j.tags.tech_intensity === "높음"),
    score: (j) => levelScore(j.tags.tech_intensity, "높음", "낮음"),
    weight: 1.0,
  },
  {
    id: "physical_demand",
    text: "체력을 많이 쓰는 활동적인 업무를 선호하시나요?",
    predicate: (j) => yes(j.tags.physical_intensity === "높음"),
    score: (j) => levelScore(j.tags.physical_intensity, "높음", "낮음"),
    weight: 1.0,
  },
  // ── 단독 특성 질문 ──
  {
    id: "creative",
    text: "창의적인 아이디어로 무언가를 만들어내는 과정에 흥미가 있으신가요?",
    predicate: (j) => yes(j.tags.creativity_level === "높음"),
    score: (j) => levelScore(j.tags.creativity_level, "높음", "낮음"),
    weight: 1.3,
  },
  {
    id: "analytical",
    text: "데이터·논리를 분석해서 문제를 푸는 과정에 흥미가 있으신가요?",
    predicate: (j) => yes(j.tags.analytical_level === "높음"),
    score: (j) => levelScore(j.tags.analytical_level, "높음", "낮음"),
    weight: 1.3,
  },
  {
    id: "license",
    text: "자격증·면허가 필요한 전문 직업을 선호하시나요?",
    predicate: (j) => yes(j.tags.license_required === true),
    weight: 1.0,
  },
  {
    id: "income_high",
    text: "소득이 높은 편의 직업을 우선적으로 고려하시나요?",
    predicate: (j) =>
      yes(j.tags.income_level === "높음" || j.tags.income_level === "매우높음"),
    score: (j) =>
      oneOfScore(j.tags.income_level, ["높음", "매우높음"], ["낮음"]),
    weight: 1.1,
  },
  {
    id: "risk_low",
    text: "위험이 적고 안전한 근무 환경을 선호하시나요?",
    predicate: (j) => yes(j.tags.risk_level === "낮음"),
    score: (j) => levelScore(j.tags.risk_level, "낮음", "높음"),
    weight: 0.9,
  },
  // ── 새로 추가된 근무 조건 질문 ──
  {
    id: "remote_work",
    text: "재택·원격 근무가 가능한 직업을 선호하시나요?",
    predicate: (j) =>
      yes(j.tags.remote_work === "가능" || j.tags.remote_work === "부분가능"),
    score: (j) =>
      softenGenericItAffinity(
        j,
        j.tags.remote_work === "가능"
          ? 1
          : j.tags.remote_work === "부분가능"
            ? 0.5
            : -1
      ),
    weight: 1.2,
  },
  {
    id: "work_schedule_regular",
    text: "교대나 불규칙 근무보다 일정한 근무 패턴을 선호하시나요?",
    predicate: (j) => yes(j.tags.work_schedule === "정규직"),
    score: (j) =>
      oneOfScore(j.tags.work_schedule, ["정규직"], ["교대근무", "불규칙"]),
    weight: 1.1,
  },
  {
    id: "employment_stable",
    text: "정규직처럼 고용이 안정적인 형태를 선호하시나요?",
    predicate: (j) => yes(j.tags.employment_type === "정규직"),
    score: (j) =>
      oneOfScore(
        j.tags.employment_type,
        ["정규직"],
        ["계약직", "프리랜서", "자영업"]
      ),
    weight: 1.1,
  },
  // ── 새로 추가된 성장/커리어 질문 ──
  {
    id: "growth_potential",
    text: "앞으로 성장 가능성이 높은 직업을 선호하시나요?",
    predicate: (j) => yes(j.tags.growth_potential === "높음"),
    score: (j) =>
      softenGenericItAffinity(
        j,
        levelScore(j.tags.growth_potential, "높음", "낮음")
      ),
    weight: 1.2,
  },
  {
    id: "job_stability",
    text: "직업 안정성을 가장 중요하게 생각하시나요?",
    predicate: (j) => yes(j.tags.job_stability === "높음"),
    score: (j) =>
      softenGenericItAffinity(
        j,
        levelScore(j.tags.job_stability, "높음", "낮음")
      ),
    weight: 1.2,
  },
  {
    id: "automation_risk_low",
    text: "AI·자동화로 대체되기 어려운 직업을 선호하시나요?",
    predicate: (j) => yes(j.tags.automation_risk === "낮음"),
    score: (j) => levelScore(j.tags.automation_risk, "낮음", "높음"),
    weight: 1.1,
  },
  // ── 새로 추가된 업무 성격 질문 ──
  {
    id: "work_autonomy",
    text: "스스로 계획하고 자율적으로 일하는 방식을 선호하시나요?",
    predicate: (j) => yes(j.tags.work_autonomy === "높음"),
    score: (j) =>
      softenGenericItAffinity(
        j,
        levelScore(j.tags.work_autonomy, "높음", "낮음")
      ),
    weight: 1.2,
  },
  {
    id: "solo_work",
    text: "혼자 집중해서 일하는 방식을 더 선호하시나요?",
    predicate: (j) => yes(j.tags.teamwork_level === "개인중심"),
    score: (j) => levelScore(j.tags.teamwork_level, "개인중심", "팀중심"),
    weight: 1.2,
  },
  {
    id: "communication_high",
    text: "말하거나 글 쓰는 커뮤니케이션이 많은 업무를 선호하시나요?",
    predicate: (j) => yes(j.tags.communication_level === "높음"),
    score: (j) => levelScore(j.tags.communication_level, "높음", "낮음"),
    weight: 1.0,
  },
  {
    id: "repetition_low",
    text: "매일 다양하고 새로운 업무를 하는 것을 선호하시나요?",
    predicate: (j) => yes(j.tags.repetition_level === "낮음"),
    score: (j) => levelScore(j.tags.repetition_level, "낮음", "높음"),
    weight: 1.0,
  },
  // ── 새로 추가된 사회적 가치 질문 ──
  {
    id: "social_impact",
    text: "사회에 긍정적인 영향을 미치는 직업을 중요하게 생각하시나요?",
    predicate: (j) => yes(j.tags.social_impact === "높음"),
    score: (j) => levelScore(j.tags.social_impact, "높음", "낮음"),
    weight: 1.1,
  },
  {
    id: "public_sector",
    text: "공공기관·공무원처럼 공공 분야에서 일하고 싶으신가요?",
    predicate: (j) => yes(j.tags.public_sector === "공공"),
    score: (j) => levelScore(j.tags.public_sector, "공공", "민간"),
    weight: 1.2,
  },
  // 도메인 그룹
  {
    id: "domain_it",
    text: "IT·소프트웨어·데이터 분야에 흥미가 있으신가요?",
    predicate: (j) => yes(j.domain === "IT/소프트웨어"),
    weight: 1.5,
  },
  {
    id: "domain_health",
    text: "사람의 건강을 돌보거나 치료하는 분야에 관심이 있으신가요?",
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
    text: "가르치고 연구하는 교육·학문 분야에 관심이 있으신가요?",
    predicate: (j) => yes(j.domain === "교육/연구"),
    weight: 1.3,
  },
  {
    id: "domain_make",
    text: "제품을 직접 만들거나 기계·설비를 다루는 분야에 관심이 있으신가요?",
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
    text: "고객을 직접 응대하는 서비스·접객 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        j.domain === "서비스/접객" ||
          j.domain === "음식/조리" ||
          j.domain === "미용/뷰티"
      ),
    weight: 1.2,
  },
  {
    id: "domain_sales",
    text: "상품이나 서비스를 제안하고 설득하는 영업·판매 분야에 관심이 있으신가요?",
    predicate: (j) => yes(j.domain === "영업/판매"),
    weight: 1.25,
  },
  {
    id: "domain_finance",
    text: "숫자·돈·자산을 다루는 금융·회계 분야에 관심이 있으신가요?",
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
    text: "건설 현장·자연·농림수산처럼 야외에서 활동하는 업무를 선호하시나요?",
    predicate: (j) =>
      yes(
        j.domain === "건설/건축" ||
          j.domain === "농림수산" ||
          j.domain === "운송/물류"
      ),
    weight: 1.2,
  },
  {
    id: "domain_environment_chem",
    text: "환경·화학·에너지 분야의 분석·처리 업무에 관심이 있으신가요?",
    predicate: (j) => yes(j.domain === "화학/환경"),
    weight: 1.25,
  },
  {
    id: "domain_safety",
    text: "사람과 사회의 안전을 지키는 분야에 관심이 있으신가요?",
    predicate: (j) => yes(j.domain === "경비/안전" || j.domain === "사회복지"),
    weight: 1.2,
  },
  {
    id: "domain_sports",
    text: "운동·신체 활동 중심의 직업에 관심이 있으신가요?",
    predicate: (j) => yes(j.domain === "스포츠"),
    weight: 1.3,
  },
  {
    id: "domain_lead",
    text: "조직을 이끌고 의사결정을 내리는 역할에 관심이 있으신가요?",
    predicate: (j) => yes(j.domain === "관리/리더십"),
    weight: 1.2,
  },
  // 도메인 안에서 서로 비슷하게 묶이는 직업군을 다시 나누는 세부 질문
  {
    id: "it_product_building",
    text: "웹·앱·게임처럼 사용자가 직접 쓰는 소프트웨어를 만드는 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        j.domain === "IT/소프트웨어" &&
          jobTitleMatches(
            j,
            /웹|앱|모바일|게임|응용소프트웨어|프로그래머|개발자/
          )
      ),
    weight: 1.25,
  },
  {
    id: "it_infrastructure_system",
    text: "네트워크·서버·시스템처럼 보이지 않는 기술 기반 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        j.domain === "IT/소프트웨어" &&
          jobTitleMatches(j, /네트워크|통신|시스템|서버|하드웨어|정보보안|보안/)
      ),
    weight: 1.2,
  },
  {
    id: "data_analysis_focus",
    text: "숫자와 데이터를 깊게 분석해 의사결정에 활용하는 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(jobMatches(j, /데이터|빅데이터|통계|수학|분석가|시장조사|리서치/)),
    weight: 1.2,
  },
  {
    id: "hr_people_ops",
    text: "채용·평가·보상·교육처럼 사람과 조직을 관리하는 업무에 관심이 있으신가요?",
    predicate: (j) =>
      yes(jobTitleMatches(j, /인적자원|인사|교육|훈련|노무/)),
    weight: 1.25,
  },
  {
    id: "electrical_component_production",
    text: "전기·전자 부품이나 반도체처럼 작은 부품을 생산·조립하는 일에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        j.domain === "전기/전자" &&
          jobMatches(
            j,
            /전기부품|전자부품|전기·전자부품|반도체|전자제품.*부품|전기기기.*제품|전자제품 및 부품/
          )
      ),
    weight: 1.2,
  },
  {
    id: "electrical_install_repair_device",
    text: "가전·사무기기·통신장비를 설치하고 고치는 현장 업무에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        j.domain === "전기/전자" &&
          jobMatches(
            j,
            /사무용 전자기기|가전제품|통신장비설치|케이블 설치|설치·수리/
          )
      ),
    weight: 1.2,
  },
  {
    id: "electrical_power_safety_supervision",
    text: "전기안전·감리처럼 설비가 기준대로 시공되고 안전한지 점검하는 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        j.domain === "전기/전자" &&
          jobMatches(j, /전기감리|전기안전|감리|안전/)
      ),
    weight: 1.2,
  },
  {
    id: "electrical_power_grid_operation",
    text: "발전·배전처럼 전기를 생산하고 공급하는 설비 운영 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(j.domain === "전기/전자" && jobMatches(j, /발전|배전|전력|전기설비/)),
    weight: 1.15,
  },
  {
    id: "health_surgery_treatment",
    text: "진단뿐 아니라 수술·시술·검사처럼 직접 처치하는 의료 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        j.domain === "의료/보건" &&
          jobTitleMatches(
            j,
            /외과|성형|산부인과|안과|치과|수술|시술|검사|임상병리|방사선|치과기공/
          )
      ),
    weight: 1.25,
  },
  {
    id: "health_counseling_rehab",
    text: "상담·재활·심리·언어처럼 사람의 회복을 꾸준히 돕는 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        j.domain === "의료/보건" &&
          jobTitleMatches(j, /상담|심리|재활|치료|언어|청능|작업치료|물리치료/)
      ),
    weight: 1.2,
  },
  {
    id: "agriculture_plant",
    text: "식물·작물·조경처럼 자라는 대상을 돌보고 관리하는 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        (j.domain === "농림수산" || j.domain === "화학/환경") &&
          jobTitleMatches(
            j,
            /곡식|채소|과수|원예|조경|작물|식물|산림|임학|농학/
          )
      ),
    weight: 1.2,
  },
  {
    id: "animal_care",
    text: "동물의 건강이나 사육 환경을 돌보는 분야에 관심이 있으신가요?",
    predicate: (j) => yes(jobTitleMatches(j, /동물|수의|가축|축산|낙농|사육/)),
    weight: 1.2,
  },
  {
    id: "marine_fishery",
    text: "바다·수산·양식처럼 물과 해양 생물을 다루는 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(jobTitleMatches(j, /수산|양식|어부|해녀|해양|어업|어패류/)),
    weight: 1.2,
  },
  {
    id: "manufacturing_food",
    text: "식품·음료를 가공하거나 생산하는 제조 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        j.domain === "제조/생산" &&
          jobTitleMatches(
            j,
            /식품|음료|육류|어패류|낙농품|제분|도정|곡물|과실|채소|정육|도축/
          )
      ),
    weight: 1.25,
  },
  {
    id: "manufacturing_textile_fashion",
    text: "섬유·의류·신발처럼 소재를 재단하고 만드는 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        j.domain === "제조/생산" &&
          jobTitleMatches(
            j,
            /섬유|직조|편직|염색|의류|재봉|제화|신발|가죽|패턴/
          )
      ),
    weight: 1.2,
  },
  {
    id: "manufacturing_metal_machine",
    text: "금속·기계 부품을 가공하거나 조립하는 제조 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        (j.domain === "제조/생산" || j.domain === "기계/정비") &&
          jobTitleMatches(
            j,
            /금속|금형|판금|제관|단조|주조|용접|도금|조립|공작/
          )
      ),
    weight: 1.2,
  },
  {
    id: "manufacturing_metal_plate_welding",
    text: "금속판을 자르고 붙여 용기·관·구조물을 만드는 작업에 관심이 있으신가요?",
    predicate: (j) =>
      yes(j.domain === "제조/생산" && jobTitleMatches(j, /제관|판금|용접/)),
    weight: 1.15,
  },
  {
    id: "manufacturing_metal_cast_forge",
    text: "금속을 녹이거나 두드려 주조·단조품을 만드는 공정에 관심이 있으신가요?",
    predicate: (j) =>
      yes(j.domain === "제조/생산" && jobTitleMatches(j, /주조|단조/)),
    weight: 1.15,
  },
  {
    id: "manufacturing_metal_forging",
    text: "금속을 두드리거나 압력을 가해 단조품을 만드는 공정에 관심이 있으신가요?",
    predicate: (j) =>
      yes(j.domain === "제조/생산" && jobTitleMatches(j, /단조/)),
    weight: 1.1,
  },
  {
    id: "manufacturing_metal_casting",
    text: "금속을 녹여 틀에 부어 주조품을 만드는 공정에 관심이 있으신가요?",
    predicate: (j) =>
      yes(j.domain === "제조/생산" && jobTitleMatches(j, /주조/)),
    weight: 1.1,
  },
  {
    id: "manufacturing_metal_surface_finish",
    text: "도금·분무처럼 금속 표면을 처리하고 마감하는 공정에 관심이 있으신가요?",
    predicate: (j) =>
      yes(j.domain === "제조/생산" && jobTitleMatches(j, /도금|금속분무/)),
    weight: 1.15,
  },
  {
    id: "manufacturing_chemical_material",
    text: "고무·플라스틱·화학 소재를 설비로 생산하는 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        (j.domain === "제조/생산" || j.domain === "화학/환경") &&
          jobTitleMatches(
            j,
            /고무|플라스틱|타이어|화학|석유|가스|도료|농약|소각|재활용/
          )
      ),
    weight: 1.2,
  },
  {
    id: "construction_structure",
    text: "건물의 뼈대와 구조물을 직접 세우는 현장 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        j.domain === "건설/건축" &&
          jobTitleMatches(
            j,
            /철근|콘크리트|강구조|조적|목공|석공|전통건축|건립/
          )
      ),
    weight: 1.2,
  },
  {
    id: "construction_finish_install",
    text: "마감·설치·보수처럼 공간을 완성하는 건축 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        j.domain === "건설/건축" &&
          jobTitleMatches(
            j,
            /미장|방수|도장|단열|유리|배관|섀시|타일|인테리어|보수|설치/
          )
      ),
    weight: 1.2,
  },
  {
    id: "construction_wall_surface_finish",
    text: "미장·방수처럼 벽과 바닥의 표면을 바르고 보강하는 작업에 관심이 있으신가요?",
    predicate: (j) =>
      yes(j.domain === "건설/건축" && jobTitleMatches(j, /미장|방수/)),
    weight: 1.15,
  },
  {
    id: "construction_plastering",
    text: "벽이나 바닥에 모르타르를 발라 표면을 고르게 마감하는 작업에 관심이 있으신가요?",
    predicate: (j) =>
      yes(j.domain === "건설/건축" && jobTitleMatches(j, /미장/)),
    weight: 1.1,
  },
  {
    id: "construction_waterproofing",
    text: "물이 새지 않도록 건물 표면을 방수 처리하는 작업에 관심이 있으신가요?",
    predicate: (j) =>
      yes(j.domain === "건설/건축" && jobTitleMatches(j, /방수/)),
    weight: 1.1,
  },
  {
    id: "construction_glass_window_install",
    text: "유리·창호처럼 건물 개구부를 설치하고 마감하는 작업에 관심이 있으신가요?",
    predicate: (j) =>
      yes(j.domain === "건설/건축" && jobTitleMatches(j, /유리|창호|섀시/)),
    weight: 1.15,
  },
  {
    id: "construction_insulation",
    text: "건물의 열 손실을 줄이기 위해 단열재를 시공하는 작업에 관심이 있으신가요?",
    predicate: (j) =>
      yes(j.domain === "건설/건축" && jobTitleMatches(j, /단열/)),
    weight: 1.1,
  },
  {
    id: "construction_painting",
    text: "건물 표면에 색과 보호 기능을 입히는 도장 작업에 관심이 있으신가요?",
    predicate: (j) =>
      yes(j.domain === "건설/건축" && jobTitleMatches(j, /도장/)),
    weight: 1.1,
  },
  {
    id: "transport_driving_equipment",
    text: "차량·열차·선박·장비를 직접 운전하거나 조작하는 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        (j.domain === "운송/물류" || j.domain === "건설/건축") &&
          jobTitleMatches(
            j,
            /운전|기관사|조종|선장|항해|크레인|호이스트|지게차|굴착|기계운전/
          )
      ),
    weight: 1.2,
  },
  {
    id: "beauty_hair_nail",
    text: "헤어·네일처럼 손기술로 외형을 다듬는 미용 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        j.domain === "미용/뷰티" &&
          jobMatches(j, /미용사|네일|손톱|발톱|모발|헤어/)
      ),
    weight: 1.15,
  },
  {
    id: "beauty_makeup_stage",
    text: "메이크업·분장처럼 얼굴 이미지나 캐릭터를 연출하는 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        j.domain === "미용/뷰티" && jobMatches(j, /메이크업|분장|화장/)
      ),
    weight: 1.15,
  },
  {
    id: "design_digital_ui",
    text: "웹사이트·앱 화면처럼 디지털 UI를 디자인하는 일에 관심이 있으신가요?",
    predicate: (j) =>
      yes(j.domain === "디자인" && jobMatches(j, /웹디자이너|웹사이트|UI|UX|앱/)),
    weight: 1.15,
  },
  {
    id: "design_game_graphic",
    text: "게임 캐릭터·배경처럼 콘텐츠 그래픽을 만드는 일에 관심이 있으신가요?",
    predicate: (j) =>
      yes(j.domain === "디자인" && jobMatches(j, /게임그래픽|게임 캐릭터|게임|캐릭터|배경/)),
    weight: 1.15,
  },
  {
    id: "research_human_society",
    text: "교육·심리·사회처럼 사람과 사회 현상을 연구하는 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        j.domain === "교육/연구" &&
          jobMatches(j, /교육학|심리학|사회학|언어학|정치학|경제학|인문|사회/)
      ),
    weight: 1.15,
  },
  {
    id: "research_education_system",
    text: "교육 제도와 학습 방법을 연구하는 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(j.domain === "교육/연구" && jobTitleMatches(j, /교육학/)),
    weight: 1.15,
  },
  {
    id: "research_politics_policy",
    text: "정치 제도와 공공 정책을 분석하는 연구 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(j.domain === "교육/연구" && jobTitleMatches(j, /정치학/)),
    weight: 1.15,
  },
  {
    id: "research_social_structure",
    text: "사회 구조와 집단 행동을 분석하는 연구 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(j.domain === "교육/연구" && jobTitleMatches(j, /사회학/)),
    weight: 1.15,
  },
  {
    id: "research_natural_life",
    text: "물리·생명·농림수산처럼 자연 현상을 연구하는 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        j.domain === "교육/연구" &&
          jobMatches(j, /물리|화학|생명|농학|수산학|임학|산림|자연과학|생물/)
      ),
    weight: 1.15,
  },
  {
    id: "management_business_support_marketing",
    text: "본사 경영지원·마케팅처럼 조직 내부 운영을 관리하는 역할에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        j.category === "관리직" &&
          jobMatches(j, /경영지원|마케팅|광고|홍보/)
      ),
    weight: 1.15,
  },
  {
    id: "management_field_operation",
    text: "호텔·여행처럼 고객 경험이 중요한 현장 사업장을 운영하는 역할에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        j.category === "관리직" &&
          jobMatches(j, /호텔|여행/)
      ),
    weight: 1.15,
  },
  {
    id: "management_industrial_facility",
    text: "전기·가스·수도·생산시설처럼 산업 인프라를 운영하는 관리 역할에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        j.category === "관리직" &&
          jobMatches(j, /전기|가스|수도|건설|채굴|운송|생산|품질|제조|시설/)
      ),
    weight: 1.15,
  },
  {
    id: "management_food_service",
    text: "음식점 운영과 직원 관리를 함께 맡는 역할에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        j.category === "관리직" &&
          jobMatches(j, /음식서비스|음식점|식당/)
      ),
    weight: 1.15,
  },
  {
    id: "sales_face_to_face",
    text: "매장이나 현장에서 고객을 직접 만나 판매하는 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        j.domain === "영업/판매" &&
          jobTitleMatches(
            j,
            /판매원|방문판매|주유원|노점|이동판매|상점|매장|자동차영업/
          )
      ),
    weight: 1.15,
  },
  {
    id: "sales_b2b_consulting",
    text: "전문 지식을 바탕으로 기업 고객이나 큰 거래를 설득하는 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        j.domain === "영업/판매" &&
          jobTitleMatches(
            j,
            /기술영업|해외영업|상품중개|경매|부동산|광고영업|영업관리/
          )
      ),
    weight: 1.15,
  },
  {
    id: "environment_field_cleanup",
    text: "현장에서 환경을 정비하거나 오염·폐기물을 처리하는 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        j.domain === "화학/환경" &&
          jobTitleMatches(
            j,
            /환경미화|재활용|방역|상·하수도|소각|폐기물|처리장치/
          )
      ),
    weight: 1.15,
  },
  {
    id: "environment_research_engineering",
    text: "환경·화학 문제를 연구하고 공학적으로 해결하는 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        j.domain === "화학/환경" &&
          jobTitleMatches(
            j,
            /연구원|기술자|공학|시험원|분석|대기환경|수질|토양|에너지/
          )
      ),
    weight: 1.15,
  },
  {
    id: "it_web_mobile_game",
    text: "웹사이트·모바일앱·게임처럼 화면이 있는 서비스를 만드는 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        j.domain === "IT/소프트웨어" && jobTitleMatches(j, /웹|모바일|앱|게임/)
      ),
    weight: 1.2,
  },
  {
    id: "it_system_analysis",
    text: "업무 시스템을 분석하고 설계하는 역할에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        j.domain === "IT/소프트웨어" &&
          jobTitleMatches(j, /시스템.*분석|시스템설계|시스템소프트웨어/)
      ),
    weight: 1.15,
  },
  {
    id: "doctor_general_care",
    text: "내과처럼 성인 질환을 진단하고 장기적으로 관리하는 진료에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        j.domain === "의료/보건" &&
          jobTitleMatches(j, /내과/)
      ),
    weight: 1.15,
  },
  {
    id: "doctor_child_family_care",
    text: "소아·청소년이나 가족 단위의 건강을 지속적으로 돌보는 진료에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        j.domain === "의료/보건" &&
          jobTitleMatches(j, /소아과|가정의학/)
      ),
    weight: 1.15,
  },
  {
    id: "doctor_pediatric_care",
    text: "소아·청소년 환자를 중심으로 진료하는 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(j.domain === "의료/보건" && jobTitleMatches(j, /소아과/)),
    weight: 1.1,
  },
  {
    id: "doctor_family_medicine",
    text: "환자와 가족의 전반적인 건강을 폭넓게 관리하는 진료에 관심이 있으신가요?",
    predicate: (j) =>
      yes(j.domain === "의료/보건" && jobTitleMatches(j, /가정의학/)),
    weight: 1.1,
  },
  {
    id: "doctor_body_system_care",
    text: "귀·코·목이나 비뇨기처럼 특정 신체 기관을 전문적으로 진료하는 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        j.domain === "의료/보건" &&
          jobTitleMatches(j, /이비인후과|비뇨기과/)
      ),
    weight: 1.15,
  },
  {
    id: "doctor_ent_care",
    text: "귀·코·목 질환을 전문적으로 진료하는 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(j.domain === "의료/보건" && jobTitleMatches(j, /이비인후과/)),
    weight: 1.1,
  },
  {
    id: "doctor_urology_care",
    text: "비뇨기계 질환을 전문적으로 진료하는 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(j.domain === "의료/보건" && jobTitleMatches(j, /비뇨기과/)),
    weight: 1.1,
  },
  {
    id: "doctor_general_practice",
    text: "특정 전문과보다 다양한 질환을 폭넓게 진료하는 역할에 관심이 있으신가요?",
    predicate: (j) =>
      yes(j.domain === "의료/보건" && jobTitleMatches(j, /일반의사/)),
    weight: 1.15,
  },
  {
    id: "doctor_mental_health",
    text: "마음 건강과 정신적 어려움을 다루는 진료 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        j.domain === "의료/보건" && jobTitleMatches(j, /정신과|심리|정신건강/)
      ),
    weight: 1.15,
  },
  {
    id: "crop_farming",
    text: "곡식·채소·과수처럼 먹거리 작물을 재배하는 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(j.domain === "농림수산" && jobTitleMatches(j, /곡식|채소|과수|작물/)),
    weight: 1.15,
  },
  {
    id: "landscape_gardening",
    text: "정원·조경·산림처럼 공간과 녹지를 가꾸는 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(j.domain === "농림수산" && jobTitleMatches(j, /원예|조경|산림|임학/)),
    weight: 1.15,
  },
  {
    id: "manufacturing_ceramic_mineral",
    text: "유리·점토·시멘트·석재 같은 광물성 소재를 다루는 제조 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        j.domain === "제조/생산" &&
          jobTitleMatches(j, /유리|점토|시멘트|광물|석제품/)
      ),
    weight: 1.15,
  },
  {
    id: "manufacturing_paper_printing",
    text: "종이·인쇄·목재처럼 생활 소재를 가공하는 제조 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        j.domain === "제조/생산" &&
          jobTitleMatches(j, /인쇄|펄프|종이|목재|가구/)
      ),
    weight: 1.15,
  },
  {
    id: "manufacturing_vehicle_assembly",
    text: "자동차나 대형 제품을 조립하는 생산 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        j.domain === "제조/생산" && jobTitleMatches(j, /자동차|조립원|가구조립/)
      ),
    weight: 1.15,
  },
  {
    id: "facility_equipment_maintenance",
    text: "냉난방·보일러·승강기 같은 설비를 설치하고 정비하는 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        (j.domain === "기계/정비" || j.domain === "전기/전자") &&
          jobTitleMatches(j, /냉동|냉장|공조|보일러|승강기|설비/)
      ),
    weight: 1.15,
  },
  {
    id: "machine_construction_mining_maintenance",
    text: "건설·광업 현장에서 쓰는 중장비를 설치하고 정비하는 일에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        j.domain === "기계/정비" &&
          jobTitleMatches(j, /건설·광업기계|건설.*기계|광업.*기계/)
      ),
    weight: 1.15,
  },
  {
    id: "machine_agriculture_maintenance",
    text: "농업용 기계와 기타 작업 장비를 정비하는 일에 관심이 있으신가요?",
    predicate: (j) =>
      yes(j.domain === "기계/정비" && jobTitleMatches(j, /농업용|기타 기계장비/)),
    weight: 1.15,
  },
  {
    id: "machine_ship_maintenance",
    text: "선박처럼 큰 이동 장비를 정비하는 일에 관심이 있으신가요?",
    predicate: (j) =>
      yes(j.domain === "기계/정비" && jobTitleMatches(j, /선박정비|선박/)),
    weight: 1.15,
  },
  {
    id: "machine_material_handling_maintenance",
    text: "물품을 옮기는 기계 장비를 설치하고 정비하는 일에 관심이 있으신가요?",
    predicate: (j) =>
      yes(j.domain === "기계/정비" && jobTitleMatches(j, /물품이동장비/)),
    weight: 1.1,
  },
  {
    id: "machine_railway_maintenance",
    text: "철도기관차나 전동차를 정비하는 일에 관심이 있으신가요?",
    predicate: (j) =>
      yes(j.domain === "기계/정비" && jobTitleMatches(j, /철도기관차|전동차/)),
    weight: 1.1,
  },
  {
    id: "vehicle_maintenance",
    text: "자동차·선박·철도 같은 이동수단을 정비하는 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        (j.domain === "기계/정비" || j.domain === "운송/물류") &&
          jobTitleMatches(j, /자동차|선박|철도|항공기|전동차|기관차|정비/)
      ),
    weight: 1.15,
  },
  {
    id: "electrical_field_work",
    text: "전기 설비나 배선을 현장에서 설치·보수하는 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        (j.domain === "전기/전자" || j.domain === "건설/건축") &&
          jobTitleMatches(j, /전기공|내선|외선|전기설비|배전|발전/)
      ),
    weight: 1.15,
  },
  {
    id: "transport_logistics_office",
    text: "운송 현장보다 배차·물류·운송 사무를 관리하는 분야에 더 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        j.domain === "운송/물류" && jobTitleMatches(j, /운송사무|물류사무|배차/)
      ),
    weight: 1.15,
  },
  {
    id: "transport_public_route",
    text: "철도·항공·수상처럼 정해진 노선과 승객 이동을 다루는 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        j.domain === "운송/물류" &&
          jobTitleMatches(j, /철도|지하철|항공|수상|버스|택시/)
      ),
    weight: 1.15,
  },
  {
    id: "construction_civil_infra",
    text: "도로·철도·토목처럼 사회 기반시설을 만드는 분야에 관심이 있으신가요?",
    predicate: (j) =>
      yes(
        j.domain === "건설/건축" &&
          jobTitleMatches(j, /토목|철로|도로|측량|교량|터널/)
      ),
    weight: 1.15,
  },
  {
    id: "entry_easy",
    text: "진입 장벽이 낮고 빨리 시작할 수 있는 직업을 선호하시나요?",
    predicate: (j) => yes(j.tags.entry_difficulty === "낮음"),
    score: (j) =>
      oneOfScore(j.tags.entry_difficulty, ["낮음"], ["높음", "매우높음"]),
    weight: 1.3,
  },
  {
    id: "competition_low",
    text: "지원자가 많이 몰리는 경쟁 치열한 직업은 피하고 싶으신가요?",
    predicate: (j) =>
      yes(
        j.tags.competition_level === "낮음" ||
          j.tags.competition_level === "보통"
      ),
    score: (j) =>
      j.tags.competition_level === "낮음"
        ? 1
        : j.tags.competition_level === "보통"
          ? 0.5
          : -1,
    weight: 1.2,
  },
  {
    id: "experience_newbie",
    text: "경력 없이 신입으로도 도전할 수 있는 직업을 선호하시나요?",
    predicate: (j) => yes(j.tags.experience_required === "신입가능"),
    score: (j) =>
      oneOfScore(j.tags.experience_required, ["신입가능"], ["경력필수"]),
    weight: 1.2,
  },
];

function questionKind(q: Question): NonNullable<Question["kind"]> {
  if (q.kind) return q.kind;
  if (q.id.startsWith("domain_")) return "domain";
  if (
    q.id.startsWith("it_") ||
    q.id.startsWith("electrical_") ||
    q.id.startsWith("health_") ||
    q.id.startsWith("doctor_") ||
    q.id.startsWith("agriculture_") ||
    q.id.startsWith("manufacturing_") ||
    q.id.startsWith("construction_") ||
    q.id.startsWith("transport_") ||
    q.id.startsWith("machine_") ||
    q.id.startsWith("beauty_") ||
    q.id.startsWith("design_") ||
    q.id.startsWith("research_") ||
    q.id.startsWith("management_") ||
    q.id.startsWith("sales_") ||
    q.id.startsWith("environment_") ||
    q.id === "animal_care" ||
    q.id === "marine_fishery" ||
    q.id === "crop_farming" ||
    q.id === "landscape_gardening" ||
    q.id === "data_analysis_focus" ||
    q.id === "hr_people_ops" ||
    q.id === "facility_equipment_maintenance" ||
    q.id === "vehicle_maintenance" ||
    q.id === "electrical_field_work"
  ) {
    return "detail";
  }
  if (
    [
      "license",
      "income_high",
      "risk_low",
      "remote_work",
      "work_schedule_regular",
      "employment_stable",
      "growth_potential",
      "job_stability",
      "automation_risk_low",
      "social_impact",
      "public_sector",
      "entry_easy",
      "competition_low",
      "experience_newbie",
    ].includes(q.id)
  ) {
    return "condition";
  }
  return "core";
}

function questionGroup(q: Question): string {
  if (q.group) return q.group;
  if (q.id.startsWith("domain_")) return "domain";
  if (q.id.startsWith("it_") || q.id === "data_analysis_focus") return "it";
  if (q.id.startsWith("electrical_")) return "electrical";
  if (q.id.startsWith("health_") || q.id.startsWith("doctor_")) return "health";
  if (
    q.id.startsWith("agriculture_") ||
    q.id === "animal_care" ||
    q.id === "marine_fishery" ||
    q.id === "crop_farming" ||
    q.id === "landscape_gardening"
  ) {
    return "agriculture";
  }
  if (q.id.startsWith("manufacturing_")) return "manufacturing";
  if (q.id.startsWith("construction_")) return "construction";
  if (q.id.startsWith("transport_")) return "transport";
  if (q.id.startsWith("machine_")) return "maintenance";
  if (q.id.startsWith("beauty_")) return "beauty";
  if (q.id.startsWith("design_")) return "design";
  if (q.id.startsWith("research_")) return "research";
  if (q.id.startsWith("management_")) return "management";
  if (q.id.startsWith("sales_")) return "sales";
  if (q.id.startsWith("environment_")) return "environment";
  if (
    q.id === "facility_equipment_maintenance" ||
    q.id === "vehicle_maintenance" ||
    q.id === "electrical_field_work"
  ) {
    return "maintenance";
  }
  if (
    [
      "remote_work",
      "work_schedule_regular",
      "employment_stable",
      "entry_easy",
      "competition_low",
      "experience_newbie",
    ].includes(q.id)
  ) {
    return "work_condition";
  }
  return q.id;
}

function questionTargetDomains(q: Question): string[] {
  if (q.targetDomains) return q.targetDomains;
  switch (q.id) {
    case "domain_it":
      return ["IT/소프트웨어"];
    case "domain_health":
      return ["의료/보건"];
    case "domain_art":
      return ["예술/문화", "디자인", "방송/미디어"];
    case "domain_edu":
      return ["교육/연구"];
    case "domain_make":
      return ["제조/생산", "기계/정비", "전기/전자"];
    case "domain_service":
      return ["서비스/접객", "음식/조리", "미용/뷰티"];
    case "domain_sales":
      return ["영업/판매"];
    case "domain_finance":
      return ["금융/보험", "행정/사무"];
    case "domain_law":
      return ["법률/공공"];
    case "domain_outdoor_work":
      return ["건설/건축", "농림수산", "운송/물류"];
    case "domain_environment_chem":
      return ["화학/환경"];
    case "domain_safety":
      return ["경비/안전", "사회복지"];
    case "domain_sports":
      return ["스포츠"];
    case "domain_lead":
      return ["관리/리더십"];
  }
  if (q.id.startsWith("it_") || q.id === "data_analysis_focus") {
    return ["IT/소프트웨어", "교육/연구", "금융/보험", "행정/사무"];
  }
  if (q.id === "hr_people_ops") {
    return ["행정/사무", "관리/리더십", "법률/공공"];
  }
  if (q.id.startsWith("electrical_")) {
    return ["전기/전자"];
  }
  if (q.id.startsWith("health_") || q.id.startsWith("doctor_")) {
    return ["의료/보건"];
  }
  if (q.id.startsWith("agriculture_") || q.id === "crop_farming" || q.id === "landscape_gardening") {
    return ["농림수산", "화학/환경"];
  }
  if (q.id === "animal_care") return ["농림수산", "의료/보건"];
  if (q.id === "marine_fishery") return ["농림수산"];
  if (q.id === "manufacturing_chemical_material") {
    return ["제조/생산", "화학/환경"];
  }
  if (q.id.startsWith("manufacturing_")) return ["제조/생산", "기계/정비"];
  if (q.id.startsWith("construction_")) return ["건설/건축"];
  if (q.id.startsWith("transport_")) return ["운송/물류", "건설/건축"];
  if (q.id.startsWith("machine_")) return ["기계/정비"];
  if (q.id.startsWith("beauty_")) return ["미용/뷰티"];
  if (q.id.startsWith("design_")) return ["디자인"];
  if (q.id.startsWith("research_")) return ["교육/연구"];
  if (q.id === "management_business_support_marketing") {
    return ["관리/리더십", "행정/사무"];
  }
  if (q.id === "management_food_service") {
    return ["음식/조리", "서비스/접객", "관리/리더십"];
  }
  if (q.id.startsWith("management_")) {
    return ["관리/리더십", "음식/조리", "서비스/접객", "제조/생산", "전기/전자", "건설/건축", "운송/물류"];
  }
  if (q.id.startsWith("sales_")) return ["영업/판매"];
  if (q.id.startsWith("environment_")) return ["화학/환경"];
  if (q.id === "facility_equipment_maintenance") return ["기계/정비", "전기/전자"];
  if (q.id === "vehicle_maintenance") return ["기계/정비", "운송/물류"];
  if (q.id === "electrical_field_work") return ["전기/전자", "건설/건축"];
  return [];
}

function countTargetDomainJobs(q: Question, candidates: Job[]): number {
  const domains = questionTargetDomains(q);
  if (domains.length === 0) return candidates.length;
  return candidates.filter(j => domains.includes(j.domain)).length;
}

function isQuestionActive(
  q: Question,
  candidates: Job[],
  answeredCount: number,
  strict = true
): boolean {
  const kind = questionKind(q);
  const minAnswers = q.minAnswers ?? (kind === "detail" ? 3 : 0);
  if (strict && answeredCount < minAnswers) return false;

  const targetCount = countTargetDomainJobs(q, candidates);
  if (targetCount === 0) return false;

  if (kind !== "detail") return true;
  if (!strict) return targetCount >= 2;

  const minTargetCount =
    candidates.length <= 20 ? 2 : Math.max(5, Math.ceil(candidates.length * 0.18));
  return targetCount >= minTargetCount;
}

function questionAppliesTo(q: Question, job: Job): boolean {
  if (q.id.startsWith("it_")) return job.domain === "IT/소프트웨어";
  if (q.id.startsWith("electrical_")) return job.domain === "전기/전자";
  if (q.id === "hr_people_ops") {
    return (
      job.domain === "행정/사무" ||
      job.domain === "관리/리더십" ||
      job.domain === "법률/공공"
    );
  }
  if (q.id.startsWith("health_") || q.id.startsWith("doctor_")) {
    return job.domain === "의료/보건";
  }
  if (
    q.id.startsWith("agriculture_") ||
    q.id === "crop_farming" ||
    q.id === "landscape_gardening" ||
    q.id === "marine_fishery"
  ) {
    return job.domain === "농림수산" || job.domain === "화학/환경";
  }
  if (q.id === "animal_care") {
    return job.domain === "농림수산" || job.domain === "의료/보건";
  }
  if (q.id === "manufacturing_chemical_material") {
    return job.domain === "제조/생산" || job.domain === "화학/환경";
  }
  if (q.id.startsWith("manufacturing_")) {
    return job.domain === "제조/생산" || job.domain === "기계/정비";
  }
  if (q.id.startsWith("construction_")) return job.domain === "건설/건축";
  if (q.id.startsWith("transport_")) {
    return job.domain === "운송/물류" || job.domain === "건설/건축";
  }
  if (q.id.startsWith("machine_")) return job.domain === "기계/정비";
  if (q.id.startsWith("beauty_")) return job.domain === "미용/뷰티";
  if (q.id.startsWith("design_")) return job.domain === "디자인";
  if (q.id.startsWith("research_")) return job.domain === "교육/연구";
  if (q.id === "management_business_support_marketing") {
    return (
      job.domain === "관리/리더십" ||
      job.domain === "행정/사무" ||
      job.category === "관리직"
    );
  }
  if (q.id === "management_food_service") {
    return (
      job.domain === "음식/조리" ||
      job.domain === "서비스/접객" ||
      job.category === "관리직"
    );
  }
  if (q.id.startsWith("management_")) {
    return (
      job.domain === "관리/리더십" ||
      job.domain === "음식/조리" ||
      job.domain === "서비스/접객" ||
      job.domain === "제조/생산" ||
      job.domain === "전기/전자" ||
      job.domain === "건설/건축" ||
      job.domain === "운송/물류" ||
      job.category === "관리직"
    );
  }
  if (q.id.startsWith("sales_")) return job.domain === "영업/판매";
  if (q.id.startsWith("environment_")) return job.domain === "화학/환경";
  if (q.id === "facility_equipment_maintenance") {
    return job.domain === "기계/정비" || job.domain === "전기/전자";
  }
  if (q.id === "vehicle_maintenance") {
    return job.domain === "기계/정비" || job.domain === "운송/물류";
  }
  if (q.id === "electrical_field_work") {
    return job.domain === "전기/전자" || job.domain === "건설/건축";
  }
  return true;
}

function questionJobScore(q: Question, job: Job): number {
  if (!questionAppliesTo(q, job)) return 0;
  if (q.score) return q.score(job);
  return q.predicate(job) ? 1 : -(q.mismatchPenalty ?? 1);
}

export interface Answer {
  questionId: string;
  level: AnswerLevel;
}

/** 성별 제한에 어김나는 직업은 사전 제외 */
export function filterByGender(jobs: Job[], userGender: UserGender): Job[] {
  return jobs.filter(j => meetsGender(j, userGender));
}

/** 사용자가 보유한 자격증/언어에 따른 가산점 */
function profileBonus(job: Job, profile?: UserProfile): number {
  if (!profile) return 0;
  let bonus = 0;

  // 1. 자격증 일치: 질문 점수(최대 20~30점)를 압도할 수 있도록 대폭 가산
  if (profile.certifications?.length && job.certifications?.length) {
    const userCerts = new Set(profile.certifications);
    for (const c of job.certifications) {
      if (userCerts.has(c)) {
        // 자격증 1개 매치당 +50점 (무조건 최상위권으로 올림)
        bonus += 50.0;
      }
    }
  }

  // 2. 언어 가산점: 외국어 관련 직업이면 언어당 +30점
  if (profile.languages?.length) {
    const isLanguageJob =
      /통역|번역|외국어|관광|가이드|외교|무역|항공|승무원|호텔|해외영업|국제/.test(
        job.name
      ) ||
      /외교관|비행기객실승무원|여행안내원|관광통역안내원|무역사무원|해외영업원/.test(
        job.name
      );

    if (isLanguageJob) {
      bonus += profile.languages.length * 30.0;
    } else if (profile.languages.length >= 2) {
      // 다국어 구사자는 일반 직업에도 약간의 보너스
      bonus += 2.0;
    }
  }

  return bonus;
}

/** 후보 직업의 점수를 계산한다. */
export function scoreJobs(
  jobs: Job[],
  answers: Answer[],
  profile?: UserProfile
): Array<{ job: Job; score: number }> {
  const qMap = new Map(QUESTIONS.map(q => [q.id, q]));
  return jobs.map(job => {
    let score = 0;
    for (const ans of answers) {
      const q = qMap.get(ans.questionId);
      if (!q || ans.level === 0) continue;
      const w = q.weight ?? 1;
      score += questionJobScore(q, job) * ans.level * w;
    }
    score += profileBonus(job, profile);
    return { job, score };
  });
}

/** 다음 질문 선택 — 후보군을 50:50으로 가르는 질문 중 랜덤으로 선택 */
export function pickNextQuestion(
  candidates: Job[],
  asked: Set<string>,
  askedOrder: string[] = []
): Question | null {
  const remaining = QUESTIONS.filter(q => !asked.has(q.id));
  if (remaining.length === 0) return null;
  if (candidates.length === 0) {
    // 아직 후보가 없으면 난수 질문만쿠다
    return remaining[Math.floor(Math.random() * remaining.length)];
  }

  const activeQuestions = remaining.filter(q =>
    isQuestionActive(q, candidates, asked.size)
  );
  const questionsToScore = activeQuestions.length
    ? activeQuestions
    : remaining.filter(q => isQuestionActive(q, candidates, asked.size, false));
  const lastAsked = askedOrder.length
    ? QUESTIONS.find(q => q.id === askedOrder[askedOrder.length - 1])
    : null;
  const lastGroup = lastAsked ? questionGroup(lastAsked) : null;

  // 각 질문의 변별력 점수(gain) 계산
  const scored: Array<{ q: Question; gain: number }> = [];
  for (const q of questionsToScore) {
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    for (const j of candidates) {
      const score = questionJobScore(q, j);
      if (score > 0) positiveCount++;
      if (score < 0) negativeCount++;
      if (score === 0) neutralCount++;
    }
    const activeCount = positiveCount + negativeCount;
    if (positiveCount === 0 || negativeCount === 0) continue; // 변별력 없는 질문은 제외
    if (activeCount < Math.min(questionKind(q) === "detail" ? 3 : 8, candidates.length)) {
      continue;
    }
    const balance = 1 - Math.abs(positiveCount - negativeCount) / activeCount;
    const coverage = activeCount / candidates.length;
    const neutralPenalty = 1 - (neutralCount / candidates.length) * 0.25;
    const kindBoost =
      questionKind(q) === "core"
        ? 1.12
        : questionKind(q) === "domain"
          ? 1.05
          : questionKind(q) === "detail"
            ? 0.95
            : 1;
    const groupPenalty = lastGroup && questionGroup(q) === lastGroup ? 0.65 : 1;
    const gain =
      (balance * 100 + coverage * 20 + (q.weight ?? 1) * 2) *
      neutralPenalty *
      kindBoost *
      groupPenalty;
    scored.push({ q, gain });
  }

  if (scored.length === 0) return null; // 변별력 있는 질문이 없으면 종료

  // 최고 점수 근처의 질문들 중 랜덤 선택
  scored.sort((a, b) => b.gain - a.gain);
  const bestGain = scored[0].gain;
  const topPool = scored
    .filter(s => s.gain >= bestGain * 0.85)
    .slice(0, 5);
  const picked = topPool[Math.floor(Math.random() * topPool.length)];
  return picked.q;
}

export interface RecommendStep {
  remainingCount: number;
  topCandidates: Array<{ job: Job; score: number }>;
  /** 메인 추천 (학력 충족 + 상위 점수) */
  mainCandidates: Array<{ job: Job; score: number }>;
  /** "도전해볼 만한 직업" - 메인에 들지 않은 속의 점수 상위 직업 중 랜덤 5개 */
  subCandidates: Array<{ job: Job; score: number }>;
}

// 시드 기반 의사난수 (mulberry32) - 공유 링크 재현에 사용
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates 셔플 (시드 선택 가능)
function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 사용자 프로필을 반영해 추천 결과를 생성한다.
 * - 성별 제한에 맞지 않는 직업은 사전 제거
 * - 메인: 학력 충족 + 상위 점수 topN개
 * - 서브 (“도전해볼 만한 직업”): 메인에 들지 않은 속의 상위 30개 풌 중 랜덤 5개
 */
export function getRecommendations(
  profile: UserProfile,
  answers: Answer[],
  topN = 5,
  seed?: number
): RecommendStep {
  // seed 가 주어지면 재현 가능한 PRNG, 아니면 Math.random
  const rng = seed != null ? makeRng(seed) : Math.random;
  const pool = filterByGender(ALL_JOBS, profile.gender);
  const scored = scoreJobs(pool, answers, profile);
  // 점수 내림차순, 동점일 때는 rng 기반으로 순서 섮기
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return rng() - 0.5;
  });

  // 학력 unspecified: 학력 구분 없이 메인은 상위 topN
  // 서브는 topN+1 이하 상위 30개 중 랜덤 topN
  if (profile.education === "unspecified") {
    const main = scored.slice(0, topN);
    const subPool = scored.slice(topN, topN + 30);
    const sub = shuffle(subPool, rng).slice(0, topN);
    return {
      remainingCount: scored.length,
      topCandidates: main,
      mainCandidates: main,
      subCandidates: sub,
    };
  }

  // 학력 지정: 학력 충족 직업만으로 메인 구성
  const eligible = scored.filter(s => meetsEducation(s.job, profile.education));
  const main = eligible.slice(0, topN);

  // 서브 풌: 메인에 알린 id 제외하고, 나머지 (학력 충족 + 미달 포함) 중 상위 30개
  const mainIds = new Set(main.map(m => m.job.id));
  const subPool = scored.filter(s => !mainIds.has(s.job.id)).slice(0, 30);
  const sub = shuffle(subPool, rng).slice(0, topN);

  return {
    remainingCount: scored.length,
    topCandidates: main.length ? main : sub,
    mainCandidates: main,
    subCandidates: sub,
  };
}

/**
 * 현재 후보군 (다음 질문 선택용) — 학력은 필터링하지 않음
 *
 * 답변이 쌓일수록 상위 점수와의 차이가 일정 범위 안에 드는 직업만 후보로 유지한다.
 * • 답변 수가 적을 때: 넓은 범위(상위 60%) → 답변이 쌓일수록 컷오프 상승
 * • 최소 5개 / 최대 300개 보장
 */
export function currentCandidates(
  profile: UserProfile,
  answers: Answer[]
): Job[] {
  const pool = filterByGender(ALL_JOBS, profile.gender);
  // 후보 좁히기 단계에서는 profile 가산점 제외 - 질문 답변 만으로 순수하게 평가
  const scored = scoreJobs(pool, answers);
  scored.sort((a, b) => b.score - a.score);

  if (scored.length === 0) return [];

  const topScore = scored[0].score;
  const n = answers.length;

  // 답변이 없으면 전체 풀 반환
  if (n === 0 || topScore <= 0) {
    return scored.map(s => s.job);
  }

  // 답변 수에 따라 컷오프 비율 상승: 답변 1개=40%, 5개=60%, 10개=75%, 15개+=85%
  const ratio = Math.min(0.4 + n * 0.03, 0.85);
  const cutoff = topScore * ratio;

  const filtered = scored.filter(s => s.score >= cutoff);

  // 최소 5개, 최대 300개 보장
  if (filtered.length < 5) return scored.slice(0, 5).map(s => s.job);
  if (filtered.length > 300) return scored.slice(0, 300).map(s => s.job);
  return filtered.map(s => s.job);
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
export const MIN_QUESTIONS = 7;
/** 최대 질문 수 — 후보가 충분히 좁혀지지 않아도 이 수에 도달하면 결과를 보여준다 */
export const MAX_QUESTIONS = 16;

export const GENDER_OPTIONS: Array<{ value: UserGender; label: string }> = [
  { value: "male", label: "남성" },
  { value: "female", label: "여성" },
  { value: "unspecified", label: "응답 안함" },
];

export const EDUCATION_OPTIONS: Array<{
  value: UserEducation;
  label: string;
}> = [
  { value: "고졸", label: "고졸" },
  { value: "전문대졸", label: "전문대졸" },
  { value: "대졸", label: "대졸" },
  { value: "석사", label: "석사" },
  { value: "박사", label: "박사" },
  { value: "unspecified", label: "응답 안함" },
];
