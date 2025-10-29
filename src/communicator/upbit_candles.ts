/**
 * Upbit 캔들스틱 데이터 조회 모듈
 *
 * - 인증 불필요 (Public API)
 * - 각 타임프레임별로 최대 200개의 캔들 데이터 조회 가능
 */

/**
 * 캔들 데이터 인터페이스
 */
export interface CandleData {
  market: string;                    // 마켓명
  candle_date_time_utc: string;     // 캔들 기준 시각 (UTC)
  candle_date_time_kst: string;     // 캔들 기준 시각 (KST)
  opening_price: number;             // 시가
  high_price: number;                // 고가
  low_price: number;                 // 저가
  trade_price: number;               // 종가 ✅
  timestamp: number;                 // 타임스탬프 (밀리초)
  candle_acc_trade_price: number;   // 누적 거래 금액
  candle_acc_trade_volume: number;  // 누적 거래량 ✅
  unit?: number;                     // 분 단위 (분봉일 경우)
}

/**
 * 타임프레임 타입
 */
export type TimeFrame = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

/**
 * 타임프레임에 따른 API 엔드포인트 매핑
 */
const TIMEFRAME_ENDPOINTS: Record<TimeFrame, string> = {
  '1m': 'https://api.upbit.com/v1/candles/minutes/1',
  '5m': 'https://api.upbit.com/v1/candles/minutes/5',
  '15m': 'https://api.upbit.com/v1/candles/minutes/15',
  '1h': 'https://api.upbit.com/v1/candles/minutes/60',
  '4h': 'https://api.upbit.com/v1/candles/minutes/240',
  '1d': 'https://api.upbit.com/v1/candles/days',
};

/**
 * Upbit에서 캔들스틱 데이터를 가져옵니다.
 *
 * @param market - 마켓 코드 (예: 'KRW-BTC', 'KRW-ETH')
 * @param timeframe - 타임프레임 ('1m', '5m', '15m', '1h', '4h', '1d')
 * @param count - 가져올 캔들 개수 (기본값: 200, 최대: 200)
 * @returns Promise<CandleData[]> - 캔들 데이터 배열 (최신순)
 *
 * @example
 * ```typescript
 * // Bitcoin 1분봉 200개 가져오기
 * const candles = await fetchCandles('KRW-BTC', '1m', 200);
 *
 * // Ethereum 일봉 100개 가져오기
 * const dailyCandles = await fetchCandles('KRW-ETH', '1d', 100);
 * ```
 */
export async function fetchCandles(
  market: string,
  timeframe: TimeFrame,
  count: number = 200
): Promise<CandleData[]> {
  try {
    // count는 최대 200으로 제한
    const validCount = Math.min(count, 200);

    // API 엔드포인트 구성
    const endpoint = TIMEFRAME_ENDPOINTS[timeframe];
    const url = `${endpoint}?market=${market}&count=${validCount}`;

    console.log(`📊 Fetching ${timeframe} candles for ${market}...`);

    // API 호출
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: CandleData[] = await response.json();

    console.log(`✅ Fetched ${data.length} candles for ${market} (${timeframe})`);

    return data;
  } catch (error) {
    console.error(`❌ Failed to fetch candles for ${market} (${timeframe}):`, error);
    throw error;
  }
}

/**
 * 여러 타임프레임의 캔들 데이터를 한 번에 가져옵니다.
 *
 * @param market - 마켓 코드
 * @param timeframes - 가져올 타임프레임 배열
 * @param count - 각 타임프레임별 캔들 개수
 * @returns Promise<Record<TimeFrame, CandleData[]>> - 타임프레임별 캔들 데이터
 *
 * @example
 * ```typescript
 * const allCandles = await fetchMultipleTimeframes(
 *   'KRW-BTC',
 *   ['1m', '5m', '1h', '1d'],
 *   200
 * );
 * console.log(allCandles['1m']); // 1분봉 200개
 * console.log(allCandles['1d']); // 일봉 200개
 * ```
 */
export async function fetchMultipleTimeframes(
  market: string,
  timeframes: TimeFrame[],
  count: number = 200
): Promise<Record<TimeFrame, CandleData[]>> {
  try {
    console.log(`📊 Fetching multiple timeframes for ${market}...`);

    // 모든 타임프레임 병렬 요청
    const promises = timeframes.map(tf =>
      fetchCandles(market, tf, count)
        .then(data => ({ timeframe: tf, data }))
    );

    const results = await Promise.all(promises);

    // 결과를 Record로 변환
    const candlesByTimeframe: Record<string, CandleData[]> = {};
    results.forEach(({ timeframe, data }) => {
      candlesByTimeframe[timeframe] = data;
    });

    console.log(`✅ Fetched all timeframes for ${market}`);

    return candlesByTimeframe as Record<TimeFrame, CandleData[]>;
  } catch (error) {
    console.error(`❌ Failed to fetch multiple timeframes for ${market}:`, error);
    throw error;
  }
}

/**
 * 캔들 데이터에서 종가와 거래량만 추출합니다.
 *
 * @param candles - 캔들 데이터 배열
 * @returns { prices: number[], volumes: number[] }
 *
 * @example
 * ```typescript
 * const candles = await fetchCandles('KRW-BTC', '1m', 200);
 * const { prices, volumes } = extractPriceAndVolume(candles);
 * console.log(prices);  // [95200000, 95300000, ...]
 * console.log(volumes); // [12.34, 15.67, ...]
 * ```
 */
export function extractPriceAndVolume(candles: CandleData[]): {
  prices: number[];
  volumes: number[];
} {
  const prices = candles.map(c => c.trade_price);
  const volumes = candles.map(c => c.candle_acc_trade_volume);

  return { prices, volumes };
}
