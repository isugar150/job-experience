import {
  QUESTIONS,
  meetsEducation,
  questionJobScore,
  type Answer,
  type Job,
  type Question,
  type UserProfile,
} from "./recommend";

export interface RecommendationReason {
  questionId: string;
  label: string;
  answerLevel: Answer["level"];
  impact: number;
}

export interface RecommendationInsights {
  matched: RecommendationReason[];
  mismatched: RecommendationReason[];
  neutral: RecommendationReason[];
  profileReasons: string[];
  summary: string;
}

const qMap = new Map<string, Question>(QUESTIONS.map((q) => [q.id, q]));

function answerImpact(job: Job, answer: Answer, question: Question): number {
  if (answer.level === 0) return 0;
  return questionJobScore(question, job) * answer.level * (question.weight ?? 1);
}

export function explainRecommendation(
  job: Job,
  answers: Answer[],
  profile?: UserProfile,
): RecommendationInsights {
  const matched: RecommendationReason[] = [];
  const mismatched: RecommendationReason[] = [];
  const neutral: RecommendationReason[] = [];

  for (const answer of answers) {
    const question = qMap.get(answer.questionId);
    if (!question) continue;
    const impact = answerImpact(job, answer, question);
    const reason: RecommendationReason = {
      questionId: answer.questionId,
      label: question.text,
      answerLevel: answer.level,
      impact,
    };
    if (impact > 0) matched.push(reason);
    else if (impact < 0) mismatched.push(reason);
    else neutral.push(reason);
  }

  matched.sort((a, b) => b.impact - a.impact);
  mismatched.sort((a, b) => a.impact - b.impact);

  const profileReasons: string[] = [];
  if (profile) {
    if (profile.education !== "unspecified") {
      profileReasons.push(
        meetsEducation(job, profile.education)
          ? `현재 학력이 학력 요건(${job.education_required ?? "고졸이상"})을 충족해요.`
          : `학력 요건(${job.education_required ?? "고졸이상"})은 보완이 필요해요.`,
      );
    }

    const matchingCerts = (profile.certifications ?? []).filter((cert) =>
      (job.certifications ?? []).includes(cert),
    );
    if (matchingCerts.length > 0) {
      profileReasons.push(`보유 자격증(${matchingCerts.join(", ")})이 이 직업과 연결돼요.`);
    }

    if ((profile.languages ?? []).length >= 2) {
      profileReasons.push("다국어 역량이 직무 확장성에 도움이 될 수 있어요.");
    }

    const interestDomains = profile.interestDomains ?? [];
    if (interestDomains.includes(job.domain)) {
      profileReasons.push(`관심 분야로 고른 ${job.domain} 영역에 속해요.`);
    }
  }

  const summary = `${answers.length}개 답변 중 ${matched.length}개 항목이 잘 맞고 ${mismatched.length}개 항목은 선호와 달라요.`;

  return {
    matched,
    mismatched,
    neutral,
    profileReasons,
    summary,
  };
}
