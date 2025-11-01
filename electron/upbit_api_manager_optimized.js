import axios from 'axios';
import { createUpbitJWT } from './upbit/auth.js';

// 메모리에 저장되는 캔들 데이터 (시간 간격별로 분리)
// Circular Buffer 구조 사용
const candleDataStore = {};
const MAX_DATA_COUNT = 200;

// 각 시간 간격별 업데이트 인터벌 저장
const updateIntervals = {};

// 현재 활성화된 마켓 저장
let activeMappings = {}; // { interval: market }

/**
 * Circular Buffer 클래스
 * O(1) 시간 복잡도로 데이터 추가/제거
 */
class CircularBuffer {
  constructor(capacity) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
    this.head = 0;  // 가장 최신 데이터의 위치
    this.size = 0;  // 현재 저장된 데이터 개수
  }

  // 새 데이터 추가 (맨 앞에) - O(1)
  push(value) {
    if (this.size < this.capacity) {
      // 버퍼가 아직 가득 차지 않음
      this.head = (this.head - 1 + this.capacity) % this.capacity;
      this.buffer[this.head] = value;
      this.size++;
    } else {
      // 버퍼가 가득 참 - 가장 오래된 데이터 덮어쓰기
      this.head = (this.head - 1 + this.capacity) % this.capacity;
      this.buffer[this.head] = value;
    }
  }

  // 인덱스로 데이터 가져오기 (0 = 최신) - O(1)
  get(index) {
    if (index >= this.size) return undefined;
    const actualIndex = (this.head + index) % this.capacity;
    return this.buffer[actualIndex];
  }

  // 전체 데이터를 배열로 반환 (최신 -> 오래된 순서) - O(n)
  toArray() {
    const result = [];
    for (let i = 0; i < this.size; i++) {
      result.push(this.get(i));
    }
    return result;
  }

  // 범위 데이터 가져오기 - O(n)
  slice(start, end) {
    const validEnd = end || this.size;
    const result = [];
    for (let i = start; i < validEnd && i < this.size; i++) {
      result.push(this.get(i));
    }
    return result;
  }

  // 현재 크기 반환
  getSize() {
    return this.size;
  }

  // 초기화
  clear() {
    this.head = 0;
    this.size = 0;
    this.buffer = new Array(this.capacity);
  }
}

/**
 * 전체 캔들 데이터 가져오기
 * @param {number} interval - 시간 간격 (분 단위: 1, 3, 5, 10, 15, 30, 60, 240)
 */
export function getCandleData(interval = 1) {
  if (!candleDataStore[interval]) {
    return {
      timestamps: [],
      closingPrices: [],
      volumes: [],
      count: 0,
      interval: interval
    };
  }

  return {
    timestamps: candleDataStore[interval].timestamps.toArray(),
    closingPrices: candleDataStore[interval].closingPrices.toArray(),
    volumes: candleDataStore[interval].volumes.toArray(),
    count: candleDataStore[interval].timestamps.getSize(),
    interval: interval
  };
}

/**
 * 모든 시간 간격의 캔들 데이터 가져오기
 */
export function getAllCandleData() {
  const result = {};
  for (const interval in candleDataStore) {
    result[interval] = {
      timestamps: candleDataStore[interval].timestamps.toArray(),
      closingPrices: candleDataStore[interval].closingPrices.toArray(),
      volumes: candleDataStore[interval].volumes.toArray(),
      count: candleDataStore[interval].timestamps.getSize(),
      market: activeMappings[interval]
    };
  }
  return result;
}

/**
 * 최신 캔들 데이터 가져오기
 * @param {number} interval - 시간 간격 (분 단위: 1, 3, 5, 10, 15, 30, 60, 240)
 */
export function getLatestCandle(interval = 1) {
  if (!candleDataStore[interval] || candleDataStore[interval].timestamps.getSize() === 0) {
    return null;
  }

  return {
    timestamp: candleDataStore[interval].timestamps.get(0),
    closingPrice: candleDataStore[interval].closingPrices.get(0),
    volume: candleDataStore[interval].volumes.get(0),
    interval: interval
  };
}

/**
 * 특정 범위의 데이터 가져오기
 * @param {number} interval - 시간 간격 (분 단위)
 * @param {number} start - 시작 인덱스
 * @param {number} end - 끝 인덱스 (선택사항)
 */
