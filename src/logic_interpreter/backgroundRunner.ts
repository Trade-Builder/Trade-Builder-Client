import { buildInterpreter, runWithInterpreter } from './interpreter'

export type LogicGraphs = { buyGraph: any; sellGraph: any }
export type LogicPayload = { stock: string; data: LogicGraphs }

type Listener = () => void

class BackgroundRunner {
  private running = new Set<string>()
  private timers = new Map<string, any>()
  private details = new Map<string, boolean>()
  private logs = new Map<string, (title: string, msg: string) => void>()
  private states = new Map<string, { interpreter: any; stock: string; data: LogicGraphs }>()
  private listeners = new Set<Listener>()

  subscribe(cb: Listener) {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }
  private emit() {
    for (const cb of this.listeners) cb()
  }

  isRunning(id: string) {
    return this.running.has(id)
  }

  getRunningIds(): string[] {
    return Array.from(this.running)
  }

  start(id: string, payload: LogicPayload, opts?: { detailed?: boolean; intervalMs?: number; log?: (title: string, msg: string) => void }) {
    if (!id) return false
    const intervalMs = opts?.intervalMs ?? 2000
    const detailed = !!opts?.detailed
    const log = opts?.log

    if (this.timers.has(id)) {
      // 실행 중이면 상세/로그만 업데이트하고, payload가 바뀌었으면 재빌드
      this.details.set(id, detailed)
      if (log) this.logs.set(id, log)
      const state = this.states.get(id)
      if (state && (state.stock !== payload.stock || state.data !== payload.data)) {
        const interpreter = buildInterpreter(payload.stock ?? '', payload.data, (t, m) => this.logs.get(id)?.(t, m))
        this.states.set(id, { interpreter, stock: payload.stock, data: payload.data })
      }
      return true
    }

    this.details.set(id, detailed)
    if (log) this.logs.set(id, log)

    const interpreter = buildInterpreter(payload.stock ?? '', payload.data, (t, m) => this.logs.get(id)?.(t, m))
    this.states.set(id, { interpreter, stock: payload.stock, data: payload.data })

    const runOnce = () => {
      runWithInterpreter(interpreter, this.details.get(id) ?? false, (t, m) => this.logs.get(id)?.(t, m))
    }
    // 즉시 1회 실행
    runOnce()
    const handle = setInterval(runOnce, intervalMs)
    this.timers.set(id, handle)
    this.running.add(id)
    this.emit()
    return true
  }

  stop(id: string) {
    const handle = this.timers.get(id)
    if (handle) clearInterval(handle)
    this.timers.delete(id)
    this.running.delete(id)
    this.details.delete(id)
    this.logs.delete(id)
    this.states.delete(id)
    this.emit()
  }

  stopAll() {
    for (const id of this.getRunningIds()) this.stop(id)
  }

  setDetailed(id: string, detailed: boolean) {
    if (this.running.has(id)) {
      this.details.set(id, detailed)
    }
  }
}

export const backgroundRunner = new BackgroundRunner()
