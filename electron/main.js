import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SignJWT } from 'jose';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import Store from 'electron-store';
import { launchRLProcess, stopRLProcess } from './RLlauncher.js';

// __dirname 대체 (ESM 환경)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const store = new Store({
  encryptionKey: 'trade-builder-encryption-key-2024',
});

// 1분봉 데이터 자동 업데이트 인터벌 관리
let candleUpdateInterval = null;
let currentMarket = null;

// 메모리에 저장되는 1분봉 데이터 (전역 변수)
let timestamps = [];      // 시간 배열
let closingPrices = [];   // 종가 배열
let volumes = [];         // 거래량 배열
const MAX_DATA_COUNT = 200;

// 데이터 접근 함수들
function getCandleData() {
  return {
    timestamps: timestamps.slice(),
    closingPrices: closingPrices.slice(),
    volumes: volumes.slice(),
    count: timestamps.length
  };
}

function getLatestCandle() {
  if (timestamps.length === 0) return null;
  return {
    timestamp: timestamps[0],
    closingPrice: closingPrices[0],
    volume: volumes[0]
  };
}

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
  try {
    const market = 'KRW-BTC';
    currentMarket = market;

    console.log(`[자동 시작] ${market} 1분봉 데이터 업데이트 시작...`);

    // 초기 데이터 200개 가져오기
    const initialResponse = await axios.get('https://api.upbit.com/v1/candles/minutes/1', {
      params: { market, count: MAX_DATA_COUNT }
    });

    // 3개의 분리된 배열에 저장 (시간 역순으로 정렬됨)
    timestamps = [];
    closingPrices = [];
    volumes = [];

    initialResponse.data.forEach(candle => {
      // timestamp를 숫자(초)로 변환 (밀리초 / 1000)
      timestamps.push(Math.floor(candle.timestamp / 1000));
      closingPrices.push(candle.trade_price);
      volumes.push(candle.candle_acc_trade_volume);
    });

    console.log(`[자동 시작] 초기 ${timestamps.length}개 데이터 메모리에 로드 완료`);
    console.log(`  - 최신: ${new Date(timestamps[0] * 1000).toISOString()} / 종가: ${closingPrices[0].toLocaleString()}`);

    // 1분마다 업데이트
    candleUpdateInterval = setInterval(async () => {
      try {
        const response = await axios.get('https://api.upbit.com/v1/candles/minutes/1', {
          params: { market, count: 1 }
        });

        const candle = response.data[0];

        // 맨 앞에 새 데이터 추가 (timestamp는 초 단위 숫자)
        timestamps.unshift(Math.floor(candle.timestamp / 1000));
        closingPrices.unshift(candle.trade_price);
        volumes.unshift(candle.candle_acc_trade_volume);

        // 200개 초과 시 맨 뒤 데이터 삭제
        if (timestamps.length > MAX_DATA_COUNT) {
          timestamps.pop();
          closingPrices.pop();
          volumes.pop();
        }

        console.log(`[자동 업데이트] ${new Date(candle.timestamp).toISOString()} - 종가: ${candle.trade_price.toLocaleString()}, 거래량: ${candle.candle_acc_trade_volume}`);
      } catch (error) {
        console.error('[자동 업데이트 실패]', error.message);
      }
    }, 60000);

  } catch (error) {
    console.error('[자동 시작 실패]', error.message);
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 앱 종료 시 RL 프로세스 및 인터벌 종료
app.on('before-quit', () => {
   stopRLProcess();

   // 1분봉 업데이트 인터벌 종료
   if (candleUpdateInterval) {
     clearInterval(candleUpdateInterval);
     candleUpdateInterval = null;
     console.log('[앱 종료] 1분봉 자동 업데이트 중지됨');
   }
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
  try {
    const payload = {
      access_key: accessKey,
      nonce: uuidv4(),
    };

    const secret = new TextEncoder().encode(secretKey);
    const jwtToken = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .sign(secret);

    const API_ENDPOINT = 'https://api.upbit.com/v1/accounts';
    const headers = {
      Accept: 'application/json',
      Authorization: `Bearer ${jwtToken}`,
    };

    const response = await axios.get(API_ENDPOINT, { headers });
    return response.data;
  } catch (error) {
    const errorMessage = error.response ? error.response.data : error.message;
    console.error('Main Process API Error:', errorMessage);
    throw new Error(JSON.stringify(errorMessage));
  }
});

// IPC: RL 프로세스 시작
ipcMain.handle('RL:start', () => {
  launchRLProcess();
});

// IPC: RL 프로세스 종료
ipcMain.handle('RL:stop', () => {
  stopRLProcess();
});

// IPC: Upbit 1분봉 데이터 조회
ipcMain.handle('upbit:fetch1mCandles', async (event, market, count = 200) => {
  try {
    const API_ENDPOINT = `https://api.upbit.com/v1/candles/minutes/1`;
    const params = {
      market: market, // 예: 'KRW-BTC'
      count: count,   // 가져올 캔들 개수 (최대 200)
    };

    const response = await axios.get(API_ENDPOINT, { params });
    console.log(`${market} 1분봉 데이터 ${response.data.length}개 조회 완료`);
    return response.data;
  } catch (error) {
    const errorMessage = error.response ? error.response.data : error.message;
    console.error('Upbit 1분봉 데이터 조회 실패:', errorMessage);
    throw new Error(JSON.stringify(errorMessage));
  }
});

// IPC: Upbit 1분봉 데이터 가져와서 바로 저장 (종가 + 거래량만)
ipcMain.handle('upbit:fetchAndSave1mCandles', async (event, market, count = 200) => {
  try {
    // 1. 데이터 가져오기
    console.log(`${market} 1분봉 데이터 ${count}개 가져오는 중...`);
    const API_ENDPOINT = `https://api.upbit.com/v1/candles/minutes/1`;
    const params = { market, count };
    const response = await axios.get(API_ENDPOINT, { params });
    const rawData = response.data;
    console.log(`${market} 1분봉 데이터 ${rawData.length}개 조회 완료`);

    // 2. 배열 형태로 변환 [timestamp, closing_price, volume]
    const simplifiedData = rawData.map(candle => [
      candle.candle_date_time_kst,  // timestamp
      candle.trade_price,            // closing_price
      candle.candle_acc_trade_volume // volume
    ]);

    // 3. 파일로 저장
    const userDataPath = app.getPath('userData');
    const filePath = path.join(userDataPath, `upbit_1m_${market}_data.json`);
    fs.writeFileSync(filePath, JSON.stringify(simplifiedData, null, 2));
    console.log(`데이터 저장 완료: ${filePath}`);
    console.log(`첫 번째 데이터 - 종가: ${simplifiedData[0][1]}, 거래량: ${simplifiedData[0][2]}`);

    return {
      success: true,
      path: filePath,
      dataCount: simplifiedData.length,
      market: market
    };
  } catch (error) {
    const errorMessage = error.response ? error.response.data : error.message;
    console.error('데이터 가져오기 및 저장 실패:', errorMessage);
    return {
      success: false,
      error: errorMessage
    };
  }
});

// IPC: 1분봉 데이터 자동 업데이트 시작 (큐 방식)
ipcMain.handle('upbit:startCandleUpdates', async (event, market, maxCount = 200) => {
  try {
    // 이미 실행 중이면 중지
    if (candleUpdateInterval) {
      clearInterval(candleUpdateInterval);
      candleUpdateInterval = null;
    }

    currentMarket = market;
    const userDataPath = app.getPath('userData');
    const filePath = path.join(userDataPath, `upbit_1m_${market}_data.json`);

    // 1. 초기 데이터 200개 가져오기
    console.log(`[초기화] ${market} 1분봉 데이터 ${maxCount}개 가져오는 중...`);
    const initialResponse = await axios.get('https://api.upbit.com/v1/candles/minutes/1', {
      params: { market, count: maxCount }
    });

    let dataQueue = initialResponse.data.map(candle => [
      candle.candle_date_time_kst,  // timestamp
      candle.trade_price,            // closing_price
      candle.candle_acc_trade_volume // volume
    ]);

    // 초기 데이터 저장
    fs.writeFileSync(filePath, JSON.stringify(dataQueue, null, 2));
    console.log(`[초기화 완료] ${dataQueue.length}개 데이터 저장됨`);

    // 2. 1분마다 최신 데이터 1개 가져와서 큐 업데이트
    candleUpdateInterval = setInterval(async () => {
      try {
        const response = await axios.get('https://api.upbit.com/v1/candles/minutes/1', {
          params: { market, count: 1 }
        });

        const newCandle = [
          response.data[0].candle_date_time_kst,  // timestamp
          response.data[0].trade_price,            // closing_price
          response.data[0].candle_acc_trade_volume // volume
        ];

        // 큐 업데이트: 맨 앞에 추가, 맨 뒤 삭제
        dataQueue.unshift(newCandle);
        if (dataQueue.length > maxCount) {
          dataQueue.pop(); // 맨 뒤 데이터 삭제
        }

        // 파일 저장
        fs.writeFileSync(filePath, JSON.stringify(dataQueue, null, 2));
        console.log(`[업데이트] ${newCandle[0]} - 종가: ${newCandle[1]}, 거래량: ${newCandle[2]}`);
      } catch (error) {
        console.error('[업데이트 실패]', error.message);
      }
    }, 60000); // 60초 = 1분

    return {
      success: true,
      message: `${market} 1분봉 자동 업데이트 시작`,
      path: filePath,
      initialDataCount: dataQueue.length
    };
  } catch (error) {
    console.error('자동 업데이트 시작 실패:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
});

// IPC: 1분봉 데이터 자동 업데이트 중지
ipcMain.handle('upbit:stopCandleUpdates', () => {
  if (candleUpdateInterval) {
    clearInterval(candleUpdateInterval);
    candleUpdateInterval = null;
    console.log(`[중지] ${currentMarket} 1분봉 자동 업데이트 중지됨`);
    return { success: true, message: '자동 업데이트 중지됨' };
  }
  return { success: false, message: '실행 중인 업데이트가 없습니다' };
});

// IPC: 메모리에서 캔들 데이터 가져오기
ipcMain.handle('candle:getData', () => {
  return getCandleData();
});

// IPC: 최신 캔들 데이터 가져오기
ipcMain.handle('candle:getLatest', () => {
  return getLatestCandle();
});

// IPC: 특정 범위의 데이터 가져오기
ipcMain.handle('candle:getRange', (event, start, end) => {
  const validEnd = end || timestamps.length;
  return {
    timestamps: timestamps.slice(start, validEnd),
    closingPrices: closingPrices.slice(start, validEnd),
    volumes: volumes.slice(start, validEnd),
    count: validEnd - start
  };
});