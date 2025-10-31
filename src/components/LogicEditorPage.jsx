import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useReteAppEditor } from '../hooks/useReteAppEditor';
import { createNodeByKind, clientToWorld, exportGraph, importGraph } from '../rete/app-editor';
import { runLogic } from '../logic_interpreter/interpreter';

// ----------------------------------------------------------------
// LogicEditorPage: 매수 / 매도 로직을 편집하는 컴포넌트
// ----------------------------------------------------------------
const LogicEditorPage = ({ selectedLogicId, onBack, onSave, defaultNewLogicName = '' }) => {
    const [logic, setLogic] = useState(null);
    const [logicName, setLogicName] = useState('');
    const [stock, setStock] = useState('');
    const buyCanvasRef = useRef(null);
    const sellCanvasRef = useRef(null);
    const [logs, setLogs] = useState([]);
    const [theme, setTheme] = useState('dark');
    const [logRunDetails, setLogRunDetails] = useState(false);
    const logRunDetailsRef = useRef(false);
    const [isRunning, setIsRunning] = useState(false);
    const runTimerRef = useRef(null);
    const infoAreaRef = useRef(null);
    const { editorRef: buyEditorRef, areaRef: buyAreaRef, ready: buyReady } = useReteAppEditor(buyCanvasRef);
    const { editorRef: sellEditorRef, areaRef: sellAreaRef, ready: sellReady } = useReteAppEditor(sellCanvasRef);

    const appendLog = useCallback((title, msg) => {
        let date = new Date();
        let hour = date.getHours().toString().padStart(2, '0');
        let minute = date.getMinutes().toString().padStart(2, '0');
        const entry = { title: title, msg: msg, time: `${hour}:${minute}`};
        setLogs(prev => [...prev, entry]);
    }, []);

    const clearLogs = useCallback(() => setLogs([]), []);

    useEffect(() => {
        if (infoAreaRef.current) infoAreaRef.current.scrollTop = infoAreaRef.current.scrollHeight;
    }, [logs]);

    // 초기 테마 동기화 (App과 동일한 규칙: localStorage > document > 시스템 선호)
    useEffect(() => {
        try {
            const saved = localStorage.getItem('theme');
            if (saved === 'light' || saved === 'dark') {
                setTheme(saved);
                document.documentElement.setAttribute('data-theme', saved);
                return;
            }
            const htmlTheme = document.documentElement.getAttribute('data-theme');
            if (htmlTheme === 'light' || htmlTheme === 'dark') {
                setTheme(htmlTheme);
                return;
            }
            const preferDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            const next = preferDark ? 'dark' : 'light';
            setTheme(next);
            document.documentElement.setAttribute('data-theme', next);
        } catch {}
    }, []);

    // logRunDetails 최신 값을 interval 콜백에서 사용할 수 있도록 ref로 동기화
    useEffect(() => {
        logRunDetailsRef.current = logRunDetails;
    }, [logRunDetails]);

    const toggleTheme = useCallback(() => {
        setTheme((t) => {
            const next = t === 'dark' ? 'light' : 'dark';
            try {
                document.documentElement.setAttribute('data-theme', next);
                localStorage.setItem('theme', next);
            } catch {}
            return next;
        });
    }, []);

    // 1) 선택된 로직의 메타(이름 등) 먼저 세팅
    useEffect(() => {
        if (selectedLogicId) {
            const savedLogics = JSON.parse(localStorage.getItem('userLogics') || '[]');
            const currentLogic = savedLogics.find(l => l.id === selectedLogicId);
            if (currentLogic) {
                setLogic(currentLogic);
                setLogicName(currentLogic.name || '');
                setStock(currentLogic.stock || '');
            }
        } else {
            setLogic(null);
            setLogicName(defaultNewLogicName || '');
            setStock('');
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
                    if (typeof buyEditor.reteUiEnhance === 'function') {
                        try { buyEditor.reteUiEnhance() } catch {}
                    }
                }
                if (sellReady && sellEditor && sellArea && sellGraph) {
                    await importGraph(sellEditor, sellArea, sellGraph);
                    if (typeof sellEditor.reteUiEnhance === 'function') {
                        try { sellEditor.reteUiEnhance() } catch {}
                    }
                }
            } catch (e) {
                console.warn('그래프 로드 중 오류:', e);
            }
        })();
    }, [logic, selectedLogicId, buyReady, sellReady, buyEditorRef, buyAreaRef, sellEditorRef, sellAreaRef]);

        // 노드 드래그 시작 핸들러
        const onDragStart = useCallback((e, kind) => {
            e.dataTransfer.effectAllowed = 'copy';
            try { e.dataTransfer.setData('application/x-rete-node', kind); } catch {}
            try { e.dataTransfer.setData('text/plain', kind); } catch {}
        }, []);

        const extractKind = (dt) => {
            if (!dt) return null;
            const raw = (dt.getData('application/x-rete-node') || dt.getData('text/plain') || '').trim();
            if (!raw) return null;
            const allowed = ['const','currentPrice','highestPrice','rsi','roi','sma','compare','logicOp','buy','sell','rl','branch'];
            // exact match 우선
            if (allowed.includes(raw)) return raw;
            // 다중 줄/문자 포함 시 포함 여부로 추출
            const lower = raw.toLowerCase();
            const found = allowed.find(k => lower.includes(k.toLowerCase()));
            return found || null;
        };

        const handleDropOn = useCallback(async (e, which) => {
            e.preventDefault();
            const kind = extractKind(e.dataTransfer);
            if (!kind) return;
            const allowed = ['const','currentPrice','highestPrice','rsi','roi','sma','compare','logicOp','buy','sell','rl','branch'];
            if (!allowed.includes(kind)) { console.warn('드롭된 kind 무시:', kind); return; }

            // 그래프별 제한 규칙 적용
            if (which === 'buy') {
                if (kind === 'sell') { alert('[드롭 차단] Sell 노드는 Buy 그래프에 추가 불가'); return; }
                if (kind === 'roi') { alert('[드롭 차단] ROI 노드는 Buy 그래프에 추가 불가'); return; }
            }
            if (which === 'sell') {
                if (kind === 'buy') { alert('[드롭 차단] Buy 노드는 Sell 그래프에 추가 불가'); return; }
            }

            const editorRef = which === 'buy' ? buyEditorRef : sellEditorRef;
            const areaRef = which === 'buy' ? buyAreaRef : sellAreaRef;
            const containerRef = which === 'buy' ? buyCanvasRef : sellCanvasRef;

            const editor = editorRef.current;
            const area = areaRef.current;
            const container = containerRef.current;

            if (!editor || !area || !container) return;

            const { x, y } = clientToWorld(area, container, e.clientX, e.clientY, e);
            const node = createNodeByKind(kind);
            // 추가 Buy/Sell 단일 개수 제한 보강 (importGraph 외 실시간)
            if (node.kind === 'buy' && editor.getNodes().some(n => n.kind === 'buy')) { alert('[드롭 차단] Buy 노드는 1개만 허용'); return; }
            if (node.kind === 'sell' && editor.getNodes().some(n => n.kind === 'sell')) { alert('[드롭 차단] Sell 노드는 1개만 허용'); return; }
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
                stock: stock || undefined,
                data: updatedLogicData,
            };
            console.log('[로직 저장] 매수 그래프(JSON):\n', JSON.stringify(buyGraph, null, 2));
            console.log('[로직 저장] 매도 그래프(JSON):\n', JSON.stringify(sellGraph, null, 2));
            
            onSave(payload);

        } catch (e) {
            console.error('저장 중 오류:', e);
        }
    };

    const startRun = () => {
        if (isRunning) return;
        setIsRunning(true);
        // 주기적으로 실행 (예: 2초마다)
        const runOnce = () => {
            try {
                const buyGraph = exportGraph(buyEditorRef.current, buyAreaRef.current);
                const sellGraph = exportGraph(sellEditorRef.current, sellAreaRef.current);
                runLogic(stock, { buyGraph, sellGraph }, appendLog, logRunDetailsRef.current);
            } catch (e) {
                appendLog('Error', String(e?.message || e));
            }
        };
        // 시작 즉시 한 번 실행하여 반응성을 높임
        runOnce();
        runTimerRef.current = setInterval(runOnce, 2000);
    };

    const stopRun = () => {
        if (runTimerRef.current) {
            clearInterval(runTimerRef.current);
            runTimerRef.current = null;
        }
        setIsRunning(false);
    };

  return (
    <div className="w-full max-w-[1900px] h-[100vh] p-4 sm:p-6 lg:p-8 rounded-3xl shadow-2xl flex flex-col bg-neutral-950 text-gray-200 border border-neutral-800/70">
        {/* 상단 헤더: 로직 이름 수정 및 저장/뒤로가기 버튼 */}
    <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
            <input 
                type="text"
                value={logicName}
                onChange={(e) => setLogicName(e.target.value)}
                placeholder="로직 이름을 입력하세요"
                className="text-2xl font-semibold tracking-tight bg-transparent text-gray-100 border-b border-transparent focus:border-cyan-400/60 outline-none placeholder:text-gray-500"
            />
           <div className="flex justify-start mr-auto">
                <select
                  value={stock}
                  onChange={(e)=>setStock(e.target.value)}
                  className="ml-[80px] bg-neutral-900 text-gray-200 border border-neutral-700 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                >
                  <option value="">종목 선택</option>
                  <option value="AAPL">AAPL</option>
                  <option value="NVDA">NVDA</option>
                  <option value="TSLA">TSLA</option>
                  <option value="MSFT">MSFT</option>
                </select>
            </div>
                        <div className="flex gap-2 items-center">
                                {/* Light/Dark 토글: 뒤로가기 버튼 왼쪽 */}
                                <button
                                    onClick={toggleTheme}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: 10,
                                        border: '1px solid var(--panel-border)',
                                        background: 'var(--panel-bg)',
                                        color: 'var(--text-primary)'
                                    }}
                                    title="테마 전환 (Dark/Light)"
                                >
                                    {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
                                </button>
                <button onClick={onBack} className="px-4 py-2 text-base font-semibold text-gray-200 bg-neutral-800 border border-neutral-700 rounded-lg hover:bg-neutral-700">
                    &larr; 뒤로가기
                </button>
                <button onClick={handleSave} className="px-4 py-2 text-base font-semibold text-white bg-cyan-600 rounded-lg hover:bg-cyan-500 disabled:opacity-50 shadow-[0_10px_30px_-10px_rgba(34,211,238,0.5)]" disabled={!logicName || !stock}>
                    저장하기
                </button>
            </div>
        </div>

        {/* 메인 컨텐츠: 왼쪽 노드 목록 + 중앙 캔버스 2영역 + 오른쪽 정보 패널 */}
        <div className="flex flex-grow mt-4 gap-6">
            {/* 1. RETE 노드 (왼쪽 사이드바) */}
            <div className="w-1/5 p-4 bg-neutral-900/60 rounded-2xl border border-neutral-800/70 flex flex-col text-center gap-7">
                {[
                    { 
                        title: 'Supplier', 
                        items: 
                        [ 
                            { label: 'Const(상수)', kind: 'const' },
                            { label: 'CurrentPrice(현재가)', kind: 'currentPrice' },
                            { label: 'HighestPrice(최고가)', kind: 'highestPrice' },
                            { label: 'RSI(투자지표)', kind: 'rsi' },
                            { label: 'ROI(수익률)', kind: 'roi' },
                            { label: 'SMA(단순 이동 평균)', kind: 'sma' },
                            { label: 'RL(강화학습 신호)', kind: 'rl' }
                        ]
                    },
                    
                    {
                        title: 'Condition',
                        items: [
                            { label: 'Compare(비교)', kind: 'compare' },
                            { label: 'LogicOp(논리)', kind: 'logicOp' }
                        ]
                    },
                    {
                        title: 'Consumer',
                        items: [
                            { label: 'Buy(매수)', kind: 'buy' },
                            { label: 'Sell(매도)', kind: 'sell' }
                        ]
                    }
                ].map((group, i, arr) => (
                    <div key={group.title} className="flex flex-col gap-2">
                        <div className="sidebar-section__bar">
                          <span className="sidebar-section__icon" aria-hidden="true" />
                          <span className="sidebar-section__title">{group.title}</span>
                        </div>
                        <div className="flex flex-col gap-2">
                            {group.items.map((item) => (
                                <div
                                    key={item.kind}
                                    draggable
                                    onDragStart={(e) => onDragStart(e, item.kind)}
                                    className="p-3 text-center bg-neutral-800/80 border border-neutral-700 rounded-md shadow-sm cursor-grab select-none hover:bg-neutral-700"
                                    title="드래그하여 캔버스로 가져오세요"
                                >
                                    {item.label}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* 2. 노드 설정 공간 (중앙 캔버스) */}
                     <div className="w-3/5 rounded-2xl border border-neutral-800/70 flex flex-col bg-neutral-900/40">
                        {/* 상단 영역 (Rete.js 캔버스) */}
                        <div
                            ref={buyCanvasRef}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDropOn(e, 'buy')}
                            className="flex-1 relative overflow-hidden border-b border-neutral-800 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.03),_transparent_60%)]"
                            title="여기로 드래그하여 노드를 추가"
                        >
                            <span className="absolute left-2 top-2 z-10 text-xs font-semibold text-gray-300 bg-neutral-800/70 border border-neutral-700 px-2 py-1 rounded shadow-sm pointer-events-none select-none">
                                BuyGraph
                            </span>
                        </div>

                        {/* 하단 영역 (Rete.js 캔버스) */}
                        <div
                            ref={sellCanvasRef}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDropOn(e, 'sell')}
                            className="flex-1 relative overflow-hidden bg-[radial-gradient(ellipse_at_bottom,_rgba(255,255,255,0.03),_transparent_60%)]"
                            title="여기로 드래그하여 노드를 추가"
                        >
                            <span className="absolute left-2 top-2 z-10 text-xs font-semibold text-gray-300 bg-neutral-800/70 border border-neutral-700 px-2 py-1 rounded shadow-sm pointer-events-none select-none">
                                SellGraph
                            </span>
                        </div>
                    </div>

            {/* 3. 정보 및 실행 패널 (오른쪽 사이드바) */}
            <div className="w-1/5 p-4 bg-neutral-900/60 rounded-2xl border border-neutral-800/70 flex flex-col">
                <h3 className="text-lg font-semibold mb-2 text-gray-200">로그</h3>
                <div ref={infoAreaRef} className="flex-grow p-2 bg-neutral-900 rounded border border-neutral-800 text-sm text-gray-300 overflow-auto" style={{ maxHeight: '60vh' }}>
                    {logs.map((l, idx) => (
                        <li
                            key={idx}
                            className="py-1 border-b last:border-b-0 flex flex-col"
                        >
                            <div className="text-[14px] text-gray-200">
                            <strong className={`text-[11px] mr-2 ${
                                l.title === 'Error'
                                    ? 'text-red-400'
                                    : l.title === 'Buy' || l.title === 'Sell'
                                    ? 'text-cyan-400'
                                    : 'text-gray-400'
                            }`}>
                                [{l.title}]
                            </strong>
                                {l.msg}
                            </div>
                            <span className="self-end text-[11px] text-gray-500">
                                {l.time}
                            </span>
                        </li>
                    ))}

                </div>
                {/* 실행 옵션: 실행 과정 출력 여부 */}
                <label className="flex items-center gap-2 mt-3 mb-1 text-sm text-gray-300 select-none">
                    <input
                        type="checkbox"
                        className="w-4 h-4"
                        checked={logRunDetails}
                        onChange={(e) => setLogRunDetails(e.target.checked)}
                    />
                    실행 과정 출력하기
                </label>
                {!isRunning ? (
                    <button
                        className="w-full p-3 mt-4 text-lg font-semibold text-white rounded-lg bg-cyan-600 hover:bg-cyan-500 shadow-[0_10px_30px_-10px_rgba(34,211,238,0.5)]"
                        onClick={startRun}
                    >
                        로직 실행하기
                    </button>
                ) : (
                    <>
                        <div className="mt-3 mb-1 text-sm text-emerald-300 flex items-center gap-2">
                            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> 실행 중…
                        </div>
                        <button
                            className="w-full p-3 mt-2 text-lg font-semibold text-white rounded-lg bg-red-600 hover:bg-red-500 shadow-[0_10px_30px_-10px_rgba(239,68,68,0.5)]"
                            onClick={stopRun}
                        >
                            정지하기
                        </button>
                    </>
                )}
                <button
                    className="w-full p-3 mt-4 text-lg font-semibold text-gray-200 bg-neutral-800 rounded-lg hover:bg-neutral-700 border border-neutral-700"
                    onClick={clearLogs}
                >
                    로그 초기화
                </button>
            </div>
        </div>
    </div>
    );
};
export default LogicEditorPage;