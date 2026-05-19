import { useEffect, useState } from "react";
import type { UserProfile } from "@/lib/recommend";

const STORAGE_KEY = "job_user_profile";

export const DEFAULT_PROFILE: UserProfile = {
  gender: "unspecified",
  education: "unspecified",
  certifications: [],
  languages: [],
  interestDomains: [],
  avoidedDomains: [],
  priorities: [],
};

function loadProfile(): UserProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    return {
      gender: parsed.gender ?? DEFAULT_PROFILE.gender,
      education: parsed.education ?? DEFAULT_PROFILE.education,
      certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
      languages: Array.isArray(parsed.languages) ? parsed.languages : [],
      interestDomains: Array.isArray(parsed.interestDomains) ? parsed.interestDomains : [],
      avoidedDomains: Array.isArray(parsed.avoidedDomains) ? parsed.avoidedDomains : [],
      priorities: Array.isArray(parsed.priorities) ? parsed.priorities : [],
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

/**
 * UserProfile을 localStorage에 자동 저장·복원하는 훅.
 * 새로고침이나 재방문 시 이전 입력값이 그대로 유지된다.
 */
export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile>(loadProfile);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // 저장 실패는 무시
    }
  }, [profile]);

  /** 모든 입력값을 초기화한다 (저장도 함께 비움). */
  function resetProfile() {
    setProfile(DEFAULT_PROFILE);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  return { profile, setProfile, resetProfile };
}
