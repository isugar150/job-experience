/**
 * 결과 페이지 공유 URL 직렬화 유틸리티.
 *
 * URL 쿼리 파라미터로 사용자 프로필과 답변을 인코딩/디코딩한다.
 * - g: gender (m/f/u)
 * - e: education (중졸이하/고졸/전문대졸/대졸/석사/박사/u)
 * - c: certifications (콤마 구분, URL 인코딩)
 * - l: languages (콤마 구분, URL 인코딩)
 * - a: answers (questionId:level 쌍을 ; 로 연결)
 * - s: seed (정수)
 */

import type { Answer, UserEducation, UserGender, UserProfile, AnswerLevel } from "./recommend";

const G_MAP: Record<UserGender, string> = { male: "m", female: "f", unspecified: "u" };
const G_REV: Record<string, UserGender> = { m: "male", f: "female", u: "unspecified" };

const E_MAP: Record<UserEducation, string> = {
  "중졸이하": "0",
  "고졸": "1",
  "전문대졸": "2",
  "대졸": "3",
  "석사": "4",
  "박사": "5",
  unspecified: "u",
};
const E_REV: Record<string, UserEducation> = {
  "0": "중졸이하",
  "1": "고졸",
  "2": "전문대졸",
  "3": "대졸",
  "4": "석사",
  "5": "박사",
  u: "unspecified",
};

export interface ShareState {
  profile: UserProfile;
  answers: Answer[];
  seed: number;
}

/** 32비트 양의 정수 시드를 생성한다 */
export function generateSeed(): number {
  return Math.floor(Math.random() * 0xffffffff);
}

/** 상태를 URLSearchParams 로 인코딩 */
export function encodeShareParams(state: ShareState): URLSearchParams {
  const sp = new URLSearchParams();
  sp.set("g", G_MAP[state.profile.gender]);
  sp.set("e", E_MAP[state.profile.education]);
  if (state.profile.certifications?.length) {
    sp.set("c", state.profile.certifications.join(","));
  }
  if (state.profile.languages?.length) {
    sp.set("l", state.profile.languages.join(","));
  }
  if (state.answers.length) {
    sp.set("a", state.answers.map((a) => `${a.questionId}:${a.level}`).join(";"));
  }
  sp.set("s", String(state.seed));
  return sp;
}

/** URLSearchParams 에서 상태 복원, 누락/오류 시 null 반환 */
export function decodeShareParams(sp: URLSearchParams): ShareState | null {
  const g = sp.get("g");
  const e = sp.get("e");
  const s = sp.get("s");
  if (!g || !e || !s) return null;
  const gender = G_REV[g];
  const education = E_REV[e];
  if (!gender || !education) return null;
  const seed = Number(s);
  if (!Number.isFinite(seed)) return null;

  const certs = sp.get("c");
  const langs = sp.get("l");
  const answersRaw = sp.get("a");

  const answers: Answer[] = [];
  if (answersRaw) {
    for (const pair of answersRaw.split(";")) {
      const [qid, lvl] = pair.split(":");
      if (!qid || lvl == null) continue;
      const level = Number(lvl);
      if (![-2, -1, 0, 1, 2].includes(level)) continue;
      answers.push({ questionId: qid, level: level as AnswerLevel });
    }
  }

  const profile: UserProfile = {
    gender,
    education,
    certifications: certs ? certs.split(",").filter(Boolean) : [],
    languages: langs ? langs.split(",").filter(Boolean) : [],
  };
  return { profile, answers, seed };
}

/** 현재 origin + base 경로 + /result + 쿼리 결합 */
export function buildShareUrl(state: ShareState): string {
  const sp = encodeShareParams(state);
  const { origin } = window.location;
  // Vite BASE_URL 보존 (예: /job-experience/) - 끝의 / 제거
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  return `${origin}${base}/result?${sp.toString()}`;
}

/** 클립보드 복사 (Web Share API 우선 시도, 실패 시 fallback) */
export async function shareUrl(url: string, title?: string): Promise<"shared" | "copied"> {
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return "shared";
    } catch {
      // 사용자 취소 등은 fallback 으로
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    // legacy fallback
    const ta = document.createElement("textarea");
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    return "copied";
  }
}
