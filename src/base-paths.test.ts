import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return collectSourceFiles(path);
    return /\.(css|tsx?)$/.test(path) && !/\.test\./.test(path) ? [path] : [];
  });
}

describe("static asset paths", () => {
  it("do not hard-code the GitHub Pages base path in source files", () => {
    const offenders = collectSourceFiles("src").filter((path) =>
      readFileSync(path, "utf8").includes("/job-experience/"),
    );

    expect(offenders).toEqual([]);
  });
});
