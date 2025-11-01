import React, { useState, useEffect } from 'react';
import ApiKeySettings from './ApiKeySettings';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getCurrentPrices } from '../communicator/upbit_api';

// ---------------------------------------------------------------
// AssetPage: 기존의 로직 목록 페이지
// ----------------------------------------------------------------
const AssetPage = ({
  logics,
  assets,
  assetsLoading,
  assetsError,
  onLogicClick,
  onAddNewLogic,
  onDeleteLogic,
  onReorderLogics,
  onRefreshAssets,
  onOpenApiKeySettings,
  showApiKeySettings,
  onCloseApiKeySettings,
  onApiKeysSaved
}) => {
  const [runningLogic, setRunningLogic] = useState(null);
  const [roi, setRoi] = useState(0);
  const [todayPnL, setTodayPnL] = useState(0);
  const [openedMenuId, setOpenedMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [currentPrices, setCurrentPrices] = useState({}); // 현재가 저장

  // ROI 계산 함수
  const calculateROI = () => {
    if (!assets || assets.length === 0) return 0;

    let totalInitialInvestment = 0;
    let totalCurrentValue = 0;

    assets.forEach(asset => {
      if (asset.currency === 'KRW') return; // 원화는 제외

      const balance = parseFloat(asset.balance) || 0;
      const avgBuyPrice = parseFloat(asset.avg_buy_price) || 0;
      const market = `KRW-${asset.currency}`;
      const currentPrice = currentPrices[market] || avgBuyPrice;

      totalInitialInvestment += balance * avgBuyPrice;
      totalCurrentValue += balance * currentPrice;
    });

    if (totalInitialInvestment === 0) return 0;
    return ((totalCurrentValue - totalInitialInvestment) / totalInitialInvestment) * 100;
  };

  // 오늘의 손익(P/L) 계산 함수
  const calculateTodayPnL = () => {
    if (!assets || assets.length === 0) return 0;

    let todayPnL = 0;

    assets.forEach(asset => {
      if (asset.currency === 'KRW') return; // 원화는 제외

      const balance = parseFloat(asset.balance) || 0;
      const market = `KRW-${asset.currency}`;
      const currentPrice = currentPrices[market];
      const todayOpenPrice = currentPrices[`${market}_open`];

      if (currentPrice && todayOpenPrice) {
        // 보유 수량 * (현재가 - 오늘시가)
        todayPnL += balance * (currentPrice - todayOpenPrice);
      }
    });

    return todayPnL;
  };

  useEffect(() => {
    if (!localStorage.getItem('runningLogic')) {
      const mockRunningLogic = { id: 'logic-1', name: 'Upbit 단타 거래 로직' };
      localStorage.setItem('runningLogic', JSON.stringify(mockRunningLogic));
    }
    const savedRunningLogic = localStorage.getItem('runningLogic');
    if (savedRunningLogic) {
      setRunningLogic(JSON.parse(savedRunningLogic));
    }
  }, []);

  // 자산 정보나 현재가가 변경될 때마다 ROI와 P/L 계산
  useEffect(() => {
    const newRoi = calculateROI();
    const newPnL = calculateTodayPnL();
    setRoi(newRoi);
    setTodayPnL(newPnL);
  }, [assets, currentPrices]);

  // 자산 정보가 변경될 때마다 현재가 조회
  useEffect(() => {
    const fetchCurrentPrices = async () => {
      if (!assets || assets.length === 0) {
        setCurrentPrices({});
        return;
      }

      try {
        // KRW가 아닌 암호화폐만 필터링하여 마켓 코드 생성
        const markets = assets
          .filter(asset => asset.currency !== 'KRW')
          .map(asset => `KRW-${asset.currency}`);

        if (markets.length === 0) {
          setCurrentPrices({});
          return;
        }

        // 현재가 일괄 조회
        const prices = await getCurrentPrices(markets);
        setCurrentPrices(prices);
      } catch (error) {
        setCurrentPrices({});
      }
    };

    fetchCurrentPrices();
  }, [assets]);

  // 드래그 앤 드롭 순서 변경 핸들러
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(logics);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    if (onReorderLogics) {
      onReorderLogics(items);
      localStorage.setItem('userLogics', JSON.stringify(items));
    }
  };

  // 새 로직 인라인 생성 시작
  const startCreateNewLogic = () => {
    // 이미 편집 중이면 무시
    if (editingId) return;
    const tempId = `temp-${Date.now()}`;
    const items = [...logics, { id: tempId, name: '', data: {}, _temp: true }];
    onReorderLogics && onReorderLogics(items);
    setOpenedMenuId(null);
    setEditingId(tempId);
    setEditingValue('');
  };

  // 생성 확정 (Enter 또는 blur 시)
  const commitCreateNewLogic = () => {
    if (!editingId) return;
    const name = editingValue.trim();
    if (!name) {
      cancelCreateNewLogic();
      return;
    }
    const newId = `logic-${Date.now()}`;
    const updated = logics.map((l) => (l.id === editingId ? { id: newId, name, data: {} } : l));
    onReorderLogics && onReorderLogics(updated);
    localStorage.setItem('userLogics', JSON.stringify(updated));
    setEditingId(null);
    setEditingValue('');
  };

  // 생성 취소 (Esc 또는 빈 값)
  const cancelCreateNewLogic = () => {
    if (!editingId) return;
    const updated = logics.filter((l) => l.id !== editingId);
    onReorderLogics && onReorderLogics(updated);
    localStorage.setItem('userLogics', JSON.stringify(updated));
    setEditingId(null);
    setEditingValue('');
  };

  return (
    <div className="w-full max-w-6xl p-8 rounded-3xl shadow-2xl bg-neutral-950 text-gray-200 border border-neutral-800/70">
      {/* API 키 설정 모달 (AssetPage 내부 렌더) */}
      {showApiKeySettings && (
        <div className="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center">
          <div className="relative">
            <button
              onClick={onCloseApiKeySettings}
              className="absolute -top-2.5 -right-2.5 h-8 w-8 rounded-full bg-neutral-900 text-gray-100 border-2 border-neutral-700 flex items-center justify-center shadow hover:border-cyan-500/40 hover:text-white"
              aria-label="닫기"
              title="닫기"
            >
              ×
            </button>
            <ApiKeySettings onKeysSaved={onApiKeysSaved} />
          </div>
        </div>
      )}
      {/* 헤더 카드 */}
      <div className="relative p-6 mb-6 rounded-2xl themed-card border border-neutral-800/70 overflow-hidden">
        <div className="flex items-center justify-between">
          <h2 className="mb-2 text-2xl font-semibold text-gray-100 tracking-tight">Trade Builder</h2>
          {/* 탭 */}
          {/* <div className="hidden sm:flex gap-2">
            {['Overview','Analytics','Monitoring'].map((t,i)=> (
              <button key={t} className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${i===0? 'bg-neutral-800/70 text-gray-100 border-neutral-700' : 'bg-neutral-900/60 text-gray-300 border-neutral-800 hover:border-cyan-500/40 hover:text-white'}`}>{t}</button>
            ))}
          </div> // 탭 기능 임시로 뺌*/}
        </div>

        {/* 자산 정보 표시 */}
        <div className="mb-1 text-sm sm:text-base text-gray-400">
          총 자산: {' '}
          {assetsLoading ? (
            <span className="text-gray-400">로딩 중...</span>
          ) : assetsError ? (
            <span className="text-red-400" title={assetsError}>오류 발생</span>
          ) : assets && assets.length > 0 ? (
            <span className="font-semibold text-cyan-400">
              {assets
                .reduce((total, asset) => {
                  const balance = parseFloat(asset.balance) || 0;
                  const locked = parseFloat(asset.locked) || 0;
                  const totalAmount = balance + locked;

                  // KRW는 그대로 더함
                  if (asset.currency === 'KRW') {
                    return total + totalAmount;
                  }

                  // 암호화폐는 현재가로 계산
                  const market = `KRW-${asset.currency}`;
                  const currentPrice = currentPrices[market];

                  // 현재가가 있으면 현재가 사용, 없으면 평균 매수가 사용 (fallback)
                  const price = currentPrice !== undefined
                    ? currentPrice
                    : parseFloat(asset.avg_buy_price) || 0;

                  return total + (totalAmount * price);
                }, 0)
                .toLocaleString('ko-KR', { maximumFractionDigits: 0 })} KRW
              {Object.keys(currentPrices).length > 0 && (
                <span className="ml-1 text-xs text-gray-500" title="현재가 기준 평가액">
                  (실시간)
                </span>
              )}
            </span>
          ) : (
            <span className="text-gray-400">자산 정보 없음</span>
          )}
          {!assetsLoading && onRefreshAssets && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRefreshAssets();
              }}
              className="ml-2 text-xs px-2 py-1 rounded bg-neutral-800 border border-neutral-700 hover:border-cyan-500/40 hover:text-cyan-400 transition"
              title="자산 정보 새로고침"
            >
              🔄
            </button>
          )}
        </div>

        <div className="mb-1 text-sm sm:text-base text-gray-400">
          실행중인 로직: <span className="font-medium text-cyan-400">{runningLogic ? runningLogic.name : '없음'}</span>
        </div>
        <div className="text-sm sm:text-base text-gray-400">
          현재 수익률: <span className="font-semibold text-cyan-400">{roi.toFixed(2)}%</span>
        </div>

        {/* 오버레이 미니 카드 (Status) - 클릭 시 API 키 설정 열기 */}
        <div
          className="absolute right-4 top-4 sm:right-6 sm:top-6 backdrop-blur-md bg-neutral-900/80 border border-neutral-700/60 rounded-xl px-4 py-2 shadow-lg cursor-pointer select-none hover:border-cyan-500/40"
          onClick={(e) => {
            e.stopPropagation();
            if (typeof onOpenApiKeySettings === 'function') onOpenApiKeySettings();
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (typeof onOpenApiKeySettings === 'function') onOpenApiKeySettings();
            }
          }}
          title="API 키 설정 열기"
          aria-label="API 키 설정 열기"
        >
          <div className="text-[12px] uppercase tracking-wide text-gray-400">API SETUP ⚙</div>
          <div className="flex items-end gap-2">
            <div className="text-lg font-semibold text-gray-100">Active</div>
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_12px_2px_rgba(34,211,238,0.6)]"></span>
          </div>
        </div>
      </div>
      {/* 추후 협업 때 추가할만한 내용: API 키가 valid 상태일때는 Active로, invalid 상태일때는 Inactive로 표시해주기 */}

      {/* KPI 카드 4개 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[{
          title:'총 전략 수', value: String(logics.length||0)
        },{
          title:'실행 중', value: runningLogic? '1' : '0'
        },{
          title:'누적 ROI', value: `${roi.toFixed(2)}%`
        },{
          title:'오늘 P/L', value: `₩${Math.abs(todayPnL) < 0.01 ? 0 : todayPnL.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`
        }].map((s,idx)=> (
          <div key={idx} className="p-5 rounded-2xl bg-neutral-900/70 border border-neutral-800/70 hover:border-cyan-500/40 transition">
            <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">{s.title}</div>
            <div className="text-3xl font-semibold text-gray-100">{s.value}</div>
            {/* 미니 바 차트 */}
            <div className="mt-3 h-10 flex items-end gap-1">
              {[4,8,3,6,9,5,7,6,8,10].map((h,i)=> (
                <div key={i} className="w-1.5 bg-neutral-700 rounded" style={{height:`${h*6}%`}} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="logic-list">
          {(provided) => (
            <div className='flex flex-col gap-3' ref={provided.innerRef} {...provided.droppableProps}>
              {logics.length > 0 ? (
                logics.map((logic, index) => (
                  // wrapper: 외곽 윤곽선은 ring으로 강조하고, 내부 경계선 색은 유지
                  <div key={logic.id} className="flex flex-col group rounded-xl ring-1 ring-transparent hover:ring-cyan-500/40 transition-shadow">
                    <Draggable draggableId={logic.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center justify-between p-4 transition-all duration-200 ease-in-out cursor-pointer 
                          bg-neutral-900/70 border border-neutral-800/70 hover:shadow-[0_8px_30px_rgba(0,0,0,0.35)] hover:-translate-y-0.5 
                          ${openedMenuId === logic.id ? 'rounded-t-xl rounded-b-none border-b-0' : 'rounded-xl'}
                          ${snapshot.isDragging ? 'ring-2 ring-cyan-400/30' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (logic.id === editingId) return; // 편집 중에는 토글하지 않음
                            setOpenedMenuId(logic.id === openedMenuId ? null : logic.id);
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          {/* 로직 이름 영역 (행 전체가 클릭 가능하므로 별도 onClick 불필요) */}
                          <div className="flex-grow">
                            {logic.id === editingId ? (
                              <input
                                className="w-full px-3 py-2 text-sm rounded outline-none bg-neutral-800 text-gray-100 border border-neutral-700 focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400/50"
                                placeholder="새 로직 이름을 입력하고 Enter를 누르세요"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitCreateNewLogic();
                                  if (e.key === 'Escape') cancelCreateNewLogic();
                                }}
                                onBlur={commitCreateNewLogic}
                                autoFocus
                              />
                            ) : (
                              <span className="text-base font-medium text-gray-100">{index + 1}. {logic.name}</span>
                            )}
                          </div>
                          {/* 드래그 핸들: 드래그 시작 시 슬라이드 메뉴 닫기 */}
                          {logic.id !== editingId && (
                            <span
                              {...provided.dragHandleProps}
                              className="ml-4 mr-3 cursor-grab text-xl select-none text-gray-400 hover:text-gray-200"
                              aria-label="드래그 핸들"
                              onMouseDown={(e) => {
                                setOpenedMenuId(null);
                                if (provided.dragHandleProps && typeof provided.dragHandleProps.onMouseDown === 'function') {
                                  provided.dragHandleProps.onMouseDown(e);
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              ☰
                            </span>
                          )}
                        </div>
                      )}
                    </Draggable>
                    {/* 슬라이드 메뉴 영역 */}
                    <div
                      className={`overflow-hidden transition-all duration-300 ${openedMenuId === logic.id ? 'max-h-16 opacity-100' : 'max-h-0 opacity-0'} 
                      bg-neutral-900/70 border-x border-b border-t border-neutral-800/70 rounded-b-xl flex items-center -mt-px`}
                      style={{ minWidth: '120px' }}
                    >
                      {openedMenuId === logic.id && (
                        <div className="flex flex-row justify-end w-full gap-2 px-4 py-2">
                        {/*  <button
                            className="px-3 py-1 bg-blue-50 hover:bg-blue-100 rounded text-sm"
                            onClick={() => {
                              setOpenedMenuId(null);
                              alert('로직 실행!');
                              runLogic(logic.id);
                            }}
                          >
                            실행하기 // 실행기능 임시로 뺌 
                          </button> */} 
                          <button
                            className="px-3 py-1 rounded text-sm bg-neutral-800 text-gray-200 border border-neutral-700 hover:border-cyan-500/40 hover:text-white"
                            onClick={() => {
                              setOpenedMenuId(null);
                              onLogicClick(logic.id);
                            }}
                          >
                            수정하기
                          </button>
                          <button
                            className="px-3 py-1 rounded text-sm text-red-400 bg-neutral-800 border border-neutral-700 hover:bg-red-500/10 hover:text-red-300"
                            onClick={() => {
                              setOpenedMenuId(null);
                              const confirmed = window.confirm(`정말로 "${logic.name}" 로직을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`);
                              if (confirmed) {
                                onDeleteLogic(logic.id);
                              }
                            }}
                          >
                            삭제하기
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400">저장된 로직이 없습니다.</p>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      <button
        className="flex items-center justify-center w-full p-4 mt-5 text-lg font-semibold text-white rounded-xl cursor-pointer transition-colors duration-200 
        bg-cyan-600 hover:bg-cyan-500 shadow-[0_10px_30px_-10px_rgba(34,211,238,0.5)]"
        onClick={startCreateNewLogic}
      >
        <span className="mr-2 text-xl">(+)</span> 새 로직 추가하기
      </button>
    </div>
  );
};

export default AssetPage;

