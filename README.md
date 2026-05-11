# 나에게 맞는 직업 찾기

> 한국 직업 537개 중에서 당신에게 잘 맞는 직업을 질문 답변을 통해 추천해주는 웹앱.

React 19 + TypeScript + Vite + Tailwind CSS 4로 만들어졌으며, 별도의 백엔드 없이 정적 파일만으로 동작합니다. GitHub Pages에 그대로 배포할 수 있습니다.

## ✨ 기능

- 한국고용정보원 직업 분류 기반 **537개 직업 코퍼스** (`client/src/data/jobs.json`)
- 각 직업에 LLM이 자동 생성한 13개 태그 (근무환경, 창의성, 분석력, 산업 도메인, 성향 키워드 등)
- 사용자의 답변에 따라 후보를 점진적으로 좁히는 **5단계 척도 질문 UI**
- 후보군의 분포에 따라 가장 분별력이 높은 질문을 우선 노출하는 **엔트로피 기반 질문 선택기**
- 흰 배경 · 미니멀 라이트 디자인 · Pretendard 폰트
- 추천 결과에는 직업 설명, 장점, 단점, 유리한 자격증을 함께 표시 (현재 30개 직업에 대해 보강 데이터 포함, 점진 확장 예정)
- 결과 화면에서 나무위키로 바로 이동 가능

## 🏗 프로젝트 구조

```
client/
  src/
    components/
      (메인 컴포넌트는 pages/Home.tsx 내에 정의)
    data/
      jobs.json                ← 537개 직업 + 태그 데이터셋
    lib/
      recommend.ts             ← 추천 엔진 + 질문 정의
    pages/
      Home.tsx                 ← 메인 인터랙션 화면
.github/workflows/
  deploy.yml                   ← GitHub Pages 자동 배포
scripts/
  postbuild-pages.mjs          ← 404.html / .nojekyll 생성
```

## 🚀 로컬 실행

```bash
pnpm install
pnpm dev
```

## 📦 GitHub Pages 배포

저장소를 `https://github.com/<user>/<repo>` 형태로 푸시한 뒤, **Settings → Pages → Source = "GitHub Actions"** 로 설정하세요.

이후 `main` 브랜치에 push하면 `.github/workflows/deploy.yml` 워크플로가 자동으로 빌드 후 `https://<user>.github.io/<repo>/` 에 배포합니다.

워크플로는 `VITE_BASE=/${{ repo }}/` 환경변수로 Vite의 `base`를 자동 설정하므로, 별도 수정 없이 동작합니다.

수동으로 빌드하려면:

```bash
VITE_BASE=/job-experience/ pnpm build:pages
```

산출물은 `dist/public/`에 생성되며, 그대로 `gh-pages` 브랜치 등에 업로드해도 됩니다.

## 🧠 추천 알고리즘 요약

- 각 질문은 직업 한 개에 대해 `predicate(job): boolean`을 가집니다.
- 사용자 답변(±2 ~ ±1, 0 = 잘 모르겠다)은 가중치를 곱해 직업의 점수를 누적합니다.
- 매 질문 후, 현재 후보군에서 yes/no 분포가 50:50에 가장 가까운 질문(가장 분별력 높은 질문)을 다음 질문으로 선택합니다.
- 후보가 5개 이하로 좁혀지거나 12개 질문에 도달하면 종료하고 Top 추천을 보여줍니다.
