// Rete 코어 및 프리셋 가져오기
import { NodeEditor, ClassicPreset } from 'rete'
import { AreaPlugin } from 'rete-area-plugin'
import { ConnectionPlugin, Presets as ConnectionPresets } from 'rete-connection-plugin'
import { ReactPlugin, Presets as ReactPresets } from 'rete-react-plugin'
import { createRoot } from 'react-dom/client'

// Typed sockets according to the design
// 소켓 타입 정의 (현재 로직에서 number/bool 주 사용)
const assetSocket = new ClassicPreset.Socket('asset') // 종목(미사용 가능성)
const numberSocket = new ClassicPreset.Socket('number') // 숫자 값 전달
const boolSocket = new ClassicPreset.Socket('bool') // 조건(Boolean)
const flowSocket = new ClassicPreset.Socket('flow') // 흐름 제어용 (미사용)

// -------------------- Supplier 노드 (값 제공) --------------------
export class ROINode extends ClassicPreset.Node {
  constructor() {
    super('ROI')
    this.addOutput('value', new ClassicPreset.Output(numberSocket, '수익률'))
    this.kind = 'roi'
    this.category = 'supplier'
  }
}

//현재가
// 현재가 공급 노드
export class CurrentPriceNode extends ClassicPreset.Node {
  constructor() {
    super('CurrentPrice')
    this.addOutput('value', new ClassicPreset.Output(numberSocket, '가격'))
    this.kind = 'currentPrice'
    this.category = 'supplier'
  }
}

//최고가
// 특정 기간 중 최고가 계산 노드
export class HighestPriceNode extends ClassicPreset.Node {
  constructor() {
    super('HighestPrice')
    this.addOutput('value', new ClassicPreset.Output(numberSocket, '최고가'))
    this.addControl('periodLength', new ClassicPreset.InputControl('number', { initial: 1 }))
    // periodUnit: dropdown (day|week|month) - 내부 값은 text control을 유지하고 UI는 나중에 select로 교체
    this.addControl('periodUnit', new ClassicPreset.InputControl('text', { initial: 'day' }))
    this.kind = 'highestPrice'
    this.category = 'supplier'
    // UI 컨트롤 설명 메타데이터
    this._controlHints = {
      periodLength: { label: '기간 길이', title: '최고가 계산에 사용할 기간 길이 (정수)' },
      periodUnit: { label: '단위', title: '기간 단위 (day/week/month)' }
    }
  }
}

//RSI
// RSI 지표 노드
export class RSINode extends ClassicPreset.Node {
  constructor() {
    super('RSI')
    this.addOutput('value', new ClassicPreset.Output(numberSocket, 'RSI'))
    // this.addControl('period', new ClassicPreset.InputControl('number', { initial: 1 }))
    this.kind = 'rsi'
    this.category = 'supplier'
  }
}

//SMA
// 단순 이동평균(SMA) 노드
export class SMANode extends ClassicPreset.Node {
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
export class ConstNode extends ClassicPreset.Node {
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
export class LogicOpNode extends ClassicPreset.Node {
  constructor() {
    super('LogicOp')
    this.addInput('a', new ClassicPreset.Input(boolSocket, 'A'))
    this.addInput('b', new ClassicPreset.Input(boolSocket, 'B'))
    this.addOutput('out', new ClassicPreset.Output(boolSocket, 'Bool'))
    // operator: &&, || 드롭다운 적용 대상 (text 유지 후 UI 교체 예정)
    this.addControl('operator', new ClassicPreset.InputControl('text', { initial: '&&' }))
    this.kind = 'logicOp'
    this.category = 'condition'
    this._controlHints = {
      operator: { label: '연산자', title: '논리 연산자 (&&: AND, ||: OR)' }
    }
  }
}

// -------------------- Condition 노드 (조건) --------------------
// 숫자 비교 노드 (A,B 입력 → Bool 출력)
export class CompareNode extends ClassicPreset.Node {
  constructor() {
    super('Compare')
    this.addInput('a', new ClassicPreset.Input(numberSocket, 'A'))
    this.addInput('b', new ClassicPreset.Input(numberSocket, 'B'))
    this.addOutput('out', new ClassicPreset.Output(boolSocket, 'Bool'))
    this.addControl('operator', new ClassicPreset.InputControl('text', { initial: '>' })) // >,>=,<,<=,==
    this.kind = 'compare'
    this.category = 'condition'
    this._controlHints = {
      operator: { label: '연산자', title: '비교 연산자 (>, >=, <, <=, ==)' }
    }
  }
}

// -------------------- Consumer 노드 (소비자/실행) --------------------
// 조건에 따라 실제 주문을 실행
// 매수 실행 노드
export class BuyNode extends ClassicPreset.Node {
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
    this._controlHints = {
      orderType: { label: '주문유형', title: '주문 방식 (market: 시장가 / limit: 지정가)' },
      limitPrice: { label: '지정가', title: 'orderType이 limit일 때 사용되는 가격' },
      sellPercent: { label: '청산%', title: '목표 수익률(%) 도달 시 매수(또는 청산) 트리거' }
    }
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
// 에디터/플러그인 초기화 및 UI 보조 로직 설정
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

