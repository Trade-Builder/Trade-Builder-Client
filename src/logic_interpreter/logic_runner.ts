// logic_runner.ts - Global logic runner manager
type LogFunc = (title: string, msg: string) => void;

interface RunningLogic {
    logicId: string;
    stock: string;
    worker: Worker;
    startTime: number;
    interval: number;
}

class LogicRunnerManager {
    private runningLogics: Map<string, RunningLogic> = new Map();
    private logCallbacks: Map<string, LogFunc> = new Map();

    /**
     * 로직을 Worker isolation에서 반복 실행 시작
     */
    public startLogic(
        logicId: string,
        stock: string,
        logicData: any,
        logFunc: LogFunc,
        logDetails: boolean = false,
        interval: number = 5000
    ): boolean {
        // 이미 실행 중인 로직인지 확인
        if (this.runningLogics.has(logicId)) {
            logFunc("Error", `로직 ID "${logicId}"는 이미 실행 중입니다.`);
            return false;
        }

        try {
            // Worker 생성
            const worker = new Worker(
                new URL('./interpreter.worker.ts', import.meta.url),
                { type: 'module' }
            );

            // 로그 콜백 저장
            this.logCallbacks.set(logicId, logFunc);

            // Worker 메시지 핸들러 설정
            worker.onmessage = (e: MessageEvent) => {
                this.handleWorkerMessage(logicId, e.data);
            };

            worker.onerror = (error: ErrorEvent) => {
                const callback = this.logCallbacks.get(logicId);
                if (callback) {
                    callback("Error", `Worker 오류: ${error.message}`);
                }
                this.stopLogic(logicId);
            };

            // 실행 정보 저장
            this.runningLogics.set(logicId, {
                logicId,
                stock,
                worker,
                startTime: Date.now(),
                interval
            });

            // Worker 초기화 및 시작
            worker.postMessage({
                type: 'init',
                stock,
                logicData
            });

            // ready 메시지를 받은 후 start
            const readyHandler = (e: MessageEvent) => {
                if (e.data.type === 'ready') {
                    worker.postMessage({
                        type: 'start',
                        interval,
                        logDetails
                    });
                    worker.removeEventListener('message', readyHandler);
                }
            };
            worker.addEventListener('message', readyHandler);

            logFunc("System", `로직 "${logicId}" 실행 시작 (${interval}ms 간격)`);
            return true;

        } catch (error: any) {
            logFunc("Error", `로직 시작 실패: ${error.message}`);
            return false;
        }
    }

    /**
     * 실행 중인 로직 중지
     */
    public stopLogic(logicId: string): boolean {
        const running = this.runningLogics.get(logicId);
        if (!running) {
            return false;
        }

        // Worker에 중지 메시지 전송
        running.worker.postMessage({ type: 'stop' });
        
        // Worker 종료
        running.worker.terminate();

        // 정리
        this.runningLogics.delete(logicId);
        const callback = this.logCallbacks.get(logicId);
        if (callback) {
            callback("System", `로직 "${logicId}" 실행 중지`);
        }
        this.logCallbacks.delete(logicId);

        return true;
    }

    /**
     * 모든 실행 중인 로직 중지
     */
    public stopAllLogics(): void {
        const logicIds = Array.from(this.runningLogics.keys());
        logicIds.forEach(id => this.stopLogic(id));
    }

    /**
     * 실행 중인 로직 정보 조회
     */
    public getRunningLogic(logicId: string): RunningLogic | undefined {
        return this.runningLogics.get(logicId);
    }

    /**
     * 모든 실행 중인 로직 목록 조회
     */
    public getAllRunningLogics(): RunningLogic[] {
        return Array.from(this.runningLogics.values());
    }

    /**
     * 로직이 실행 중인지 확인
     */
    public isRunning(logicId: string): boolean {
        return this.runningLogics.has(logicId);
    }

    /**
     * Worker로부터 받은 메시지 처리
     */
    private handleWorkerMessage(logicId: string, data: any) {
        const callback = this.logCallbacks.get(logicId);
        const running = this.runningLogics.get(logicId);

        switch (data.type) {
            case 'log':
                if (callback) {
                    callback(data.title, data.msg);
                }
                break;

            case 'order':
                // 주문 처리 (메인 스레드에서 실행)
                if (callback) {
                    this.handleOrder(logicId, data, callback);
                }
                break;

            case 'api-request':
                // Worker에서 온 API 요청 처리
                if (running) {
                    this.handleAPIRequest(running.worker, data);
                }
                break;

            case 'rl-request':
                // Worker에서 온 RL 요청 처리
                if (running) {
                    this.handleRLRequest(running.worker, data);
                }
                break;

            case 'started':
                if (callback) {
                    callback("System", `로직 실행 시작됨 (${data.interval}ms 간격)`);
                }
                break;

            case 'stopped':
                if (callback) {
                    callback("System", "로직 실행 중지됨");
                }
                break;

            case 'error':
                if (callback) {
                    callback("Error", data.message);
                }
                break;

            default:
                console.warn('Unknown worker message type:', data.type);
        }
    }

