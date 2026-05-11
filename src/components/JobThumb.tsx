import { useState } from "react";
import { Briefcase } from "lucide-react";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/opacity.css";
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
  /**
   * 로딩 모드.
   * - `lazy` (기본): 뷰포트에 진입하기 직전(threshold만큼 앞)에 이미지를 로드한다.
   * - `eager`: 첫 화면에 바로 보이는 경우(예: 결과 페이지의 winner 카드)에 사용한다.
   */
  loading?: "lazy" | "eager";
  /**
   * 뷰포트 진입 전에 미리 이미지를 로드하기 시작할 거리(px). 기본 100px.
   * 너무 작으면 스크롤 시 빈 칸이 보일 수 있고, 너무 크면 lazy 효과가 줄어든다.
   */
  threshold?: number;
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
 * - `Job.image`가 있으면 `react-lazy-load-image-component`의 `LazyLoadImage`로
 *   IntersectionObserver 기반 lazy loading + opacity fade-in 효과를 적용한다.
 * - 없거나 로드에 실패하면 도메인 이니셜 + 아이콘 플레이스홀더를 보여준다.
 */
export function JobThumb({
  job,
  size,
  rounded = "md",
  className,
  showFallback = true,
  loading = "lazy",
  threshold = 100,
}: JobThumbProps) {
  const [errored, setErrored] = useState(false);
  const hasImage = !!job.image && !errored;

  const sizeStyle = size ? { width: size, height: size } : undefined;
  const roundClass = ROUND_CLASS[rounded];

  if (!hasImage) {
    if (!showFallback) return null;
    const initial = (job.domain || job.name || "·").trim().slice(0, 1);
    return (
      <div
        style={sizeStyle}
        className={cn(
          "shrink-0 inline-flex items-center justify-center bg-muted text-muted-foreground border border-border overflow-hidden select-none",
          roundClass,
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

  // eager 모드는 lazy 처리를 우회하기 위해 visibleByDefault로 동작시킨다.
  // (현재 뷰포트에 즉시 보여야 하는 경우: winner 카드 등)
  const eager = loading === "eager";

  return (
    <LazyLoadImage
      src={withBase(job.image!)}
      alt={`${job.name} 일러스트`}
      width={size}
      height={size}
      style={sizeStyle}
      threshold={threshold}
      effect="opacity"
      visibleByDefault={eager}
      onError={() => setErrored(true)}
      wrapperClassName={cn("shrink-0 inline-block align-top", roundClass)}
      className={cn(
        "shrink-0 object-cover bg-muted border border-border overflow-hidden",
        roundClass,
        className,
      )}
    />
  );
}

export default JobThumb;
