// Rete 코어 및 프리셋 가져오기 (TypeScript 변환)
import { NodeEditor, ClassicPreset } from 'rete'
import { AreaPlugin } from 'rete-area-plugin'
import { ConnectionPlugin, Presets as ConnectionPresets } from 'rete-connection-plugin'
import { ReactPlugin, Presets as ReactPresets } from 'rete-react-plugin'
import { createRoot } from 'react-dom/client'

// Custom themed components for nodes, sockets, connections
import { CustomNode } from '../customization/CustomNode.tsx'
import { CustomSocket } from '../customization/CustomSocket'
import { CustomConnection } from '../customization/CustomConnection'
import { addCustomBackground } from '../customization/custom-background'
import '../customization/background.css'

// -------------------- 타입 선언/유틸 --------------------
export type NodeKind =
    'stock'
    | 'const'
    | 'roi'
    | 'currentPrice'
    | 'highestPrice'
    | 'rsi'
    | 'sma'
    | 'compare'
    | 'logicOp'
    | 'buy'
    | 'sell'
    | 'branch'

export type SerializedGraph = {
    nodes: Array<{
        id: string
        label: string
        kind?: NodeKind
        position: { x: number; y: number }
        controls?: Record<string, any>
    }>
    connections: Array<{
        id: string
        source: string
        target: string
        sourceOutput: string
        targetInput: string
    }>
    // 실제 구현에서 viewport도 직렬화/역직렬화하므로 타입에 포함(옵션)
    viewport?: { k: number; x: number; y: number }
}

export class TradeNode extends ClassicPreset.Node {
    declare kind: NodeKind
    declare category: string
    declare _controlHints?: Record<string, { label: string; title?: string }>
}

// Typed sockets according to the design
// 소켓 타입 정의 (현재 로직에서 number/bool 주 사용)
// const assetSocket = new ClassicPreset.Socket('asset') // 종목(미사용 가능성) - 현재 미사용
const numberSocket = new ClassicPreset.Socket('number') // 숫자 값 전달
const boolSocket = new ClassicPreset.Socket('bool') // 조건(Boolean)
const flowSocket = new ClassicPreset.Socket('flow') // 흐름 제어용 (미사용)

// -------------------- Supplier 노드 (값 제공) --------------------
export class ROINode extends TradeNode {
    constructor() {
        super('ROI')
        this.addOutput('value', new ClassicPreset.Output(numberSocket, '수익률'))
        this.kind = 'roi'
        this.category = 'supplier'
    }
}

// 현재가 공급 노드
export class CurrentPriceNode extends TradeNode {
    constructor() {
        super('CurrentPrice')
        this.addOutput('value', new ClassicPreset.Output(numberSocket, '가격'))
        this.kind = 'currentPrice'
        this.category = 'supplier'
    }
}

// 특정 기간 중 최고가 계산 노드
export class HighestPriceNode extends TradeNode {
    constructor() {
        super('HighestPrice')
        this.addOutput('value', new ClassicPreset.Output(numberSocket, '최고가'))
        this.addControl('periodLength', new ClassicPreset.InputControl('number', { initial: 1 }))
        // periodUnit: dropdown (day|week|month) - 내부 값은 text control을 유지하고 UI는 나중에 select로 교체
        this.addControl('periodUnit', new ClassicPreset.InputControl('text', { initial: 'day' }))
        this.kind = 'highestPrice'
        this.category = 'supplier'
        this._controlHints = {
            periodLength: { label: '기간 길이', title: '최고가 계산에 사용할 기간 길이 (정수)' },
            periodUnit: { label: '단위', title: '기간 단위 (day/week/month)' }
        }
    }
}

// RSI 지표 노드
export class RSINode extends TradeNode {
    constructor() {
        super('RSI')
        this.addOutput('value', new ClassicPreset.Output(numberSocket, 'RSI'))
        // this.addControl('period', new ClassicPreset.InputControl('number', { initial: 1 }))
        this.kind = 'rsi'
        this.category = 'supplier'
    }
}