    /**
     * Worker에서 온 API 요청 처리
     */
    private async handleAPIRequest(worker: Worker, data: any) {
        const { requestId, method, params } = data;

        try {
            const electronAPI = (window as any).electronAPI;
            if (!electronAPI) {
                throw new Error('electronAPI is not available');
            }

            let result: any;
            switch (method) {
                case 'fetchCandles':
                    result = await electronAPI.fetchCandles(...params);
                    break;
                case 'getHighestPrice':
                    result = await electronAPI.getHighestPrice(...params);
                    break;
                default:
                    throw new Error(`Unknown API method: ${method}`);
            }

            // 성공 응답 전송
            worker.postMessage({
                type: 'api-response',
                requestId,
                success: true,
                result
            });
        } catch (error: any) {
            // 에러 응답 전송
            worker.postMessage({
                type: 'api-response',
                requestId,
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Worker에서 온 RL 요청 처리
     */
    private async handleRLRequest(worker: Worker, data: any) {
        const { requestId, data: rlData } = data;

        try {
            // 메인 스레드의 RLConnection을 가져와서 요청 전송
            const { getGlobalRLConnection } = await import('../communicator/RLConnection');
            const rlConnection = getGlobalRLConnection();
            
            if (!rlConnection) {
                throw new Error('RLConnection is not initialized');
            }

            const result = await rlConnection.send(rlData);

            // 성공 응답 전송
            worker.postMessage({
                type: 'rl-response',
                requestId,
                success: true,
                result
            });
        } catch (error: any) {
            // 에러 응답 전송
            worker.postMessage({
                type: 'rl-response',
                requestId,
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Worker에서 요청한 주문 처리
     */
    private async handleOrder(_logicId: string, orderData: any, logFunc: LogFunc) {
        const { action, orderType, stock, limitPrice, quantity } = orderData;
        
        try {
            if (action === 'buy') {
                if (orderType === 'market') {
                    logFunc("Buy", `시장가 ${quantity}₩어치 매수를 시도합니다.`);
                    const result = await (window as any).electronAPI.marketBuy(stock, quantity);
                    if (result.success) {
                        logFunc("Buy", `시장가 ${quantity}₩어치 매수 완료`);
                    } else {
                        logFunc("Error", `시장가 매수 실패: ${result.error}`);
                    }
                } else {
                    logFunc("Buy", `지정가 ${limitPrice}₩에 ${quantity}₩어치 매수를 시도합니다.`);
                    const result = await (window as any).electronAPI.limitBuyWithKRW(stock, limitPrice, quantity);
                    if (result.success) {
                        logFunc("Buy", `지정가 ${limitPrice}₩에 ${quantity}₩어치 매수 완료`);
                    } else {
                        logFunc("Error", `지정가 매수 실패: ${result.error}`);
                    }
                }
            } else if (action === 'sell') {
                if (orderType === 'market') {
                    logFunc("Sell", `시장가 ${quantity}₩어치 매도를 시도합니다.`);
                    const result = await (window as any).electronAPI.marketSell(stock, quantity);
                    if (result.success) {
                        logFunc("Sell", `시장가 ${quantity}₩어치 매도 완료`);
                    } else {
                        logFunc("Error", `시장가 매도 실패: ${result.error}`);
                    }
                } else {
                    logFunc("Sell", `지정가 ${limitPrice}₩에 ${quantity}₩어치 매도 시도`);
                    const result = await (window as any).electronAPI.limitSellWithKRW(stock, limitPrice, quantity);
                    if (result.success) {
                        logFunc("Sell", `지정가 ${limitPrice}₩에 ${quantity}₩어치 매도 완료`);
                    } else {
                        logFunc("Error", `지정가 매도 실패: ${result.error}`);
                    }
                }
            }
        } catch (error: any) {
            logFunc("Error", `주문 처리 중 오류: ${error.message}`);
        }
    }
}

// 전역 싱글톤 인스턴스
export const logicRunner = new LogicRunnerManager();

/**
 * 로직 실행 함수 (기존 runLogic 대체)
 */
export function runLogic(
    stock: string,
    logicData: any,
    logFunc: LogFunc,
    logDetails: boolean = false,
    logicId?: string,
    interval: number = 5000
) {
    const id = logicId || `logic-${Date.now()}`;
    return logicRunner.startLogic(id, stock, logicData, logFunc, logDetails, interval);
}

/**
 * 로직 중지 함수
 */
export function stopLogic(logicId: string) {
    return logicRunner.stopLogic(logicId);
}

/**
 * 모든 로직 중지 함수
 */
export function stopAllLogics() {
    logicRunner.stopAllLogics();
}

/**
 * 실행 중인 로직 정보 조회
 */
export function getRunningLogicInfo(logicId: string) {
    return logicRunner.getRunningLogic(logicId);
}

/**
 * 모든 실행 중인 로직 조회
 */
export function getAllRunningLogics() {
    return logicRunner.getAllRunningLogics();
}

/**
 * 로직 실행 중 여부 확인
 */
export function isLogicRunning(logicId: string) {
    return logicRunner.isRunning(logicId);
}
