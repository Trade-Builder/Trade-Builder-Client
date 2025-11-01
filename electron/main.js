import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SignJWT } from 'jose';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import Store from 'electron-store';
import { launchRLProcess, stopRLProcess } from './RLlauncher.js';
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
