/// <reference types="vite/client" />

export declare global {
  interface Window {
    electronAPI: {
      /**
       * API 키 저장
       * @returns Promise<boolean>
       */
      saveApiKeys: (accessKey: string, secretKey: string) => Promise<boolean>;

      /**
       * API 키 로드
       * @returns Promise<{ accessKey: string; secretKey: string } | null>
       */
      loadApiKeys: () => Promise<{ accessKey: string; secretKey: string } | null>;

      /**
       * 업비트 계좌 정보 조회
       * @returns Promise<any>
       */
      fetchUpbitAccounts: (accessKey: string, secretKey: string) => Promise<any>;

      /**
       * Python 프로세스 시작/종료
       */
      startRL: () => void;
      stopRL: () => void;
    };
  }
}
