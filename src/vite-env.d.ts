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
       * 업비트 1분봉 캔들 데이터 조회 (하위 호환성)
       * @param market - 마켓 코드 (예: 'KRW-BTC')
       * @param count - 가져올 캔들 개수 (기본값: 200, 최대: 200)
       * @returns Promise<Array> 1분봉 데이터 배열
       */
      fetch1mCandles: (market: string, count?: number) => Promise<any[]>;

      /**
       * 업비트 캔들 데이터 조회 (시간 간격 선택 가능)
       * @param market - 마켓 코드 (예: 'KRW-BTC')
       * @param interval - 시간 간격 (분 단위: 1, 3, 5, 10, 15, 30, 60, 240)
       * @param count - 가져올 캔들 개수 (기본값: 200, 최대: 200)
       * @returns Promise<Array> 캔들 데이터 배열
       */
      fetchCandles: (market: string, interval?: number, count?: number) => Promise<any[]>;

      /**
       * 업비트 1분봉 캔들 데이터 가져와서 바로 저장 (하위 호환성)
       * @param market - 마켓 코드 (예: 'KRW-BTC')
       * @param count - 가져올 캔들 개수 (기본값: 200, 최대: 200)
       * @returns Promise<{success: boolean, data?: Array, dataCount?: number, market?: string, interval?: number, error?: any}>
       */
      fetchAndSave1mCandles: (
        market: string,
        count?: number
      ) => Promise<{
        success: boolean;
        data?: any[];
        dataCount?: number;
        market?: string;
        interval?: number;
        error?: any;
      }>;

      /**
       * 업비트 캔들 데이터 가져와서 배열로 저장 (시간 간격 선택 가능)
       * @param market - 마켓 코드 (예: 'KRW-BTC')
       * @param interval - 시간 간격 (분 단위: 1, 3, 5, 10, 15, 30, 60, 240)
       * @param count - 가져올 캔들 개수 (기본값: 200, 최대: 200)
       * @returns Promise<{success: boolean, data?: Array, dataCount?: number, market?: string, interval?: number, error?: any}>
       */
      fetchAndSaveCandles: (
        market: string,
        interval?: number,
        count?: number
      ) => Promise<{
        success: boolean;
        data?: any[];
        dataCount?: number;
        market?: string;
        interval?: number;
        error?: any;
      }>;

      /**
       * 업비트 캔들 자동 업데이트 시작 (시간 간격 선택 가능)
       * @param market - 마켓 코드 (예: 'KRW-BTC')
       * @param interval - 시간 간격 (분 단위: 1, 3, 5, 10, 15, 30, 60, 240)
       * @returns Promise<{success: boolean, message?: string, initialDataCount?: number, interval?: number, error?: string}>
       */
      startCandleUpdates: (
        market: string,
        interval?: number
      ) => Promise<{
        success: boolean;
        message?: string;
        initialDataCount?: number;
        interval?: number;
        error?: string;
      }>;

      /**
       * 캔들 데이터 자동 업데이트 중지
       * @param interval - 중지할 시간 간격 (생략 시 모든 업데이트 중지)
       * @returns Promise<{success: boolean, message: string}>
       */
      stopCandleUpdates: (interval?: number | null) => Promise<{
        success: boolean;
        message: string;
      }>;

      /**
       * Python 프로세스 시작
       */
      startRL: () => Promise<void>;

      /**
       * Python 프로세스 종료
       */
      stopRL: () => Promise<void>;

      /**
       * 메모리에서 특정 시간 간격의 캔들 데이터 가져오기
       * @param interval - 시간 간격 (분 단위: 1, 3, 5, 10, 15, 30, 60, 240)
       * @returns Promise<{timestamps: number[], closingPrices: number[], volumes: number[], count: number, interval: number}>
       */
      getCandleData: (interval?: number) => Promise<{
        timestamps: number[];
        closingPrices: number[];
        volumes: number[];
        count: number;
        interval: number;
      }>;

      /**
       * 메모리에서 모든 시간 간격의 캔들 데이터 가져오기
       * @returns Promise<{[interval: number]: {timestamps: number[], closingPrices: number[], volumes: number[], count: number, market: string}}>
       */
      getAllCandleData: () => Promise<{
        [interval: number]: {
          timestamps: number[];
          closingPrices: number[];
          volumes: number[];
          count: number;
          market: string;
        };
      }>;

      /**
       * 최신 캔들 데이터 가져오기
       * @param interval - 시간 간격 (분 단위: 1, 3, 5, 10, 15, 30, 60, 240)
       * @returns Promise<{timestamp: number, closingPrice: number, volume: number, interval: number} | null>
       */
      getLatestCandle: (interval?: number) => Promise<{
        timestamp: number;
        closingPrice: number;
        volume: number;
        interval: number;
      } | null>;

      /**
       * 특정 범위의 캔들 데이터 가져오기
       * @param interval - 시간 간격 (분 단위)
       * @param start - 시작 인덱스 (0부터 시작, 0이 최신 데이터)
       * @param end - 끝 인덱스 (생략 시 끝까지)
       * @returns Promise<{timestamps: number[], closingPrices: number[], volumes: number[], count: number, interval: number}>
       */
      getCandleRange: (
        interval: number,
        start: number,
        end?: number
      ) => Promise<{
        timestamps: number[];
        closingPrices: number[];
        volumes: number[];
        count: number;
        interval: number;
      }>;

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
