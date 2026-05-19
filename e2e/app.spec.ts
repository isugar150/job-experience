import { expect, test } from "@playwright/test";

test("complete quiz flow and show explainable result", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByText("나에게 맞는 직업 찾기").first()).toBeVisible();

  await page.getByRole("button", { name: /시작|직업 찾기|찾아보기/ }).first().click();
  await expect(page.getByText("먼저 간단한 프로필")).toBeVisible();
  await page.getByRole("button", { name: "응답 안함" }).last().click();
  await page.getByRole("button", { name: "질문 시작" }).click();

  for (let i = 0; i < 16; i += 1) {
    if (await page.getByText("왜 이 직업이 추천됐나요?").isVisible().catch(() => false)) break;
    await page.getByRole("button", { name: /건너뛰기|그렇다/ }).first().click();
  }

  await expect(page.getByText("왜 이 직업이 추천됐나요?")).toBeVisible();
  await expect(page.getByRole("button", { name: "공유하기" })).toBeVisible();
  await expect(page.getByRole("button", { name: "결과 저장" })).toHaveCount(0);

  await expect(page.getByText("추천 직업 비교")).toBeVisible();
  await page.getByLabel("비교할 직업 선택").selectOption({ index: 1 });
  await expect(page.getByText("추천 점수")).toBeVisible();
});

test("browse filters and compare jobs", async ({ page }) => {
  await page.goto("./");
  await page.getByPlaceholder(/검색/).fill("분석");
  await expect(page.getByText(/개 직업 중/)).toBeVisible();
  await page.getByRole("button", { name: "비교 추가" }).first().click();
  await page.getByRole("button", { name: "비교 추가" }).first().click();
  await expect(page.getByText("직업 비교")).toBeVisible();
});
