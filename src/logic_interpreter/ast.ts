import { IndicatorsSync } from '@ixjb94/indicators';
import { APIManager } from './api_manager';

const ta = new IndicatorsSync();

export interface AST {
    evaluate(): number | boolean;
    evaluateDetailed(log: (msg: string) => void): number | boolean;
}

export abstract class SupplierAST implements AST {
    manager: APIManager;

    constructor(manager: APIManager) {
        this.manager = manager;
    }

    abstract evaluate(): number | boolean;
    abstract evaluateDetailed(log: (msg: string) => void): number | boolean;
}

export class ConstantAST extends SupplierAST {
    value: number;
    constructor(manager: APIManager, value: number) {
        super(manager);
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

export class CurrentPriceAST extends SupplierAST {
    constructor(manager: APIManager) {
        super(manager);
    }
    calcValue() {
        return this.manager.getLatestPrice();
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

export class HighestPriceAST extends SupplierAST {
    periodLength: number;
    periodUnit: string;
    private isReady: boolean = false;

    constructor(manager: APIManager, periodLength: number, periodUnit: string) {
        super(manager);
        this.periodLength = periodLength;
        this.periodUnit = periodUnit;
        manager.setReadyHighestPrice(periodUnit, periodLength).then(() => {
            this.isReady = true;
        });
    }

    calcValue() {
        // TODO: 나중에 적절히 기다리도록 수정 필요
        if (!this.isReady) {
            throw new Error(`HighestPrice data not ready yet for ${this.periodUnit}-${this.periodLength}`);
        }
        return this.manager.getHighestPrice(`${this.periodUnit}-${this.periodLength}`);
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

export class RsiAST extends SupplierAST {
    constructor(manager: APIManager) {
        super(manager);
    }
    calcValue() {
        const data = this.manager.getPriceDataArray();
        const result = ta.rsi(data, 14);
        return result[result.length - 1];
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

export class RoiAST extends SupplierAST {
    constructor(manager: APIManager) {
        super(manager);
    }
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

export class SmaAST extends SupplierAST {
    period: number;

    constructor(manager: APIManager, period: number) {
        super(manager);
        this.period = period;
    }

    calcValue() {
        const data = this.manager.getPriceDataArray().slice(-this.period);
        const result = ta.sma(data, this.period);
        return result[result.length - 1];
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
            case 'and': return a && b;
            case 'or': return a || b;
            default: return false;
        }
    }

    evaluateDetailed(log: (msg: string) => void) {
        const a = this.childA.evaluateDetailed((msg:string) => log(msg)) as boolean;
        const b = this.childB.evaluateDetailed((msg:string) => log(msg)) as boolean;
        let result: boolean;
        switch (this.operator) {
            case 'and': result = a && b; break;
            case 'or': result = a || b; break;
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
            case '≥': return a >= b;
            case '≤': return a <= b;
            case '=': return a === b;
            case '≠': return a !== b;
            default: return false;
        }
    }

    evaluateDetailed(log: (msg: string) => void) {
        const a = this.childA.evaluateDetailed(log) as number;
        const b = this.childB.evaluateDetailed(log) as number;
        let result: boolean;
        switch (this.operator) {
            case '>': result = a > b; break;
            case '<': result = a < b; break;
            case '≥': result = a >= b; break;
            case '≤': result = a <= b; break;
            case '=': result = a === b; break;
            case '≠': result = a !== b; break;
            default: result = false;
        }
        log(`Compare expr: ${a.toFixed(2)} ${this.operator} ${b.toFixed(2)} => ${result}`);
        return result;
    }
}
