import { describe, expect, it } from "vitest";
import {
  MAX_QUESTIONS,
  meetsEducation,
  meetsGender,
  getRecommendations,
  type Job,
  type UserProfile,
} from "./recommend";
import { decodeShareParams, encodeShareParams } from "./share";

const baseJob: Job = {
  id: 999001,
  name: "테스트 직업",
  category: "테스트",
  domain: "테스트",
  tags: {
    work_environment: "실내중심",
    physical_intensity: "낮음",
    people_interaction: "낮음",
    creativity_level: "낮음",
    analytical_level: "낮음",
    tech_intensity: "낮음",
    education_required: "고졸이상",
    license_required: false,
    income_level: "보통",
    risk_level: "낮음",
  },
  traits: [],
  short_desc: "테스트용 직업",
};

describe("profile eligibility", () => {
  it("treats unspecified education and gender as permissive", () => {
    const job: Job = {
      ...baseJob,
      education_required: "대졸",
      gender_restriction: "여성",
    };

    expect(meetsEducation(job, "unspecified")).toBe(true);
    expect(meetsGender(job, "unspecified")).toBe(true);
  });

  it("separates unmet education from eligible recommendations", () => {
    const job: Job = { ...baseJob, education_required: "대졸" };

    expect(meetsEducation(job, "고졸")).toBe(false);
    expect(meetsEducation(job, "대졸")).toBe(true);
  });
});

describe("share params", () => {
  it("round-trips profile, answers, and seed", () => {
    const profile: UserProfile = {
      gender: "female",
      education: "대졸",
      certifications: ["정보처리기사"],
      languages: ["영어"],
    };
    const answers = [
      { questionId: "creative", level: 2 as const },
      { questionId: "risk_low", level: -1 as const },
    ];

    const encoded = encodeShareParams({ profile, answers, seed: 12345 });
    const decoded = decodeShareParams(encoded);

    expect(decoded).toEqual({ profile, answers, seed: 12345 });
  });
});

describe("recommendations", () => {
  it("produces deterministic recommendations for the same seed", () => {
    const profile: UserProfile = {
      gender: "unspecified",
      education: "unspecified",
      certifications: [],
      languages: [],
    };
    const answers = [
      { questionId: "creative", level: 1 as const },
      { questionId: "tech_usage", level: 1 as const },
    ];

    const first = getRecommendations(profile, answers, 5, 777).mainCandidates.map(
      ({ job }) => job.id,
    );
    const second = getRecommendations(profile, answers, 5, 777).mainCandidates.map(
      ({ job }) => job.id,
    );

    expect(first).toEqual(second);
  });

  it("keeps the documented max question limit at 16", () => {
    expect(MAX_QUESTIONS).toBe(16);
  });
});