// 단순 이동평균(SMA) 노드
export class SMANode extends TradeNode {
    constructor() {
        super('SMA')
        this.addOutput('value', new ClassicPreset.Output(numberSocket, 'SMA'))
        this.addControl('period', new ClassicPreset.InputControl('number', { initial: 20 }))
        this.kind = 'sma'
        this.category = 'supplier'
        this._controlHints = {
            period: { label: '기간', title: '단순 이동평균 계산 기간 (일 수)' }
        }
    }
}

// 숫자 상수 공급 노드
export class ConstNode extends TradeNode {
    constructor() {
        super('Const')
        this.addOutput('value', new ClassicPreset.Output(numberSocket, '값'))
        this.addControl('value', new ClassicPreset.InputControl('number', { initial: 0 }))
        this.kind = 'const'
        this.category = 'supplier'
        this._controlHints = {
            value: { label: '값', title: '상수로 사용할 숫자 값' }
        }
    }
}

// -------------------- LogicOp 노드 (AND/OR) --------------------
// 논리 연산 (&& / ||) 노드
export class LogicOpNode extends TradeNode {
    constructor() {
        super('LogicOp')
        this.addInput('a', new ClassicPreset.Input(boolSocket, 'A'))
        this.addInput('b', new ClassicPreset.Input(boolSocket, 'B'))
        this.addOutput('out', new ClassicPreset.Output(boolSocket, 'Bool'))
        // operator: &&, || 드롭다운 적용 대상 (text 유지 후 UI 교체 예정)
        this.addControl('operator', new ClassicPreset.InputControl('text', { initial: 'and' }))
        this.kind = 'logicOp'
        this.category = 'condition'
        this._controlHints = {
            operator: { label: '연산자', title: '논리 연산자 (&&: AND, ||: OR)' }
        }
    }
}

// -------------------- Condition 노드 (조건) --------------------
// 숫자 비교 노드 (A,B 입력 → Bool 출력)
export class CompareNode extends TradeNode {
    constructor() {
        super('Compare')
        this.addInput('a', new ClassicPreset.Input(numberSocket, 'A'))
        this.addInput('b', new ClassicPreset.Input(numberSocket, 'B'))
        this.addOutput('out', new ClassicPreset.Output(boolSocket, 'Bool'))
        this.addControl('operator', new ClassicPreset.InputControl('text', { initial: '>' })) // >,>=,<,<=,==,!=
        this.kind = 'compare'
        this.category = 'condition'
        this._controlHints = {
            operator: { label: '연산자', title: '비교 연산자 (>, ≥, <, ≤, =, ≠)' }
        }
    }
}

// -------------------- Consumer 노드 (소비자/실행) --------------------
// 매수 실행 노드
export class BuyNode extends TradeNode {
    constructor() {
        super('Buy')
        this.addInput('cond', new ClassicPreset.Input(boolSocket, 'Bool')) //bool 값을 받음
        // this.addOutput('out', new ClassicPreset.Output(flowSocket, '다음'))
        this.addControl('orderType', new ClassicPreset.InputControl('text', { initial: 'market' })) // market|limit
        this.addControl('limitPrice', new ClassicPreset.InputControl('number', { initial: 100 }))
        this.addControl('sellPercent', new ClassicPreset.InputControl('number', { initial: 2 }))
        this.kind = 'buy'
        this.category = 'consumer'
        this._controlHints = {
            orderType: { label: '주문유형', title: '주문 방식 (market: 시장가 / limit: 지정가)' },
            limitPrice: { label: '지정가', title: 'orderType이 limit일 때 사용되는 가격' },
            sellPercent: { label: '청산%', title: '목표 수익률(%) 도달 시 매도 (예: 2 => 2%)' }
        }
    }
}