  // --- 더블클릭 확대 비활성화: 기본 d3/zoom 유사 동작 차단 ---
  // 캔버스 컨테이너에서 발생하는 dblclick을 막아 확대 트리거를 방지한다.
  const stopDblClick = (e) => { e.preventDefault(); e.stopPropagation(); };
  container.addEventListener('dblclick', stopDblClick, { capture: true });

  // (이전 버전에서 사용한 연결선 재계산/동적 라벨 삽입 코드는 사용자 요청으로 제거됨)

  // -------------------- 공통 드롭다운 변환 유틸 (dropdown) --------------------
  // Text 기반 컨트롤을 <select> 로 치환하여 드롭다운 UI 제공
  function genericSelectEnhancer(node, cfg) {
    // 1. 노드가 없거나 라벨이 일치하지 않으면 종료
    if (!node || node.label !== cfg.labelMatch) return
    let attempts = 0
    const MAX_ATTEMPTS = 5 // DOM 요소 로딩을 기다리며 최대 5회 재시도한다.
    // 실제 UI 강화 로직을 담고 있는 함수로, try-catch 구문을 이용해 비동기적으로 실행된다.
    const tryEnhance = () => {
      attempts++
      try {
        // 2. 노드의 시각적 뷰(view) 객체를 area.nodeViews에서 가져온다.
        const view = area.nodeViews.get(node.id)
        // 뷰가 없으면 재시도하거나 종료한다.
        if (!view) {
          if (attempts < MAX_ATTEMPTS)
            return requestAnimationFrame(tryEnhance);
          else return;
        }
        // 3. 뷰의 최상위 DOM 요소(el)를 가져온다.

        const el = view.element || view.el || view.root
        // DOM 요소가 없으면 재시도하거나 종료한다.
        if (!el) {
          if (attempts < MAX_ATTEMPTS) return requestAnimationFrame(tryEnhance);
          else return;
        }
        const inputs = el.querySelectorAll('input')
        let targetInput = null // 교체할 대상 <input> 요소를 저장하는 변수

        // 4. 교체할 <input> 필드 찾기 (1순위: 옵션 값 중 하나를 현재 값으로 가진 input)

        inputs.forEach(inp => { if (cfg.options.includes(inp.value)) targetInput = inp })

        // 5. 교체할 <input> 필드 찾기 (2순위: 아직 교체되지 않은 일반 텍스트 input)
        if (!targetInput) {
          inputs.forEach(inp => {
            if (!targetInput && inp.type === 'text' && !inp.dataset.replaced) targetInput = inp
          })
        }
        // 대상 input을 찾지 못했으면 재시도하거나 종료한다.

        if (!targetInput) {
          if (attempts < MAX_ATTEMPTS) return requestAnimationFrame(tryEnhance);
          else return;
        }

        // 이미 교체된 input이라면 로직을 더 진행하지 않고 종료한다.
        if (targetInput.dataset.replaced === '1') return

        // 6. <select> 드롭다운 요소를 생성하고 옵션을 채운다.
        const wrapper = targetInput.parentElement || el
        const select = document.createElement('select')

        // 설정된 옵션 배열을 기반으로 <option> 요소를 만들어 select에 추가한다.
        cfg.options.forEach(opt => {
          const o = document.createElement('option')
          o.value = opt
          o.textContent = opt
          select.appendChild(o)
        })

        // 7. 초기 값 결정: 컨트롤 내부 값 > 기존 input 값 > 옵션의 첫 번째 값 순서로 결정한다.
        const ctrl = node.controls?.[cfg.controlKey]
        // 컨트롤의 현재 값(.value 또는 .getValue() 호출)을 가져온다.
        const internalVal = ctrl && (ctrl.value || (typeof ctrl.getValue === 'function' ? ctrl.getValue() : undefined))
        // 1순위: 유효한 컨트롤 값
        let currentVal = internalVal && cfg.options.includes(internalVal) ? internalVal : undefined
        // 2순위: 유효한 기존 input 값, 3순위: 옵션 배열의 첫 번째 값
        if (!currentVal) currentVal = targetInput.value && cfg.options.includes(targetInput.value) ? targetInput.value : cfg.options[0]
        select.value = currentVal// select에 초기 값을 설정한다.

        // 8. 노드 컨트롤의 값을 현재 값으로 보정하여 동기화한다.
        try {
          if (ctrl) {
            if (typeof ctrl.setValue === 'function') ctrl.setValue(currentVal)
            else ctrl.value = currentVal
          }
        } catch { }
        // -------------------- <select> 스타일 설정 구간 --------------------
        // 9. <select>의 스타일을 설정하여 원래 input과 비슷하게 맞춘다.
        select.style.width = targetInput.style.width || '100%'
        select.style.boxSizing = 'border-box'
        select.style.padding = '2px 4px'

        // 10. <select>의 'change' 이벤트 리스너를 등록한다.
        select.addEventListener('change', () => {
          try {
            const ctrl2 = node.controls?.[cfg.controlKey]
            if (ctrl2) {
              // 값이 변경될 때마다 노드 컨트롤 객체의 값을 새로운 선택 값으로 업데이트한다.
              if (typeof ctrl2.setValue === 'function') ctrl2.setValue(select.value)
              else ctrl2.value = select.value
            }
          } catch { }
        })

        // 11. DOM 교체: 원래 input을 숨기고 select를 삽입한다.
        targetInput.style.display = 'none' // 원래 input 필드를 화면에서 숨긴다.
        targetInput.dataset.replaced = '1' // 교체 완료 상태를 표시한다.
        // 원래 input 다음에 select 드롭다운을 삽입하여 화면에 표시한다.
        wrapper.insertBefore(select, targetInput.nextSibling)
      } catch {
        // 예외 발생 시, 재시도 횟수가 남았으면 다시 시도한다.
        if (attempts < MAX_ATTEMPTS) requestAnimationFrame(tryEnhance)
      }
    }

    // 다음 애니메이션 프레임에 비동기 함수 실행을 요청하여 작업을 시작한다.
    requestAnimationFrame(tryEnhance)
  }

