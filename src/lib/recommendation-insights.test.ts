import { describe, expect, it } from "vitest";
import { explainRecommendation } from "./recommendation-insights";
import { QUESTIONS, type Answer, type Job, type UserProfile } from "./recommend";

const baseJob: Job = {
  id: 999001,
  name: "테스트 분석가",
  category: "테스트",
  domain: "IT/소프트웨어",
  tags: {
    work_environment: "실내중심",
    physical_intensity: "낮음",
    people_interaction: "낮음",
    creativity_level: "보통",
    analytical_level: "높음",
    tech_intensity: "높음",
    education_required: "대졸",
    license_required: false,
    income_level: "높음",
    risk_level: "낮음",
  },
  traits: ["분석적", "꼼꼼함"],
  short_desc: "테스트용 직업",
  description: "데이터를 분석하는 테스트용 직업",
  certifications: ["정보처리기사"],
  education_required: "대졸",
  gender_restriction: "무관",
};

const profile: UserProfile = {
  gender: "unspecified",
  education: "대졸",
  certifications: ["정보처리기사"],
  languages: ["영어", "일본어"],
};

const answer = (questionId: string, level: Answer["level"]): Answer => ({ questionId, level });

describe("explainRecommendation", () => {
  it("separates matched, mismatched and neutral answer reasons", () => {
    const insights = explainRecommendation(baseJob, [
      answer("work_env", 2),
      answer("physical_demand", 2),
      answer("license", 0),
    ], profile);

    expect(insights.matched.map((item) => item.questionId)).toContain("work_env");
    expect(insights.mismatched.map((item) => item.questionId)).toContain("physical_demand");
    expect(insights.neutral.map((item) => item.questionId)).toContain("license");
    expect(insights.summary).toContain("3개 답변");
    expect(insights.summary).toContain("1개 항목");
  });

  it("adds profile reasons for matching certifications and education", () => {
    const insights = explainRecommendation(baseJob, [answer("analytical", 2)], profile);

    expect(insights.profileReasons.some((reason) => reason.includes("정보처리기사"))).toBe(true);
    expect(insights.profileReasons.some((reason) => reason.includes("학력 요건"))).toBe(true);
  });

  it("uses the live question text in reason labels", () => {
    const question = QUESTIONS.find((q) => q.id === "analytical");
    const insights = explainRecommendation(baseJob, [answer("analytical", 2)], profile);

    expect(insights.matched[0]?.label).toBe(question?.text);
  });
});
