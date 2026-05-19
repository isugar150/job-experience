import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("PWA assets", () => {
  it("declares an installable web app manifest", () => {
    expect(existsSync("public/manifest.webmanifest")).toBe(true);

    const index = readFileSync("index.html", "utf8");
    expect(index).toContain('rel="manifest" href="manifest.webmanifest"');
    expect(index).toContain('href="pwa-192.png"');
    expect(index).not.toContain("%BASE_URL%manifest.webmanifest");

    const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));
    expect(manifest.name).toBe("나에게 맞는 직업 찾기");
    expect(manifest.short_name).toBe("직업찾기");
    expect(manifest.id).toBe("https://isugar150.github.io/job-experience/");
    expect(manifest.start_url).toBe("/job-experience/");
    expect(manifest.scope).toBe("/job-experience/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: "./pwa-192.png", sizes: "192x192", type: "image/png" }),
        expect.objectContaining({ src: "./pwa-512.png", sizes: "512x512", type: "image/png" }),
      ]),
    );
  });

  it("registers a service worker using the Vite base path", () => {
    const main = readFileSync("src/main.tsx", "utf8");
    expect(main).toContain("./registerServiceWorker");

    const register = readFileSync("src/registerServiceWorker.ts", "utf8");
    expect(register).toContain("import.meta.env.BASE_URL");
    expect(register).toContain("serviceWorker.register");

    const sw = readFileSync("public/sw.js", "utf8");
    expect(sw).toContain("CACHE_NAME");
    expect(sw).toContain("fetch");
  });

  it("exposes an in-app install prompt hook for browsers that support beforeinstallprompt", () => {
    const hook = readFileSync("src/hooks/usePwaInstallPrompt.ts", "utf8");
    expect(hook).toContain("beforeinstallprompt");
    expect(hook).toContain("prompt()");
  });

  it("shows a mobile-only install banner with Android and iOS behavior", () => {
    const hook = readFileSync("src/hooks/usePwaInstallPrompt.ts", "utf8");
    expect(hook).toContain("platform");
    expect(hook).toContain("android");
    expect(hook).toContain("ios");
    expect(hook).toContain("localPreview");
    expect(hook).toContain("import.meta.env.DEV");

    const banner = readFileSync("src/components/PwaInstallBanner.tsx", "utf8");
    expect(banner).toContain("앱 설치하기");
    expect(banner).toContain("홈 화면에 추가");
    expect(banner).toContain("md:hidden");
    expect(banner).toContain("pwa-install-banner-dismissed");
    expect(banner).toContain("setInstallHelp");
    expect(banner).toContain("아직 브라우저 설치 프롬프트가 준비되지 않았어요.");
    expect(banner).not.toContain("disabled={!pwa.canInstall}");

    const home = readFileSync("src/pages/Home.tsx", "utf8");
    expect(home).toContain("PwaInstallBanner");
  });
});
