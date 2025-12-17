import { useEffect } from 'react';
import { createEditor } from '../rete';

/**
 * Mounts a Rete v2 editor into the given container element and cleans up on unmount.
 * Usage: const ref = useRef(null); useReteEditor(ref);
 */
export function useReteEditor(containerRef: React.RefObject<HTMLElement>) {
    // 컴포넌트 마운트 및 containerRef 변경 시 실행되는 Effect
  useEffect(() => {
    const el = containerRef.current;
        // 컨테이너 DOM 요소가 준비되지 않았다면 중단

    if (!el) return;

// Rete 에디터가 정상적으로 렌더링되도록 필수 CSS 스타일을 설정합니다.
    el.style.position ||= 'relative';
    el.style.overflow ||= 'hidden';

    let destroy: (() => void) | undefined;
    let cancelled = false;
 // Rete 에디터 초기화 비동기 로직
    (async () => {
      try {
        // '../rete' 경로의 createEditor 함수를 호출하여 에디터 생성 및 초기화
        // 이 함수는 에디터 인스턴스가 아닌, cleanup 함수만 반환하는 것으로 추정됩니다.
        const { destroy: d } = await createEditor(el);
        if (cancelled) {
          d();
        } else {
          destroy = d;
        }
      } catch (e) {
         // 초기화 실패 시 오류 로깅
        // eslint-disable-next-line no-console
        console.error('Failed to initialize Rete editor:', e);
      }
    })();
 // -------------------- Cleanup 함수 (언마운트 시 실행) --------------------
    return () => {
      cancelled = true;// 비동기 초기화 작업에게 취소되었음을 알림
      try {
               // 저장된 에디터 정리 함수를 호출하여 모든 리소스 해제
        destroy?.();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Error during Rete editor cleanup', e);
      }
    };
  }, [containerRef]);// containerRef의 변화가 있을 때만 Effect 재실행
}
