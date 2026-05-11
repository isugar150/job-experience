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
 */
export function useModalBackHandler(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    // 다이얼로그가 열릴 때 히스토리에 항목 추가
    history.pushState({ modal: true }, "");

    function handlePopState(e: PopStateEvent) {
      // 뒤로가기로 modal 상태가 사라졌을 때 닫기
      if (!e.state?.modal) {
        onCloseRef.current();
      }
    }

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      // history.back() 호출 제거 — 중첩 모달 열기 시 즉시 닫힘 버그 방지
    };
  }, [open]);
}
