import type { AST } from "./ast";
import {RLConnection} from "../communicator/RLConnection";
import {ConstantAST, CurrentPriceAST, HighestPriceAST, RsiAST, RoiAST, SmaAST, CompareAST, LogicOpAST, RLSignalAST} from "./ast";
import {APIManager} from "./api_manager";

let dummydata = [1];
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

    log: ((title: string, msg: string) => void);

    dataManager: APIManager;

    constructor() {
        this.stock = "KRW-BTC";
        this.log = (a, b) => {};
        this.dataManager = new APIManager();

        this.logicID = null;
        this.buyRoot = null;
        this.sellRoot = null;

        this.buyOrderData = new OrderData();
        this.sellOrderData = new OrderData();
    }

    public run(logDetails: boolean) {
        if (!this.parseComplete) { return; }
        if (this.buyRoot != null) this.runBuy(logDetails);
        if (this.sellRoot != null) this.runSell(logDetails);
    }

    public runBuy(logDetails: boolean) {
        let result: boolean;
        if (logDetails) {
            result = this.buyRoot!.evaluateDetailed(this.log.bind(this, "BuyGraph")) as boolean;
        }
        else {
            result = this.buyRoot!.evaluate() as boolean;
        }
        if (result) {
            this.doBuy();
        } else {
            this.log("BuyGraph", "매수 조건 미충족");
        }
    }

    public runSell(logDetails: boolean) {
        let result: boolean;
        if (logDetails) {
            result = this.sellRoot!.evaluateDetailed(this.log.bind(this, "SellGraph")) as boolean;
        }
        else {
            result = this.sellRoot!.evaluate() as boolean;
        }
        if (result) {
            this.doSell();
        } else {
            this.log("SellGraph", "매도 조건 미충족");
        }
    }

    public parse(data: any) {
        this.buyRoot = null;
        this.sellRoot = null;
        try {
            this.tryParse(data);
        } catch (error: any) {
            this.log("Error", error.message);
            this.parseComplete = false;
            return;
        }
        this.parseComplete = true;
    }

    private tryParse(data: any) {
        const buyNode = data.buyGraph.nodes.find((n: any) => n.kind === "buy");
        const sellNode = data.sellGraph.nodes.find((n: any) => n.kind === "sell");
        if (buyNode === undefined && sellNode === undefined) {
            throw new Error("매수/매도 노드가 모두 없습니다. 적어도 하나의 로직이 필요합니다.");
        }
        if (buyNode !== undefined) {
            this.parseBuy(buyNode, data.buyGraph);
        }
        if (sellNode !== undefined) {
            this.parseSell(sellNode, data.sellGraph);
        }
    }

    private parseBuy(buyNode: any, buyGraph: any) {
        this.buyOrderData.init(buyNode.controls);
        const nodes = new Map<string, any>();
        const connections = new Map<string, string[]>();

        buyGraph.nodes.forEach((node: any) => {
            nodes.set(node.id, {
                kind: node.kind,
                controls: node.controls,
            });
        });
        buyGraph.connections.forEach((conn: any) => {
            if (!connections.has(conn.target)) {
                connections.set(conn.target, []);
            }
            connections.get(conn.target)!!.push(conn.source);
        });
        const buyNodeChild = connections.get(buyNode.id);
        if (buyNodeChild === undefined) {
            throw new Error("매수 노드에 연결된 조건이 없습니다.");
        }
        this.buyRoot = this.parseRecursive(buyNodeChild[0], nodes, connections);
    }

    private parseSell(sellNode: any, sellGraph: any) {
        this.sellOrderData.init(sellNode.controls);
        const nodes = new Map<string, any>();
        const connections = new Map<string, string[]>();

        sellGraph.nodes.forEach((node: any) => {
            nodes.set(node.id, {
                kind: node.kind,
                controls: node.controls,
            });
        });
        sellGraph.connections.forEach((conn: any) => {
            if (!connections.has(conn.target)) {
                connections.set(conn.target, []);
            }
            connections.get(conn.target)!!.push(conn.source);
        });

        const sellNodeChild = connections.get(sellNode.id);
        if (sellNodeChild === undefined) {
            throw new Error("매도 노드에 연결된 조건이 없습니다.");
        }
        this.sellRoot = this.parseRecursive(sellNodeChild[0], nodes, connections);
    }

    private parseRecursive(nodeID: string, nodes: Map<string, any>, connections: Map<string, string[]>): AST {
        const node = nodes.get(nodeID);
        switch (node.kind) {
            case "const":
                return new ConstantAST(this.dataManager, tryParseInt(node.controls.value));
            case "currentPrice":
                return new CurrentPriceAST(this.dataManager);
            case "highestPrice":
                return new HighestPriceAST(this.dataManager, tryParseInt(node.controls.periodLength), node.controls.periodUnit);
            case "rsi":
                return new RsiAST();
            case "rl":
                return new RLSignalAST(String(node.controls.periodUnit ?? 'day'));
            case "sma":
                const val = tryParseInt(node.controls.period);
                if (val > 200) {
                    throw new Error("SMA 기간은 최대 200까지 설정할 수 있습니다.");
                }
                return new SmaAST(this.dataManager, val, node.controls.periodUnit));
            case "roi":
                return new RoiAST(this.dataManager);
            case "logicOp": {
                const children = connections.get(nodeID);
                if (children === undefined) {
                    throw new Error("논리 노드에 연결된 자식이 없습니다");
                }
                if (children.length < 2) {
                    throw new Error("논리 노드에 피연산자 노드가 부족합니다.");
                }
                return new LogicOpAST(node.controls.operator, 
                    this.parseRecursive(children[0], nodes, connections), 
                    this.parseRecursive(children[1], nodes, connections)
                );
            }
            case "compare": {
                const children = connections.get(nodeID);
                if (children === undefined) {
                    throw new Error("비교 노드에 연결된 자식이 없습니다");
                }
                if (children.length < 2) {
                    throw new Error("비교 노드에 피연산자 노드가 부족합니다.");
                }
                return new CompareAST(node.controls.operator, 
                    this.parseRecursive(children[0], nodes, connections), 
                    this.parseRecursive(children[1], nodes, connections)
                );
            }
            default:
                throw new Error(`알 수 없는 노드 종류: ${node.kind}`);
        }
    }

    private async doBuy() {
        const log = this.log.bind(this, "BuyGraph");
        if (this.buyOrderData.orderType === 'market') {
            log(`시장가 ${this.buyOrderData.quantity}₩어치 매수를 시도합니다.`);
            const result = await window.electronAPI.marketBuy(this.stock, this.buyOrderData.quantity);
            if (result.success) {
                log(`시장가 ${this.buyOrderData.quantity}₩어치 매수 완료`);
            } else {
                log(`시장가 매수 실패: ${result.error}`);
            }
        }
        else {
            log(`지정가 ${this.buyOrderData.limitPrice}₩에 ${this.buyOrderData.quantity}₩어치 매수를 시도합니다.`);
            const result = await window.electronAPI.limitBuyWithKRW(this.stock, this.buyOrderData.limitPrice, this.buyOrderData.quantity);
            if (result.success) {
                log(`지정가 ${this.buyOrderData.limitPrice}₩에 ${this.buyOrderData.quantity}₩어치 매수 완료`);
            } else {
                log(`지정가 매수 실패: ${result.error}`);
            }
        }
    }

    private async doSell() {
        const log = this.log.bind(this, "SellGraph");
        if (this.sellOrderData.orderType === 'market') {
            log(`시장가 ${this.sellOrderData.quantity}₩어치 매도를 시도합니다.`);
            const result = await window.electronAPI.marketSell(this.stock, this.sellOrderData.quantity);
            if (result.success) {
                log(`시장가 ${this.sellOrderData.quantity}₩어치 매도 완료`);
            } else {
                log(`시장가 매도 실패: ${result.error}`);
            }
        }
        else {
            log(`지정가 ${this.sellOrderData.limitPrice}₩에 ${this.sellOrderData.quantity}₩어치 매도 시도`);
            const result = await window.electronAPI.limitSellWithKRW(this.stock, this.sellOrderData.limitPrice, this.sellOrderData.quantity);
            if (result.success) {
                log(`지정가 ${this.sellOrderData.limitPrice}₩에 ${this.sellOrderData.quantity}₩어치 매도 완료`);
            } else {
                log(`지정가 매도 실패: ${result.error}`);
            }
        }
    }

    public setStock(stock: string) {
        this.stock = stock;
    }

    public setLogfunc(logFunc: (title: string, msg: string) => void) {
        this.log = logFunc;
    }

    // private loadLogic() { //나중에 메인 화면에서 실행하는 경우 사용
    //     const savedLogics = JSON.parse(localStorage.getItem('userLogics')!!);
    //     const targetLogic = savedLogics.find((item: any) => item.id === this.logicID);
    //     return [targetLogic.stock, targetLogic.data];
    // }
}

class OrderData {
    orderType: string;
    limitPrice: number;
    quantity: number;

    constructor() {
        this.orderType = "";
        this.limitPrice = 0;
        this.quantity = 0;
    }

    init(data: any) {
        this.orderType = data.orderType;
        this.limitPrice = data.limitPrice;
        this.quantity = data.sellPercent;
    }
}

function tryParseInt(v: any): number {
    if (isNaN(v)) {
        throw new Error(`숫자 형식이 올바르지 않습니다: ${v}`);
    }
    return parseInt(v);
}

const interpreter = new Interpreter();

export function runLogic(stock: string, logicData: any, logFunc: (title: string, msg: string) => void, logDetails: boolean = false) {
    //startCoroutine(RLRunningRoutine, logFunc);
    interpreter.setStock(stock);
    interpreter.setLogfunc(logFunc);
    interpreter.parse(logicData);
    setTimeout(() => {
        interpreter.run(logDetails);
    }, 500);
}
