// interpreter.worker.ts - Web Worker for running logic in isolation
import { Interpreter, OrderData } from "./interpreter";

// Worker instance
let workerInterpreter: Interpreter | null = null;
let runInterval: any = null;

// Worker에서 사용할 로그 함수
function workerLog(title: string, msg: string) {
    self.postMessage({ type: 'log', title, msg });
}

// Worker에서 사용할 주문 실행 함수
async function workerExecuteOrder(action: 'buy' | 'sell', orderData: OrderData, stock: string) {
    self.postMessage({ 
        type: 'order', 
        action,
        orderType: orderData.orderType,
        stock: stock,
        limitPrice: orderData.limitPrice,
        quantity: orderData.quantity
    });
}

self.onmessage = (e: MessageEvent) => {
    const { type, ...data } = e.data;

    switch (type) {
        case 'init':
            // orderExecutor를 주입하여 Interpreter 생성
            workerInterpreter = new Interpreter(workerLog, workerExecuteOrder);
            workerInterpreter.setStock(data.stock);
            workerInterpreter.parse(data.logicData);
            self.postMessage({ type: 'ready' });
            break;

        case 'start':
            if (!workerInterpreter) {
                self.postMessage({ type: 'error', message: 'Interpreter not initialized' });
                break;
            }
            
            if (runInterval) {
                clearInterval(runInterval);
            }
            
            const interval = data.interval || 5000; // 기본 5초
            const logDetails = data.logDetails || false;
            const interpreter = workerInterpreter; // null 체크 후 복사
            
            // 즉시 한 번 실행
            interpreter.run(logDetails).catch(err => {
                self.postMessage({ type: 'error', message: err.message });
            });
            
            // 반복 실행 설정
            runInterval = setInterval(() => {
                interpreter.run(logDetails).catch(err => {
                    self.postMessage({ type: 'error', message: err.message });
                });
            }, interval);
            
            self.postMessage({ type: 'started', interval });
            break;

        case 'stop':
            if (runInterval) {
                clearInterval(runInterval);
                runInterval = null;
                self.postMessage({ type: 'stopped' });
            }
            break;

        case 'run-once':
            if (!workerInterpreter) {
                self.postMessage({ type: 'error', message: 'Interpreter not initialized' });
                break;
            }
            workerInterpreter.run(data.logDetails || false).catch(err => {
                self.postMessage({ type: 'error', message: err.message });
            });
            break;

        case 'api-response':
            // API 응답을 받아서 WorkerAPIWrapper로 전달 (이미 addEventListener로 처리됨)
            // 이 케이스는 명시적으로 처리할 필요 없음
            break;

        case 'rl-response':
            // RL 응답을 받아서 WorkerRLWrapper로 전달 (이미 addEventListener로 처리됨)
            // 이 케이스는 명시적으로 처리할 필요 없음
            break;

        default:
            console.warn('Unknown message type:', type);
    }
};
