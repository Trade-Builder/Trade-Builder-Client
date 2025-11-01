import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Store from 'electron-store';
import { launchRLProcess, stopRLProcess } from './RLlauncher.js';
import {
  getCandleData,
  getAllCandleData,
  getLatestCandle,
  getCandleRange,
  startCandleUpdates,
  stopCandleUpdates,
  fetchUpbitAccounts,
  fetch1mCandles,
  fetchAndFormat1mCandles,
  fetchCandles,
  fetchAndFormatCandles,
  placeOrder,
  marketBuy,
  marketSell,
  limitBuy,
  limitSell,
  getCurrentPrice,
  buyAtCurrentPrice,
  sellAtCurrentPrice,
  limitBuyWithKRW,
  sellAll
} from './candleDataManager.js';

// __dirname 대체 (ESM 환경)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const store = new Store({
  encryptionKey: 'trade-builder-encryption-key-2024',
});

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

  // Electron 시작 시 자동으로 비트코인 1분봉 데이터 업데이트 시작
  await startCandleUpdates('KRW-BTC');

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 앱 종료 시 RL 프로세스 및 캔들 데이터 업데이트 종료
app.on('before-quit', () => {
   stopRLProcess();
   stopCandleUpdates();
});

// IPC: API 키 저장
ipcMain.handle('keys:save', async (event, accessKey, secretKey) => {
  try {
    store.set('upbit.accessKey', accessKey);
    store.set('upbit.secretKey', secretKey);
    console.log('API 키가 암호화되어 저장되었습니다.');
    return true;
  } catch (error) {
    console.error('API 키 저장 실패:', error);
    throw error;
  }
});

// IPC: API 키 불러오기
ipcMain.handle('keys:load', async (event) => {
  try {
    const accessKey = store.get('upbit.accessKey');
    const secretKey = store.get('upbit.secretKey');

    if (accessKey && secretKey) {
      console.log('저장된 API 키를 불러왔습니다.');
      return { accessKey, secretKey };
    }

    console.log('저장된 API 키가 없습니다.');
    return null;
  } catch (error) {
    console.error('API 키 불러오기 실패:', error);
    return null;
  }
});

// IPC: Upbit 계좌 조회
ipcMain.handle('upbit:fetchAccounts', async (event, accessKey, secretKey) => {
  return await fetchUpbitAccounts(accessKey, secretKey);
});

// IPC: RL 프로세스 시작
ipcMain.handle('RL:start', () => {
  launchRLProcess();
});

// IPC: RL 프로세스 종료
ipcMain.handle('RL:stop', () => {
  stopRLProcess();
});

// IPC: Upbit 1분봉 데이터 조회 (하위 호환성)
ipcMain.handle('upbit:fetch1mCandles', async (event, market, count = 200) => {
  return await fetch1mCandles(market, count);
});

// IPC: Upbit 캔들 데이터 조회 (시간 간격 선택 가능)
ipcMain.handle('upbit:fetchCandles', async (event, market, interval = 1, count = 200) => {
  return await fetchCandles(market, interval, count);
});

// IPC: Upbit 1분봉 데이터 가져와서 바로 저장 (하위 호환성)
ipcMain.handle('upbit:fetchAndSave1mCandles', async (event, market, count = 200) => {
  return await fetchAndFormat1mCandles(market, count);
});

// IPC: Upbit 캔들 데이터 가져와서 배열로 저장 (시간 간격 선택 가능)
ipcMain.handle('upbit:fetchAndSaveCandles', async (event, market, interval = 1, count = 200) => {
  return await fetchAndFormatCandles(market, interval, count);
});

// IPC: 캔들 데이터 자동 업데이트 시작 (시간 간격 선택 가능)
ipcMain.handle('upbit:startCandleUpdates', async (event, market, interval = 1) => {
  return await startCandleUpdates(market, interval);
});

// IPC: 캔들 데이터 자동 업데이트 중지 (특정 interval 또는 전체)
ipcMain.handle('upbit:stopCandleUpdates', (event, interval = null) => {
  return stopCandleUpdates(interval);
});

// IPC: 메모리에서 캔들 데이터 가져오기 (특정 interval)
ipcMain.handle('candle:getData', (event, interval = 1) => {
  return getCandleData(interval);
});

// IPC: 모든 시간 간격의 캔들 데이터 가져오기
ipcMain.handle('candle:getAllData', () => {
  return getAllCandleData();
});

// IPC: 최신 캔들 데이터 가져오기 (특정 interval)
ipcMain.handle('candle:getLatest', (event, interval = 1) => {
  return getLatestCandle(interval);
});

// IPC: 특정 범위의 데이터 가져오기
ipcMain.handle('candle:getRange', (event, interval, start, end) => {
  return getCandleRange(interval, start, end);
});

// IPC: 통합 주문
ipcMain.handle('upbit:placeOrder', async (event, accessKey, secretKey, options) => {
  return await placeOrder(accessKey, secretKey, options);
});

// IPC: 시장가 매수
ipcMain.handle('upbit:marketBuy', async (event, accessKey, secretKey, market, price) => {
  return await marketBuy(accessKey, secretKey, market, price);
});

// IPC: 시장가 매도
ipcMain.handle('upbit:marketSell', async (event, accessKey, secretKey, market, volume) => {
  return await marketSell(accessKey, secretKey, market, volume);
});

// IPC: 지정가 매수
ipcMain.handle('upbit:limitBuy', async (event, accessKey, secretKey, market, price, volume) => {
  return await limitBuy(accessKey, secretKey, market, price, volume);
});

// IPC: 지정가 매도
ipcMain.handle('upbit:limitSell', async (event, accessKey, secretKey, market, price, volume) => {
  return await limitSell(accessKey, secretKey, market, price, volume);
});

// IPC: 현재가 조회
ipcMain.handle('upbit:getCurrentPrice', async (event, market) => {
  return await getCurrentPrice(market);
});

// IPC: 현재가로 지정가 매수
ipcMain.handle('upbit:buyAtCurrentPrice', async (event, accessKey, secretKey, market, volume) => {
  return await buyAtCurrentPrice(accessKey, secretKey, market, volume);
});

// IPC: 현재가로 지정가 매도
ipcMain.handle('upbit:sellAtCurrentPrice', async (event, accessKey, secretKey, market, volume) => {
  return await sellAtCurrentPrice(accessKey, secretKey, market, volume);
});

// IPC: KRW 금액으로 지정가 매수
ipcMain.handle('upbit:limitBuyWithKRW', async (event, accessKey, secretKey, market, price, krwAmount) => {
  return await limitBuyWithKRW(accessKey, secretKey, market, price, krwAmount);
});

// IPC: 보유 수량 전체 매도
ipcMain.handle('upbit:sellAll', async (event, accessKey, secretKey, market, orderType, limitPrice) => {
  return await sellAll(accessKey, secretKey, market, orderType, limitPrice);
});