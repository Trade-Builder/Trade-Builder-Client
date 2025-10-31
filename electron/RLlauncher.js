import { spawn } from 'node:child_process';

let RLProc = null;

export function launchRLProcess() {
    const RLCmd = 'C:/Codes/Python/RL-models/.venv/Scripts/python.exe'; //process.platform === 'win32' ? 'python' : 'python3';
    const scriptPath = 'C:/Codes/Python/RL-models/deploy/socket_server.py';
    try {
        // 이미 실행 중이면 기존 프로세스 반환
        if (RLProc && !RLProc.killed) {
            return;
        }
        console.log('Starting RL process with command:', RLCmd, scriptPath);

        RLProc = spawn(RLCmd, [scriptPath], {
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true,
        });
        RLProc.on('stdout', (data) => {
            console.log(`RL stdout: ${data}`);
        });
        RLProc.on('stderr', (data) => {
            console.error(`RL stderr: ${data}`);
        });
        RLProc.on('spawn', () => {
            console.log(`RL process opened`);
        });
        RLProc.on('error', (err) => {
            console.error('Failed to start RL process:', err);
        });
    } catch (e) {
        console.error('Failed to start RL process:', e);
    }
}

export function stopRLProcess() {
    try {
        if (RLProc && !RLProc.killed) {
            RLProc.kill();
            RLProc = null;
        }
    } catch (e) {
        console.error('Failed to stop RL process:', e);
    }
}