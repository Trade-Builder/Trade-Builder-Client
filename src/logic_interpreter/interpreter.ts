import type { AST } from "./ast";
import { SupplierAST, ConstantAST, LogicOpAST, CompareAST } from "./ast";

export function runLogic(stock: string, logicData: any) {
    let interpreter = new Interpreter();
    interpreter.parse(stock, logicData);
    interpreter.run();
}

class Interpreter {
    readonly supplierSet = new Set(["currentPrice", "highestPrice", "rsi", "sma", "roi", "const"]);
    logicID: string | null;
    buyRoot: AST | null;
    sellRoot: AST | null;

    stock: string;
    buyOrderData: OrderData;
    sellOrderData: OrderData;

    nodes: Map<string, any>;
    connections: Map<string, string[]>;

    constructor() {
        this.logicID = null;
        this.buyRoot = null;
        this.sellRoot = null;

        this.stock = "";
        this.buyOrderData = new OrderData();
        this.sellOrderData = new OrderData();

        this.nodes = new Map<string, any>();
        this.connections = new Map<string, string[]>();
    }

    public parse(stock: string, data: any) {
        this.stock = stock;

        const buyNode = data.buyGraph.nodes.find((n: any) => n.kind === "buy");
        const sellNode = data.sellGraph.nodes.find((n: any) => n.kind === "sell");
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
        const buyChildID = this.connections.get(buyNode.id)!![0];
        this.buyRoot = this.parseRecursive(buyChildID);

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

        const sellChildID = this.connections.get(sellNode.id)!![0];
        this.sellRoot = this.parseRecursive(sellChildID);
    }

    public run() {
        let buyResult = this.buyRoot!.evaluate();
        let sellResult = this.sellRoot!.evaluate();
        if (buyResult) {
            console.log("조건 충족! 매수 실행");
            //this.doBuy(this.orderType!!, this.limitPrice!!, this.sellPercent!!);
        }
        else {
            console.log("조건 미충족! 매수 안함");
        }
        if (sellResult) {
            console.log("조건 충족! 매도 실행");
            //this.doSell(this.orderType!!, this.limitPrice!!, this.sellPercent!!);
        }
        else {
            console.log("조건 미충족! 매도 안함");
        }
    }

    private loadLogic() { //나중에 메인 화면에서 실행하는 경우 사용
        const savedLogics = JSON.parse(localStorage.getItem('userLogics')!!);
        const targetLogic = savedLogics.find((item: any) => item.id === this.logicID);
        return [targetLogic.stock, targetLogic.data];
    }

    private parseRecursive(nodeID: string): AST {
        const node = this.nodes.get(nodeID);
        if (node.kind === "const") {
            return new ConstantAST(node.controls.value);
        }
        if (node.kind === "logicOp") {
            return new LogicOpAST(node.controls.operator, this.parseRecursive(this.connections.get(nodeID)!![0]), this.parseRecursive(this.connections.get(nodeID)!![1]));
        }
        if (node.kind === "compare") {
            return new CompareAST(node.controls.operator, this.parseRecursive(this.connections.get(nodeID)!![0]), this.parseRecursive(this.connections.get(nodeID)!![1]));
        }
        return new SupplierAST(node.kind);
    }


    private doBuy(orderType: string, limitPrice: number, sellPercent: number) {
        let msg = '';
        if (orderType === 'market') {
            msg = `시장가 자산의 ${sellPercent}% 매수`;
        }
        else {
            msg = `지정가 ${limitPrice}에 자산의 ${sellPercent}% 매수`;
        }
        console.log(msg);
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
