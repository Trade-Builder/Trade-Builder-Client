import { NodeEditor, ClassicPreset } from 'rete'
import { AreaPlugin } from 'rete-area-plugin'
import { ConnectionPlugin, Presets as ConnectionPresets } from 'rete-connection-plugin'
import { ReactPlugin, Presets as ReactPresets } from 'rete-react-plugin'
import { createRoot } from 'react-dom/client'

// Typed sockets according to the design
const assetSocket = new ClassicPreset.Socket('asset') // 종목
const numberSocket = new ClassicPreset.Socket('number') // Double/숫자
const boolSocket = new ClassicPreset.Socket('bool') // Bool
const flowSocket = new ClassicPreset.Socket('flow') // 제어 흐름(Consumer chaining)

// -------------------- Supplier 노드 (데이터 공급자) --------------------
export class StockNode extends ClassicPreset.Node {
  constructor() {
    super('Stock')
    this.addOutput('asset', new ClassicPreset.Output(assetSocket, '종목'))
    this.addControl('symbol', new ClassicPreset.InputControl('text', { initial: 'AAPL' }))
    this.kind = 'stock'
    this.category = 'supplier'
  }
}

export class ROINode extends ClassicPreset.Node {
  constructor() {
    super('ROI')
    this.addOutput('value', new ClassicPreset.Output(numberSocket, '수익률'))
    this.kind = 'roi'
    this.category = 'supplier'
  } 
}

// -------------------- Calculator 노드 (계산/분석) --------------------
//현재가
export class CurrentPriceNode extends ClassicPreset.Node {
  constructor() {
    super('CurrentPrice')
    this.addInput('asset', new ClassicPreset.Input(assetSocket, '종목'))
    this.addOutput('value', new ClassicPreset.Output(numberSocket, '가격'))
    this.kind = 'currentPrice'
    this.category = 'calculator'
  }
}
//최고가
export class HighestPriceNode extends ClassicPreset.Node {
  constructor() {
    super('HighestPrice')
    this.addInput('asset', new ClassicPreset.Input(assetSocket, '종목'))
    this.addOutput('value', new ClassicPreset.Output(numberSocket, '최고가'))
    this.addControl('periodLength', new ClassicPreset.InputControl('number', { initial: 1 }))
    this.addControl('periodUnit', new ClassicPreset.InputControl('text', { initial: 'day' })) // day|week|month|year
    this.kind = 'highestPrice'
    this.category = 'calculator'
  }
}
//RSI
export class RSINode extends ClassicPreset.Node {
  constructor() {
    super('RSI')
    this.addInput('asset', new ClassicPreset.Input(assetSocket, '종목'))
    this.addOutput('value', new ClassicPreset.Output(numberSocket, 'RSI'))
    // this.addControl('period', new ClassicPreset.InputControl('number', { initial: 1 }))
    this.kind = 'rsi'
    this.category = 'calculator'
  }
}
//SMA
export class SMANode extends ClassicPreset.Node {
  constructor() {
    super('SMA')
    this.addInput('asset', new ClassicPreset.Input(assetSocket, '종목'))
    this.addOutput('value', new ClassicPreset.Output(numberSocket, 'SMA'))
    this.addControl('period', new ClassicPreset.InputControl('number', { initial: 20 }))
    this.kind = 'sma'
    this.category = 'calculator'
  }
}

// -------------------- Condition 노드 (조건) --------------------
export class CompareNode extends ClassicPreset.Node {
  constructor() {
    super('Compare')
    this.addInput('a', new ClassicPreset.Input(numberSocket, 'A'))
    this.addInput('b', new ClassicPreset.Input(numberSocket, 'B'))
    this.addOutput('out', new ClassicPreset.Output(boolSocket, 'Bool'))
    this.addControl('operator', new ClassicPreset.InputControl('text', { initial: '>' })) // >,>=,<,<=,==
    this.kind = 'compare'
    this.category = 'condition'
  }
}

// -------------------- Consumer 노드 (소비자/실행) --------------------
// 조건에 따라 실제 주문을 실행
export class BuyNode extends ClassicPreset.Node {
  constructor() {
    super('Buy')
     this.addInput('cond', new ClassicPreset.Input(boolSocket, 'Bool')) //bool 값을 받음
    // this.addOutput('out', new ClassicPreset.Output(flowSocket, '다음'))
    this.addControl('orderType', new ClassicPreset.InputControl('text', { initial: 'market' })) // market|limit
    this.addControl('limitPrice', new ClassicPreset.InputControl('number', { initial: 100 }))
    this.addControl('sellPercent', new ClassicPreset.InputControl('number', { initial: 2}))
    this.kind = 'buy'
    this.category = 'consumer'
  }
}

