import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useReteAppEditor } from '../hooks/useReteAppEditor';
import { createNodeByKind, clientToWorld, exportGraph, importGraph } from '../rete/app-editor';

// ----------------------------------------------------------------
// LogicEditorPage: 매수 / 매도 로직을 편집하는 컴포넌트
// ----------------------------------------------------------------
const LogicEditorPage = ({ selectedLogicId, onBack, onSave, defaultNewLogicName = '' }) => {
    const [logic, setLogic] = useState(null);
    const [logicName, setLogicName] = useState('');
    const buyCanvasRef = useRef(null);
    const sellCanvasRef = useRef(null);
    const { editorRef: buyEditorRef, areaRef: buyAreaRef, ready: buyReady } = useReteAppEditor(buyCanvasRef);
    const { editorRef: sellEditorRef, areaRef: sellAreaRef, ready: sellReady } = useReteAppEditor(sellCanvasRef);

    // 1) 선택된 로직의 메타(이름 등) 먼저 세팅
    useEffect(() => {
        if (selectedLogicId) {
            const savedLogics = JSON.parse(localStorage.getItem('userLogics') || '[]');
            const currentLogic = savedLogics.find(l => l.id === selectedLogicId);
            if (currentLogic) {
                setLogic(currentLogic);
                setLogicName(currentLogic.name || '');
            }
        } else {
            setLogic(null);
            setLogicName(defaultNewLogicName || '');
        }
    }, [selectedLogicId, defaultNewLogicName]);

    // 2) 에디터가 준비된 이후 그래프를 로드
    useEffect(() => {
        if (!logic || !selectedLogicId) return;
        if (!buyReady && !sellReady) return; // 둘 중 하나라도 준비되면 해당 것만 로드

        const data = logic.data || {};
        const buyGraph = data.buyGraph || data.buy || data.graphBuy;
        const sellGraph = data.sellGraph || data.sell || data.graphSell;

            // 로드되는 JSON 구조를 확인
            try {
                console.log('[로직 로드] 선택된 로직 전체 데이터(JSON):\n', JSON.stringify(logic, null, 2));
                console.log('[로직 로드] 매수 그래프(JSON):\n', JSON.stringify(buyGraph, null, 2));
                console.log('[로직 로드] 매도 그래프(JSON):\n', JSON.stringify(sellGraph, null, 2));
            } catch {}

        const buyEditor = buyEditorRef.current;
        const buyArea = buyAreaRef.current;
        const sellEditor = sellEditorRef.current;
        const sellArea = sellAreaRef.current;

        (async () => {
            try {
                if (buyReady && buyEditor && buyArea && buyGraph) {
                    await importGraph(buyEditor, buyArea, buyGraph);
                }
                if (sellReady && sellEditor && sellArea && sellGraph) {
                    await importGraph(sellEditor, sellArea, sellGraph);
                }
            } catch (e) {
                console.warn('그래프 로드 중 오류:', e);
            }
        })();
    }, [logic, selectedLogicId, buyReady, sellReady, buyEditorRef, buyAreaRef, sellEditorRef, sellAreaRef]);

        // 노드 드래그 시작 핸들러
        const onDragStart = useCallback((e, kind) => {
            e.dataTransfer.effectAllowed = 'copy';
            try {
                e.dataTransfer.setData('application/x-rete-node', kind);
            } catch {
                e.dataTransfer.setData('text/plain', kind);
            }
        }, []);

        const extractKind = (dt) => {
            if (!dt) return null;
            return dt.getData('application/x-rete-node') || dt.getData('text/plain') || null;
        };

        const handleDropOn = useCallback(async (e, which) => {
            e.preventDefault();
            const kind = extractKind(e.dataTransfer);
            if (!kind) return;

            const editorRef = which === 'buy' ? buyEditorRef : sellEditorRef;
            const areaRef = which === 'buy' ? buyAreaRef : sellAreaRef;
            const containerRef = which === 'buy' ? buyCanvasRef : sellCanvasRef;

            const editor = editorRef.current;
            const area = areaRef.current;
            const container = containerRef.current;

            if (!editor || !area || !container) return;

            const { x, y } = clientToWorld(area, container, e.clientX, e.clientY, e);
            const node = createNodeByKind(kind);
            await editor.addNode(node);
            await area.nodeViews.get(node.id)?.translate(x, y);
        }, [buyEditorRef, sellEditorRef, buyAreaRef, sellAreaRef]);

    const handleSave = async () => {
        try {
            const buyEditor = buyEditorRef.current;
            const buyArea = buyAreaRef.current;
            const sellEditor = sellEditorRef.current;
            const sellArea = sellAreaRef.current;

            const buyGraph = buyEditor && buyArea ? exportGraph(buyEditor, buyArea) : undefined;
            const sellGraph = sellEditor && sellArea ? exportGraph(sellEditor, sellArea) : undefined;

            const updatedLogicData = { buyGraph, sellGraph };

                const payload = {
                    id: selectedLogicId || `logic-${Date.now()}`,
                    name: logicName,
                    data: updatedLogicData,
                };

                // 저장 직전 JSON 형태를 콘솔에 출력
                console.log('[로직 저장] 저장 payload (LogicEntry):\n', JSON.stringify(payload, null, 2));
                console.log('[로직 저장] 매수 그래프(JSON):\n', JSON.stringify(buyGraph, null, 2));
                console.log('[로직 저장] 매도 그래프(JSON):\n', JSON.stringify(sellGraph, null, 2));

                onSave(payload);

                // parent가 localStorage를 갱신한다면, 바로 리스트도 확인해보기 (있으면 출력)
                try {
                    const savedList = JSON.parse(localStorage.getItem('userLogics') || '[]');
                    if (Array.isArray(savedList)) {
                        console.log('[로직 저장] 현재 저장된 목록(userLogics) JSON: \n', JSON.stringify(savedList, null, 2));
                    }
                } catch {}
            console.log('로직이 저장되었습니다!');
            onBack();
        } catch (e) {
            console.error('저장 중 오류:', e);
        }
    };

  return (
    <div className="w-full max-w-[1900px] h-[90vh] p-4 sm:p-6 lg:p-8 bg-white rounded-2xl shadow-lg  flex flex-col">
        {/* 상단 헤더: 로직 이름 수정 및 저장/뒤로가기 버튼 */}
        <div className="flex items-center justify-between pb-4 border-b">
            <input 
                type="text"
                value={logicName}
                onChange={(e) => setLogicName(e.target.value)}
                placeholder="로직 이름을 입력하세요"
                className="text-2xl font-bold text-gray-800 border-b-2 border-transparent focus:border-blue-500 focus:outline-none focus:outline-none placeholder:text-gray-400"
            />
            <div className="flex gap-2">
                <button onClick={onBack} className="px-4 py-2 text-base font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">
                    &larr; 뒤로가기
                </button>
                <button onClick={handleSave} className="px-4 py-2 text-base font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                    저장하기
                </button>
            </div>
        </div>

        {/* 메인 컨텐츠: 왼쪽 노드 목록 + 중앙 캔버스 2영역 + 오른쪽 정보 패널 */}
        <div className="flex flex-grow mt-4 gap-6">
            {/* 1. RETE 노드 (왼쪽 사이드바), 차후에 구현 예정 */}
                        <div className="w-1/5 p-4 bg-gray-50 rounded-lg border flex flex-col gap-3">    
                <h3 className="text-lg font-bold text-center mb-2">노드 목록</h3>
                                                {[
                                                    // Supplier
                                                    { label: 'Stock(종목)', kind: 'stock' },
                                                    { label: 'ROI(수익률)', kind: 'roi' },
                                                    // Calculator
                                                    { label: 'CurrentPrice(현재가)', kind: 'currentPrice' },
                                                    { label: 'HighestPrice(최고가)', kind: 'highestPrice' },
                                                    { label: 'RSI', kind: 'rsi' },
                                                    { label: 'SMA', kind: 'sma' },
                                                    // Condition
                                                    { label: 'Compare(비교)', kind: 'compare' },
                                                    // Consumer
                                                    { label: 'Buy(매수)', kind: 'buy' },
                                                    { label: 'Sell(매도)', kind: 'sell' },
                                                    // Branch/Flow
                                                    // { label: 'Branch(조건 분기)', kind: 'branch' }
                                                ].map(item => (
                                    <div
                                        key={item.kind}
                                        draggable
                                        onDragStart={(e) => onDragStart(e, item.kind)}
                                        className="p-3 text-center bg-white border rounded-md shadow-sm cursor-grab select-none"
                                    >
                                        {item.label} 
                                    </div>
                                ))}
            </div>

            {/* 2. 노드 설정 공간 (중앙 캔버스) */}
           <div className="w-3/5 bg-gray-100 rounded-lg border flex flex-col">
    
            {/* 상단 영역 (Rete.js 캔버스) */}
                                                <div
                                    ref={buyCanvasRef}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => handleDropOn(e, 'buy')}
                                                                        className="flex-1 border-b relative overflow-hidden"
                                    title="여기로 드래그하여 노드를 추가"
                                />

            {/* 하단 영역 (Rete.js 캔버스) */}
                                            <div
                                ref={sellCanvasRef}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => handleDropOn(e, 'sell')}
                                                                className="flex-1 border-b relative overflow-hidden"
                                title="여기로 드래그하여 노드를 추가"
                            />

            </div>

            {/* 3. 정보 및 실행 패널 (오른쪽 사이드바) */}
            <div className="w-1/5 p-4 bg-gray-50 rounded-lg border flex flex-col">
                <h3 className="text-lg font-bold mb-2">내부 정보</h3>
                <div className="flex-grow p-2 bg-white rounded border text-sm text-gray-600">
                    <p>1. 로직 상태: 편집 중</p>
                    <p>2. 노드 개수: 0</p>
                    <p>3. 연결 상태: 미연결</p>
                </div>
                <button className="w-full p-3 mt-4 text-lg font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700">
                    매수 로직 실행
                </button>
                 <button className="w-full p-3 mt-2 text-lg font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700">
                    매도 로직 실행
                </button>
            </div>
        </div>
    </div>
  );
};
export default LogicEditorPage;