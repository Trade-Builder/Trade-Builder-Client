import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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