export class SellNode extends ClassicPreset.Node {
  constructor() {
    super('Sell')
    this.addInput('cond', new ClassicPreset.Input(boolSocket, 'Bool'))
    // this.addOutput('out', new ClassicPreset.Output(flowSocket, '다음'))
    this.addControl('orderType', new ClassicPreset.InputControl('text', { initial: 'market' })) // market|limit
    this.addControl('limitPrice', new ClassicPreset.InputControl('number', { initial: 100 }))
    this.addControl('sellPercent', new ClassicPreset.InputControl('number', { initial: 2 }))
    this.kind = 'sell'
    this.category = 'consumer'
  }
}

// export class BranchNode extends ClassicPreset.Node {
//   constructor() {
//     super('조건분기')
//     this.addInput('in', new ClassicPreset.Input(flowSocket, '이전'))
//     this.addOutput('true', new ClassicPreset.Output(flowSocket, '참'))
//     this.addOutput('false', new ClassicPreset.Output(flowSocket, '거짓'))
//   }
// }

// 기존 ConditionNode/AnalysisNode는 설계도에 맞춰 Compare/Calculator 계열로 대체

// -------------------- 에디터 초기화 및 설정 --------------------
export async function createAppEditor(container) {
  const editor = new NodeEditor()
  const area = new AreaPlugin(container)
  const connection = new ConnectionPlugin()
  const reactRender = new ReactPlugin({ createRoot })

  editor.use(area)
  area.use(connection)
  area.use(reactRender)

  connection.addPreset(ConnectionPresets.classic.setup())
  reactRender.addPreset(ReactPresets.classic.setup())

  // -------------------- Context Menu (우클릭 메뉴) --------------------
  const menu = document.createElement('div')
  Object.assign(menu.style, {
     // CSS 스타일 설정 (메뉴 위치, 배경, 그림자 등)
    position: 'absolute',
    zIndex: 50,
    display: 'none',
    background: 'white',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    borderRadius: '8px',
    padding: '6px',
    border: '1px solid #e5e7eb',
    minWidth: '100px'
  })
 // 우클릭 시 나오는 delBtn
  const delBtn = document.createElement('button')
  delBtn.textContent = '삭제'
  Object.assign(delBtn.style, {
    width: '100%',
    padding: '6px 10px',
    color: '#fff',
    background: '#ef4444',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer'
  })
  menu.appendChild(delBtn)
  container.appendChild(menu)

  let currentNode = null
    // 메뉴 닫기 함수
  function closeMenu() {
    menu.style.display = 'none'
    currentNode = null
  }
    // 메뉴 열기 함수
  function openMenu(clientX, clientY, node) {
    const rect = container.getBoundingClientRect()
    menu.style.left = `${clientX - rect.left}px`
    menu.style.top = `${clientY - rect.top}px`
    menu.style.display = 'block'
    currentNode = node
  }

    // 클릭된 위치에서 노드를 찾는 함수

  function findNodeAt(clientX, clientY) {
    const nodes = editor.getNodes()
    for (const node of nodes) {
      const view = area.nodeViews.get(node.id)
      const el = view && (view.element || view.el || view.root || null)
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
  // 노드 삭제 함수: 노드와 연결된 간선을 모두 제거한 후 노드를 제거
  delBtn.addEventListener('click', async () => { 
    if (currentNode) {
      try {
        // 먼저 해당 노드와 연결된 간선을 제거
        const cons = editor.getConnections().filter((c) => c.source === currentNode.id || c.target === currentNode.id)
        for (const c of cons) {
          try { await editor.removeConnection(c.id) } catch {}
        }
        // 그 다음 노드 제거
        await editor.removeNode(currentNode.id)
      } catch {}
    }
    closeMenu()
  })
   // 기타 이벤트: 마우스 클릭이나 Esc 키를 누르면 메뉴 닫기
  window.addEventListener('click', (e) => {
    if (e.button === 0) closeMenu()
  })
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu()
  })

  return {
    editor,
    area,
    destroy: () => { closeMenu(); menu.remove(); area.destroy() }
  }
}

