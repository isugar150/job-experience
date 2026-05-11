import { useEffect, useRef } from "react";

/**
 * 모바일 뒤로가기로 다이얼로그를 닫을 수 있게 해주는 훅.
 * - open=true 시 history에 #modal 항목을 push
 * - 뒤로가기(popstate) 발생 시 onClose 호출
 *
 * cleanup 시 history.back()을 호출하지 않는다.
 * 이전 구현에서는 cleanup 시 history.back()을 호출했는데,
 * 중첩 모달(책갈피 → 상세)을 열 때 상위 모달의 backHandler가
 * cleanup되면서 history.back()이 호출되어 하위 모달이 즉시 닫히는
 * 버그가 있었다.
 *
 * 성능 최적화: history.pushState/popstate 리스너 등록을 다음 애니메이션
 * 프레임으로 미뤄, 다이얼로그가 열리는 첫 페인트가 끝난 후 동작하도록 한다.
 * 클릭에서 다이얼로그가 화면에 그려지는 단계와 메인 스레드 작업을 분리해
 * 다이얼로그 열림 반응을 더 빠르게 느끼도록 한다.
 */
export function useModalBackHandler(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    let pushed = false;
    let listenerAttached = false;

    function handlePopState(e: PopStateEvent) {
      // 뒤로가기로 modal 상태가 사라졌을 때 닫기
      if (!e.state?.modal) {
        onCloseRef.current();
      }
    }

    // 다이얼로그가 열리는 프레임에서는 페인트만 수행하고,
    // 무거운 history.pushState / addEventListener는 다음 프레임으로 미룬다.
    const raf = requestAnimationFrame(() => {
      try {
        history.pushState({ modal: true }, "");
        pushed = true;
      } catch {
        // ignore
      }
      window.addEventListener("popstate", handlePopState);
      listenerAttached = true;
    });

    return () => {
      cancelAnimationFrame(raf);
      if (listenerAttached) {
        window.removeEventListener("popstate", handlePopState);
      }
      // history.back() 호출 제거 — 중첩 모달 열기 시 즉시 닫힘 버그 방지
      void pushed;
    };
  }, [open]);
}
