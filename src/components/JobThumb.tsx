import { useState } from "react";
import { Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Job } from "@/lib/recommend";

/**
 * Vite의 BASE_URL을 prefix로 하여 정적 자산 경로를 만든다.
 * BASE_URL은 항상 trailing slash를 포함하므로 image의 leading slash는 제거한다.
 */
function withBase(path: string): string {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const rel = path.startsWith("/") ? path : `/${path}`;
  return `${base}${rel}`;
}

export interface JobThumbProps {
  job: Pick<Job, "id" | "name" | "image" | "domain">;
  /** 썸네일 한 변 크기 (px). size 또는 className의 width/height 중 한쪽만 지정한다. */
  size?: number;
  /** 모서리 라운딩 강도 */
  rounded?: "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  /** 추가 클래스 (예: 비율 변경, 그림자 등) */
  className?: string;
  /** 이미지가 없을 때 fallback을 표시할지 여부 (기본 true). false면 null 반환. */
  showFallback?: boolean;
  /** lazy loading. 결과 페이지 winner 카드처럼 처음부터 보이는 곳에서는 'eager'로. */
  loading?: "lazy" | "eager";
}

const ROUND_CLASS: Record<NonNullable<JobThumbProps["rounded"]>, string> = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  full: "rounded-full",
};

/**
 * 직업 썸네일 일러스트를 렌더링하는 공통 컴포넌트.
 * - `Job.image`가 있으면 `<img>`를 사용한다.
 * - 없거나 로드에 실패하면 도메인 이니셜 + 아이콘 플레이스홀더를 보여준다.
 */
export function JobThumb({
  job,
  size,
  rounded = "md",
  className,
  showFallback = true,
  loading = "lazy",
}: JobThumbProps) {
  const [errored, setErrored] = useState(false);
  const hasImage = !!job.image && !errored;

  const sizeStyle = size ? { width: size, height: size } : undefined;

  if (!hasImage) {
    if (!showFallback) return null;
    const initial = (job.domain || job.name || "·").trim().slice(0, 1);
    return (
      <div
        style={sizeStyle}
        className={cn(
          "shrink-0 inline-flex items-center justify-center bg-muted text-muted-foreground border border-border overflow-hidden select-none",
          ROUND_CLASS[rounded],
          className,
        )}
        aria-hidden
      >
        {initial ? (
          <span className="text-[0.7em] font-semibold tracking-tight opacity-70">
            {initial}
          </span>
        ) : (
          <Briefcase className="h-1/2 w-1/2 opacity-50" />
        )}
      </div>
    );
  }

  return (
    <img
      src={withBase(job.image!)}
      alt={`${job.name} 일러스트`}
      width={size}
      height={size}
      style={sizeStyle}
      loading={loading}
      decoding="async"
      onError={() => setErrored(true)}
      className={cn(
        "shrink-0 object-cover bg-muted border border-border overflow-hidden",
        ROUND_CLASS[rounded],
        className,
      )}
    />
  );
}

export default JobThumb;