// 매도 실행 노드
export class SellNode extends TradeNode {
    constructor() {
        super('Sell')
        this.addInput('cond', new ClassicPreset.Input(boolSocket, 'Bool'))
        // this.addOutput('out', new ClassicPreset.Output(flowSocket, '다음'))
        this.addControl('orderType', new ClassicPreset.InputControl('text', { initial: 'market' })) // market|limit
        this.addControl('limitPrice', new ClassicPreset.InputControl('number', { initial: 100 }))
        this.addControl('sellPercent', new ClassicPreset.InputControl('number', { initial: 2 }))
        this.kind = 'sell'
        this.category = 'consumer'
        this._controlHints = {
            orderType: { label: '주문유형', title: '주문 방식 (market: 시장가 / limit: 지정가)' },
            limitPrice: { label: '지정가', title: 'orderType이 limit일 때 사용되는 가격' },
            sellPercent: { label: '청산%', title: '목표 수익률(%) 도달 시 매수(또는 청산) 트리거' }
        }
    }
}

// 조건 분기(과거에 주석 처리되어 있었으나 createNodeByKind에서 참조하므로 복구)
export class BranchNode extends TradeNode {
    constructor() {
        super('조건분기')
        this.addInput('in', new ClassicPreset.Input(flowSocket, '이전'))
        this.addOutput('true', new ClassicPreset.Output(flowSocket, '참'))
        this.addOutput('false', new ClassicPreset.Output(flowSocket, '거짓'))
        this.kind = 'branch'
        this.category = 'flow'
    }
}

