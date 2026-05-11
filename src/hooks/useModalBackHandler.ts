import { useEffect } from "react";

/**
 * 모바일 뒤로가기로 다이얼로그를 닫을 수 있게 해주는 훅.
 * - open=true 시 history에 #modal 항목을 push
 * - 뒤로가기(popstate) 발생 시 onClose 호출
 */
export function useModalBackHandler(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;

    // 다이얼로그가 열릴 때 히스토리에 항목 추가
    history.pushState({ modal: true }, "");

    function handlePopState(e: PopStateEvent) {
      // 뒤로가기로 modal 상태가 사라졌을 때 닫기
      if (!e.state?.modal) {
        onClose();
      }
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      // 컴포넌트 언마운트 또는 open=false 시 히스토리 정리
      // (X 버튼으로 닫을 때는 history.back()으로 modal 항목 제거)
      if (history.state?.modal) {
        history.back();
      }
    };
  }, [open]);
}
