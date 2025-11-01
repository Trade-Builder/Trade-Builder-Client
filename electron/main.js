import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SignJWT } from 'jose';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import Store from 'electron-store';
import { launchRLProcess, stopRLProcess } from './rl_launcher.js';
import {
  saveApiKeys,
  loadApiKeys,
  fetchUpbitAccounts,
  fetchCandles,
  getHighestPrice,
  placeOrder,
  marketBuy,
  marketSell,
  getCurrentPrice,
  getCurrentPrices,
  limitBuyWithKRW,
  limitSellWithKRW,
  sellAll
} from './upbit_api_manager.js';
import {
  listLogics as ls_listLogics,
  createLogic as ls_createLogic,
  loadLogic as ls_loadLogic,
  saveLogic as ls_saveLogic,
  deleteLogic as ls_deleteLogic,
  reorderLogics as ls_reorderLogics,
  loadLogicApiKeys as ls_loadLogicApiKeys,
  saveLogicApiKeys as ls_saveLogicApiKeys,
} from './logicStore.js';

// Store 인스턴스 생성
const store = new Store({
  encryptionKey: 'trade-builder-encryption-key-2024',
});

// __dirname 대체 (ESM 환경)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Vite 개발 서버 URL 로드
  mainWindow.loadURL('http://localhost:5173');

  // 개발자 도구 항상 열기
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(async () => {
  createWindow();
});

app.on('window-all-closed', function () {
    app.quit();
});

// 앱 종료 시 RL 프로세스 종료
app.on('before-quit', () => {
   stopRLProcess();
});

// IPC: API 키 저장
ipcMain.handle('keys:save', async (event, accessKey, secretKey) => {
  return await saveApiKeys(accessKey, secretKey);
});

// IPC: API 키 불러오기
ipcMain.handle('keys:load', async (event) => {
  return await loadApiKeys();
});

// IPC: Upbit 계좌 조회
ipcMain.handle('upbit:fetchAccounts', async (event) => {
  return await fetchUpbitAccounts();
});

// IPC: RL 프로세스 시작
ipcMain.handle('RL:start', () => {
  launchRLProcess();
});

// IPC: RL 프로세스 종료
ipcMain.handle('RL:stop', () => {
  stopRLProcess();
});

// IPC: Upbit 캔들 데이터 조회
ipcMain.handle('upbit:fetchCandles', async (event, market, period = 1, count = 200) => {
  return await fetchCandles(market, period, count);
});

// IPC: Upbit 최고가 조회
ipcMain.handle('upbit:getHighestPrice', async (event, market, periodUnit, period) => {
  return await getHighestPrice(market, periodUnit, period);
});

// IPC: 통합 주문
ipcMain.handle('upbit:placeOrder', async (event, options) => {
  return await placeOrder(options);
});

// IPC: 시장가 매수
ipcMain.handle('upbit:marketBuy', async (event, market, price) => {
  return await marketBuy(market, price);
});

// IPC: 시장가 매도
ipcMain.handle('upbit:marketSell', async (event, market, volume) => {
  return await marketSell(market, volume);
});

// IPC: 현재가 조회 (단일 마켓)
ipcMain.handle('upbit:getCurrentPrice', async (event, market) => {
  return await getCurrentPrice(market);
});

// IPC: 현재가 일괄 조회 (여러 마켓)
ipcMain.handle('upbit:getCurrentPrices', async (event, markets) => {
  return await getCurrentPrices(markets);
});

// IPC: KRW 금액으로 지정가 매수
ipcMain.handle('upbit:limitBuyWithKRW', async (event, market, price, krwAmount) => {
  return await limitBuyWithKRW(market, price, krwAmount);
});

// IPC: KRW 금액으로 지정가 매도
ipcMain.handle('upbit:limitSellWithKRW', async (event, market, price, krwAmount) => {
  return await limitSellWithKRW(market, price, krwAmount);
});

// IPC: 보유 수량 전체 매도
ipcMain.handle('upbit:sellAll', async (event, market, orderType, limitPrice) => {
  return await sellAll(market, orderType, limitPrice);
});

// ---------------- Preferences / App state via electron-store ----------------
ipcMain.handle('prefs:getTheme', async () => {
  try {
    return store.get('ui.theme') || 'dark';
  } catch {
    return 'dark';
  }
});

ipcMain.handle('prefs:setTheme', async (event, theme) => {
  try {
    store.set('ui.theme', theme === 'light' ? 'light' : 'dark');
    return true;
  } catch (e) { console.error('prefs:setTheme failed', e); throw e; }
});

ipcMain.handle('app:getRunningLogic', async () => {
  try {
    return store.get('app.runningLogic') || null;
  } catch { return null; }
});

ipcMain.handle('app:setRunningLogic', async (event, logicMeta) => {
  try {
    // logicMeta: {id,name}
    store.set('app.runningLogic', logicMeta || null);
    return true;
  } catch (e) { console.error('app:setRunningLogic failed', e); throw e; }
});

// ---------------- Logic persistence (modularized, async, per-logic files) ----------------
// 인덱스(요약 목록) 조회
ipcMain.handle('logics:list', async () => {
  try { return await ls_listLogics(); } catch (e) { console.error('logics:list failed', e); return []; }
});
// 새 로직 생성 (파일 생성 + 인덱스 갱신)
ipcMain.handle('logics:create', async (event, name) => {
  try { return await ls_createLogic(name); } catch (e) { console.error('logics:create failed', e); throw e; }
});
// 특정 로직 본문 로드
ipcMain.handle('logics:load', async (event, id) => {
  try { return await ls_loadLogic(id); } catch (e) { console.error('logics:load failed', e); throw e; }
});
// 특정 로직 저장
ipcMain.handle('logics:save', async (event, logic) => {
  try { return await ls_saveLogic(logic); } catch (e) { console.error('logics:save failed', e); throw e; }
});
// 삭제
ipcMain.handle('logics:delete', async (event, id) => {
  try { return await ls_deleteLogic(id); } catch (e) { console.error('logics:delete failed', e); throw e; }
});
// 순서 재배치
ipcMain.handle('logics:reorder', async (event, ids) => {
  try { return await ls_reorderLogics(ids); } catch (e) { console.error('logics:reorder failed', e); throw e; }
});

// per-logic api keys
ipcMain.handle('logics:loadKeys', async (event, id) => {
  try { return await ls_loadLogicApiKeys(id); } catch (e) { console.error('logics:loadKeys failed', e); return null; }
});
ipcMain.handle('logics:saveKeys', async (event, id, accessKey, secretKey) => {
  try { return await ls_saveLogicApiKeys(id, accessKey, secretKey); } catch (e) { console.error('logics:saveKeys failed', e); throw e; }
});
