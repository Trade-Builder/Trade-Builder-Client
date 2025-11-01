import type { AST } from "./ast";
import {RLConnection} from "../communicator/RLConnection";
import {ConstantAST, CurrentPriceAST, HighestPriceAST, RsiAST, RoiAST, SmaAST, CompareAST, LogicOpAST, RLSignalAST, MarketBuyAST, MarketSellAST, LimitBuyAST, LimitSellAST, LimitBuyWithKRWAST, SellAllAST} from "./ast";
import {APIManager} from "./api_manager";

let dummydata = [1];
// @ts-ignore - 나중에 사용할 함수
function* RLRunningRoutine(log: (title: string, msg: string) => void) {
    window.electronAPI.startRL();
    yield wait(5000);
    let RLServer = new RLConnection();
    yield wait(2000);
    RLServer.send({ action: "init", data: dummydata.slice(0, 200) });
    yield wait(1000);
    for (let i = 200; i < dummydata.length; i++) {
        RLServer.send({ action: "run", index: i, data: dummydata[i] });
        yield wait(500);
    }
}

function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// @ts-ignore - 나중에 사용할 함수
function startCoroutine(generatorFunc: ((log: (title: string, msg: string) => void) => Generator), log: (title: string, msg: string) => void) {
    const iterator = generatorFunc(log);

    function step(result: IteratorResult<any>) {
        if (result.done) return; // 끝났으면 종료
        Promise.resolve(result.value).then(() => step(iterator.next()));
    }
    step(iterator.next());
}

class Interpreter {
    parseComplete: boolean = false;
    logicID: string | null;
    buyRoot: AST | null;
    sellRoot: AST | null;

    //order data
    stock: string;
    buyOrderData: OrderData;
    sellOrderData: OrderData;

    // parsing cache
    nodes: Map<string, any>;
    connections: Map<string, string[]>;

    log: null | ((title: string, msg: string) => void);

    dataManager: APIManager;

    constructor() {
        this.stock = "KRW-BTC";
        this.log = null;
        this.dataManager = new APIManager();

        this.logicID = null;
        this.buyRoot = null;
        this.sellRoot = null;

        this.buyOrderData = new OrderData();
        this.sellOrderData = new OrderData();

        this.nodes = new Map<string, any>();
        this.connections = new Map<string, string[]>();
    }

    public parse(data: any) {
        try {
            this.tryParse(data);
        } catch (error: any) {
            if (this.log != null) 
                this.log("Error", error.message);
            return;
        }
        this.parseComplete = true;
    }

    public async run(logDetails: boolean) {
        if (!this.parseComplete) { return; }
        await this.runBuy(logDetails);
        await this.runSell(logDetails);
    }

    public async runBuy(logDetails: boolean) {
        let result: boolean;
        if (logDetails && this.log != null) {
            result = this.buyRoot!.evaluateDetailed(this.log.bind(this, "BuyGraph")) as boolean;
        }
        else {
            result = this.buyRoot!.evaluate() as boolean;
        }
        if (result) {
            await this.doBuy();
        } else if (this.log != null) {
            this.log("Buy", "매수 조건 미충족");
        }
    }

    public async runSell(logDetails: boolean) {
        let result: boolean;
        if (logDetails && this.log != null) {
            result = this.sellRoot!.evaluateDetailed(this.log.bind(this, "SellGraph")) as boolean;
        }
        else {
            result = this.sellRoot!.evaluate() as boolean;
        }
        if (result) {
            await this.doSell();
        } else if (this.log != null) {
            this.log("Sell", "매도 조건 미충족");
        }
    }

    private tryParse(data: any) {
        const buyNode = data.buyGraph.nodes.find((n: any) => n.kind === "buy");
        if (buyNode === undefined) {
            throw new Error("매수 노드가 없습니다.");
        }
        const sellNode = data.sellGraph.nodes.find((n: any) => n.kind === "sell");
        if (sellNode === undefined) {
            throw new Error("매도 노드가 없습니다.");
        }
        this.buyOrderData.init(buyNode.controls);
        this.sellOrderData.init(sellNode.controls);

        data.buyGraph.nodes.forEach((node: any) => {
            this.nodes.set(node.id, {
                kind: node.kind,
                controls: node.controls,
            });
        });
        data.buyGraph.connections.forEach((conn: any) => {
            if (!this.connections.has(conn.target)) {
                this.connections.set(conn.target, []);
            }
            this.connections.get(conn.target)!!.push(conn.source);
        });
        const buyNodeChild = this.connections.get(buyNode.id);
        if (buyNodeChild === undefined) {
            throw new Error("매수 노드에 연결된 조건이 없습니다.");
        }
        this.buyRoot = this.parseRecursive(buyNodeChild[0]);

        this.nodes.clear();
        this.connections.clear();
        data.sellGraph.nodes.forEach((node: any) => {
            this.nodes.set(node.id, {
                kind: node.kind,
                controls: node.controls,
            });
        });
        data.sellGraph.connections.forEach((conn: any) => {
            if (!this.connections.has(conn.target)) {
                this.connections.set(conn.target, []);
            }
            this.connections.get(conn.target)!!.push(conn.source);
        });

        const sellNodeChild = this.connections.get(sellNode.id);
        if (sellNodeChild === undefined) {
            throw new Error("매도 노드에 연결된 조건이 없습니다.");
        }
        this.sellRoot = this.parseRecursive(sellNodeChild[0]);

        this.nodes.clear();
        this.connections.clear();
    }

