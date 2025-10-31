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

  // 로직 배열 파일 저장/로드
  /**
   * 모든 로직 불러오기
   * @returns {Promise<Array>} 로직 배열
   */
  loadAllLogics: () => ipcRenderer.invoke('logics:loadAll'),
  /**
   * 모든 로직 저장 (덮어쓰기)
   * @param {Array} logics
   * @returns {Promise<boolean>}
   */
  saveAllLogics: (logics) => ipcRenderer.invoke('logics:saveAll', logics),
  /**
   * 특정 로직 삭제 후 저장
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  deleteLogicById: (id) => ipcRenderer.invoke('logics:deleteById', id),
});