// -------------------- 노드 생성 유틸리티 --------------------
// kind 문자열에 따라 해당 노드 클래스의 인스턴스를 생성합니다.
export function createNodeByKind(kind) {
  switch (kind) {
    // Supplier
    case 'stock':
      return new StockNode()
    case 'roi':
      return new ROINode()
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
    // Consumer
    case 'buy':
      return new BuyNode()
    case 'sell':
      return new SellNode()
    // Branch/Flow
    case 'branch':
      return new BranchNode()
    default:
      throw new Error('Unknown node kind: ' + kind)
  }
}

// 클라이언트 좌표 (브라우저 화면)를 Rete 에디터의 세계 좌표 (줌/패닝 적용)로 변환

export function clientToWorld(area, container, clientX, clientY, evt) {
  // Prefer pointer computed by area when event is available (accounts for zoom/pan handlers)
  if (evt && area && area.area && typeof area.area.setPointerFrom === 'function') {
    try {
      area.area.setPointerFrom(evt)
      const { k, x, y } = area.area.transform
      const sx = area.area.pointer.x
      const sy = area.area.pointer.y
      return { x: (sx - x) / k, y: (sy - y) / k }
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

const labelToKind = (label) => {
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
    // Supplier
    case 'Stock':
    case '종목':
      return 'stock'
    case 'ROI':
    case '수익률':
      return 'roi'
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
    // Legacy fallbacks
    case '데이터 분석':
      return 'analysis'
    default:
      return undefined
  }
}
// -------------------- 그래프 내보내기 (Export) --------------------

export function exportGraph(editor, area) {
    // 모든 노드의 정보(위치, 컨트롤 값)를 JSON 직렬화 가능한 형태로 변환
  const nodes = editor.getNodes().map((node) => {
    const view = area.nodeViews.get(node.id)
    const position = (view && view.position) ? view.position : { x: 0, y: 0 }
    const controls = {}
        // 노드의 모든 컨트롤 값을 추출
    if (node.controls) {
      for (const key of Object.keys(node.controls)) {
        const ctrl = node.controls[key]
        if (ctrl && Object.prototype.hasOwnProperty.call(ctrl, 'value')) {
          controls[key] = ctrl.value
        }
      }
    }
    return {
      id: node.id,
      label: node.label,
      kind: node.kind || labelToKind(node.label),
      position,
      controls
    }
  })
  // 모든 연결 정보를 직렬화

  const connections = editor.getConnections().map((c) => ({
    id: c.id,
    source: c.source,
    target: c.target,
    sourceOutput: c.sourceOutput,
    targetInput: c.targetInput
  }))

  return { nodes, connections } // 노드 및 연결 정보가 포함된 그래프 객체 반환
}

// -------------------- 그래프 불러오기 (Import) --------------------
export async function importGraph(editor, area, graph) {
  if (!graph) return
  await editor.clear() // 기존 에디터 내용 초기화

  const idMap = new Map() // 이전 ID와 새 노드 객체를 매핑
    // 1. 노드 생성 및 값 복원
  for (const n of graph.nodes || []) {
    const kind = n.kind || labelToKind(n.label)
    let node
    try {
      node = createNodeByKind(kind)
    } catch (e) {
      // fallback to a generic BuyNode to avoid breaking
      node = new BuyNode()
    }

 // 컨트롤 값 복원
    if (n.controls) {
      for (const key of Object.keys(n.controls)) {
        const ctrl = node.controls[key]
        const val = n.controls[key]
        if (ctrl && typeof ctrl.setValue === 'function') ctrl.setValue(val)
        else if (ctrl && 'value' in ctrl) ctrl.value = val
      }
    }

    await editor.addNode(node)
    idMap.set(n.id, node)
    const pos = n.position || { x: 0, y: 0 }
    await area.nodeViews.get(node.id)?.translate(pos.x, pos.y)
  }

 // 2. 연결 생성
  for (const con of graph.connections || []) {
    const source = idMap.get(con.source)
    const target = idMap.get(con.target)
    if (source && target) {
           // 노드 객체와 포트 키를 사용하여 연결 생성
      await editor.addConnection(new ClassicPreset.Connection(source, con.sourceOutput, target, con.targetInput))
    }
  }
}
// -------------------- 개별 노드 제거 유틸리티 -------------------- 
export async function removeNodeWithConnections(editor, nodeId) {
  const cons = editor.getConnections().filter((c) => c.source === nodeId || c.target === nodeId)
  for (const c of cons) {
    try { await editor.removeConnection(c.id) } catch {}
  }
  try { await editor.removeNode(nodeId) } catch {}
}