    private parseRecursive(nodeID: string): AST {
        const node = this.nodes.get(nodeID);
        switch (node.kind) {
            case "const":
                return new ConstantAST(this.dataManager, tryParseInt(node.controls.value));
            case "currentPrice":
                return new CurrentPriceAST(this.dataManager);
            case "highestPrice":
                return new HighestPriceAST(this.dataManager, tryParseInt(node.controls.periodLength), node.controls.periodUnit);
            case "rsi":
                return new RsiAST(this.dataManager);
            case "rl":
                return new RLSignalAST(String(node.controls.periodUnit ?? 'day'));
            case "sma":
                const val = tryParseInt(node.controls.period);
                if (val > 200) {
                    throw new Error("SMA 기간은 최대 200까지 설정할 수 있습니다.");
                }
                return new SmaAST(this.dataManager, val, String(node.controls.periodUnit ?? 'minute'));
            case "roi":
                return new RoiAST(this.dataManager);
            case "logicOp": {
                const children = this.connections.get(nodeID);
                if (children === undefined) {
                    throw new Error("논리 노드에 연결된 자식이 없습니다");
                }
                if (children.length < 2) {
                    throw new Error("논리 노드에 피연산자 노드가 부족합니다.");
                }
                return new LogicOpAST(node.controls.operator, this.parseRecursive(children[0]), this.parseRecursive(children[1]));
            }
            case "compare": {
                const children = this.connections.get(nodeID);
                if (children === undefined) {
                    throw new Error("비교 노드에 연결된 자식이 없습니다");
                }
                if (children.length < 2) {
                    throw new Error("비교 노드에 피연산자 노드가 부족합니다.");
                }
                return new CompareAST(node.controls.operator, this.parseRecursive(children[0]), this.parseRecursive(children[1]));
            }
            case "marketBuy": {
                const children = this.connections.get(nodeID);
                const condition = children && children.length > 0 ? this.parseRecursive(children[0]) : null;
                return new MarketBuyAST(this.stock, tryParseFloat(node.controls.amount), condition);
            }
            case "marketSell": {
                const children = this.connections.get(nodeID);
                const condition = children && children.length > 0 ? this.parseRecursive(children[0]) : null;
                return new MarketSellAST(this.stock, tryParseFloat(node.controls.volume), condition);
            }
            case "limitBuy": {
                const children = this.connections.get(nodeID);
                const condition = children && children.length > 0 ? this.parseRecursive(children[0]) : null;
                return new LimitBuyAST(
                    this.stock,
                    tryParseFloat(node.controls.price),
                    tryParseFloat(node.controls.volume),
                    condition
                );
            }
            case "limitSell": {
                const children = this.connections.get(nodeID);
                const condition = children && children.length > 0 ? this.parseRecursive(children[0]) : null;
                return new LimitSellAST(
                    this.stock,
                    tryParseFloat(node.controls.price),
                    tryParseFloat(node.controls.volume),
                    condition
                );
            }
            case "limitBuyWithKRW": {
                const children = this.connections.get(nodeID);
                const condition = children && children.length > 0 ? this.parseRecursive(children[0]) : null;
                return new LimitBuyWithKRWAST(
                    this.stock,
                    tryParseFloat(node.controls.price),
                    tryParseFloat(node.controls.amount),
                    condition
                );
            }
            case "sellAll": {
                const children = this.connections.get(nodeID);
                const condition = children && children.length > 0 ? this.parseRecursive(children[0]) : null;
                return new SellAllAST(
                    this.stock,
                    node.controls.orderType,
                    tryParseFloat(node.controls.limitPrice || '0'),
                    condition
                );
            }
            default:
                throw new Error(`알 수 없는 노드 종류: ${node.kind}`);
        }
    }

