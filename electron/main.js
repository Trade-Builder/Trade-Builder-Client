import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Store from 'electron-store';
import { launchRLProcess, stopRLProcess } from './rl_launcher.js';
import {
  fetchUpbitAccounts,
  fetchCandles,
  getHighestPrice,
  placeOrder,
  marketBuy,
  marketSell,
  limitBuy,
  limitSell,
  getCurrentPrice,
  getCurrentPrices,
  buyAtCurrentPrice,
  sellAtCurrentPrice,
  limitBuyWithKRW,
  sellAll
} from './upbit_api_manager_optimized.js';

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

// IPC: Upbit 캔들 데이터 조회
ipcMain.handle('upbit:fetchCandles', async (event, market, period = 1, count = 200) => {
  return await fetchCandles(market, period, count);
});

// IPC: Upbit 최고가 조회
ipcMain.handle('upbit:getHighestPrice', async (event, market, periodUnit, period) => {
  return await getHighestPrice(market, periodUnit, period);
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

// IPC: 현재가 조회 (단일 마켓)
ipcMain.handle('upbit:getCurrentPrice', async (event, market) => {
  return await getCurrentPrice(market);
});

// IPC: 현재가 일괄 조회 (여러 마켓)
ipcMain.handle('upbit:getCurrentPrices', async (event, markets) => {
  return await getCurrentPrices(markets);
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