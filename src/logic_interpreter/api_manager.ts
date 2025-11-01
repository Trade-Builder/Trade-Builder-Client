
// API 인터페이스 정의
interface ElectronAPI {
    fetchCandles: (stock: string, interval?: number, count?: number) => Promise<any>;
    getHighestPrice: (stock: string, periodUnit: string, period: number) => Promise<number>;
}

// 메시지 ID 생성기
let messageIdCounter = 0;
function generateMessageId(): number {
    return ++messageIdCounter;
}

// Worker 환경인지 확인
function isWorkerEnvironment(): boolean {
    return typeof self !== 'undefined' && typeof window === 'undefined';
}

// 전역 API 접근자 (Worker 환경에서는 메시지로 처리)
function getElectronAPI(): ElectronAPI | null {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
        return (window as any).electronAPI;
    }
    return null;
}

// Worker에서 사용할 API 래퍼
class WorkerAPIWrapper implements ElectronAPI {
    private pendingRequests: Map<number, { resolve: (value: any) => void, reject: (error: any) => void }> = new Map();

    constructor() {
        if (isWorkerEnvironment()) {
            self.addEventListener('message', (e: MessageEvent) => {
                if (e.data.type === 'api-response') {
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

    private sendRequest(method: string, params: any[]): Promise<any> {
        return new Promise((resolve, reject) => {
            const requestId = generateMessageId();
            this.pendingRequests.set(requestId, { resolve, reject });
            
            self.postMessage({
                type: 'api-request',
                requestId,
                method,
                params
            });

            // 타임아웃 설정 (30초)
            setTimeout(() => {
                if (this.pendingRequests.has(requestId)) {
                    this.pendingRequests.delete(requestId);
                    reject(new Error(`API request timeout: ${method}`));
                }
            }, 30000);
        });
    }

    async fetchCandles(stock: string, interval?: number, count?: number): Promise<any> {
        return this.sendRequest('fetchCandles', [stock, interval, count]);
    }

    async getHighestPrice(stock: string, periodUnit: string, period: number): Promise<number> {
        return this.sendRequest('getHighestPrice', [stock, periodUnit, period]);
    }
}

// API 인스턴스 생성 (Worker 환경에 따라 다름)
function createAPIInstance(): ElectronAPI | null {
    if (isWorkerEnvironment()) {
        return new WorkerAPIWrapper();
    }
    return getElectronAPI();
}

export class APIManager {
    private priceData: Array<number>;
    private timeData: Array<number>;
    private volumeData: Array<number>;
    private highestPriceCache: Map<string, number>;
    private stock: string;
    private updateInterval: any;
    private api: ElectronAPI | null;
    private readyPromise: Promise<void>;
    private isReady: boolean = false;

    constructor(stock: string) {
        this.stock = stock;
        this.priceData = [];
        this.timeData = [];
        this.volumeData = [];
        this.highestPriceCache = new Map<string, number>();
        this.api = createAPIInstance();

        // 초기 데이터 로드를 Promise로 관리
        this.readyPromise = this.initializeData();
    }

    /**
     * 초기 데이터를 로드하고 준비 상태를 설정
     */
    private async initializeData(): Promise<void> {
        if (!this.api) {
            this.isReady = true;
            return;
        }

        try {
            const result = await this.api.fetchCandles(this.stock, 60, 200);
            
            if (result.success && result.data) {
                for (let candle of result.data) {
                    this.timeData.push(candle.timestamp);
                    this.priceData.push(candle.price);
                    this.volumeData.push(candle.volume);
                }
            }

            this.isReady = true;
            
            // 초기 데이터 로드 후 주기적 업데이트 시작
            this.startPeriodicUpdate();
        } catch (error) {
            console.error("Failed to fetch initial candles:", error);
            this.isReady = true; // 에러가 나도 ready 상태로 변경
            throw error;
        }
    }

    /**
     * 주기적 데이터 업데이트 시작
     */
    private startPeriodicUpdate(): void {
        if (!this.api) return;

        this.updateInterval = setInterval(() => {
            this.api!.fetchCandles(this.stock).then((result) => {
                if (result.success && result.data) {
                    for (let candle of result.data) {
                        this.timeData.push(candle.timestamp);
                        this.priceData.push(candle.price);
                        this.volumeData.push(candle.volume);
                    }
                }
            }).catch(error => {
                console.error("Failed to update candles:", error);
            });
        }, 60000);
    }

    /**
     * 데이터 로드가 완료될 때까지 대기
     * @returns 데이터 로드 완료를 나타내는 Promise
     */
    public async waitUntilReady(): Promise<void> {
        return this.readyPromise;
    }

    /**
     * 현재 준비 상태 확인
     * @returns 데이터 로드 완료 여부
     */
    public isDataReady(): boolean {
        return this.isReady;
    }

    public setReadyHighestPrice(periodUnit: string, period: number) : Promise<void>{
        if (!this.api) {
            return Promise.resolve();
        }
        return this.api.getHighestPrice(this.stock, periodUnit, period).then((price) => {
            this.highestPriceCache.set(`${periodUnit}-${period}`, price);
        });
    }

    public getLatestPrice() : number{
        return this.priceData[this.priceData.length - 1];
    }

    public getHighestPrice(period: string) : number {
        return this.highestPriceCache.get(period)!;
    }

    public getPriceDataArray() : Array<number> {
        return this.priceData;
    }
    
    public dispose() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}