export function getCandleRange(interval, start, end) {
  if (!candleDataStore[interval]) {
    return {
      timestamps: [],
      closingPrices: [],
      volumes: [],
      count: 0,
      interval: interval
    };
  }

  const timestamps = candleDataStore[interval].timestamps.slice(start, end);
  const closingPrices = candleDataStore[interval].closingPrices.slice(start, end);
  const volumes = candleDataStore[interval].volumes.slice(start, end);

  return {
    timestamps,
    closingPrices,
    volumes,
    count: timestamps.length,
    interval: interval
  };
}

/**
 * 캔들 데이터 자동 업데이트 시작
 * @param {string} market - 마켓 코드 (예: 'KRW-BTC')
 * @param {number} interval - 시간 간격 (분 단위: 1, 3, 5, 10, 15, 30, 60, 240)
 */
export async function startCandleUpdates(market = 'KRW-BTC', interval = 1) {
  try {
    // 지원하는 시간 간격 확인
    const validIntervals = [1, 3, 5, 10, 15, 30, 60, 240];
    if (!validIntervals.includes(interval)) {
      throw new Error(`지원하지 않는 시간 간격입니다. 사용 가능한 값: ${validIntervals.join(', ')}`);
    }

    // 이미 해당 interval에 대한 업데이트가 실행 중이면 중지하고 재시작
    if (updateIntervals[interval]) {
      console.log(`[재시작] 기존 ${interval}분봉 업데이트 중지 후 재시작`);
      clearInterval(updateIntervals[interval]);
    }

    activeMappings[interval] = market;

    console.log(`[자동 시작] ${market} ${interval}분봉 데이터 업데이트 시작...`);

    // 초기 데이터 200개 가져오기
    const initialResponse = await axios.get(`https://api.upbit.com/v1/candles/minutes/${interval}`, {
      params: { market, count: MAX_DATA_COUNT }
    });

    // 해당 interval에 대한 Circular Buffer 초기화
    candleDataStore[interval] = {
      timestamps: new CircularBuffer(MAX_DATA_COUNT),
      closingPrices: new CircularBuffer(MAX_DATA_COUNT),
      volumes: new CircularBuffer(MAX_DATA_COUNT)
    };

    // 초기 데이터를 역순으로 추가 (API는 최신 -> 오래된 순서로 반환)
    // Circular Buffer에는 오래된 것부터 추가해야 함
    for (let i = initialResponse.data.length - 1; i >= 0; i--) {
      const candle = initialResponse.data[i];
      candleDataStore[interval].timestamps.push(Math.floor(candle.timestamp / 1000));
      candleDataStore[interval].closingPrices.push(candle.trade_price);
      candleDataStore[interval].volumes.push(candle.candle_acc_trade_volume);
    }

    console.log(`[자동 시작] ${interval}분봉 초기 ${candleDataStore[interval].timestamps.getSize()}개 데이터 메모리에 로드 완료`);
    console.log(`  - 최신: ${new Date(candleDataStore[interval].timestamps.get(0) * 1000).toISOString()} / 종가: ${candleDataStore[interval].closingPrices.get(0).toLocaleString()}`);

    // interval 분마다 업데이트 (밀리초로 변환)
    updateIntervals[interval] = setInterval(async () => {
      try {
        const response = await axios.get(`https://api.upbit.com/v1/candles/minutes/${interval}`, {
          params: { market, count: 1 }
        });

        const candle = response.data[0];

        // Circular Buffer에 새 데이터 추가 - O(1)
        candleDataStore[interval].timestamps.push(Math.floor(candle.timestamp / 1000));
        candleDataStore[interval].closingPrices.push(candle.trade_price);
        candleDataStore[interval].volumes.push(candle.candle_acc_trade_volume);

        console.log(`[자동 업데이트 ${interval}분봉] ${new Date(candle.timestamp).toISOString()} - 종가: ${candle.trade_price.toLocaleString()}, 거래량: ${candle.candle_acc_trade_volume}`);
      } catch (error) {
        console.error(`[자동 업데이트 실패 ${interval}분봉]`, error.message);
      }
    }, interval * 60000);  // interval을 밀리초로 변환

    return {
      success: true,
      message: `${market} ${interval}분봉 자동 업데이트 시작`,
      initialDataCount: candleDataStore[interval].timestamps.getSize(),
      interval: interval
    };
  } catch (error) {
    console.error('[자동 시작 실패]', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 캔들 데이터 자동 업데이트 중지
 * @param {number} interval - 중지할 시간 간격 (생략 시 모든 업데이트 중지)
 */
export function stopCandleUpdates(interval = null) {
  if (interval !== null) {
    // 특정 interval만 중지
    if (updateIntervals[interval]) {
      clearInterval(updateIntervals[interval]);
      delete updateIntervals[interval];
      const market = activeMappings[interval];
      console.log(`[중지] ${market} ${interval}분봉 자동 업데이트 중지됨`);
      return {
        success: true,
        message: `${interval}분봉 자동 업데이트 중지됨`,
        interval: interval
      };
    }
    return {
      success: false,
      message: `${interval}분봉 실행 중인 업데이트가 없습니다`,
      interval: interval
    };
  } else {
    // 모든 interval 중지
    let stoppedCount = 0;
    for (const int in updateIntervals) {
      clearInterval(updateIntervals[int]);
      const market = activeMappings[int];
      console.log(`[중지] ${market} ${int}분봉 자동 업데이트 중지됨`);
      stoppedCount++;
    }

    // updateIntervals 초기화
    for (const key in updateIntervals) {
      delete updateIntervals[key];
    }

    if (stoppedCount > 0) {
      return {
        success: true,
        message: `${stoppedCount}개의 자동 업데이트가 중지됨`,
        stoppedCount: stoppedCount
      };
    }
    return { success: false, message: '실행 중인 업데이트가 없습니다' };
  }
}

/**
 * Upbit 계좌 조회
 */
export async function fetchUpbitAccounts(accessKey, secretKey) {
  try {
    const jwtToken = await createUpbitJWT(accessKey, secretKey);

    const API_ENDPOINT = 'https://api.upbit.com/v1/accounts';
    const headers = {
      Accept: 'application/json',
      Authorization: `Bearer ${jwtToken}`,
    };

    const response = await axios.get(API_ENDPOINT, { headers });
    return response.data;
  } catch (error) {
    const errorMessage = error.response ? error.response.data : error.message;
    console.error('Main Process API Error:', errorMessage);
    throw new Error(JSON.stringify(errorMessage));
  }
}

/**
 * Upbit 캔들 데이터 조회
 * @param {string} market - 마켓 코드 (예: 'KRW-BTC')
 * @param {number} interval - 시간 간격 (분 단위: 1, 3, 5, 10, 15, 30, 60, 240)
 * @param {number} count - 가져올 캔들 개수 (기본값: 200, 최대: 200)
 */
export async function fetchCandles(market, interval = 1, count = 200) {
  try {
    const validIntervals = [1, 3, 5, 10, 15, 30, 60, 240];
    if (!validIntervals.includes(interval)) {
      throw new Error(`지원하지 않는 시간 간격입니다. 사용 가능한 값: ${validIntervals.join(', ')}`);
    }

    const API_ENDPOINT = `https://api.upbit.com/v1/candles/minutes/${interval}`;
    const params = {
      market: market,
      count: count,
    };

    const response = await axios.get(API_ENDPOINT, { params });
    console.log(`${market} ${interval}분봉 데이터 ${response.data.length}개 조회 완료`);
    return response.data;
  } catch (error) {
    const errorMessage = error.response ? error.response.data : error.message;
    console.error(`Upbit ${interval}분봉 데이터 조회 실패:`, errorMessage);
    throw new Error(JSON.stringify(errorMessage));
  }
}

/**
 * Upbit 1분봉 데이터 조회 (하위 호환성 유지)
 */
export async function fetch1mCandles(market, count = 200) {
  return fetchCandles(market, 1, count);
}

/**
 * Upbit 캔들 데이터 가져와서 배열 형태로 변환
 * @param {string} market - 마켓 코드 (예: 'KRW-BTC')
 * @param {number} interval - 시간 간격 (분 단위: 1, 3, 5, 10, 15, 30, 60, 240)
 * @param {number} count - 가져올 캔들 개수 (기본값: 200, 최대: 200)
 */
export async function fetchAndFormatCandles(market, interval = 1, count = 200) {
  try {
    console.log(`${market} ${interval}분봉 데이터 ${count}개 가져오는 중...`);
    const rawData = await fetchCandles(market, interval, count);
    console.log(`${market} ${interval}분봉 데이터 ${rawData.length}개 조회 완료`);

    // 배열 형태로 변환 [timestamp(초), closing_price, volume]
    const simplifiedData = rawData.map(candle => [
      Math.floor(candle.timestamp / 1000),  // timestamp (초 단위)
      candle.trade_price,                    // closing_price
      candle.candle_acc_trade_volume         // volume
    ]);

    console.log(`첫 번째 데이터 - 종가: ${simplifiedData[0][1]}, 거래량: ${simplifiedData[0][2]}`);

    return {
      success: true,
      data: simplifiedData,
      dataCount: simplifiedData.length,
      market: market,
      interval: interval
    };
  } catch (error) {
    const errorMessage = error.response ? error.response.data : error.message;
    console.error('데이터 가져오기 및 변환 실패:', errorMessage);
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Upbit 1분봉 데이터 가져와서 배열 형태로 변환 (하위 호환성 유지)
 */
export async function fetchAndFormat1mCandles(market, count = 200) {
  return fetchAndFormatCandles(market, 1, count);
}

/**
 * Upbit 통합 주문 함수
 * @param {string} accessKey - Access Key
 * @param {string} secretKey - Secret Key
 * @param {object} options - 주문 옵션
 * @param {string} options.market - 마켓 코드 (예: 'KRW-BTC')
 * @param {string} options.side - 주문 종류 ('bid': 매수, 'ask': 매도)
 * @param {string} options.orderType - 주문 타입
 *   - 'market': 시장가 (매수: price 지정, 매도: volume 지정)
 *   - 'limit': 지정가 (price, volume 둘 다 지정)
 * @param {number} [options.price] - 주문 가격 또는 금액
 *   - 시장가 매수: KRW 금액
 *   - 지정가: 1개당 가격
 * @param {number} [options.volume] - 주문 수량
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export async function placeOrder(accessKey, secretKey, options) {
  try {
    const { market, side, orderType, price, volume } = options;

    // 주문 타입별 body 구성
    let body = {
      market: market,
      side: side,  // 'bid' (매수) or 'ask' (매도)
    };

    if (orderType === 'market') {
      // 시장가 주문
      if (side === 'bid') {
        // 시장가 매수: 금액 지정
        body.ord_type = 'price';
        body.price = price.toString();
      } else {
        // 시장가 매도: 수량 지정
        body.ord_type = 'market';
        body.volume = volume.toString();
      }
    } else if (orderType === 'limit') {
      // 지정가 주문: 가격과 수량 둘 다 지정
      body.ord_type = 'limit';
      body.price = price.toString();
      body.volume = volume.toString();
    } else {
      throw new Error(`지원하지 않는 주문 타입: ${orderType}`);
    }

    // JWT 인증 토큰 생성 (쿼리 파라미터 포함)
    const jwtToken = await createUpbitJWT(accessKey, secretKey, body);

    // API 요청
    const API_ENDPOINT = 'https://api.upbit.com/v1/orders';
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwtToken}`,
    };

    const response = await axios.post(API_ENDPOINT, body, { headers });

    const sideKr = side === 'bid' ? '매수' : '매도';
    const typeKr = orderType === 'market' ? '시장가' : '지정가';
    console.log(`[주문 성공] ${market} - ${typeKr} ${sideKr}`);

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    const errorMessage = error.response ? error.response.data : error.message;
    console.error('[주문 실패]', errorMessage);
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * 시장가 매수 (간편 함수)
 * @param {string} accessKey - Access Key
 * @param {string} secretKey - Secret Key
 * @param {string} market - 마켓 코드
 * @param {number} price - KRW 금액
 */
export async function marketBuy(accessKey, secretKey, market, price) {
  return placeOrder(accessKey, secretKey, {
    market,
    side: 'bid',
    orderType: 'market',
    price
  });
}

/**
 * 시장가 매도 (간편 함수)
 * @param {string} accessKey - Access Key
 * @param {string} secretKey - Secret Key
 * @param {string} market - 마켓 코드
 * @param {number} volume - 매도 수량
 */
export async function marketSell(accessKey, secretKey, market, volume) {
  return placeOrder(accessKey, secretKey, {
    market,
    side: 'ask',
    orderType: 'market',
    volume
  });
}

/**
 * 지정가 매수 (간편 함수)
 * @param {string} accessKey - Access Key
 * @param {string} secretKey - Secret Key
 * @param {string} market - 마켓 코드
 * @param {number} price - 1개당 가격
 * @param {number} volume - 매수 수량
 */
export async function limitBuy(accessKey, secretKey, market, price, volume) {
  return placeOrder(accessKey, secretKey, {
    market,
    side: 'bid',
    orderType: 'limit',
    price,
    volume
  });
}

/**
 * 지정가 매도 (간편 함수)
 * @param {string} accessKey - Access Key
 * @param {string} secretKey - Secret Key
 * @param {string} market - 마켓 코드
 * @param {number} price - 1개당 가격
 * @param {number} volume - 매도 수량
 */
export async function limitSell(accessKey, secretKey, market, price, volume) {
  return placeOrder(accessKey, secretKey, {
    market,
    side: 'ask',
    orderType: 'limit',
    price,
    volume
  });
}

/**
 * 현재가 조회
 * @param {string} market - 마켓 코드 (예: 'KRW-BTC')
 */
export async function getCurrentPrice(market) {
  try {
    const API_ENDPOINT = `https://api.upbit.com/v1/ticker`;
    const params = { markets: market };

    const response = await axios.get(API_ENDPOINT, { params });
    const currentPrice = response.data[0].trade_price;

    console.log(`[현재가] ${market}: ${currentPrice.toLocaleString()}원`);
    return {
      success: true,
      price: currentPrice,
      data: response.data[0]
    };
  } catch (error) {
    const errorMessage = error.response ? error.response.data : error.message;
    console.error('[현재가 조회 실패]', errorMessage);
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * 현재가로 지정가 매수 (간편 함수)
 * @param {string} accessKey - Access Key
 * @param {string} secretKey - Secret Key
 * @param {string} market - 마켓 코드
 * @param {number} volume - 매수 수량
 */
export async function buyAtCurrentPrice(accessKey, secretKey, market, volume) {
  const priceInfo = await getCurrentPrice(market);
  if (!priceInfo.success) {
    return priceInfo;
  }

  return limitBuy(accessKey, secretKey, market, priceInfo.price, volume);
}

/**
 * 현재가로 지정가 매도 (간편 함수)
 * @param {string} accessKey - Access Key
 * @param {string} secretKey - Secret Key
 * @param {string} market - 마켓 코드
 * @param {number} volume - 매도 수량
 */
export async function sellAtCurrentPrice(accessKey, secretKey, market, volume) {
  const priceInfo = await getCurrentPrice(market);
  if (!priceInfo.success) {
    return priceInfo;
  }

  return limitSell(accessKey, secretKey, market, priceInfo.price, volume);
}

/**
 * KRW 금액으로 지정가 매수 (금액 지정 -> 수량 자동 계산)
 * @param {string} accessKey - Access Key
 * @param {string} secretKey - Secret Key
 * @param {string} market - 마켓 코드
 * @param {number} price - 1개당 가격
 * @param {number} krwAmount - 사용할 KRW 금액
 */
export async function limitBuyWithKRW(accessKey, secretKey, market, price, krwAmount) {
  const volume = krwAmount / price;
  return limitBuy(accessKey, secretKey, market, price, volume);
}

/**
 * 보유 수량 전체 매도
 * @param {string} accessKey - Access Key
 * @param {string} secretKey - Secret Key
 * @param {string} market - 마켓 코드
 * @param {string} orderType - 'market' 또는 'limit'
 * @param {number} [limitPrice] - 지정가인 경우 가격
 */
export async function sellAll(accessKey, secretKey, market, orderType = 'market', limitPrice = null) {
  try {
    // 계좌 조회해서 보유 수량 확인
    const accounts = await fetchUpbitAccounts(accessKey, secretKey);
    const currency = market.split('-')[1]; // 'KRW-BTC' -> 'BTC'
    const account = accounts.find(acc => acc.currency === currency);

    if (!account || parseFloat(account.balance) === 0) {
      return {
        success: false,
        error: '보유한 코인이 없습니다'
      };
    }

    const volume = parseFloat(account.balance);

    if (orderType === 'market') {
      return marketSell(accessKey, secretKey, market, volume);
    } else if (orderType === 'limit') {
      const price = limitPrice || (await getCurrentPrice(market)).price;
      return limitSell(accessKey, secretKey, market, price, volume);
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