// -------------------- 에디터 초기화 및 설정 --------------------
// 에디터/플러그인 초기화 및 UI 보조 로직 설정
export async function createAppEditor(container: HTMLElement): Promise<{
        editor: any
        area: any
        destroy: () => void
    }> {
    const editor = new NodeEditor()
    const area: any = new AreaPlugin(container as unknown as HTMLElement)
    const connection: any = new ConnectionPlugin()
    const reactRender: any = new ReactPlugin({ createRoot })

    editor.use(area)
    area.use(connection)
    area.use(reactRender)

    connection.addPreset(ConnectionPresets.classic.setup())
    // Apply custom theming for Node/Socket/Connection
    reactRender.addPreset(
        (ReactPresets as any).classic.setup({
            customize: {
                node() { return CustomNode },
                socket() { return CustomSocket },
                connection() { return CustomConnection }
            }
        })
    )

    // Optional: add subtle dark grid background to the area
    try {
        addCustomBackground(area as any)
    } catch { }

    // --- 더블클릭 확대 비활성화: 기본 d3/zoom 유사 동작 차단 ---
    // 캔버스 컨테이너에서 발생하는 dblclick을 막아 확대 트리거를 방지한다.
    const stopDblClick = (e: MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
    }
    container.addEventListener('dblclick', stopDblClick, { capture: true })

    // -------------------- 공통 드롭다운 변환 유틸 (dropdown) --------------------
    // Text 기반 컨트롤을 <select> 로 치환하여 드롭다운 UI 제공
    function genericSelectEnhancer(
        node: TradeNode | any,
        cfg: {
            labelMatch: string
            controlKey: string
            options: string[]
            dropdown?: { noScroll?: boolean; itemTextClass?: string }
        }
    ) {
        // 1. 노드가 없거나 라벨이 일치하지 않으면 종료
        if (!node || node.label !== cfg.labelMatch) return
        let attempts = 0
        const MAX_ATTEMPTS = 5 // DOM 요소 로딩을 기다리며 최대 5회 재시도한다.
        // 실제 UI 강화 로직을 담고 있는 함수로, try-catch 구문을 이용해 비동기적으로 실행된다.
        const tryEnhance = () => {
            attempts++
            try {
                // 2. 노드의 시각적 뷰(view) 객체를 area.nodeViews에서 가져온다.
                const view: any = (area as any).nodeViews.get(node.id)
                // 뷰가 없으면 재시도하거나 종료한다.
                if (!view) {
                    if (attempts < MAX_ATTEMPTS) return requestAnimationFrame(tryEnhance)
                    else return
                }
                // 3. 뷰의 최상위 DOM 요소(el)를 가져온다.
                const el: HTMLElement | undefined = (view.element || view.el || view.root) as HTMLElement | undefined
                // DOM 요소가 없으면 재시도하거나 종료한다.
                if (!el) {
                    if (attempts < MAX_ATTEMPTS) return requestAnimationFrame(tryEnhance)
                    else return
                }
                const inputs: NodeListOf<HTMLInputElement> = el.querySelectorAll('input')
                let targetInput: HTMLInputElement | null = null // 교체할 대상 <input> 요소를 저장하는 변수

                // 4. 교체할 <input> 필드 찾기 (1순위: 옵션 값 중 하나를 현재 값으로 가진 input)
                inputs.forEach((inp) => {
                    if (cfg.options.includes(inp.value)) targetInput = inp
                })

                // 5. 교체할 <input> 필드 찾기 (2순위: 아직 교체되지 않은 일반 텍스트 input)
                if (!targetInput) {
                    inputs.forEach((inp) => {
                        if (!targetInput && inp.type === 'text' && !(inp as any).dataset.replaced) targetInput = inp
                    })
                }
                // 대상 input을 찾지 못했으면 재시도하거나 종료한다.
                if (!targetInput) {
                    if (attempts < MAX_ATTEMPTS) return requestAnimationFrame(tryEnhance)
                    else return
                }

                // 이미 교체된 input이라면 로직을 더 진행하지 않고 종료한다.
                if ((targetInput as any).dataset.replaced === '1') return

                // 6. 드롭다운 UI 생성 (커스텀 구현: 원본 input을 숨기고, 버튼+목록으로 대체)
                const ti = targetInput as HTMLInputElement
                const wrapper = (ti.parentElement || el) as HTMLElement
                const container = document.createElement('div')
                container.className = 'relative'
                const button = document.createElement('button')
                button.type = 'button'
                button.className = [
                    'w-full',
                    'px-3',
                    'py-2',
                    'text-sm',
                    'rounded-md',
                    'border',
                    'outline-none',
                    'focus:ring-2',
                    'focus:ring-cyan-400/40',
                    'focus:border-cyan-400/50',
                    'flex',
                    'items-center',
                    'justify-between'
                ].join(' ')
                    // 색상은 노드 input과 동일한 토큰을 직접 적용
                    ; (button.style as any).background = 'var(--control-bg)'
                    ; (button.style as any).borderColor = 'var(--control-border)'
                    ; (button.style as any).color = 'var(--control-fg)'
                const labelSpan = document.createElement('span')
                labelSpan.className = 'truncate text-left'
                const caretSpan = document.createElement('span')
                caretSpan.className = 'ml-2 text-gray-400 select-none'
                caretSpan.textContent = '▾'
                button.appendChild(labelSpan)
                button.appendChild(caretSpan)
                const list = document.createElement('ul')
                const listClasses = ['absolute', 'left-0', 'right-0', 'mt-1', 'rounded-md', 'border', 'shadow-xl', 'z-[1100]', 'hidden']
                if (!(cfg.dropdown && cfg.dropdown.noScroll)) {
                    listClasses.push('max-h-48', 'overflow-auto')
                }
                list.className = listClasses.join(' ')
                    ; (list.style as any).background = 'var(--control-bg)'
                    ; (list.style as any).borderColor = 'var(--control-border)'
                if (cfg.dropdown && cfg.dropdown.noScroll) {
                    list.style.maxHeight = 'none'
                    list.style.overflow = 'visible'
                }
                // 옵션 항목 생성
                const itemTextClass = (cfg.dropdown && cfg.dropdown.itemTextClass) || 'text-sm'
                cfg.options.forEach((opt) => {
                    const li = document.createElement('li')
                    li.textContent = opt
                    li.className = `px-3 py-2 ${itemTextClass} cursor-pointer`
                        ; (li.style as any).color = 'var(--control-fg)'
                    // hover 배경은 control-border를 옅게 사용
                    li.addEventListener('mouseenter', () => {
                        li.style.background = 'rgba(51, 65, 85, 0.2)' // slate-700/20 유사
                    })
                    li.addEventListener('mouseleave', () => {
                        li.style.background = 'transparent'
                    })
                    li.addEventListener('click', () => {
                        setCurrent(opt)
                        hideList()
                    })
                    list.appendChild(li)
                })
                container.appendChild(button)
                container.appendChild(list)

                // 7. 초기 값 결정
                const ctrl = (node.controls as any)?.[cfg.controlKey]
                const internalVal = ctrl && (ctrl.value ?? (typeof ctrl.getValue === 'function' ? ctrl.getValue() : undefined))
                let currentVal: string | undefined = internalVal && cfg.options.includes(internalVal) ? (internalVal as string) : undefined
                if (!currentVal)
                    currentVal = ti.value && cfg.options.includes(ti.value)
                        ? ti.value
                        : cfg.options[0]
                // 버튼 라벨 초기화
                labelSpan.textContent = currentVal ?? ''

                // 8. 노드 컨트롤의 값을 현재 값으로 보정하여 동기화한다.
                try {
                    if (ctrl) {
                        if (typeof ctrl.setValue === 'function') ctrl.setValue(currentVal)
                        else ctrl.value = currentVal
                    }
                } catch { }

                // -------------------- 동작 로직: 열기/닫기/값 설정 --------------------
                function showList() {
                    list.classList.remove('hidden')
                    container.classList.add('ring-2', 'ring-cyan-400/40')
                    setTimeout(() => {
                        // 외부 클릭 시 닫기
                        const onDoc = (ev: MouseEvent) => {
                            if (!container.contains(ev.target as Node)) hideList()
                        }
                        window.addEventListener('mousedown', onDoc, { once: true })
                    }, 0)
                }
                function hideList() {
                    list.classList.add('hidden')
                    container.classList.remove('ring-2', 'ring-cyan-400/40')
                }
                function setCurrent(val: string) {
                    labelSpan.textContent = val
                    try {
                        const ctrl2 = (node.controls as any)?.[cfg.controlKey]
                        if (ctrl2) {
                            if (typeof ctrl2.setValue === 'function') ctrl2.setValue(val)
                            else ctrl2.value = val
                        }
                    } catch { }
                }
                button.addEventListener('click', (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (list.classList.contains('hidden')) showList()
                    else hideList()
                })
                button.addEventListener('keydown', (e: KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        showList()
                    }
                    if (e.key === 'Escape') {
                        e.preventDefault()
                        hideList()
                    }
                })

                // 11. DOM 교체: 원래 input을 숨기고 커스텀 드롭다운을 삽입한다.
                ti.style.display = 'none'
                    ; (ti as any).dataset.replaced = '1'
                wrapper.insertBefore(container, ti.nextSibling)
            } catch {
                // 예외 발생 시, 재시도 횟수가 남았으면 다시 시도한다.
                if (attempts < MAX_ATTEMPTS) requestAnimationFrame(tryEnhance)
            }
        }

        // 다음 애니메이션 프레임에 비동기 함수 실행을 요청하여 작업을 시작한다.
        requestAnimationFrame(tryEnhance)
    }

    // addNode 오버라이드: 제약 검사 후 select 변환 적용
    const originalAddNode = editor.addNode.bind(editor)
        ; (editor as any).addNode = async (node: TradeNode) => {
            // 규칙: Buy/Sell 단일 개수 (그래프 전체)
            if (node.kind === 'buy' && (editor.getNodes() as any[]).some((n: any) => (n as TradeNode).kind === 'buy')) {
                console.warn('[규칙] Buy 노드는 1개만 허용')
                return node
            }
            if (node.kind === 'sell' && (editor.getNodes() as any[]).some((n: any) => (n as TradeNode).kind === 'sell')) {
                console.warn('[규칙] Sell 노드는 1개만 허용')
                return node
            }
            const res = await originalAddNode(node)
            applySelectEnhancements(node)
            return res
        }

    // -------------------- Node별 Select 적용 조합 --------------------
    function applySelectEnhancements(node: TradeNode) {
        genericSelectEnhancer(node, { labelMatch: 'HighestPrice', controlKey: 'periodUnit', options: ['day', 'week', 'month', 'year'] })
        genericSelectEnhancer(node, { labelMatch: 'Buy', controlKey: 'orderType', options: ['market', 'limit'] })
        genericSelectEnhancer(node, { labelMatch: 'Sell', controlKey: 'orderType', options: ['market', 'limit'] })
        genericSelectEnhancer(node, {
            labelMatch: 'Compare',
            controlKey: 'operator',
            options: ['>', '≥', '=', '<', '≤', '≠'],
            dropdown: { noScroll: true, itemTextClass: 'text-base' }
        })
        genericSelectEnhancer(node, { labelMatch: 'LogicOp', controlKey: 'operator', options: ['and', 'or'] })
    }

    // -------------------- 연결 타입 검사 --------------------
    const originalAddConnection = (editor as any).addConnection.bind(editor)
        ; (editor as any).addConnection = async (con: any) => {
            try {
                // source/target 소켓 name 비교 (number/bool 등)
                const sNode: TradeNode | undefined = editor.getNode(con.source) as any
                const tNode: TradeNode | undefined = editor.getNode(con.target) as any
                if (sNode && tNode) {
                    const sOut = (sNode.outputs as any)[con.sourceOutput] as ClassicPreset.Output<ClassicPreset.Socket>
                    const tIn = (tNode.inputs as any)[con.targetInput] as ClassicPreset.Input<ClassicPreset.Socket>
                    const sType = sOut && (sOut.socket as any) && (sOut.socket as any).name
                    const tType = tIn && (tIn.socket as any) && (tIn.socket as any).name
                    if (sType && tType && sType !== tType) {
                        console.warn('[연결 차단] 소켓 타입 불일치', sType, '->', tType)
                        return con
                    }
                }
            } catch { }
            return originalAddConnection(con)
        }

    // -------------------- Context Menu (우클릭 메뉴) --------------------
    const menu = document.createElement('div')
    menu.style.position = 'absolute'
    menu.style.zIndex = '50'
    menu.style.display = 'none'
    menu.style.background = 'white'
    menu.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
    menu.style.borderRadius = '8px'
    menu.style.padding = '6px'
        ; (menu.style as any).border = '1px solid #e5e7eb'
    menu.style.minWidth = '100px'
    const delBtn = document.createElement('button')
    delBtn.textContent = '삭제'
    delBtn.style.width = '100%'
    delBtn.style.padding = '6px 10px'
    delBtn.style.color = '#fff'
    delBtn.style.background = '#ef4444'
    delBtn.style.borderRadius = '6px'
        ; (delBtn.style as any).border = 'none'
    delBtn.style.cursor = 'pointer'
    menu.appendChild(delBtn)
    container.appendChild(menu)

    let currentNode: TradeNode | null = null
    function closeMenu() {
        menu.style.display = 'none'
        currentNode = null
    }
    function openMenu(clientX: number, clientY: number, node: TradeNode) {
        const rect = container.getBoundingClientRect()
        menu.style.left = `${clientX - rect.left}px`
        menu.style.top = `${clientY - rect.top}px`
        menu.style.display = 'block'
        currentNode = node
    }

    function findNodeAt(clientX: number, clientY: number): TradeNode | null {
        for (const node of (editor.getNodes() as any[])) {
            const view: any = (area as any).nodeViews.get((node as any).id)
            const el: any = view && (view.element || view.el || view.root || null)
            if (!el || !el.getBoundingClientRect) continue
            const r = el.getBoundingClientRect()
            if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
                return node
            }
        }
        return null
    }

    container.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        const node = findNodeAt(e.clientX, e.clientY)
        if (node) openMenu(e.clientX, e.clientY, node)
        else closeMenu()
    })
    delBtn.addEventListener('click', async () => {
        if (currentNode) {
            try {
                const cons = editor
                    .getConnections()
                    .filter((c: any) => c.source === (currentNode as any).id || c.target === (currentNode as any).id)
                for (const c of cons) {
                    try {
                        await (editor as any).removeConnection(c.id)
                    } catch { }
                }
                await (editor as any).removeNode((currentNode as any).id)
            } catch { }
        }
        closeMenu()
    })
    window.addEventListener('click', (e) => {
        if ((e as MouseEvent).button === 0) closeMenu()
    })
    window.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Escape') closeMenu()
    })

    return {
        editor,
        area,
        destroy: () => {
            closeMenu()
            menu.remove()
                ; (area as any).destroy()
        }
    }
}

