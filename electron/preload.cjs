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
   * 업비트 1분봉 캔들 데이터 조회 (하위 호환성)
   * @param {string} market - 마켓 코드 (예: 'KRW-BTC')
   * @param {number} count - 가져올 캔들 개수 (기본값: 200, 최대: 200)
   * @returns {Promise<Array>} 1분봉 데이터 배열 (종가, 시가, 고가, 저가, 거래량 등)
   */
  fetch1mCandles: (market, count = 200) =>
    ipcRenderer.invoke('upbit:fetch1mCandles', market, count),

  /**
   * 업비트 캔들 데이터 조회 (시간 간격 선택 가능)
   * @param {string} market - 마켓 코드 (예: 'KRW-BTC')
   * @param {number} interval - 시간 간격 (분 단위: 1, 3, 5, 10, 15, 30, 60, 240)
   * @param {number} count - 가져올 캔들 개수 (기본값: 200, 최대: 200)
   * @returns {Promise<Array>} 캔들 데이터 배열
   */
  fetchCandles: (market, interval = 1, count = 200) =>
    ipcRenderer.invoke('upbit:fetchCandles', market, interval, count),

  /**
   * 업비트 1분봉 캔들 데이터 가져와서 바로 저장 (하위 호환성)
   * @param {string} market - 마켓 코드 (예: 'KRW-BTC')
   * @param {number} count - 가져올 캔들 개수 (기본값: 200, 최대: 200)
   * @returns {Promise<{success: boolean, data?: Array, dataCount?: number, market?: string, interval?: number, error?: any}>}
   */
  fetchAndSave1mCandles: (market, count = 200) =>
    ipcRenderer.invoke('upbit:fetchAndSave1mCandles', market, count),

  /**
   * 업비트 캔들 데이터 가져와서 배열로 저장 (시간 간격 선택 가능)
   * @param {string} market - 마켓 코드 (예: 'KRW-BTC')
   * @param {number} interval - 시간 간격 (분 단위: 1, 3, 5, 10, 15, 30, 60, 240)
   * @param {number} count - 가져올 캔들 개수 (기본값: 200, 최대: 200)
   * @returns {Promise<{success: boolean, data?: Array, dataCount?: number, market?: string, interval?: number, error?: any}>}
   */
  fetchAndSaveCandles: (market, interval = 1, count = 200) =>
    ipcRenderer.invoke('upbit:fetchAndSaveCandles', market, interval, count),

  /**
   * 업비트 캔들 자동 업데이트 시작 (시간 간격 선택 가능)
   * 초기 200개 데이터를 가져온 후, interval마다 최신 데이터 1개씩 업데이트
   * @param {string} market - 마켓 코드 (예: 'KRW-BTC')
   * @param {number} interval - 시간 간격 (분 단위: 1, 3, 5, 10, 15, 30, 60, 240)
   * @returns {Promise<{success: boolean, message?: string, initialDataCount?: number, interval?: number, error?: string}>}
   */
  startCandleUpdates: (market, interval = 1) =>
    ipcRenderer.invoke('upbit:startCandleUpdates', market, interval),

  /**
   * 캔들 데이터 자동 업데이트 중지
   * @param {number} interval - 중지할 시간 간격 (생략 시 모든 업데이트 중지)
   * @returns {Promise<{success: boolean, message: string}>}
   */
  stopCandleUpdates: (interval = null) =>
    ipcRenderer.invoke('upbit:stopCandleUpdates', interval),

  /**
   * Python 프로세스 시작
   */
  startRL: () => ipcRenderer.invoke('RL:start'),

  /**
   * Python 프로세스 종료
   */
  stopRL: () => ipcRenderer.invoke('RL:stop'),

  /**
   * 메모리에서 특정 시간 간격의 캔들 데이터 가져오기
   * @param {number} interval - 시간 간격 (분 단위: 1, 3, 5, 10, 15, 30, 60, 240)
   * @returns {Promise<{timestamps: number[], closingPrices: number[], volumes: number[], count: number, interval: number}>}
   */
  getCandleData: (interval = 1) => ipcRenderer.invoke('candle:getData', interval),

  /**
   * 메모리에서 모든 시간 간격의 캔들 데이터 가져오기
   * @returns {Promise<{[interval: number]: {timestamps: number[], closingPrices: number[], volumes: number[], count: number, market: string}}>}
   */
  getAllCandleData: () => ipcRenderer.invoke('candle:getAllData'),

  /**
   * 최신 캔들 데이터 가져오기
   * @param {number} interval - 시간 간격 (분 단위: 1, 3, 5, 10, 15, 30, 60, 240)
   * @returns {Promise<{timestamp: number, closingPrice: number, volume: number, interval: number} | null>}
   */
  getLatestCandle: (interval = 1) => ipcRenderer.invoke('candle:getLatest', interval),

  /**
   * 특정 범위의 캔들 데이터 가져오기
   * @param {number} interval - 시간 간격 (분 단위)
   * @param {number} start - 시작 인덱스 (0부터 시작, 0이 최신 데이터)
   * @param {number} end - 끝 인덱스 (생략 시 끝까지)
   * @returns {Promise<{timestamps: number[], closingPrices: number[], volumes: number[], count: number, interval: number}>}
   */
  getCandleRange: (interval, start, end) => ipcRenderer.invoke('candle:getRange', interval, start, end),
});
