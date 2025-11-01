const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * API 키 저장
   * @param {string} accessKey
   * @param {string} secretKey
   * @returns {Promise<boolean>}
   */
  saveApiKeys: (accessKey, secretKey) => ipcRenderer.invoke('keys:save', accessKey, secretKey),

  /**
   * API 키 로드
   * @returns {Promise<{accessKey: string, secretKey: string} | null>}
   */
  loadApiKeys: () => ipcRenderer.invoke('keys:load'),

  /**
   * 업비트 계좌 정보 조회
   * @param {string} accessKey
   * @param {string} secretKey
   * @returns {Promise<any>}
   */
  fetchUpbitAccounts: (accessKey, secretKey) =>
    ipcRenderer.invoke('upbit:fetchAccounts', accessKey, secretKey),

  /**
   * 업비트 캔들 데이터 조회
   * @param {string} market - 마켓 코드 (예: 'KRW-BTC')
   * @param {number} period - 시간 간격 (분 단위: 1, 3, 5, 10, 15, 30, 60, 240)
   * @param {number} count - 가져올 캔들 개수 (기본값: 200, 최대: 200)
   * @returns {Promise<{success: boolean, data?: Array<{timestamp: number, price: number, volume: number}>, error?: any}>}
   */
  fetchCandles: (market, period = 1, count = 200) =>
    ipcRenderer.invoke('upbit:fetchCandles', market, period, count),

  /**
   * 업비트 최고가 조회
   * @param {string} market - 마켓 코드 (예: 'KRW-BTC')
   * @param {string} periodUnit - 기간 단위 ('day', 'week', 'month', 'year')
   * @param {number} period - 조회할 캔들 개수
   * @returns {Promise<number>} 해당 기간의 최고가
   */
  getHighestPrice: (market, periodUnit, period) =>
    ipcRenderer.invoke('upbit:getHighestPrice', market, periodUnit, period),

  /**
   * Python 프로세스 시작
   */
  startRL: () => ipcRenderer.invoke('RL:start'),

  /**
   * Python 프로세스 종료
   */
  stopRL: () => ipcRenderer.invoke('RL:stop'),

  /**
   * 업비트 통합 주문
   * @param {string} accessKey - Access Key
   * @param {string} secretKey - Secret Key
   * @param {object} options - 주문 옵션 {market, side, orderType, price, volume}
   * @returns {Promise<{success: boolean, data?: any, error?: any}>}
   */
  placeOrder: (accessKey, secretKey, options) =>
    ipcRenderer.invoke('upbit:placeOrder', accessKey, secretKey, options),

  /**
   * 업비트 시장가 매수
   * @param {string} accessKey - Access Key
   * @param {string} secretKey - Secret Key
   * @param {string} market - 마켓 코드 (예: 'KRW-BTC')
   * @param {number} price - 주문 금액 (KRW)
   * @returns {Promise<{success: boolean, data?: any, error?: any}>}
   */
  marketBuy: (accessKey, secretKey, market, price) =>
    ipcRenderer.invoke('upbit:marketBuy', accessKey, secretKey, market, price),

  /**
   * 업비트 시장가 매도
   * @param {string} accessKey - Access Key
   * @param {string} secretKey - Secret Key
   * @param {string} market - 마켓 코드 (예: 'KRW-BTC')
   * @param {number} volume - 매도할 코인 수량
   * @returns {Promise<{success: boolean, data?: any, error?: any}>}
   */
  marketSell: (accessKey, secretKey, market, volume) =>
    ipcRenderer.invoke('upbit:marketSell', accessKey, secretKey, market, volume),

  /**
   * 업비트 지정가 매수
   * @param {string} accessKey - Access Key
   * @param {string} secretKey - Secret Key
   * @param {string} market - 마켓 코드 (예: 'KRW-BTC')
   * @param {number} price - 1개당 가격
   * @param {number} volume - 매수 수량
   * @returns {Promise<{success: boolean, data?: any, error?: any}>}
   */
  limitBuy: (accessKey, secretKey, market, price, volume) =>
    ipcRenderer.invoke('upbit:limitBuy', accessKey, secretKey, market, price, volume),

  /**
   * 업비트 지정가 매도
   * @param {string} accessKey - Access Key
   * @param {string} secretKey - Secret Key
   * @param {string} market - 마켓 코드 (예: 'KRW-BTC')
   * @param {number} price - 1개당 가격
   * @param {number} volume - 매도 수량
   * @returns {Promise<{success: boolean, data?: any, error?: any}>}
   */
  limitSell: (accessKey, secretKey, market, price, volume) =>
    ipcRenderer.invoke('upbit:limitSell', accessKey, secretKey, market, price, volume),

  /**
   * 현재가 조회
   * @param {string} market - 마켓 코드 (예: 'KRW-BTC')
   * @returns {Promise<{success: boolean, price?: number, data?: any, error?: any}>}
   */
  getCurrentPrice: (market) =>
    ipcRenderer.invoke('upbit:getCurrentPrice', market),

  /**
   * 현재가로 지정가 매수
   * @param {string} accessKey - Access Key
   * @param {string} secretKey - Secret Key
   * @param {string} market - 마켓 코드 (예: 'KRW-BTC')
   * @param {number} volume - 매수 수량
   * @returns {Promise<{success: boolean, data?: any, error?: any}>}
   */
  buyAtCurrentPrice: (accessKey, secretKey, market, volume) =>
    ipcRenderer.invoke('upbit:buyAtCurrentPrice', accessKey, secretKey, market, volume),

  /**
   * 현재가로 지정가 매도
   * @param {string} accessKey - Access Key
   * @param {string} secretKey - Secret Key
   * @param {string} market - 마켓 코드 (예: 'KRW-BTC')
   * @param {number} volume - 매도 수량
   * @returns {Promise<{success: boolean, data?: any, error?: any}>}
   */
  sellAtCurrentPrice: (accessKey, secretKey, market, volume) =>
    ipcRenderer.invoke('upbit:sellAtCurrentPrice', accessKey, secretKey, market, volume),

  /**
   * KRW 금액으로 지정가 매수
   * @param {string} accessKey - Access Key
   * @param {string} secretKey - Secret Key
   * @param {string} market - 마켓 코드 (예: 'KRW-BTC')
   * @param {number} price - 1개당 가격
   * @param {number} krwAmount - 사용할 KRW 금액
   * @returns {Promise<{success: boolean, data?: any, error?: any}>}
   */
  limitBuyWithKRW: (accessKey, secretKey, market, price, krwAmount) =>
    ipcRenderer.invoke('upbit:limitBuyWithKRW', accessKey, secretKey, market, price, krwAmount),

  /**
   * 보유 수량 전체 매도
   * @param {string} accessKey - Access Key
   * @param {string} secretKey - Secret Key
   * @param {string} market - 마켓 코드 (예: 'KRW-BTC')
   * @param {string} orderType - 'market' 또는 'limit'
   * @param {number} [limitPrice] - 지정가인 경우 가격
   * @returns {Promise<{success: boolean, data?: any, error?: any}>}
   */
  sellAll: (accessKey, secretKey, market, orderType = 'market', limitPrice = null) =>
    ipcRenderer.invoke('upbit:sellAll', accessKey, secretKey, market, orderType, limitPrice),
});
