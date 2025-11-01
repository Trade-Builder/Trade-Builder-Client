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
   * 업비트 1분봉 캔들 데이터 조회
   * @param {string} market - 마켓 코드 (예: 'KRW-BTC')
   * @param {number} count - 가져올 캔들 개수 (기본값: 200, 최대: 200)
   * @returns {Promise<Array>} 1분봉 데이터 배열 (종가, 시가, 고가, 저가, 거래량 등)
   */
  fetch1mCandles: (market, count = 200) =>
    ipcRenderer.invoke('upbit:fetch1mCandles', market, count),

  /**
   * 업비트 1분봉 캔들 데이터 가져와서 바로 저장 (원스텝)
   * @param {string} market - 마켓 코드 (예: 'KRW-BTC')
   * @param {number} count - 가져올 캔들 개수 (기본값: 200, 최대: 200)
   * @returns {Promise<{success: boolean, path?: string, dataCount?: number, market?: string, error?: any}>}
   */
  fetchAndSave1mCandles: (market, count = 200) =>
    ipcRenderer.invoke('upbit:fetchAndSave1mCandles', market, count),

  /**
   * 업비트 1분봉 자동 업데이트 시작 (큐 방식)
   * 초기 200개 데이터를 가져온 후, 1분마다 최신 데이터 1개씩 업데이트
   * @param {string} market - 마켓 코드 (예: 'KRW-BTC')
   * @param {number} maxCount - 유지할 최대 데이터 개수 (기본값: 200)
   * @returns {Promise<{success: boolean, message?: string, path?: string, initialDataCount?: number, error?: string}>}
   */
  startCandleUpdates: (market, maxCount = 200) =>
    ipcRenderer.invoke('upbit:startCandleUpdates', market, maxCount),

  /**
   * 업비트 1분봉 자동 업데이트 중지
   * @returns {Promise<{success: boolean, message: string}>}
   */
  stopCandleUpdates: () =>
    ipcRenderer.invoke('upbit:stopCandleUpdates'),

  /**
   * Python 프로세스 시작
   */
  startRL: () => ipcRenderer.invoke('RL:start'),

  /**
   * Python 프로세스 종료
   */
  stopRL: () => ipcRenderer.invoke('RL:stop'),

  /**
   * 메모리에서 전체 캔들 데이터 가져오기
   * @returns {Promise<{timestamps: number[], closingPrices: number[], volumes: number[], count: number}>}
   */
  getCandleData: () => ipcRenderer.invoke('candle:getData'),

  /**
   * 최신 캔들 데이터 가져오기
   * @returns {Promise<{timestamp: number, closingPrice: number, volume: number} | null>}
   */
  getLatestCandle: () => ipcRenderer.invoke('candle:getLatest'),

  /**
   * 특정 범위의 캔들 데이터 가져오기
   * @param {number} start - 시작 인덱스 (0부터 시작, 0이 최신 데이터)
   * @param {number} end - 끝 인덱스 (생략 시 끝까지)
   * @returns {Promise<{timestamps: number[], closingPrices: number[], volumes: number[], count: number}>}
   */
  getCandleRange: (start, end) => ipcRenderer.invoke('candle:getRange', start, end),
});
