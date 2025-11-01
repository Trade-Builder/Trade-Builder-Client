
export class APIManager {
    private priceData: Array<number>;
    private timeData: Array<number>;
    private volumeData: Array<number>;
    private highestPriceCache: Map<string, number>;

    constructor() {
        this.priceData = [];
        this.timeData = [];
        this.volumeData = [];
        this.highestPriceCache = new Map<string, number>();
        
        window.electronAPI.fetchCandles('KRW-BTC', 60, 200).then((result) => {
            if (result.success && result.data) {
                for (let candle of result.data) {
                    this.timeData.push(candle.timestamp);
                    this.priceData.push(candle.price);
                    this.volumeData.push(candle.volume);
                }
            }
        });
    }

    public setReadyHighestPrice(periodUnit: string, period: number) : Promise<void>{
        return window.electronAPI.getHighestPrice('KRW-BTC', periodUnit, period).then((price) => {
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
}