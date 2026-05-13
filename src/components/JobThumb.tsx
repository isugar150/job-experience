import { useEffect, useState } from "react";
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
  /**
   * 로딩 모드.
   * - `lazy` (기본): 뷰포트에 진입하기 직전(threshold만큼 앞)에 이미지를 로드한다.
   * - `eager`: 첫 화면에 바로 보이는 경우(예: 결과 페이지의 winner 카드)에 사용한다.
   */
  loading?: "lazy" | "eager";
  /**
   * 이전 lazy 이미지 구현과의 호환용 옵션. 현재는 브라우저 기본 lazy loading을 사용한다.
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
 * - 이미지가 로드되기 전에도 플레이스홀더 영역을 먼저 렌더링해 레이아웃 흔들림을 막는다.
 * - 이미지가 없거나 로드에 실패하면 도메인 이니셜 + 아이콘 플레이스홀더를 보여준다.
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
  const [loaded, setLoaded] = useState(false);
  const hasImage = !!job.image && !errored;

  useEffect(() => {
    setErrored(false);
    setLoaded(false);
  }, [job.image]);

  const sizeStyle = size ? { width: size, height: size } : undefined;
  const roundClass = ROUND_CLASS[rounded];
  const initial = (job.domain || job.name || "·").trim().slice(0, 1);
  const placeholder = initial ? (
    <span className="text-[0.7em] font-semibold tracking-tight opacity-70">
      {initial}
    </span>
  ) : (
    <Briefcase className="h-1/2 w-1/2 opacity-50" />
  );

  if (!hasImage) {
    if (!showFallback) return null;
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
        {placeholder}
      </div>
    );
  }

  return (
    <div
      style={sizeStyle}
      className={cn(
        "relative shrink-0 inline-flex items-center justify-center bg-muted text-muted-foreground border border-border overflow-hidden select-none",
        roundClass,
        className,
      )}
    >
      {showFallback && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-opacity duration-200",
            loaded ? "opacity-0" : "opacity-100"
          )}
          aria-hidden
        >
          {placeholder}
        </div>
      )}
      <img
        src={withBase(job.image!)}
        alt={`${job.name} 일러스트`}
        loading={loading}
        decoding="async"
        draggable={false}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-200",
          loaded ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}

export default JobThumb;
