import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { usePwaInstallPrompt } from "@/hooks/usePwaInstallPrompt";

const DISMISS_KEY = "pwa-install-banner-dismissed";

export default function PwaInstallBanner() {
  const pwa = usePwaInstallPrompt();
  const [dismissed, setDismissed] = useState(true);
  const [installHelp, setInstallHelp] = useState<string | null>(null);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if ((dismissed && !pwa.localPreview) || !pwa.shouldShowBanner) return null;

  const isIOS = pwa.platform === "ios";
  const title = isIOS ? "iPhone에서 앱처럼 사용하기" : "앱 설치하기";
  const description = isIOS
    ? "공유 버튼을 누른 뒤 ‘홈 화면에 추가’를 선택하세요."
    : "홈 화면에 추가해서 더 빠르게 열 수 있어요.";

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  async function handleInstall() {
    if (isIOS) {
      setInstallHelp("공유 버튼을 누른 뒤 ‘홈 화면에 추가’를 선택하세요.");
      return;
    }

    if (!pwa.canInstall) {
      setInstallHelp("아직 브라우저 설치 프롬프트가 준비되지 않았어요. 배포/preview 환경에서 열거나 Chrome 메뉴의 ‘홈 화면에 추가’를 사용해 주세요.");
      return;
    }

    await pwa.install();
  }

  return (
    <div className="md:hidden sticky top-0 z-20 border-b border-border bg-[#F5EFE2] px-4 py-3 shadow-sm">
      <div className="mx-auto flex max-w-3xl items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{title}</div>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {installHelp ?? description}
          </p>
        </div>
        {isIOS ? (
          <Button size="sm" variant="outline" className="h-8 shrink-0 px-3 text-xs" onClick={handleInstall}>
            홈 화면에 추가
          </Button>
        ) : (
          <Button
            size="sm"
            className="h-8 shrink-0 px-3 text-xs"
            onClick={handleInstall}
          >
            앱 설치하기
          </Button>
        )}
        <button
          type="button"
          aria-label="설치 배너 닫기"
          onClick={dismiss}
          className="mt-1 shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
