# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

# Job Experience - 직업 추천 서비스

## 프로젝트 개요

사용자의 프로필과 질문 답변을 기반으로 적합한 직업을 추천하는 React 기반 SPA. 직업 데이터는 `src/data/jobs.json`에서 관리하며, 각 직업은 `src/lib/recommend.ts`의 `Job` 인터페이스를 따른다.

## 디렉토리 규칙

- `public/jobs/{id}.png` — 각 직업의 정사각형 썸네일 일러스트. 파일명은 `Job.id`와 일치시킨다.
- 웹에서 접근하는 경로는 항상 Vite의 `BASE_URL`을 prefix로 붙인다 (예: `/job-experience/jobs/4.png`). 새 컴포넌트에서 직업 이미지를 표시할 때는 `import.meta.env.BASE_URL`을 사용해 안전하게 prefix를 결합한다.
- `Job.image` 필드에는 base 경로를 제외한 상대 경로(`/jobs/{id}.png`)만 저장한다. UI에서 prefix를 결합한다.
- 이미지가 아직 없는 직업(`image` 필드 부재)은 UI에서 자동으로 생략하거나 플레이스홀더(인물 실루엣 + 도메인 이니셜)로 대체한다.

## 직업 썸네일 일러스트 스타일 가이드

새로운 직업 썸네일을 생성·교체할 때는 아래의 **공통 스타일 토큰**을 그대로 사용하여 컬렉션 전체의 시각적 일관성을 유지한다. 한 직업당 하나의 정사각형(1:1) 일러스트만 만들고, 사이즈는 1248×1248px (생성기 기본값)을 권장한다.

### 공통 스타일 토큰 (모든 프롬프트에 포함)

> Modern flat vector illustration thumbnail of {대상 직업 영문 명칭과 한국어 직업명 병기, 핵심 동작 1가지를 명확히 묘사}.
> {주인공 1명: 단정한 복장, 자연스러운 동아시아인 얼굴, 부드러운 미소 또는 집중한 표정. 직업 정체성을 드러내는 도구·소품 2~3개를 손에 들거나 주변에 배치}. {배경에는 직업 환경을 암시하는 가벼운 디테일 1~2개 — 예: 가구, 벽 장식, 작은 식물, 도식화된 아이콘}.
>
> Style: warm pastel color palette of cream, soft beige, muted teal and coral accents (with a small accent color only when culturally needed), clean rounded shapes, subtle paper-grain texture, soft drop shadows, flat vector illustration with light watercolor-like gradients, friendly approachable mood, minimalist composition centered on the character. Square 1:1 thumbnail, consistent style across the whole job collection, no text, no logo, no watermark, no UI overlay, no signage with words.

### 색상 팔레트

| 역할 | 색상 | 용도 |
| --- | --- | --- |
| Base background | `#F5EFE2` cream / `#EFE6D2` soft beige | 일러스트 바탕, 종이 질감 |
| Primary accent | `#3A8A8A` muted teal | 의상 포인트, 작은 가구, 식물 등 |
| Secondary accent | `#E08A6A` coral | 강조 오브젝트, 따뜻한 포인트 |
| Neutral line | `#3A3A3A` 부드러운 다크 그레이 | 외곽선·텍스트 대신 사용 |
| Optional accent | 직업·문화적 필요시에만 (예: 중식 = 따뜻한 빨강 등불) | 한 컷에 1색만 |

### 구도 규칙

1. **인물 중심**: 주인공이 화면의 60~70%를 차지하도록 배치하고, 시선·손·도구가 자연스럽게 동선을 만든다.
2. **명확한 행동**: 직업의 핵심 동작 한 가지를 한눈에 알 수 있게 묘사한다 (예: 한식조리사 = 비빔밥 플레이팅, 바텐더 = 셰이커 흔들기).
3. **소품 2~3개**: 직업 정체성을 보강하는 소품을 좌우 또는 하단에 흩뿌리듯 배치하되, 인물보다 작게 그린다.
4. **배경 단순화**: 단색 또는 부드러운 원형/아치 형태의 배경 셰이프 1개만 사용. 복잡한 풍경은 금지.
5. **텍스트 금지**: 간판·메뉴판·문서 등에 한글/영문 텍스트를 절대 넣지 않는다 (오타 방지).
6. **여백**: 상하좌우에 최소 5%의 마진을 확보해 카드/원형 마스크에서도 잘리지 않도록 한다.

### 직업별 프롬프트 작성 절차

1. `jobs.json`에서 대상 직업의 `name`, `short_desc`, `description`을 읽고, 해당 직업이 일하는 **장소**, **사용하는 도구**, **결과물**을 각각 1~2개씩 메모한다.
2. 위 메모를 다음 슬롯에 채운다.
   - `{영문 직업명} ({한국어 직업명})`
   - `{핵심 동작}` — 동사형 1줄
   - `{인물 묘사}` — 복장·헤어·표정
   - `{소품 2~3개}` — 카메라에 잡히는 위치 명시
   - `{배경 디테일 1~2개}` — 가구·식물·도식 아이콘 중 선택
3. 위 **공통 스타일 토큰** 문단을 그대로 끝에 붙인다.
4. 한 번에 최대 5개씩 배치 생성하고, 첫 5개 결과를 검수한 뒤 나머지를 생성한다. 스타일이 어긋난 경우 1번의 슬롯 묘사만 다시 다듬고 토큰은 손대지 않는다.

### 예시 프롬프트 (속기사)

> Modern flat vector illustration thumbnail of a Korean stenographer (속기사). A focused professional in a smart cream blouse, swiftly typing on a stenotype keyboard with chord keys; a microphone stand to her right and a soft transcript page floating with stylized sound waves drifting from the keyboard. Background hint of a courtroom bench with a small balance-scale icon.
>
> Style: warm pastel color palette of cream, soft beige, muted teal and coral accents, clean rounded shapes, subtle paper-grain texture, soft drop shadows, flat vector illustration with light watercolor-like gradients, friendly approachable mood, minimalist composition centered on the character. Square 1:1 thumbnail, consistent style across the whole job collection, no text, no logo, no watermark, no UI overlay, no signage with words.

### 생성 후 작업

1. 결과물을 `public/jobs/{id}.png`로 저장한다 (PNG, 1248×1248).
2. `src/data/jobs.json`의 해당 항목 `image` 필드를 `/jobs/{id}.png`로 설정한다. `image` 필드는 `short_desc` 바로 뒤에 위치시켜 다른 항목과 키 순서를 통일한다.
3. 새 이미지를 추가했다면 `git status`로 변경 파일을 확인하고 커밋한다.

## 직업 썸네일을 사용하는 UI 위치

다음 화면에서 동일한 일러스트를 재사용한다.

- **직업 찾아보기 (왼쪽 리스트)** — `JobListBrowser`에서 각 카드의 좌측에 정사각형 썸네일을 표시한다.
- **직업 상세 (모달)** — `JobDetailDialog` 헤더 상단에 16:9 또는 1:1 비율로 일러스트를 노출한다.
- **직업 찾기 결과 페이지** — `Result`의 winner 카드 상단과 `JobList`의 서브 추천 카드에서 동일한 썸네일을 표시한다.
- **북마크/최근 본 직업 모달** — 카드 좌측에 작은 썸네일을 노출한다.

공통 컴포넌트 `JobThumb`(또는 직접 `<img>`)을 사용해 base URL prefix와 fallback 처리를 일원화한다.