// -------------------- 노드 생성 유틸리티 --------------------
// kind 식별자를 실제 노드 인스턴스로 생성
export function createNodeByKind(kind: NodeKind): TradeNode {
    switch (kind) {
        // Supplier / Sources
        case 'roi':
            return new ROINode()
        case 'const':
            return new ConstNode()
        // Calculator
        case 'currentPrice':
            return new CurrentPriceNode()
        case 'highestPrice':
            return new HighestPriceNode()
        case 'rsi':
            return new RSINode()
        case 'sma':
            return new SMANode()
        // Condition
        case 'compare':
            return new CompareNode()
        case 'logicOp':
            return new LogicOpNode()
        // Consumer
        case 'buy':
            return new BuyNode()
        case 'sell':
            return new SellNode()
        // Branch/Flow
        case 'branch':
            return new BranchNode()
        // 제거된/미지원 노드 안전 처리
        case 'stock':
            throw new Error('Deprecated node kind: stock')
        default:
            throw new Error('Unknown node kind: ' + (kind as string))
    }
}

// 화면 좌표(client) → 에디터 공간(world) 좌표 변환 (줌/팬 반영)
export function clientToWorld(
    area: any,
    container: HTMLElement,
    clientX: number,
    clientY: number,
    evt?: MouseEvent
): { x: number; y: number } {
    // Prefer pointer computed by area when event is available (accounts for zoom/pan handlers)
    if (evt && area && area.area && typeof area.area.setPointerFrom === 'function') {
        try {
            area.area.setPointerFrom(evt)
            const wx = area.area.pointer.x
            const wy = area.area.pointer.y
            return { x: wx, y: wy }
        } catch (_) {
            // fallback below
        }
    }
    const rect = container.getBoundingClientRect()
    const sx = clientX - rect.left
    const sy = clientY - rect.top
    const { k, x, y } = area.area.transform
    return { x: (sx - x) / k, y: (sy - y) / k }
}

