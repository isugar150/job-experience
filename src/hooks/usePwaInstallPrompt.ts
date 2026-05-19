import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export type PwaInstallPlatform = "android" | "ios" | "other";

function detectPlatform(): PwaInstallPlatform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) return "ios";
  if (/android/.test(ua)) return "android";
  return "other";
}

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
}

function isLocalPreview() {
  if (typeof window === "undefined") return false;
  return import.meta.env.DEV && ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

export function usePwaInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<PwaInstallPlatform>("other");
  const [localPreview, setLocalPreview] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(isStandaloneDisplay());
    setLocalPreview(isLocalPreview());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice.catch(() => null);
    setPromptEvent(null);
  }

  return {
    canInstall: Boolean(promptEvent) && !installed,
    shouldShowBanner: !installed && (localPreview || platform === "ios" || platform === "android"),
    installed,
    install,
    localPreview,
    platform,
  };
}