  // editor.addNode 훅킹하여 HighestPriceNode 렌더 후 select 적용
  // addNode 오버라이드: 제약 검사 후 select 변환 적용
  const originalAddNode = editor.addNode.bind(editor)
  editor.addNode = async (node) => {
    // 규칙: Buy/Sell 단일 개수 (그래프 전체)
    if (node.kind === 'buy' && editor.getNodes().some(n => n.kind === 'buy')) {
      console.warn('[규칙] Buy 노드는 1개만 허용')
      return node
    }
    if (node.kind === 'sell' && editor.getNodes().some(n => n.kind === 'sell')) {
      console.warn('[규칙] Sell 노드는 1개만 허용')
      return node
    }
    const res = await originalAddNode(node)
    applySelectEnhancements(node)
    return res
  }

  // -------------------- Node별 Select 적용 조합 --------------------
  // 노드 라벨별 select 변환 매핑
  function applySelectEnhancements(node) {
    genericSelectEnhancer(node, { labelMatch: 'HighestPrice', controlKey: 'periodUnit', options: ['day', 'week', 'month', 'year'] })
    genericSelectEnhancer(node, { labelMatch: 'Buy', controlKey: 'orderType', options: ['market', 'limit'] })
    genericSelectEnhancer(node, { labelMatch: 'Sell', controlKey: 'orderType', options: ['market', 'limit'] })
    genericSelectEnhancer(node, { labelMatch: 'Compare', controlKey: 'operator', options: ['>', '>=', '<', '<=', '==', '!='] })
    genericSelectEnhancer(node, { labelMatch: 'LogicOp', controlKey: 'operator', options: ['&&', '||'] })
  }

  // (컨트롤 라벨 삽입 기능 제거됨)

