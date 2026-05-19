import type { Job } from "./recommend";

export type JobSortKey =
  | "default"
  | "name"
  | "incomeDesc"
  | "growthDesc"
  | "automationRiskAsc"
  | "riskAsc";

export interface JobFilters {
  query?: string;
  domain?: string;
  category?: string;
  workEnvironment?: string;
  physicalIntensity?: string;
  peopleInteraction?: string;
  creativityLevel?: string;
  analyticalLevel?: string;
  techIntensity?: string;
  incomeLevel?: string;
  riskLevel?: string;
  growthPotential?: string;
  automationRisk?: string;
  educationRequired?: string;
  licenseRequired?: "any" | "required" | "notRequired";
  sortBy?: JobSortKey;
}

const rank = (value: string | undefined, order: string[]) => {
  const idx = value ? order.indexOf(value) : -1;
  return idx === -1 ? 0 : idx;
};

const incomeRank = (job: Job) => rank(job.tags.income_level, ["낮음", "보통", "높음", "매우높음"]);
const growthRank = (job: Job) => rank(job.tags.growth_potential, ["낮음", "보통", "높음"]);
const riskRank = (job: Job) => rank(job.tags.risk_level, ["낮음", "보통", "높음"]);
const automationRank = (job: Job) => rank(job.tags.automation_risk, ["낮음", "보통", "높음"]);

function matchesQuery(job: Job, query: string) {
  if (!query) return true;
  const haystack = [
    job.name,
    job.domain,
    job.category,
    job.short_desc,
    job.description,
    ...(job.traits ?? []),
    ...(job.certifications ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function matchesExact(value: string | undefined, filter: string | undefined) {
  return !filter || value === filter;
}

export function filterAndSortJobs(jobs: Job[], filters: JobFilters = {}): Job[] {
  const out = jobs.filter((job) => {
    if (!matchesQuery(job, filters.query?.trim() ?? "")) return false;
    if (!matchesExact(job.domain, filters.domain)) return false;
    if (!matchesExact(job.category, filters.category)) return false;
    if (!matchesExact(job.tags.work_environment, filters.workEnvironment)) return false;
    if (!matchesExact(job.tags.physical_intensity, filters.physicalIntensity)) return false;
    if (!matchesExact(job.tags.people_interaction, filters.peopleInteraction)) return false;
    if (!matchesExact(job.tags.creativity_level, filters.creativityLevel)) return false;
    if (!matchesExact(job.tags.analytical_level, filters.analyticalLevel)) return false;
    if (!matchesExact(job.tags.tech_intensity, filters.techIntensity)) return false;
    if (!matchesExact(job.tags.income_level, filters.incomeLevel)) return false;
    if (!matchesExact(job.tags.risk_level, filters.riskLevel)) return false;
    if (!matchesExact(job.tags.growth_potential, filters.growthPotential)) return false;
    if (!matchesExact(job.tags.automation_risk, filters.automationRisk)) return false;
    if (!matchesExact(job.education_required ?? job.tags.education_required, filters.educationRequired)) return false;
    if (filters.licenseRequired === "required" && !job.tags.license_required) return false;
    if (filters.licenseRequired === "notRequired" && job.tags.license_required) return false;
    return true;
  });

  const sortBy = filters.sortBy ?? "default";
  return [...out].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name, "ko");
    if (sortBy === "incomeDesc") return incomeRank(b) - incomeRank(a) || a.name.localeCompare(b.name, "ko");
    if (sortBy === "growthDesc") return growthRank(b) - growthRank(a) || a.name.localeCompare(b.name, "ko");
    if (sortBy === "automationRiskAsc") return automationRank(a) - automationRank(b) || a.name.localeCompare(b.name, "ko");
    if (sortBy === "riskAsc") return riskRank(a) - riskRank(b) || a.name.localeCompare(b.name, "ko");
    return a.id - b.id;
  });
}