    private async doBuy() {
        try {
            // 계좌 조회해서 KRW 잔고 가져오기
            const accounts = await window.electronAPI.fetchUpbitAccounts();
            const krwAccount = accounts.find((acc: any) => acc.currency === 'KRW');

            if (!krwAccount) {
                if (this.log != null)
                    this.log("Buy", "원화 계좌를 찾을 수 없습니다");
                return;
            }

            const availableKRW = parseFloat(krwAccount.balance);
            const buyPercent = this.buyOrderData.buyPercent;
            const buyAmount = Math.floor(availableKRW * (buyPercent / 100));

            if (buyAmount < 5000) {
                if (this.log != null)
                    this.log("Buy", `매수 금액이 너무 적습니다 (${buyAmount}원, 최소 5000원)`);
                return;
            }

            await window.electronAPI.marketBuy(this.stock, buyAmount);
            const msg = `시장가 ${buyAmount.toLocaleString()}원 매수 (보유금 ${availableKRW.toLocaleString()}원의 ${buyPercent}%)`;

            if (this.log != null)
                this.log("Buy", msg);
        } catch (error: any) {
            if (this.log != null)
                this.log("Buy", `매수 실패: ${error.message}`);
        }
    }

    private async doSell() {
        try {
            // 계좌 정보 조회
            const accounts = await window.electronAPI.fetchUpbitAccounts();

            // 선택된 stock에서 화폐 추출 (예: 'KRW-BTC' -> 'BTC')
            const currency = this.stock.split('-')[1];
            const cryptoAccount = accounts.find((acc: any) => acc.currency === currency);

            if (!cryptoAccount || parseFloat(cryptoAccount.balance) === 0) {
                if (this.log != null)
                    this.log("Sell", `${currency} 보유량이 없습니다.`);
                return;
            }

            const availableVolume = parseFloat(cryptoAccount.balance);
            const sellPercent = this.sellOrderData.sellPercent;
            const sellVolume = availableVolume * (sellPercent / 100);

            if (sellVolume <= 0) {
                if (this.log != null)
                    this.log("Sell", `매도 수량이 너무 적습니다 (${sellVolume})`);
                return;
            }

            await window.electronAPI.marketSell(this.stock, sellVolume);
            const msg = `시장가 ${sellVolume.toFixed(8)} ${currency} 매도 (보유량 ${availableVolume.toFixed(8)}의 ${sellPercent}%)`;

            if (this.log != null)
                this.log("Sell", msg);
        } catch (error: any) {
            if (this.log != null)
                this.log("Sell", `매도 실패: ${error.message}`);
        }
    }

    public setStock(stock: string) {
        this.stock = stock;
    }

    public setLogfunc(logFunc: (title: string, msg: string) => void) {
        this.log = logFunc;
    }

    // @ts-ignore - 나중에 메인 화면에서 실행하는 경우 사용
    private loadLogic() {
        const savedLogics = JSON.parse(localStorage.getItem('userLogics')!!);
        const targetLogic = savedLogics.find((item: any) => item.id === this.logicID);
        return [targetLogic.stock, targetLogic.data];
    }
}

class OrderData {
    orderType: string;
    limitPrice: number;
    quantity: number;
    buyPercent: number;
    sellPercent: number;

    constructor() {
        this.orderType = "";
        this.limitPrice = 0;
        this.quantity = 0;
        this.buyPercent = 100;
        this.sellPercent = 100;
    }

    init(data: any) {
        // Buy 노드용
        if (data.buyPercent !== undefined) {
            this.buyPercent = parseFloat(data.buyPercent) || 100;
        }
        // Sell 노드용 (percentage-based)
        if (data.sellPercent !== undefined) {
            this.sellPercent = parseFloat(data.sellPercent) || 100;
        }
        // Legacy: 기존 orderType 기반 로직 (하위호환)
        if (data.orderType !== undefined) {
            this.orderType = data.orderType;
            this.limitPrice = data.limitPrice;
            this.quantity = data.quantity || data.sellPercent;
        }
    }
}

function tryParseInt(v: any): number {
    if (isNaN(v)) {
        throw new Error(`숫자 형식이 올바르지 않습니다: ${v}`);
    }
    return parseInt(v);
}

function tryParseFloat(v: any): number {
    if (isNaN(v)) {
        throw new Error(`숫자 형식이 올바르지 않습니다: ${v}`);
    }
    return parseFloat(v);
}

const interpreter = new Interpreter();

export function runLogic(stock: string, logicData: any, logFunc: (title: string, msg: string) => void, logDetails: boolean = false) {
    //startCoroutine(RLRunningRoutine, logFunc);
    interpreter.setStock(stock);
    interpreter.setLogfunc(logFunc);
    interpreter.parse(logicData);
    setTimeout(async () => {
        await interpreter.run(logDetails);
    }, 500);
}