  // -------------------- 연결 타입 검사 --------------------
  // 연결 타입 검사 (소켓 타입 불일치 차단)
  const originalAddConnection = editor.addConnection.bind(editor)
  editor.addConnection = async (con) => {
    try {
      // source/target 소켓 name 비교 (number/bool 등)
      const sNode = editor.getNode(con.source)
      const tNode = editor.getNode(con.target)
      if (sNode && tNode) {
        const sOut = sNode.outputs[con.sourceOutput]
        const tIn = tNode.inputs[con.targetInput]
        const sType = sOut && sOut.socket && sOut.socket.name
        const tType = tIn && tIn.socket && tIn.socket.name
        if (sType && tType && sType !== tType) {
          console.warn('[연결 차단] 소켓 타입 불일치', sType, '->', tType)
          return con
        }
      }
    } catch { }
    return originalAddConnection(con)
  }

  // -------------------- Context Menu (우클릭 메뉴) --------------------
  // 우클릭 컨텍스트 메뉴 구성 (현재: 삭제 기능만)
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

  // 포인터 위치에 있는 노드 탐색 (우클릭 메뉴용)
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
          try { await editor.removeConnection(c.id) } catch { }
        }
        // 그 다음 노드 제거
        await editor.removeNode(currentNode.id)
      } catch { }
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
// kind 문자열에 따라 해당 노드 클래스의 인스턴스를 생성한다.
// kind 식별자를 실제 노드 인스턴스로 생성
export function createNodeByKind(kind) {
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
    default:
      throw new Error('Unknown node kind: ' + kind)
  }
}

// 클라이언트 좌표 (브라우저 화면)를 Rete 에디터의 세계 좌표 (줌/패닝 적용)로 변환

