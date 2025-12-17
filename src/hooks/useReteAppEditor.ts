import { useEffect, useRef, useState } from 'react';
// Rete.js 에디터를 초기화하고 관리하는 커스텀 Hook

export function useReteAppEditor(containerRef: React.RefObject<HTMLElement>) {
    // Rete.js 에디터 인스턴스를 저장하기 위한 Ref
  const editorRef = useRef<any>(null);
    // Rete.js Area Plugin 인스턴스를 저장하기 위한 Ref (화면 렌더링, 줌/패닝 관리)
  const areaRef = useRef<any>(null);
    // 에디터 초기화 완료 상태를 저장하는 State
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Rete 에디터가 정상적으로 렌더링되도록 필수 CSS 스타일을 설정합니다.

    el.style.position ||= 'relative'; // 'relative'가 설정되어 있지 않으면 설정
    el.style.overflow ||= 'hidden'; // 'hidden'이 설정되어 있지 않으면 설정

    let destroy: (() => void) | undefined;
    let cancelled = false; // 마운트 해제(Cleanup) 시 비동기 초기화 중단을 위한 플래그
 // 비동기로 Rete 에디터 초기화 로직 실행
    (async () => {
      try {
          // 동적으로 app-editor.js 파일을 가져와 모듈을 로드 (Dynamic Import)
        const mod: any = await import('../rete/app-editor.js');

          // 모듈의 createAppEditor 함수를 호출하여 에디터 인스턴스 생성
        const { editor, area, destroy: d } = await mod.createAppEditor(el);
        if (cancelled) {
          d();
          return;
        }

         // 성공적으로 생성된 인스턴스를 Ref에 저장
        editorRef.current = editor;
        areaRef.current = area;
        destroy = d;
        setReady(true);
      } catch (e) {
          // 초기화 실패 시 콘솔에 오류 기록
        // eslint-disable-next-line no-console
        console.error('Failed to initialize app editor:', e);
      }
    })();

    // -------------------- Cleanup 함수 (언마운트 시 실행) --------------------
    return () => {
      cancelled = true; // 비동기 초기화 중단을 요청
      try {
         // Rete.js 에디터의 리소스 정리 함수 호출
        destroy?.();
      } catch (e) {
        // 정리 중 발생한 경고는 콘솔에 기록
        // eslint-disable-next-line no-console
        console.warn('Error during app editor cleanup', e);
      }
      setReady(false);// 준비 상태 초기화
    };
  }, [containerRef]); // containerRef가 변경될 때만 Effect 재실행

    // Rete.js 인스턴스와 준비 상태를 반환
  return { editorRef, areaRef, ready } as const;
}
