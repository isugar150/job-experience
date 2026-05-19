import { useEffect, useRef } from "react";

let nextModalId = 0;

/**
 * 모바일 뒤로가기로 다이얼로그를 닫을 수 있게 해주는 훅.
 * - open=true 시 history에 이 모달 전용 modalId 항목을 push
 * - 뒤로가기(popstate) 발생 시 현재 모달의 history 항목을 벗어나면 onClose 호출
 *
 * cleanup 시 history.back()을 호출하지 않는다.
 * 중첩 모달(책갈피/최근 본 직업 → 상세)을 열 때 상위 모달의 backHandler가
 * 일시적으로 cleanup되므로, cleanup에서 history를 움직이면 하위 모달이 즉시
 * 닫히거나 history stack이 꼬일 수 있다.
 */
export function useModalBackHandler(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  const modalIdRef = useRef<string | null>(null);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const modalId = `modal-${++nextModalId}`;
    modalIdRef.current = modalId;
    let listenerAttached = false;

    function handlePopState(e: PopStateEvent) {
      // 중첩 모달에서 뒤로가면 이전 state도 { modal: true }일 수 있다.
      // 단순 modal boolean이 아니라 이 모달의 modalId를 벗어났는지로 판별한다.
      if (e.state?.modalId !== modalId) {
        onCloseRef.current();
      }
    }

    // 다이얼로그가 열리는 프레임에서는 페인트만 수행하고,
    // history.pushState / addEventListener는 다음 프레임으로 미룬다.
    const raf = requestAnimationFrame(() => {
      try {
        history.pushState({ modal: true, modalId }, "");
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
      if (modalIdRef.current === modalId) {
        modalIdRef.current = null;
      }
    };
  }, [open]);
}
