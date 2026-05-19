import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Header static assets", () => {
  it("does not hard-code the GitHub Pages base path", () => {
    const source = readFileSync(new URL("./Header.tsx", import.meta.url), "utf8");

    expect(source).not.toContain("/job-experience/");
    expect(source).toContain("@/lib/assets");
  });
});
