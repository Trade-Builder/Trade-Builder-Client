
export class APIManager {
    private priceData: Array<number>;
    private timeData: Array<number>;
    private volumeData: Array<number>;
    private highestPriceCache: Map<string, number>;
    private currentPrice: number;
    private market: string;

    constructor(market: string = 'KRW-BTC') {
        this.priceData = [];
        this.timeData = [];
        this.volumeData = [];
        this.highestPriceCache = new Map<string, number>();
        this.currentPrice = 0;
        this.market = market;

        window.electronAPI.fetchCandles(market, 60, 200).then((result) => {
            if (result.success && result.data) {
                for (let candle of result.data) {
                    this.timeData.push(candle.timestamp);
                    this.priceData.push(candle.price);
                    this.volumeData.push(candle.volume);
                }
            }
        });

        // 실시간 현재가 업데이트
        this.updateCurrentPrice();
        setInterval(() => this.updateCurrentPrice(), 1000); // 1초마다 업데이트
    }

    private async updateCurrentPrice() {
        const result = await window.electronAPI.getCurrentPrice(this.market);
        if (result.success && result.price) {
            this.currentPrice = result.price;
        }
    }

    public setReadyHighestPrice(periodUnit: string, period: number) : Promise<void>{
        return window.electronAPI.getHighestPrice('KRW-BTC', periodUnit, period).then((price) => {
            this.highestPriceCache.set(`${periodUnit}-${period}`, price);
        });
    }

    public getLatestPrice() : number{
        // 실시간 현재가 반환, 없으면 캔들 데이터의 마지막 가격
        return this.currentPrice || this.priceData[this.priceData.length - 1];
    }

    public getCurrentPrice() : number {
        return this.currentPrice;
    }

    public getHighestPrice(period: string) : number {
        return this.highestPriceCache.get(period)!;
    }

    public getPriceDataArray() : Array<number> {
        return this.priceData;
    }
}