// 라벨 문자열을 kind 로 역매핑 (과거 데이터 호환)
const labelToKind = (label: string): NodeKind | undefined => {
    switch (label) {
        // Consumer
        case 'Buy':
        case '매수 로직':
        case '매수':
            return 'buy'
        case 'Sell':
        case '매도 로직':
        case '매도':
            return 'sell'
        // Branch/Flow
        case '조건 분기':
        case '조건분기':
        case 'Branch':
            return 'branch'
        case 'ROI':
        case '수익률':
            return 'roi'
        case 'Const':
        case '상수':
            return 'const'
        // Calculator
        case 'CurrentPrice':
        case '현재가':
            return 'currentPrice'
        case 'HighestPrice':
        case '최고가':
            return 'highestPrice'
        case 'RSI':
            return 'rsi'
        case 'SMA':
            return 'sma'
        // Condition
        case 'Compare':
        case '비교':
            return 'compare'
        case 'LogicOp':
        case '논리':
        case 'AND/OR':
            return 'logicOp'
        // Legacy fallbacks
        case '데이터 분석':
            // 과거 값으로, 현재는 별도 kind 아님
            return undefined
        default:
            return undefined
    }
}

// -------------------- 그래프 내보내기, JSON 직렬화 (Export) --------------------
export function exportGraph(editor: any, area: any): SerializedGraph {
    const nodes = editor.getNodes().map((node: TradeNode) => {
        const view = (area as any).nodeViews.get((node as any).id)
        const position = view && view.position ? view.position : { x: 0, y: 0 }
        const controls: Record<string, any> = {}
        if (node.controls) {
            for (const key of Object.keys(node.controls)) {
                const ctrl = (node.controls as any)[key]
                if (ctrl && Object.prototype.hasOwnProperty.call(ctrl, 'value')) {
                    controls[key] = ctrl.value
                }
            }
        }
        return {
            id: (node as any).id,
            label: node.label,
            kind: (node as TradeNode).kind || labelToKind(node.label),
            position,
            controls
        }
    })

    const connections = editor.getConnections().map((c: any) => ({
        id: c.id,
        source: c.source,
        target: c.target,
        sourceOutput: c.sourceOutput,
        targetInput: c.targetInput
    }))

    let viewport: SerializedGraph['viewport']
    try {
        if (area && area.area && area.area.transform) {
            const { k, x, y } = area.area.transform
            viewport = { k, x, y }
        }
    } catch { }

    return { nodes, connections, viewport }
}

