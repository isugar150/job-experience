import { Button } from "@/components/ui/button";
import { EDUCATION_OPTIONS, GENDER_OPTIONS, type UserEducation, type UserGender, type UserProfile } from "@/lib/recommend";
import { ArrowRight } from "lucide-react";
import { TagInput } from "@/components/TagInput";
import { ALL_CERTIFICATIONS, ALL_LANGUAGES } from "@/data/profileData";
export function Profile({
  profile,
  onChange,
  onReset,
  onContinue,
}: {
  profile: UserProfile;
  onChange: (p: UserProfile) => void;
  onReset: () => void;
  onContinue: () => void;
}) {
  const hasSavedData =
    profile.gender !== "unspecified" ||
    profile.education !== "unspecified" ||
    (profile.certifications?.length ?? 0) > 0 ||
    (profile.languages?.length ?? 0) > 0;
  return (
    <section>
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
        먼저 간단한 프로필을 알려주세요.
      </h2>
      <p className="text-sm text-muted-foreground mb-10 max-w-xl">
        입력한 정보는 추천 결과를 더 정확하게 맞추는 데 사용됩니다.
        모든 항목은 선택 사항이며, 응답하기 어려운 항목은 <span className="font-medium">응답 안함</span>으로 두셔도 됩니다.
      </p>

      <div className="space-y-10">
        {/* 성별 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold">성별</h3>
            <span className="text-xs text-muted-foreground">
              일부 직업의 성별 제한 필터링에만 사용됩니다.
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {GENDER_OPTIONS.map((o) => (
              <OptionButton
                key={o.value}
                selected={profile.gender === o.value}
                onClick={() => onChange({ ...profile, gender: o.value as UserGender })}
                label={o.label}
              />
            ))}
          </div>
        </div>

        {/* 학력 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold">학력</h3>
            <span className="text-xs text-muted-foreground">
              요건 충족 여부에 따라 메인/보완 추천으로 나뉘니다.
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
            {EDUCATION_OPTIONS.map((o) => (
              <OptionButton
                key={o.value}
                selected={profile.education === o.value}
                onClick={() =>
                  onChange({ ...profile, education: o.value as UserEducation })
                }
                label={o.label}
              />
            ))}
          </div>
        </div>

        {/* 자격증 (선택) */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold">보유 자격증</h3>
            <span className="text-xs text-muted-foreground">
              입력한 자격증을 요구하는 직업에 가산점이 부여됩니다.
            </span>
          </div>
          <TagInput
            value={profile.certifications ?? []}
            onChange={(certs) => onChange({ ...profile, certifications: certs })}
            suggestions={ALL_CERTIFICATIONS}
            placeholder="예: 정보처리기사, 운전면허 ..."
          />
        </div>

        {/* 언어 능력 (선택) */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold">구사 언어</h3>
            <span className="text-xs text-muted-foreground">
              통번역·외국어 관련 직업에 가산점이 부여됩니다.
            </span>
          </div>
          <TagInput
            value={profile.languages ?? []}
            onChange={(langs) => onChange({ ...profile, languages: langs })}
            suggestions={ALL_LANGUAGES}
            placeholder="예: 영어, 일본어 ..."
          />
        </div>
      </div>

      <div className="mt-12 flex flex-wrap gap-3">
        <Button size="lg" onClick={onContinue} className="h-11 px-6 rounded-md">
          질문 시작
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
        {hasSavedData && (
          <Button
            variant="ghost"
            size="lg"
            onClick={onReset}
            className="h-11 px-4 rounded-md text-muted-foreground hover:text-foreground"
          >
            프로필 초기화
          </Button>
        )}
      </div>
    </section>
  );
}

function OptionButton({
  selected,
  onClick,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-md border px-4 py-3 text-sm font-medium transition-colors text-left " +
        (selected
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-card hover:border-foreground")
      }
    >
      {label}
    </button>
  );
}

/* ----------------------------- Asking ----------------------------- */
