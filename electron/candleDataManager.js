import axios from 'axios';
import { SignJWT } from 'jose';
import { v4 as uuidv4 } from 'uuid';

// 메모리에 저장되는 캔들 데이터 (시간 간격별로 분리)
// 구조: { interval: { timestamps: [], closingPrices: [], volumes: [] } }
const candleDataStore = {};
const MAX_DATA_COUNT = 200;

// 각 시간 간격별 업데이트 인터벌 저장
const updateIntervals = {};

// 현재 활성화된 마켓 저장
let activeMappings = {}; // { interval: market }

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
    timestamps: candleDataStore[interval].timestamps.slice(),
    closingPrices: candleDataStore[interval].closingPrices.slice(),
    volumes: candleDataStore[interval].volumes.slice(),
    count: candleDataStore[interval].timestamps.length,
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
      timestamps: candleDataStore[interval].timestamps.slice(),
      closingPrices: candleDataStore[interval].closingPrices.slice(),
      volumes: candleDataStore[interval].volumes.slice(),
      count: candleDataStore[interval].timestamps.length,
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
  if (!candleDataStore[interval] || candleDataStore[interval].timestamps.length === 0) {
    return null;
  }

  return {
    timestamp: candleDataStore[interval].timestamps[0],
    closingPrice: candleDataStore[interval].closingPrices[0],
    volume: candleDataStore[interval].volumes[0],
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

  const validEnd = end || candleDataStore[interval].timestamps.length;
  return {
    timestamps: candleDataStore[interval].timestamps.slice(start, validEnd),
    closingPrices: candleDataStore[interval].closingPrices.slice(start, validEnd),
    volumes: candleDataStore[interval].volumes.slice(start, validEnd),
    count: validEnd - start,
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

    // 해당 interval에 대한 저장소 초기화
    if (!candleDataStore[interval]) {
      candleDataStore[interval] = {
        timestamps: [],
        closingPrices: [],
        volumes: []
      };
    }

    // 데이터 초기화 및 저장
    candleDataStore[interval].timestamps = [];
    candleDataStore[interval].closingPrices = [];
    candleDataStore[interval].volumes = [];

    initialResponse.data.forEach(candle => {
      // timestamp를 숫자(초)로 변환 (밀리초 / 1000)
      candleDataStore[interval].timestamps.push(Math.floor(candle.timestamp / 1000));
      candleDataStore[interval].closingPrices.push(candle.trade_price);
      candleDataStore[interval].volumes.push(candle.candle_acc_trade_volume);
    });

    console.log(`[자동 시작] ${interval}분봉 초기 ${candleDataStore[interval].timestamps.length}개 데이터 메모리에 로드 완료`);
    console.log(`  - 최신: ${new Date(candleDataStore[interval].timestamps[0] * 1000).toISOString()} / 종가: ${candleDataStore[interval].closingPrices[0].toLocaleString()}`);

    // interval 분마다 업데이트 (밀리초로 변환)
    updateIntervals[interval] = setInterval(async () => {
      try {
        const response = await axios.get(`https://api.upbit.com/v1/candles/minutes/${interval}`, {
          params: { market, count: 1 }
        });

        const candle = response.data[0];

        // 맨 앞에 새 데이터 추가 (timestamp는 초 단위 숫자)
        candleDataStore[interval].timestamps.unshift(Math.floor(candle.timestamp / 1000));
        candleDataStore[interval].closingPrices.unshift(candle.trade_price);
        candleDataStore[interval].volumes.unshift(candle.candle_acc_trade_volume);

        // 200개 초과 시 맨 뒤 데이터 삭제
        if (candleDataStore[interval].timestamps.length > MAX_DATA_COUNT) {
          candleDataStore[interval].timestamps.pop();
          candleDataStore[interval].closingPrices.pop();
          candleDataStore[interval].volumes.pop();
        }

        console.log(`[자동 업데이트 ${interval}분봉] ${new Date(candle.timestamp).toISOString()} - 종가: ${candle.trade_price.toLocaleString()}, 거래량: ${candle.candle_acc_trade_volume}`);
      } catch (error) {
        console.error(`[자동 업데이트 실패 ${interval}분봉]`, error.message);
      }
    }, interval * 60000);  // interval을 밀리초로 변환

    return {
      success: true,
      message: `${market} ${interval}분봉 자동 업데이트 시작`,
      initialDataCount: candleDataStore[interval].timestamps.length,
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
    const payload = {
      access_key: accessKey,
      nonce: uuidv4(),
    };

    const secret = new TextEncoder().encode(secretKey);
    const jwtToken = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .sign(secret);

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
