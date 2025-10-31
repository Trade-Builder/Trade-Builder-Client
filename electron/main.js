import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SignJWT } from 'jose';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { spawn } from 'node:child_process';
import Store from 'electron-store';

// __dirname 대체 (ESM 환경)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const store = new Store({
  encryptionKey: 'trade-builder-encryption-key-2024',
});

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
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

// IPC: RL 모델 추론 (Python 실행)
ipcMain.handle('rl:predict', async (event, market, timeframe = '1h', count = 200) => {
  return new Promise((resolve, reject) => {
    try {
      console.log(`🤖 RL 모델 추론 시작: ${market} ${timeframe}`);

      const scriptPath = path.join(__dirname, '..', 'RL-models', 'predict.py');
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

      const pythonProcess = spawn(pythonCmd, [
        scriptPath,
        '--market', market,
        '--timeframe', timeframe,
        '--count', count.toString(),
      ]);

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error(`Python stderr: ${data}`);
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            if (result.success) {
              console.log(`✅ RL 추론 성공: ${result.signal} (confidence: ${result.confidence})`);
              resolve(result);
            } else {
              console.error(`❌ RL 추론 실패: ${result.error}`);
              reject(new Error(result.error));
            }
          } catch (parseError) {
            console.error('❌ JSON 파싱 실패:', stdout);
            reject(new Error(`Failed to parse Python output: ${parseError.message}`));
          }
        } else {
          console.error(`❌ Python 프로세스 종료 코드: ${code}`);
          console.error(`stderr: ${stderr}`);
          reject(new Error(`Python script exited with code ${code}: ${stderr}`));
        }
      });

      pythonProcess.on('error', (error) => {
        console.error('❌ Python 프로세스 실행 실패:', error);
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });
    } catch (error) {
      console.error('❌ RL 추론 에러:', error);
      reject(error);
    }
  });
});
