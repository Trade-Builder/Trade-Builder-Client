/// <reference types="vite/client" />

export declare global {
  interface Window {
    electronAPI: {
      /**
       * API 키 저장
       * @param accessKey - Upbit Access Key
       * @param secretKey - Upbit Secret Key
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
      fetchUpbitAccounts: () => Promise<any>;

      /**
       * 업비트 캔들 데이터 조회
       * @param market - 마켓 코드 (예: 'KRW-BTC')
       * @param period - 시간 간격 (분 단위: 1, 3, 5, 10, 15, 30, 60, 240)
       * @param count - 가져올 캔들 개수 (기본값: 200, 최대: 200)
       * @returns Promise<{success: boolean, data?: Array<{timestamp: number, price: number, volume: number}>, error?: any}>
       */
      fetchCandles: (
        market: string,
        period?: number,
        count?: number
      ) => Promise<{
        success: boolean;
        data?: Array<{
          timestamp: number;
          price: number;
          volume: number;
        }>;
        error?: any;
      }>;

      /**
       * 업비트 최고가 조회
       * @param market - 마켓 코드 (예: 'KRW-BTC')
       * @param periodUnit - 기간 단위 ('day', 'week', 'month', 'year')
       * @param period - 조회할 캔들 개수
       * @returns Promise<number> 해당 기간의 최고가
       */
      getHighestPrice: (
        market: string,
        periodUnit: string,
        period: number
      ) => Promise<number>;

      /**
       * Python 프로세스 시작
       */
      startRL: () => Promise<void>;

      /**
       * Python 프로세스 종료
       */
      stopRL: () => Promise<void>;

      /**
       * 로직 요약 목록(인덱스) 조회 [{id,name,stock,order}]
       */
      listLogics: () => Promise<any>;

      /**
       * 새 로직 생성
       */
      createLogic: (name: string) => Promise<any>;

      /**
       * 특정 로직 로드
       */
      loadLogic: (id: string) => Promise<any>;

      /**
       * 특정 로직 저장
       */
      saveLogic: (logic: any) => Promise<any>;

      /**
       * 특정 로직 삭제
       */
      deleteLogic: (id: string) => Promise<any>;

      /**
       * 로직 순서 재배치
       */
      reorderLogics: (ids: string[]) => Promise<any>;

      /**
       * 로직별 API 키 로드
       */
      loadLogicApiKeys: (id: string) => Promise<{ accessKey: string; secretKey: string } | null>;

      /**
       * 로직별 API 키 저장
       */
      saveLogicApiKeys: (id: string, accessKey: string, secretKey: string) => Promise<boolean>;

      /**
       * 테마 가져오기
       */
      getTheme: () => Promise<string>;

      /**
       * 테마 설정
       */
      setTheme: (theme: string) => Promise<void>;

      /**
       * 실행 중인 로직 가져오기
       */
      getRunningLogic: () => Promise<any>;

      /**
       * 실행 중인 로직 설정
       */
      setRunningLogic: (meta: any) => Promise<void>;

      /**
       * 업비트 통합 주문
       * @param options - 주문 옵션 {market, side, orderType, price, volume}
       * @returns Promise<{success: boolean, data?: any, error?: any}>
       */
      placeOrder: (
        options: {
          market: string;
          side: 'bid' | 'ask';
          orderType: 'limit' | 'price' | 'market';
          price?: number;
          volume?: number;
        }
      ) => Promise<{
        success: boolean;
        data?: any;
        error?: any;
      }>;

      /**
       * 업비트 시장가 매수
       * @param market - 마켓 코드 (예: 'KRW-BTC')
       * @param price - 주문 금액 (KRW)
       * @returns Promise<{success: boolean, data?: any, error?: any}>
       */
      marketBuy: (
        market: string,
        price: number
      ) => Promise<{
        success: boolean;
        data?: any;
        error?: any;
      }>;

      /**
       * 업비트 시장가 매도
       * @param market - 마켓 코드 (예: 'KRW-BTC')
       * @param price - 주문 금액 (KRW)
       * @returns Promise<{success: boolean, data?: any, error?: any}>
       */
      marketSell: (
        market: string,
        price: number
      ) => Promise<{
        success: boolean;
        data?: any;
        error?: any;
      }>;

      /**
       * 현재가 조회
       * @param market - 마켓 코드 (예: 'KRW-BTC')
       * @returns Promise<{success: boolean, price?: number, data?: any, error?: any}>
       */
      getCurrentPrice: (market: string) => Promise<{
        success: boolean;
        price?: number;
        data?: any;
        error?: any;
      }>;

      /**
       * 현재가 일괄 조회 (여러 마켓 동시 조회)
       * @param markets - 마켓 코드 배열 (예: ['KRW-BTC', 'KRW-ETH'])
       * @returns Promise<{success: boolean, data?: {[market: string]: number}, error?: any}>
       */
      getCurrentPrices: (markets: string[]) => Promise<{
        success: boolean;
        data?: {[market: string]: number};
        error?: any;
      }>;

      /**
       * KRW 금액으로 지정가 매수
       * @param market - 마켓 코드 (예: 'KRW-BTC')
       * @param price - 1개당 가격
       * @param krwAmount - 사용할 KRW 금액
       * @returns Promise<{success: boolean, data?: any, error?: any}>
       */
      limitBuyWithKRW: (
        market: string,
        price: number,
        krwAmount: number
      ) => Promise<{
        success: boolean;
        data?: any;
        error?: any;
      }>;

      /**
       * KRW 금액으로 지정가 매도
       * @param market - 마켓 코드 (예: 'KRW-BTC')
       * @param price - 1개당 가격
       * @param krwAmount - 매도할 KRW 금액
       * @returns Promise<{success: boolean, data?: any, error?: any}>
       */
      limitSellWithKRW: (
        market: string,
        price: number,
        krwAmount: number
      ) => Promise<{
        success: boolean;
        data?: any;
        error?: any;
      }>;

      /**
       * 보유 수량 전체 매도
       * @param market - 마켓 코드 (예: 'KRW-BTC')
       * @param orderType - 'market' 또는 'limit'
       * @param limitPrice - 지정가인 경우 가격
       * @returns Promise<{success: boolean, data?: any, error?: any}>
       */
      sellAll: (
        market: string,
        orderType?: 'market' | 'limit',
        limitPrice?: number | null
      ) => Promise<{
        success: boolean;
        data?: any;
        error?: any;
      }>;
    };
  }
}
