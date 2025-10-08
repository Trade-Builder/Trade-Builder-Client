import { IndicatorsSync } from '@ixjb94/indicators';

//-----------------데모용-----------------

const generators = new Map([
    ["currentPrice", async () => {
        return 100 + Math.random() * 50;
    }],
    ["highestPrice", async () => {
        return 120 + Math.random() * 40;
    }],
    ["rsi", async () => {
        return Math.random() * 100;
    }],
    ["sma", async () => {
        return 110 + Math.random() * 30;
    }],
    ["roi", async () => {
        return -5 + Math.random() * 10;
    }],
    ["const", async () => {
        return 100;
    }],
]);

function calc() {
    const ta = new IndicatorsSync();
    const closes = [44, 44.15, 43.9, 44.35, 44.7, 45.05, 44.9, 45.2, 45.5, 45.3, 45.6]
    const highs = [45, 45.2, 45.0, 45.5, 45.7, 45.8, 45.6, 45.9, 46.0, 45.95, 46.2]

    const sma5 = ta.sma(closes, 5)
    console.log('Sync SMA(5):', sma5)

    const rsi14 = ta.rsi(closes, 14)
    console.log('Sync RSI(14):', rsi14)

    const hh5 = ta.max(highs, 5)
    console.log('Sync 5봉 최고가:', hh5)
}
//--------------------------------------------------


export interface AST {
    evaluate(): number | boolean;
}

export class SupplierAST implements AST {
    supplierType: string;
    constructor(supplierType: string) {
        this.supplierType = supplierType;
    }
    evaluate() {
        let value = 0;
        generators.get(this.supplierType)!!().then((v) => {
            value = v;
        });
        return value;
    }
}

export class ConstantAST implements AST {
    value: number;
    constructor(value: number) {
        this.value = value;
    }

    evaluate() {
        console.log(`ConstantAST evaluate called. value: ${this.value}`);
        return this.value;
    }
}

export class LogicOpAST implements AST {
    operator: string;
    childA: AST;
    childB: AST
    constructor(operator: string, childA: AST, childB: AST) {
        this.operator = operator;
        this.childA = childA;
        this.childB = childB;
    }
    evaluate() {
        const a = this.childA.evaluate() as boolean;
        const b = this.childB.evaluate() as boolean;
        console.log(`LogicOpAST evaluate called. expr: ${a} ${this.operator} ${b}`);
        switch (this.operator) {
            case '&&': return a && b;
            case '||': return a || b;
            default: return false;
        }
    }
}

export class CompareAST implements AST {
    operator: string;
    childA: AST;
    childB: AST;
    constructor(operator: string, childA: AST, childB: AST) {
        this.operator = operator;
        this.childA = childA;
        this.childB = childB;
    }
    evaluate() {
        const a = this.childA.evaluate() as number;
        const b = this.childB.evaluate() as number;
        console.log(`CompareAST evaluate called. expr: ${a} ${this.operator} ${b}`);
        switch (this.operator) {
            case '>': return a > b;
            case '<': return a < b;
            case '>=': return a >= b;
            case '<=': return a <= b;
            case '==': return a === b;
            case '!=': return a !== b;
            default: return false;
        }
    }
}
