import { IndicatorsSync } from '@ixjb94/indicators';

function calc() { //데모용
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

export interface AST {
    evaluate(): number | boolean;

    evaluateDetailed(log: (msg: string) => void): number | boolean;
}

export class ConstantAST implements AST {
    value: number;
    constructor(value: number) {
        this.value = value;
    }

    evaluate() {
        return this.value;
    }

    evaluateDetailed(log: (msg: string) => void) {
        log(`Constant value: ${this.value}`);
        return this.value;
    }
}

export class CurrentPriceAST implements AST {
    constructor() { }
    calcValue() {
        return 100 + Math.random() * 50;
    }

    evaluate() {
        return this.calcValue();
    }

    evaluateDetailed(log: (msg: string) => void) {
        const value = this.calcValue();
        log(`CurrentPrice value: ${value.toFixed(2)}`);
        return value;
    }
}

export class HighestPriceAST implements AST {
    periodLength: number;
    periodUnit: string;

    constructor(periodLength: number, periodUnit: string) {
        this.periodLength = periodLength;
        this.periodUnit = periodUnit;
    }

    calcValue() {
        return 120 + Math.random() * 40;
    }

    evaluate() {
        return this.calcValue();
    }

    evaluateDetailed(log: (msg: string) => void) {
        const value = this.calcValue();
        log(`HighestPrice value: ${value.toFixed(2)}`);
        return value;
    }
}

export class RsiAST implements AST {
    constructor() { }
    calcValue() {
        return Math.random() * 100;
    }

    evaluate() {
        return this.calcValue();
    }

    evaluateDetailed(log: (msg: string) => void) {
        const value = this.calcValue();
        log(`RSI value: ${value.toFixed(2)}`);
        return value;
    }
}

export class RoiAST implements AST {
    constructor() { }
    calcValue() {
        return -5 + Math.random() * 10;
    }

    evaluate() {
        return this.calcValue();
    }

    evaluateDetailed(log: (msg: string) => void) {
        const value = this.calcValue();
        log(`ROI value: ${value.toFixed(2)}`);
        return value;
    }
}

export class SmaAST implements AST {
    period: number;

    constructor(period: number) {
        this.period = period;
    }

    calcValue() {
        return 110 + Math.random() * 30;
    }

    evaluate() {
        return this.calcValue();
    }

    evaluateDetailed(log: (msg: string) => void) {
        const value = this.calcValue();
        log(`SMA value: ${value.toFixed(2)}`);
        return value;
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
        switch (this.operator) {
            case '&&': return a && b;
            case '||': return a || b;
            default: return false;
        }
    }

    evaluateDetailed(log: (msg: string) => void) {
        const a = this.childA.evaluateDetailed((msg:string) => log(msg)) as boolean;
        const b = this.childB.evaluateDetailed((msg:string) => log(msg)) as boolean;
        let result: boolean;
        switch (this.operator) {
            case '&&': result = a && b; break;
            case '||': result = a || b; break;
            default: result = false;
        }
        log(`LogicOp expr: ${a} ${this.operator} ${b} => ${result}`);
        return result;
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

    evaluateDetailed(log: (msg: string) => void) {
        const a = this.childA.evaluateDetailed((msg:string) => log(msg)) as number;
        const b = this.childB.evaluateDetailed((msg:string) => log(msg)) as number;
        let result: boolean;
        switch (this.operator) {
            case '>': result = a > b; break;
            case '<': result = a < b; break;
            case '>=': result = a >= b; break;
            case '<=': result = a <= b; break;
            case '==': result = a === b; break;
            case '!=': result = a !== b; break;
            default: result = false;
        }
        log(`Compare expr: ${a.toFixed(2)} ${this.operator} ${b.toFixed(2)} => ${result}`);
        return result;
    }
}
