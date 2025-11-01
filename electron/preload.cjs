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

  // 로직 파일 저장/로드 (분리 구조)
  /**
   * 로직 요약 목록(인덱스) 조회 [{id,name,stock,order}]
   */
  listLogics: () => ipcRenderer.invoke('logics:list'),
  /**
   * 새 로직 생성
   */
  createLogic: (name) => ipcRenderer.invoke('logics:create', name),
  /**
   * 특정 로직 로드
   */
  loadLogic: (id) => ipcRenderer.invoke('logics:load', id),
  /**
   * 특정 로직 저장
   */
  saveLogic: (logic) => ipcRenderer.invoke('logics:save', logic),
  /**
   * 특정 로직 삭제
   */
  deleteLogic: (id) => ipcRenderer.invoke('logics:delete', id),
  /**
   * 로직 순서 재배치
   */
  reorderLogics: (ids) => ipcRenderer.invoke('logics:reorder', ids),

  // 환경설정/앱 상태 (Electron Store)
  getTheme: () => ipcRenderer.invoke('prefs:getTheme'),
  setTheme: (theme) => ipcRenderer.invoke('prefs:setTheme', theme),
  getRunningLogic: () => ipcRenderer.invoke('app:getRunningLogic'),
  setRunningLogic: (meta) => ipcRenderer.invoke('app:setRunningLogic', meta),
});
