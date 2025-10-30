// Electron의 contextBridge와 ipcRenderer 모듈을 가져옵니다.
// contextBridge: 메인 프로세스와 렌더러 프로세스를 안전하게 연결합니다.
// ipcRenderer: 렌더러 프로세스에서 메인 프로세스로 비동기 메시지를 보냅니다.
const { contextBridge, ipcRenderer } = require('electron');

// contextBridge를 사용해 렌더러 프로세스의 전역 window 객체에 'electronAPI'라는 객체를 노출시킵니다.
// 이 방식은 프로세스 간의 경리를 유지하여 보안을 강화합니다.
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * API 키를 암호화해서 저장합니다.
   * @param {string} accessKey - Upbit Access Key
   * @param {string} secretKey - Upbit Secret Key
   * @returns {Promise<boolean>} 저장 성공 여부
   */
  saveApiKeys: (accessKey, secretKey) =>
    ipcRenderer.invoke('keys:save', accessKey, secretKey),

  /**
   * 저장된 API 키를 불러옵니다.
   * @returns {Promise<{accessKey: string, secretKey: string} | null>} 저장된 키 객체 또는 null
   */
  loadApiKeys: () =>
    ipcRenderer.invoke('keys:load'),

  /**
   * 메인 프로세스에 업비트 계좌 정보 조회를 비동기적으로 요청하는 함수입니다.
   * @param {string} accessKey - 사용자의 Access Key
   * @param {string} secretKey - 사용자의 Secret Key
   * @returns {Promise<any>} 메인 프로세스로부터 받은 API 응답 데이터가 담긴 Promise
   */
  fetchUpbitAccounts: (accessKey, secretKey) =>
    // ipcRenderer.invoke는 양방향 통신을 처리합니다.
    // 'upbit:fetchAccounts' 채널로 accessKey와 secretKey를 보내고,
    // 메인 프로세스가 해당 채널에서 작업을 완료하고 결과를 반환할 때까지 기다립니다.
    ipcRenderer.invoke('upbit:fetchAccounts', accessKey, secretKey),

  /**
   * RL 모델 추론을 요청합니다 (Python 스크립트 실행)
   * @param {string} market - 마켓 코드 (예: 'KRW-BTC')
   * @param {string} timeframe - 타임프레임 (예: '1h', '5m', '1d')
   * @param {number} count - 캔들 개수 (기본값: 200)
   * @returns {Promise<Object>} 추론 결과 { action, signal, confidence, trade_unit, portfolio_value }
   */
  predictWithRL: (market, timeframe = '1h', count = 200) =>
    ipcRenderer.invoke('rl:predict', market, timeframe, count)
});