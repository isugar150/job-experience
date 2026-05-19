import { useEffect, useMemo, useRef, useState } from "react";
import { ALL_CATEGORIES, ALL_DOMAINS, ALL_JOBS, type Job } from "@/lib/recommend";
import { filterAndSortJobs, type JobFilters, type JobSortKey } from "@/lib/job-explore";
import { JobThumb } from "@/components/JobThumb";
import type { BookmarksHook, RecentJobsHook } from "./types";
import { JobDetailDialog } from "./JobDetailDialog";

const JOB_LIST_PAGE_SIZE = 100;
const ANY = "__any__";

const option = (value: string, label = value) => ({ value, label });
const workOptions = [option(ANY, "전체"), option("실내중심"), option("실외중심"), option("혼합")];
const levelOptions = [option(ANY, "전체"), option("낮음"), option("보통"), option("높음")];
const incomeOptions = [option(ANY, "전체"), option("낮음"), option("보통"), option("높음"), option("매우높음")];
const licenseOptions = [option("any", "전체"), option("required", "필요"), option("notRequired", "불필요")];
const sortOptions: Array<{ value: JobSortKey; label: string }> = [
  { value: "default", label: "기본순" },
  { value: "name", label: "이름순" },
  { value: "incomeDesc", label: "소득 높은순" },
  { value: "growthDesc", label: "성장성 높은순" },
  { value: "automationRiskAsc", label: "자동화 위험 낮은순" },
  { value: "riskAsc", label: "위험도 낮은순" },
];

function filterValue(value: string) {
  return value === ANY ? undefined : value;
}

