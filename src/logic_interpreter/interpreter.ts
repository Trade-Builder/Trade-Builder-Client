import type { AST } from "./ast";
import { SupplierAST, CompareAST } from "./ast";

function addStock(logicID: String) {
    //데모용
    const savedLogics = JSON.parse(localStorage.getItem('userLogics')!!);
    let i = savedLogics.findIndex((l: any) => l.id === logicID);
    savedLogics[i].stock = "NVDA";
    localStorage.setItem('userLogics', JSON.stringify(savedLogics));
}

function loadLogic(logicID: String) {
    const savedLogics = JSON.parse(localStorage.getItem('userLogics')!!);
    const targetLogic = savedLogics.find((item: any) => item.id === logicID);
    return [targetLogic.stock, targetLogic.data];
}

export function runLogic(logicID: String) {
    const [stock, data] = loadLogic(logicID);
    console.log("종목명: " + stock);
    console.log(data);


}


class ASTRoot {
    child: AST;
    constructor(child: AST) {
        this.child = child;
    }

    public parse(data: any) {
        const nodes = data.buyGraph.nodes;
        const connections = data.buyGraph.connections;
    }

    private parseRecursive() {
        
    }

    public run() {
        let result = this.child.evaluate();
        if (result) {
            doBuy();
        }
    }
}

function doBuy() {
    console.log("OK Buy it");
}
