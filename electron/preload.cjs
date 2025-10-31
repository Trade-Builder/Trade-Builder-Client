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
   * Python 프로세스 시작
   */
  startRL: () => ipcRenderer.invoke('RL:start'),

  /**
   * Python 프로세스 종료
   */
  stopRL: () => ipcRenderer.invoke('RL:stop'),
});