// -------------------- 그래프 불러오기 (Import) --------------------
export async function importGraph(editor: any, area: any, graph: SerializedGraph | undefined | null): Promise<void> {
    if (!graph) return
    await editor.clear()

    const idMap = new Map<string, TradeNode>()

    // 1. 노드 생성 및 값 복원
    for (const n of graph.nodes || []) {
        if (n.kind === 'stock' || n.label === 'Stock' || (n as any).label === '종목') {
            console.warn('[importGraph] 제거된 Stock 노드 스킵:', n)
            continue
        }
        const kind = n.kind || labelToKind(n.label)
        let node: TradeNode
        try {
            node = createNodeByKind(kind as NodeKind)
        } catch (e) {
            node = new BuyNode() as TradeNode
        }

        if (n.controls) {
            for (const key of Object.keys(n.controls)) {
                const ctrl = (node.controls as any)[key]
                const val = (n.controls as any)[key]
                if (ctrl && typeof ctrl.setValue === 'function') ctrl.setValue(val)
                else if (ctrl && 'value' in ctrl) ctrl.value = val
            }
        }

        await editor.addNode(node)
        idMap.set(n.id, node)

        const pos = n.position || { x: 0, y: 0 }
        await (area as any).nodeViews.get((node as any).id)?.translate(pos.x, pos.y)
    }

    // 2. 연결 생성
    for (const con of graph.connections || []) {
        const source = idMap.get(con.source)
        const target = idMap.get(con.target)

        if (source && target) {
            await editor.addConnection(new ClassicPreset.Connection(source, con.sourceOutput, target, con.targetInput))
        }
    }

    // 3. 뷰포트(줌/팬) 복원
    if (graph.viewport && area && area.area && typeof area.area.translate === 'function') {
        try {
            const { k, x, y } = graph.viewport
            if (typeof k === 'number') area.area.transform.k = k
            if (typeof x === 'number') area.area.transform.x = x
            if (typeof y === 'number') area.area.transform.y = y
            if (typeof area.area.update === 'function') area.area.update()
        } catch { }
    }

    if (typeof (editor as any).reteUiEnhance === 'function') {
        requestAnimationFrame(() => {
            try {
                ; (editor as any).reteUiEnhance()
            } catch { }
        })
    }
}

// -------------------- 개별 노드 제거 (Delete) --------------------
export async function removeNodeWithConnections(editor: any, nodeId: string): Promise<void> {
    const cons = editor.getConnections().filter((c: any) => c.source === nodeId || c.target === nodeId)
    for (const c of cons) {
        try {
            await (editor as any).removeConnection(c.id)
        } catch { }
    }
    try {
        await (editor as any).removeNode(nodeId)
    } catch { }
}