// 화면 좌표(client) → 에디터 공간(world) 좌표 변환 (줌/팬 반영)
export function clientToWorld(area, container, clientX, clientY, evt) {
  // Prefer pointer computed by area when event is available (accounts for zoom/pan handlers)
  if (evt && area && area.area && typeof area.area.setPointerFrom === 'function') {
    try {
      area.area.setPointerFrom(evt)
      // setPoiterForm을 실행한 이후에는 area.area.pointer가 월드 좌표를 가짐
      // 여기에 역변환을 다시 적용해서 zoom 스케일에 따라 달라지는 오프셋이 발생했던 것.
      // 그래서 포인터 좌표를 역변환 없이 그대로 반환하게 함.
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
      return 'analysis'
    default:
      return undefined
  }
}
// -------------------- 그래프 내보내기, JSON 직렬화 (Export) --------------------

// 그래프 직렬화: 노드/연결/뷰포트 상태를 JSON 형태로 추출
export function exportGraph(editor, area) {
  // 모든 노드의 정보(위치, 컨트롤 값)를 JSON 직렬화 가능한 형태로 변환
  const nodes = editor.getNodes().map((node) => {
    const view = area.nodeViews.get(node.id)
    // 노드의 시각적 위치를 가져온다. 뷰가 없으면 기본값 {x:0,y:0} 사용
    const position = (view && view.position) ? view.position : { x: 0, y: 0 }
    const controls = {}
    // 노드의 모든 컨트롤 값을 추출
    if (node.controls) {
      for (const key of Object.keys(node.controls)) {
        const ctrl = node.controls[key]
        // 컨트롤에 'value' 속성이 있는 경우에만 그 값을 저장한다.
        if (ctrl && Object.prototype.hasOwnProperty.call(ctrl, 'value')) {
          controls[key] = ctrl.value
        }
      }
    }
    return {
      id: node.id,
      label: node.label,
      kind: node.kind || labelToKind(node.label),// kind가 없으면 label에서 유추한다.
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

  // 뷰포트(줌/팬) 정보 저장 (area.area.transform: { k, x, y }) , 리스트에서 다시 불러올때 캔버스가 과도하게 줌 되어 표시되는 문제 해결
  let viewport
  try {
    if (area && area.area && area.area.transform) {
      const { k, x, y } = area.area.transform
      viewport = { k, x, y } // 줌 레벨(k), 팬 위치(x, y)를 저장한다.
    }
  } catch { }

  return { nodes, connections, viewport } // 노드/연결 + 뷰포트 정보 포함
}



// -------------------- 그래프 불러오기 (Import) --------------------

/**
 * 저장된 그래프 데이터(JSON)를 읽어 에디터의 노드, 연결, 뷰포트를 복원하는 함수.
 * @param {object} editor - Rete.js 에디터 인스턴스.
 * @param {object} area - Rete.js 영역(Area) 인스턴스.
 * @param {object} graph - 불러올 그래프 데이터(nodes, connections, viewport)
 */

// 그래프 복원: JSON 을 읽어 노드/연결/뷰포트 재구성
export async function importGraph(editor, area, graph) {
  if (!graph) return
  await editor.clear() // 기존 에디터 내용 모두 초기화

  const idMap = new Map() // 이전 ID와 새 노드 객체를 매핑

  // 1. 노드 생성 및 값 복원
  for (const n of graph.nodes || []) {

    // 제거된 노드 종류(예: Stock)를 만나면 경고를 출력하고 스킵.
    if (n.kind === 'stock' || n.label === 'Stock' || n.label === '종목') {
      console.warn('[importGraph] 제거된 Stock 노드 스킵:', n)
      continue
    }
    const kind = n.kind || labelToKind(n.label)
    let node;
    try {
      node = createNodeByKind(kind) // 종류에 따라 새 노드 객체를 생성.
    } catch (e) {
      // 노드 생성 실패 시, 그래프가 깨지지 않도록 BuyNode와 같은 제네릭 노드로 대체.
      node = new BuyNode()
    }

    // 컨트롤 값 복원
    if (n.controls) {
      for (const key of Object.keys(n.controls)) {
        const ctrl = node.controls[key]
        const val = n.controls[key]
        // 컨트롤에 setValue 함수가 있으면 함수를 사용하고, 아니면 value 속성에 직접 값을 할당.
        if (ctrl && typeof ctrl.setValue === 'function') ctrl.setValue(val)
        else if (ctrl && 'value' in ctrl) ctrl.value = val
      }
    }

    await editor.addNode(node) // 새로 생성된 노드를 에디터에 추가.
    idMap.set(n.id, node) // 이전 ID와 새 노드 객체를 매핑하여 저장.

    const pos = n.position || { x: 0, y: 0 }
    // 노드의 시각적 위치를 저장된 위치로 이동시킴. (translate)
    await area.nodeViews.get(node.id)?.translate(pos.x, pos.y)
  }

  // 2. 연결 생성
  for (const con of graph.connections || []) {
    // idMap을 사용하여 이전 ID에 해당하는 새 소스/타겟 노드 객체를 찾음.
    const source = idMap.get(con.source)
    const target = idMap.get(con.target)

    if (source && target) {
      // 노드 객체와 포트 키를 사용하여 새로운 연결을 생성하고 에디터에 추가.
      await editor.addConnection(new ClassicPreset.Connection(source, con.sourceOutput, target, con.targetInput))
    }
  }

  // 3. 뷰포트(줌/팬) 복원
  if (graph.viewport && area && area.area && typeof area.area.translate === 'function') {
    try {
      const { k, x, y } = graph.viewport
      // 저장된 줌 레벨(k)과 팬 위치(x, y)를 캔버스 transform에 직접 적용.
      if (typeof k === 'number') area.area.transform.k = k
      if (typeof x === 'number') area.area.transform.x = x
      if (typeof y === 'number') area.area.transform.y = y
      // 캔버스 UI를 강제로 갱신.
      if (typeof area.area.update === 'function') area.area.update()
    } catch { }
  }

  // 그래프 로드 후 UI 드롭다운 재적용 (DOM 렌더링 타이밍 문제에 대비함, 1회만 실행)
  if (typeof editor.reteUiEnhance === 'function') {
    requestAnimationFrame(() => {
      try { editor.reteUiEnhance() } catch { }
    })
  }
}

// -------------------- 개별 노드 제거 (Delete) -------------------- 
/**
 * 노드와 그에 연결된 모든 연결선을 안전하게 제거하는 유틸리티 함수.
 * @param {object} editor - Rete.js 에디터 인스턴스.
 * @param {string} nodeId - 제거할 노드의 ID.
 */
// 노드를 연결과 함께 안전 제거
export async function removeNodeWithConnections(editor, nodeId) {
  // 제거할 노드를 소스 또는 타겟으로 가진 모든 연결을 찾음.
  const cons = editor.getConnections().filter((c) => c.source === nodeId || c.target === nodeId)

  // 찾은 모든 연결을 제거한다.
  for (const c of cons) {
    try { await editor.removeConnection(c.id) } catch { }
  }

  // 마지막으로 노드를 제거한다.
  try { await editor.removeNode(nodeId) } catch { }
}
