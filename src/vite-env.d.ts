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
       * @param accessKey - Upbit Access Key
       * @param secretKey - Upbit Secret Key
       * @returns Promise<any>
       */
      fetchUpbitAccounts: (accessKey: string, secretKey: string) => Promise<any>;

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
       * 업비트 통합 주문
       * @param accessKey - Access Key
       * @param secretKey - Secret Key
       * @param options - 주문 옵션 {market, side, orderType, price, volume}
       * @returns Promise<{success: boolean, data?: any, error?: any}>
       */
      placeOrder: (
        accessKey: string,
        secretKey: string,
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
       * @param accessKey - Access Key
       * @param secretKey - Secret Key
       * @param market - 마켓 코드 (예: 'KRW-BTC')
       * @param price - 주문 금액 (KRW)
       * @returns Promise<{success: boolean, data?: any, error?: any}>
       */
      marketBuy: (
        accessKey: string,
        secretKey: string,
        market: string,
        price: number
      ) => Promise<{
        success: boolean;
        data?: any;
        error?: any;
      }>;

      /**
       * 업비트 시장가 매도
       * @param accessKey - Access Key
       * @param secretKey - Secret Key
       * @param market - 마켓 코드 (예: 'KRW-BTC')
       * @param volume - 매도할 코인 수량
       * @returns Promise<{success: boolean, data?: any, error?: any}>
       */
      marketSell: (
        accessKey: string,
        secretKey: string,
        market: string,
        volume: number
      ) => Promise<{
        success: boolean;
        data?: any;
        error?: any;
      }>;

      /**
       * 업비트 지정가 매수
       * @param accessKey - Access Key
       * @param secretKey - Secret Key
       * @param market - 마켓 코드 (예: 'KRW-BTC')
       * @param price - 1개당 가격
       * @param volume - 매수 수량
       * @returns Promise<{success: boolean, data?: any, error?: any}>
       */
      limitBuy: (
        accessKey: string,
        secretKey: string,
        market: string,
        price: number,
        volume: number
      ) => Promise<{
        success: boolean;
        data?: any;
        error?: any;
      }>;

      /**
       * 업비트 지정가 매도
       * @param accessKey - Access Key
       * @param secretKey - Secret Key
       * @param market - 마켓 코드 (예: 'KRW-BTC')
       * @param price - 1개당 가격
       * @param volume - 매도 수량
       * @returns Promise<{success: boolean, data?: any, error?: any}>
       */
      limitSell: (
        accessKey: string,
        secretKey: string,
        market: string,
        price: number,
        volume: number
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
       * 현재가로 지정가 매수
       * @param accessKey - Access Key
       * @param secretKey - Secret Key
       * @param market - 마켓 코드 (예: 'KRW-BTC')
       * @param volume - 매수 수량
       * @returns Promise<{success: boolean, data?: any, error?: any}>
       */
      buyAtCurrentPrice: (
        accessKey: string,
        secretKey: string,
        market: string,
        volume: number
      ) => Promise<{
        success: boolean;
        data?: any;
        error?: any;
      }>;

      /**
       * 현재가로 지정가 매도
       * @param accessKey - Access Key
       * @param secretKey - Secret Key
       * @param market - 마켓 코드 (예: 'KRW-BTC')
       * @param volume - 매도 수량
       * @returns Promise<{success: boolean, data?: any, error?: any}>
       */
      sellAtCurrentPrice: (
        accessKey: string,
        secretKey: string,
        market: string,
        volume: number
      ) => Promise<{
        success: boolean;
        data?: any;
        error?: any;
      }>;

      /**
       * KRW 금액으로 지정가 매수
       * @param accessKey - Access Key
       * @param secretKey - Secret Key
       * @param market - 마켓 코드 (예: 'KRW-BTC')
       * @param price - 1개당 가격
       * @param krwAmount - 사용할 KRW 금액
       * @returns Promise<{success: boolean, data?: any, error?: any}>
       */
      limitBuyWithKRW: (
        accessKey: string,
        secretKey: string,
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
       * @param accessKey - Access Key
       * @param secretKey - Secret Key
       * @param market - 마켓 코드 (예: 'KRW-BTC')
       * @param orderType - 'market' 또는 'limit'
       * @param limitPrice - 지정가인 경우 가격
       * @returns Promise<{success: boolean, data?: any, error?: any}>
       */
      sellAll: (
        accessKey: string,
        secretKey: string,
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
