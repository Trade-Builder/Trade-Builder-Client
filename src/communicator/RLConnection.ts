// Worker 환경인지 확인
function isWorkerEnvironment(): boolean {
	return typeof self !== 'undefined' && typeof window === 'undefined';
}

// 메시지 ID 생성기
let rlMessageIdCounter = 0;
function generateRLMessageId(): number {
	return ++rlMessageIdCounter;
}

// Worker에서 사용할 RL 래퍼
class WorkerRLWrapper {
	private pendingRequests: Map<number, { resolve: (value: any) => void, reject: (error: any) => void }> = new Map();

	constructor() {
		if (isWorkerEnvironment()) {
			self.addEventListener('message', (e: MessageEvent) => {
				if (e.data.type === 'rl-response') {
					const pending = this.pendingRequests.get(e.data.requestId);
					if (pending) {
						if (e.data.success) {
							pending.resolve(e.data.result);
						} else {
							pending.reject(new Error(e.data.error));
						}
						this.pendingRequests.delete(e.data.requestId);
					}
				}
			});
		}
	}

	public async send(data: any): Promise<any> {
		return new Promise((resolve, reject) => {
			const requestId = generateRLMessageId();
			this.pendingRequests.set(requestId, { resolve, reject });
			
			self.postMessage({
				type: 'rl-request',
				requestId,
				data
			});

			// 타임아웃 설정 (30초)
			setTimeout(() => {
				if (this.pendingRequests.has(requestId)) {
					this.pendingRequests.delete(requestId);
					reject(new Error(`RL request timeout`));
				}
			}, 30000);
		});
	}

	public stop() {
		// Worker에서는 실제 소켓을 닫지 않음 (메인 스레드에서 관리)
		console.log("Worker: RL connection stop called (no-op in worker)");
	}
}

export class RLConnection {
	private socket: WebSocket;
	private pendingResolvers: Map<number, (value: any) => void> = new Map();
	private messageIdCounter: number = 0;

	constructor() {
		this.socket = this.makeSocket();
	}

	private makeSocket() {
		const socket = new WebSocket("ws://127.0.0.1:5577");
		socket.onopen = () => {
			console.log("Info","RL: WebSocket connected");
		};

		socket.onerror = (error) => {
			console.error("Error","RL: " + error);
			setTimeout(() => {
				this.socket = this.makeSocket();
			}, 5000);
		};

		socket.onmessage = (event: MessageEvent) => {
			const raw = event.data;
			try {
				const response = JSON.parse(raw);
				const messageId = response.messageId;
				
				if (messageId !== undefined && this.pendingResolvers.has(messageId)) {
					const resolve = this.pendingResolvers.get(messageId)!;
					this.pendingResolvers.delete(messageId);
					resolve(response);
				}
			} catch (err) {
				console.error("Error", "RL: Failed to parse message: " + err);
			}
		};
		return socket;
	}

	public async send(data: any): Promise<any> {
		if (this.socket.readyState !== WebSocket.OPEN) {
			console.error("Error","socket are not opened yet");
			throw new Error("WebSocket is not open");
		}
		
		return new Promise((resolve, reject) => {
			try {
				const messageId = this.messageIdCounter++;
				this.pendingResolvers.set(messageId, resolve);
				
				const messageWithId = {
					...data,
					messageId: messageId
				};
				
				let txt = JSON.stringify(messageWithId);
				this.socket.send(txt);
				
				// 타임아웃 설정 (30초)
				setTimeout(() => {
					if (this.pendingResolvers.has(messageId)) {
						this.pendingResolvers.delete(messageId);
						reject(new Error("RL: Response timeout"));
					}
				}, 30000);
			} catch (err) {
				console.error("Error","RL: Failed to send message: " + err);
				reject(err);
			}
		});
	}

	public stop() {
		this.socket.close();
	};
}

function wait(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

let RLServer: RLConnection | WorkerRLWrapper | null = null;
let isInitialized = false;

export function getGlobalRLConnection(): RLConnection | WorkerRLWrapper | null {
    // Worker 환경에서는 WorkerRLWrapper 반환
    if (isWorkerEnvironment()) {
        if (!RLServer) {
            RLServer = new WorkerRLWrapper();
        }
        return RLServer;
    }
    
    // 메인 스레드 환경
    if (!RLServer && !isInitialized) {
        console.warn("RLServer가 아직 초기화되지 않았습니다.");
    }
    return RLServer;
}

export async function initializeRLServer() {
    // Worker 환경에서는 초기화하지 않음 (메인 스레드에서만)
    if (isWorkerEnvironment()) {
        console.log("Worker 환경: RLServer 초기화 건너뜀");
        return getGlobalRLConnection();
    }
    
    if (isInitialized || RLServer) return RLServer;
    
	await (window as any).electronAPI.startRL();
	await wait(5000);
	RLServer = new RLConnection();
	isInitialized = true;
	return RLServer;
}

// 메인 스레드에서만 초기화
if (!isWorkerEnvironment()) {
    initializeRLServer();
}