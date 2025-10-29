const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { SignJWT } = require('jose');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const Store = require('electron-store');
const { spawn } = require('child_process');

/**
 * electron-store를 사용하여 API 키를 암호화해서 안전하게 저장합니다.
 * - Windows: %APPDATA%/electron/config.json (암호화됨)
 * - macOS: ~/Library/Application Support/electron/config.json (암호화됨)
 *
 * encryptionKey: 데이터를 암호화하는 키 (프로덕션에서는 더 안전한 키 사용 권장)
 */
const store = new Store({
  encryptionKey: 'trade-builder-encryption-key-2024'
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

  // Vite 개발 서버의 URL을 로드합니다.
  mainWindow.loadURL('http://localhost:5173');

  // --- 이 부분이 핵심입니다! ---
  // 조건 없이, 무조건 개발자 도구를 엽니다.
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

/**
 * IPC Handler: API 키를 암호화해서 저장합니다.
 *
 * @param {string} accessKey - Upbit Access Key
 * @param {string} secretKey - Upbit Secret Key
 * @returns {boolean} 저장 성공 여부
 */
ipcMain.handle('keys:save', async (event, accessKey, secretKey) => {
  try {
    // electron-store에 암호화해서 저장
    store.set('upbit.accessKey', accessKey);
    store.set('upbit.secretKey', secretKey);
    console.log('API 키가 암호화되어 저장되었습니다.');
    return true;
  } catch (error) {
    console.error('API 키 저장 실패:', error);
    throw error;
  }
});

/**
 * IPC Handler: 저장된 API 키를 불러옵니다.
 *
 * @returns {Object} { accessKey, secretKey } 또는 null (저장된 키가 없는 경우)
 */
ipcMain.handle('keys:load', async (event) => {
  try {
    const accessKey = store.get('upbit.accessKey');
    const secretKey = store.get('upbit.secretKey');

    // 둘 다 있으면 반환, 하나라도 없으면 null
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

/**
 * IPC Handler: Upbit API를 호출하여 계좌 정보를 가져옵니다.
 *
 * @param {string} accessKey - Upbit Access Key
 * @param {string} secretKey - Upbit Secret Key
 * @returns {Array} 계좌 정보 배열
 */
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
    const API_ENDPOINT = "https://api.upbit.com/v1/accounts";
    const headers = {
      "Accept": "application/json",
      "Authorization": `Bearer ${jwtToken}`
    };
    const response = await axios.get(API_ENDPOINT, { headers });
    return response.data;
  } catch (error) {
    const errorMessage = error.response ? error.response.data : error.message;
    console.error("Main Process API Error:", errorMessage);
    throw new Error(JSON.stringify(errorMessage));
  }
});

/**
 * IPC Handler: RL 모델 추론 (Python 스크립트 실행)
 *
 * @param {string} market - 마켓 코드 (예: 'KRW-BTC')
 * @param {string} timeframe - 타임프레임 (예: '1h', '5m', '1d')
 * @param {number} count - 캔들 개수 (기본값: 200)
 * @returns {Object} 추론 결과 { action, signal, confidence, trade_unit, portfolio_value }
 */
ipcMain.handle('rl:predict', async (event, market, timeframe = '1h', count = 200) => {
  return new Promise((resolve, reject) => {
    try {
      console.log(`🤖 RL 모델 추론 시작: ${market} ${timeframe}`);

      // Python 스크립트 경로
      const scriptPath = path.join(__dirname, '..', 'RL-models', 'predict.py');

      // Python 실행 (python 또는 python3)
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

      // Python 프로세스 spawn
      const pythonProcess = spawn(pythonCmd, [
        scriptPath,
        '--market', market,
        '--timeframe', timeframe,
        '--count', count.toString()
      ]);

      let stdout = '';
      let stderr = '';

      // stdout 데이터 수집
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      // stderr 데이터 수집
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error(`Python stderr: ${data}`);
      });

      // 프로세스 종료 처리
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            // JSON 파싱
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

      // 프로세스 에러 처리
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