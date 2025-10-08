import type { AST } from "./ast";
import {ConstantAST, CurrentPriceAST, HighestPriceAST, RsiAST, RoiAST, SmaAST, CompareAST, LogicOpAST} from "./ast";

export function runLogic(stock: string, logicData: any, logFunc: (title: string, msg: string) => void, logRunDetails: boolean = false) {
    let interpreter = new Interpreter(stock, logFunc);
    interpreter.parse(logicData);
    //setInterval(interpreter.run.bind(interpreter, logRunDetails), 1000);
    interpreter.run(logRunDetails);
}

class Interpreter {
    parseComplete: boolean = false;
    logicID: string | null;
    buyRoot: AST | null;
    sellRoot: AST | null;

    stock: string;
    buyOrderData: OrderData;
    sellOrderData: OrderData;

    nodes: Map<string, any>;
    connections: Map<string, string[]>;

    log: (title: string, msg: string) => void;

    constructor(stock: string, logFunc: (title: string, msg: string) => void) {
        this.stock = stock;
        this.log = logFunc;

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
            this.log("Error",error.message);
            return;
        }
        this.parseComplete = true;
    }

    public run(logRunDetails: boolean) {
        if (!this.parseComplete) { return; }
        let buyResult: boolean;
        let sellResult: boolean;
        if (logRunDetails) {
            buyResult = this.buyRoot!.evaluateDetailed(this.log.bind(this, "BuyGraph")) as boolean;
            sellResult = this.sellRoot!.evaluateDetailed(this.log.bind(this, "SellGraph")) as boolean;
        }
        else {
            buyResult = this.buyRoot!.evaluate() as boolean;
            sellResult = this.sellRoot!.evaluate() as boolean;
        }
        if (buyResult) {
            this.doBuy(this.buyOrderData);
        } else {
            this.log("Buy", "매수 조건 미충족");
        }
        if (sellResult) {
            this.doSell(this.sellOrderData);
        } else {
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
                return new ConstantAST(node.controls.value);
            case "currentPrice":
                return new CurrentPriceAST();
            case "highestPrice":
                return new HighestPriceAST(node.controls.periodLength, node.controls.periodUnit);
            case "rsi":
                return new RsiAST();
            case "sma":
                return new SmaAST(node.controls.period);
            case "roi":
                return new RoiAST();
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
            default:
                throw new Error(`알 수 없는 노드 종류: ${node.kind}`);
        }
    }

    private doBuy(orderData: OrderData) {
        let msg = '';
        if (orderData.orderType === 'market') {
            msg = `시장가 자산의 ${orderData.sellPercent}% 매수`;
        }
        else {
            msg = `지정가 ${orderData.limitPrice}$에 자산의 ${orderData.sellPercent}% 매수`;
        }
        this.log("Buy", msg);
    }

    private doSell(orderData: OrderData) {
        let msg = '';
        if (orderData.orderType === 'market') {
            msg = `시장가 자산의 ${orderData.sellPercent}% 매도`;
        }
        else {
            msg = `지정가 ${orderData.limitPrice}$에 자산의 ${orderData.sellPercent}% 매도`;
        }
        this.log("Sell", msg);
    }

    private loadLogic() { //나중에 메인 화면에서 실행하는 경우 사용
        const savedLogics = JSON.parse(localStorage.getItem('userLogics')!!);
        const targetLogic = savedLogics.find((item: any) => item.id === this.logicID);
        return [targetLogic.stock, targetLogic.data];
    }
}

class OrderData {
    orderType: string;
    limitPrice: number;
    sellPercent: number;

    constructor() {
        this.orderType = "";
        this.limitPrice = 0;
        this.sellPercent = 0;
    }

    init(data: any) {
        this.orderType = data.orderType;
        this.limitPrice = data.limitPrice;
        this.sellPercent = data.sellPercent;
    }
}
