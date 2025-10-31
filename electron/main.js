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

app.whenReady().then(() => {
  createWindow();
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 앱 종료 시 RL 프로세스도 함께 종료
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

// ---------------- Logic persistence (single JSON file) ----------------
const logicFilePath = () => path.join(app.getPath('userData'), 'logics.json');

ipcMain.handle('logics:loadAll', async () => {
  try {
    const file = logicFilePath();
    if (!fs.existsSync(file)) return [];
    const raw = fs.readFileSync(file, 'utf-8');
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr;
    return [];
  } catch (e) {
    console.error('logics:loadAll failed', e);
    return [];
  }
});

ipcMain.handle('logics:saveAll', async (event, logics) => {
  try {
    const file = logicFilePath();
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(logics ?? [], null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('logics:saveAll failed', e);
    throw e;
  }
});

ipcMain.handle('logics:deleteById', async (event, id) => {
  try {
    const file = logicFilePath();
    if (!fs.existsSync(file)) return true;
    const raw = fs.readFileSync(file, 'utf-8');
    const arr = JSON.parse(raw);
    const next = Array.isArray(arr) ? arr.filter((l) => l?.id !== id) : [];
    fs.writeFileSync(file, JSON.stringify(next, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('logics:deleteById failed', e);
    throw e;
  }
});
