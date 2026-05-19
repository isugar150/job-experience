import { describe, expect, it } from "vitest";
import { filterAndSortJobs, type JobFilters } from "./job-explore";
import type { Job } from "./recommend";

const defaultTags: Job["tags"] = {
  work_environment: "실내중심",
  physical_intensity: "보통",
  people_interaction: "보통",
  creativity_level: "보통",
  analytical_level: "보통",
  tech_intensity: "보통",
  education_required: "고졸이상",
  license_required: false,
  income_level: "보통",
  risk_level: "보통",
  growth_potential: "보통",
  automation_risk: "보통",
};

const makeJob = (overrides: Partial<Job>): Job => ({
  id: 1,
  name: "기본 직업",
  category: "기본분류",
  domain: "기본도메인",
  tags: { ...defaultTags, ...(overrides.tags ?? {}) },
  traits: [],
  short_desc: "기본 설명",
  ...overrides,
});

const jobs: Job[] = [
  makeJob({
    id: 1,
    name: "데이터 분석가",
    domain: "IT/소프트웨어",
    category: "정보통신",
    short_desc: "데이터 분석",
    tags: {
      ...defaultTags,
      work_environment: "실내중심",
      physical_intensity: "낮음",
      people_interaction: "낮음",
      analytical_level: "높음",
      tech_intensity: "높음",
      education_required: "대졸",
      income_level: "높음",
      risk_level: "낮음",
      growth_potential: "높음",
      automation_risk: "낮음",
    },
  }),
  makeJob({
    id: 2,
    name: "현장 기술자",
    domain: "건설/건축",
    category: "건설",
    short_desc: "현장 업무",
    tags: {
      ...defaultTags,
      work_environment: "실외중심",
      physical_intensity: "높음",
      creativity_level: "낮음",
      tech_intensity: "낮음",
      license_required: true,
      risk_level: "높음",
    },
  }),
];

describe("filterAndSortJobs", () => {
  it("filters by search text, domain and tag values", () => {
    const filters: JobFilters = {
      query: "분석",
      domain: "IT/소프트웨어",
      workEnvironment: "실내중심",
      analyticalLevel: "높음",
      licenseRequired: "any",
      sortBy: "name",
    };

    expect(filterAndSortJobs(jobs, filters).map((job) => job.id)).toEqual([1]);
  });

  it("sorts by high income and low automation risk", () => {
    expect(filterAndSortJobs(jobs, { sortBy: "incomeDesc" }).map((job) => job.id)).toEqual([1, 2]);
    expect(filterAndSortJobs(jobs, { sortBy: "automationRiskAsc" }).map((job) => job.id)).toEqual([1, 2]);
  });
});
