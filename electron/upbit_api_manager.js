import axios from 'axios';
import { createUpbitJWT } from './upbit/auth.js';
import Store from 'electron-store';

// Store 인스턴스 생성
const store = new Store({
  encryptionKey: 'trade-builder-encryption-key-2024',
});

/**
 * API 키 저장
 */
export async function saveApiKeys(accessKey, secretKey) {
  try {
    store.set('upbit.accessKey', accessKey);
    store.set('upbit.secretKey', secretKey);
    return true;
  } catch (error) {
    console.error('API 키 저장 실패:', error);
    throw error;
  }
}

/**
 * API 키 불러오기
 */
export async function loadApiKeys() {
  try {
    const accessKey = store.get('upbit.accessKey');
    const secretKey = store.get('upbit.secretKey');

    if (accessKey && secretKey) {
      return { accessKey, secretKey };
    }

    return null;
  } catch (error) {
    console.error('API 키 불러오기 실패:', error);
    return null;
  }
}

/**
 * Upbit 계좌 조회
 */
export async function fetchUpbitAccounts() {
  try {
    const keys = await loadApiKeys();
    if (!keys) {
      throw new Error('저장된 API 키가 없습니다.');
    }

    const { accessKey, secretKey } = keys;

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
 * @param {number} period - 시간 간격 (분 단위: 1, 3, 5, 10, 15, 30, 60, 240)
 * @param {number} count - 가져올 캔들 개수 (기본값: 200, 최대: 200)
 */
export async function fetchCandles(market, period = 1, count = 200) {
  try {
    const validIntervals = [1, 3, 5, 10, 15, 30, 60, 240];
    if (!validIntervals.includes(period)) {
      throw new Error(`지원하지 않는 시간 간격입니다. 사용 가능한 값: ${validIntervals.join(', ')}`);
    }

    const API_ENDPOINT = `https://api.upbit.com/v1/candles/minutes/${period}`;
    const params = {
      market: market,
      count: count,
    };

    const response = await axios.get(API_ENDPOINT, { params });
    console.log(`${market} ${period}분봉 데이터 ${response.data.length}개 조회 완료`);
    
    // 객체 형태로 변환 (역순으로 한 번에 처리: 오래된 것 -> 최신 순으로)
    const simplifiedData = [];
    for (let i = response.data.length - 1; i >= 0; i--) {
      const candle = response.data[i];
      simplifiedData.push({
        timestamp: Math.floor(candle.timestamp / 1000),
        price: candle.trade_price,
        volume: candle.candle_acc_trade_volume
      });
    }
    return {
      success: true,
      data: simplifiedData,
    };
  } catch (error) {
    const errorMessage = error.response ? error.response.data : error.message;
    console.error(`Upbit ${period}분봉 데이터 조회 실패:`, errorMessage);
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Upbit 최고가 조회 (일/주/월/년 단위)
 * @param {string} market - 마켓 코드 (예: 'KRW-BTC')
 * @param {string} periodUnit - 기간 단위 ('day', 'week', 'month', 'year')
 * @param {number} period - 조회할 캔들 개수
 * @returns {Promise<number>} 해당 기간의 최고가
 */
export async function getHighestPrice(market, periodUnit, period) {
  try {
    const validPeriods = ['day', 'week', 'month', 'year'];
    if (!validPeriods.includes(periodUnit)) {
      throw new Error(`지원하지 않는 기간입니다. 사용 가능한 값: ${validPeriods.join(', ')}`);
    }

    const API_ENDPOINT = `https://api.upbit.com/v1/candles/${periodUnit}s`;
    const params = {
      market: market,
      count: period,
    };

    const response = await axios.get(API_ENDPOINT, { params });
    
    // 모든 캔들의 high_price 중 최대값 찾기
    let highestPrice = 0;
    for (const candle of response.data) {
      if (candle.high_price > highestPrice) {
        highestPrice = candle.high_price;
      }
    }
    
    console.log(`${market} ${period}개 ${periodUnit} 최고가: ${highestPrice.toLocaleString()}원`);
    return highestPrice;
  } catch (error) {
    const errorMessage = error.response ? error.response.data : error.message;
    console.error(`Upbit ${periodUnit} 최고가 조회 실패:`, errorMessage);
    throw error;
  }
}

/**
 * Upbit 통합 주문 함수
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
export async function placeOrder(options) {
  try {
    const keys = await loadApiKeys();
    if (!keys) {
      return {
        success: false,
        error: '저장된 API 키가 없습니다.'
      };
    }

    const { accessKey, secretKey } = keys;
    const { market, side, orderType, price, volume } = options;

    // 주문 타입별 body 구성
    const body = {
      market,
      side,  // 'bid' (매수) or 'ask' (매도)
    };

    if (orderType === 'market') {
      // 시장가 주문
      if (side === 'bid') {
        // 시장가 매수: 금액 지정
        body.ord_type = 'price';
        body.price = String(price);
      } else {
        // 시장가 매도: 수량 지정
        body.ord_type = 'market';
        body.volume = String(volume);
      }
    } else if (orderType === 'limit') {
      // 지정가 주문: 가격과 수량 둘 다 지정
      body.ord_type = 'limit';
      body.price = String(price);
      body.volume = String(volume);
    } else {
      throw new Error(`지원하지 않는 주문 타입: ${orderType}`);
    }

    // JWT 인증 토큰 생성
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
 * @param {string} market - 마켓 코드
 * @param {number} price - KRW 금액
 */
export async function marketBuy(market, price) {
  return placeOrder({
    market,
    side: 'bid',
    orderType: 'market',
    price
  });
}

/**
 * 시장가 매도 (간편 함수)
 * @param {string} market - 마켓 코드
 * @param {number} volume - 매도 수량
 */
export async function marketSell(market, volume) {
  return placeOrder({
    market,
    side: 'ask',
    orderType: 'market',
    volume
  });
}



/**
 * 현재가 조회 (단일 마켓)
 * @param {string} market - 마켓 코드 (예: 'KRW-BTC')
 */
export async function getCurrentPrice(market) {
  try {
    const API_ENDPOINT = `https://api.upbit.com/v1/ticker`;
    const params = { markets: market };

    const response = await axios.get(API_ENDPOINT, { params });
    const currentPrice = response.data[0].trade_price;

    return {
      success: true,
      price: currentPrice,
      data: response.data[0]
    };
  } catch (error) {
    const errorMessage = error.response ? error.response.data : error.message;
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * 현재가 일괄 조회 (여러 마켓 동시 조회)
 * @param {string[]} markets - 마켓 코드 배열 (예: ['KRW-BTC', 'KRW-ETH'])
 * @returns {Promise<{success: boolean, data?: Object, error?: any}>}
 */
export async function getCurrentPrices(markets) {
  try {
    if (!markets || markets.length === 0) {
      return {
        success: true,
        data: {}
      };
    }

    const API_ENDPOINT = `https://api.upbit.com/v1/ticker`;
    const params = { markets: markets.join(',') };

    const response = await axios.get(API_ENDPOINT, { params });

    // { 'KRW-BTC': 50000000, 'KRW-ETH': 3000000 } 형태로 변환
    const priceMap = {};
    response.data.forEach(ticker => {
      priceMap[ticker.market] = ticker.trade_price;
      // 오늘의 시가(opening_price)도 저장 - P/L 계산에 사용
      priceMap[`${ticker.market}_open`] = ticker.opening_price;
    });

    // console.log(`[현재가 일괄 조회] ${markets.length}개 마켓 조회 완료`);
    return {
      success: true,
      data: priceMap
    };
  } catch (error) {
    const errorMessage = error.response ? error.response.data : error.message;
    // console.error('[현재가 일괄 조회 실패]', errorMessage);
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * KRW 금액으로 지정가 매수 (금액 지정 -> 수량 자동 계산)
 * @param {string} market - 마켓 코드
 * @param {number} price - 1개당 가격
 * @param {number} krwAmount - 사용할 KRW 금액
 */
export async function limitBuyWithKRW(market, price, krwAmount) {
  const volume = krwAmount / price;
  return placeOrder({
    market,
    side: 'bid',
    orderType: 'limit',
    price,
    volume
  });
}

/**
 * KRW 금액으로 지정가 매도 (금액 지정 -> 수량 자동 계산)
 * @param {string} market - 마켓 코드
 * @param {number} price - 1개당 가격
 * @param {number} krwAmount - 매도할 KRW 금액 (가격 * 수량)
 */
export async function limitSellWithKRW(market, price, krwAmount) {
  const volume = krwAmount / price;
  return placeOrder({
    market,
    side: 'ask',
    orderType: 'limit',
    price,
    volume
  });
}

/**
 * 보유 수량 전체 매도
 * @param {string} market - 마켓 코드
 * @param {string} orderType - 'market' 또는 'limit'
 * @param {number} [limitPrice] - 지정가인 경우 가격
 */
export async function sellAll(market, orderType = 'market', limitPrice = null) {
  try {
    // 계좌 조회해서 보유 수량 확인
    const accounts = await fetchUpbitAccounts();
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
      return marketSell(market, volume);
    } else if (orderType === 'limit') {
      const price = limitPrice || (await getCurrentPrice(market)).price;
      return placeOrder({
        market,
        side: 'ask',
        orderType: 'limit',
        price,
        volume
      });
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