export function JobListBrowser({ bookmarks, recentJobs }: { bookmarks?: BookmarksHook; recentJobs?: RecentJobsHook }) {
  const [filters, setFilters] = useState<JobFilters>({ licenseRequired: "any", sortBy: "default" });
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);
  const [visibleCount, setVisibleCount] = useState(JOB_LIST_PAGE_SIZE);

  useEffect(() => {
    if (dialogOpen && scrollAreaRef.current) {
      scrollPositionRef.current = scrollAreaRef.current.scrollTop;
    }
  }, [dialogOpen]);

  useEffect(() => {
    if (!dialogOpen && scrollAreaRef.current && scrollPositionRef.current > 0) {
      const rafId = requestAnimationFrame(() => {
        if (scrollAreaRef.current) scrollAreaRef.current.scrollTop = scrollPositionRef.current;
      });
      return () => cancelAnimationFrame(rafId);
    }
  }, [dialogOpen]);

  const filtered = useMemo(() => filterAndSortJobs(ALL_JOBS, filters), [filters]);

  useEffect(() => {
    setVisibleCount(JOB_LIST_PAGE_SIZE);
  }, [filters]);

  const visibleJobs = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const compareJobs = compareIds
    .map((id) => ALL_JOBS.find((job) => job.id === id))
    .filter((job): job is Job => Boolean(job));

  const updateFilter = <K extends keyof JobFilters>(key: K, value: JobFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => setFilters({ licenseRequired: "any", sortBy: "default" });

  const toggleCompare = (id: number) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      return [...prev, id].slice(-3);
    });
  };

  return (
    <div className="space-y-4">
      <input
        type="text"
        aria-label="직업 검색"
        placeholder="직업명, 도메인, 설명으로 검색..."
        value={filters.query ?? ""}
        onChange={(e) => updateFilter("query", e.target.value)}
        className="w-full px-4 py-2.5 rounded-md border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
      />

      <div className="rounded-md border border-border bg-card/60 p-3 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">필터/정렬</h3>
          <button type="button" onClick={resetFilters} className="text-xs text-muted-foreground hover:text-foreground">
            초기화
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Select label="분야" value={filters.domain ?? ANY} onChange={(v) => updateFilter("domain", filterValue(v))} options={[option(ANY, "전체 분야"), ...ALL_DOMAINS.map((d) => option(d))]} />
          <Select label="분류" value={filters.category ?? ANY} onChange={(v) => updateFilter("category", filterValue(v))} options={[option(ANY, "전체 분류"), ...ALL_CATEGORIES.map((c) => option(c))]} />
          <Select label="정렬" value={filters.sortBy ?? "default"} onChange={(v) => updateFilter("sortBy", v as JobSortKey)} options={sortOptions} />
          <Select label="근무환경" value={filters.workEnvironment ?? ANY} onChange={(v) => updateFilter("workEnvironment", filterValue(v))} options={workOptions} />
          <Select label="신체활동" value={filters.physicalIntensity ?? ANY} onChange={(v) => updateFilter("physicalIntensity", filterValue(v))} options={levelOptions} />
          <Select label="대인관계" value={filters.peopleInteraction ?? ANY} onChange={(v) => updateFilter("peopleInteraction", filterValue(v))} options={levelOptions} />
          <Select label="창의성" value={filters.creativityLevel ?? ANY} onChange={(v) => updateFilter("creativityLevel", filterValue(v))} options={levelOptions} />
          <Select label="분석력" value={filters.analyticalLevel ?? ANY} onChange={(v) => updateFilter("analyticalLevel", filterValue(v))} options={levelOptions} />
          <Select label="기술활용" value={filters.techIntensity ?? ANY} onChange={(v) => updateFilter("techIntensity", filterValue(v))} options={levelOptions} />
          <Select label="소득" value={filters.incomeLevel ?? ANY} onChange={(v) => updateFilter("incomeLevel", filterValue(v))} options={incomeOptions} />
          <Select label="위험도" value={filters.riskLevel ?? ANY} onChange={(v) => updateFilter("riskLevel", filterValue(v))} options={levelOptions} />
          <Select label="자격증" value={filters.licenseRequired ?? "any"} onChange={(v) => updateFilter("licenseRequired", v as JobFilters["licenseRequired"])} options={licenseOptions} />
        </div>
      </div>

      {compareJobs.length > 0 && (
        <ComparePanel jobs={compareJobs} onRemove={(id) => setCompareIds((prev) => prev.filter((item) => item !== id))} />
      )}

      <div className="mt-6">
        <p className="text-xs text-muted-foreground mb-3">
          {filtered.length}개 직업 중 {Math.min(visibleCount, filtered.length)}개 표시 · 비교는 최대 3개
        </p>
        <div ref={scrollAreaRef} className="grid gap-2 max-h-[600px] overflow-y-auto border border-border rounded-md p-3 bg-card/50">
          {visibleJobs.map((job) => {
            const compared = compareIds.includes(job.id);
            return (
              <div key={job.id} className="rounded-md border border-border bg-card p-3 hover:border-foreground transition-colors">
                <button
                  type="button"
                  onClick={() => { setSelectedJob(job); setDialogOpen(true); }}
                  className="text-left w-full cursor-pointer"
                >
                  <div className="flex gap-3">
                    <JobThumb job={job} size={56} rounded="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="font-medium text-sm truncate">{job.name}</div>
                        <div className="text-xs text-muted-foreground shrink-0">{job.domain}</div>
                      </div>
                      {(job.description || job.short_desc) && (
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {job.description || job.short_desc}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    aria-pressed={compared}
                    onClick={() => toggleCompare(job.id)}
                    className={
                      "rounded-full border px-2.5 py-1 text-xs " +
                      (compared ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground")
                    }
                  >
                    {compared ? "비교 중" : "비교 추가"}
                  </button>
                </div>
              </div>
            );
          })}
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

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <label className="grid gap-1 text-xs text-muted-foreground">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-background px-2 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
      >
        {options.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </select>
    </label>
  );
}

function ComparePanel({ jobs, onRemove }: { jobs: Job[]; onRemove: (id: number) => void }) {
  return (
    <div className="rounded-md border border-border bg-card p-3 overflow-x-auto">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">직업 비교</h3>
        <span className="text-xs text-muted-foreground">{jobs.length}/3개 선택</span>
      </div>
      <table className="w-full min-w-[620px] text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="w-28 py-2 text-left font-medium text-muted-foreground">항목</th>
            {jobs.map((job) => (
              <th key={job.id} className="py-2 text-left font-semibold">
                {job.name}
                <button type="button" onClick={() => onRemove(job.id)} className="ml-2 text-muted-foreground hover:text-foreground">×</button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <CompareRow label="분야" jobs={jobs} render={(job) => `${job.domain} · ${job.category}`} />
          <CompareRow label="설명" jobs={jobs} render={(job) => job.short_desc} />
          <CompareRow label="학력" jobs={jobs} render={(job) => job.education_required ?? job.tags.education_required} />
          <CompareRow label="자격증" jobs={jobs} render={(job) => job.tags.license_required ? (job.certifications?.slice(0, 2).join(", ") || "필요") : "불필요"} />
          <CompareRow label="소득" jobs={jobs} render={(job) => job.tags.income_level} />
          <CompareRow label="위험도" jobs={jobs} render={(job) => job.tags.risk_level} />
          <CompareRow label="성장성" jobs={jobs} render={(job) => job.tags.growth_potential ?? "보통"} />
          <CompareRow label="자동화" jobs={jobs} render={(job) => job.tags.automation_risk ?? "보통"} />
        </tbody>
      </table>
    </div>
  );
}

function CompareRow({ label, jobs, render }: { label: string; jobs: Job[]; render: (job: Job) => string }) {
  return (
    <tr className="border-b border-border/70 align-top last:border-0">
      <td className="py-2 pr-3 font-medium text-muted-foreground">{label}</td>
      {jobs.map((job) => (
        <td key={job.id} className="py-2 pr-3 leading-relaxed">{render(job)}</td>
      ))}
    </tr>
  );
}
