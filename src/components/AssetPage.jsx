import React, { useState, useEffect } from 'react';
import ApiKeySettings from './ApiKeySettings';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getCurrentPrices } from '../communicator/upbit_api';
import { runLogic } from '../logic_interpreter/logic_runner';
import { fetchCandles } from '../communicator/upbit_candles';

// ---------------------------------------------------------------
// AssetPage: 기존의 로직 목록 페이지
// ----------------------------------------------------------------
const AssetPage = ({
  logics,
  assets,
  assetsLoading,
  assetsError,
  runningLogics,
  runIntervalSeconds,
  onRunIntervalChange,
  onStopLogic,
  onLogicClick,
  onDeleteLogic,
  onReorderLogics,
  onCreateLogic,
  onRefreshAssets,
  onOpenApiKeySettings,
  showApiKeySettings,
  onCloseApiKeySettings,
  onApiKeysSaved
}) => {
  const [roi, setRoi] = useState(0);
  const [todayPnL, setTodayPnL] = useState(0);
  const [openedMenuId, setOpenedMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [selectedLogicForApi, setSelectedLogicForApi] = useState(null);
  const [apiValidityByLogic, setApiValidityByLogic] = useState({}); // { [logicId]: true|false|null }
  const [currentPrices, setCurrentPrices] = useState({}); // 현재가 저장
  const [showIntervalInput, setShowIntervalInput] = useState(null); // 간격 설정 중인 로직 ID
  
  // 차트 데이터
  const [btcCandles, setBtcCandles] = useState([]);
  const [ethCandles, setEthCandles] = useState([]);
  const [chartLoading, setChartLoading] = useState(true);
  
  // Report 모달
  const [showReport, setShowReport] = useState(false);
  
  // 삭제 확인 모달
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetLogic, setDeleteTargetLogic] = useState(null);

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

  const validateLogicApi = async (logicId) => {
    if (!logicId) return;
    try {
      // @ts-ignore
      if (!window.electronAPI) {
        setApiValidityByLogic((m) => ({ ...m, [logicId]: null }));
        return;
      }
      // @ts-ignore
      const saved = await window.electronAPI.loadLogicApiKeys(logicId);
      if (!saved?.accessKey || !saved?.secretKey) {
        setApiValidityByLogic((m) => ({ ...m, [logicId]: false }));
        return;
      }
      // @ts-ignore
      await window.electronAPI.fetchUpbitAccounts(saved.accessKey, saved.secretKey);
      setApiValidityByLogic((m) => ({ ...m, [logicId]: true }));
    } catch {
      setApiValidityByLogic((m) => ({ ...m, [logicId]: false }));
    }
  };

  // runningLogics에서 첫 번째 실행 중인 로직 가져오기
  const runningLogic = runningLogics.length > 0 ? runningLogics[0] : null;

  useEffect(() => {
    setRoi(7.25);
  }, []);

  // 차트 데이터 로드
  useEffect(() => {
    const loadChartData = async () => {
      setChartLoading(true);
      try {
        const [btcData, ethData] = await Promise.all([
          fetchCandles('KRW-BTC', '5m', 50),
          fetchCandles('KRW-ETH', '5m', 50)
        ]);
        setBtcCandles(btcData.reverse()); // 시간순 정렬
        setEthCandles(ethData.reverse());
      } catch (error) {
        console.error('차트 데이터 로드 실패:', error);
      } finally {
        setChartLoading(false);
      }
    };

    loadChartData();
    
    // 30초마다 차트 데이터 업데이트
    const interval = setInterval(loadChartData, 30000);
    return () => clearInterval(interval);
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
        console.log('현재가 조회 완료:', prices);
      } catch (error) {
        console.error('현재가 조회 실패:', error);
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
    }
  };

  // 드롭다운을 펼칠 때 해당 로직의 API 상태를 갱신
  useEffect(() => {
    if (openedMenuId) validateLogicApi(openedMenuId);
  }, [openedMenuId]);

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
    // 생성은 상위(App)로 위임하여 파일 생성/인덱스 갱신
    if (typeof onCreateLogic === 'function') {
      onCreateLogic(name);
    }
    // 로컬 UI에서 임시 항목 제거하여 즉시 반영
    const updated = logics.filter((l) => l.id !== editingId);
    onReorderLogics && onReorderLogics(updated);
    setEditingId(null);
    setEditingValue('');
  };

  // 생성 취소 (Esc 또는 빈 값)
  const cancelCreateNewLogic = () => {
    if (!editingId) return;
    const updated = logics.filter((l) => l.id !== editingId);
    onReorderLogics && onReorderLogics(updated);
    setEditingId(null);
    setEditingValue('');
  };

  return (
    <div className="w-full max-w-6xl p-8 rounded-3xl shadow-2xl bg-neutral-950 text-gray-200 border border-neutral-800/70 fade-in">
      {/* API 키 설정 모달 (AssetPage 내부 렌더) */}
      {showApiKeySettings && (
        <div className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm flex items-center justify-center fade-in">
          <div className="relative">
            <button
              onClick={async () => {
                const target = selectedLogicForApi;
                onCloseApiKeySettings && onCloseApiKeySettings();
                if (target) await validateLogicApi(target);
                setSelectedLogicForApi(null);
              }}
              className="absolute -top-2.5 -right-2.5 h-8 w-8 rounded-full bg-neutral-900 text-gray-100 border-2 border-neutral-700 flex items-center justify-center shadow hover:border-cyan-500/40 hover:text-white transition-all hover:scale-110 z-10"
              aria-label="닫기"
              title="닫기"
            >
              ×
            </button>
            <ApiKeySettings onKeysSaved={onApiKeysSaved} logicId={selectedLogicForApi || undefined} />
          </div>
        </div>
      )}
      
      {/* 삭제 확인 모달 */}
      {showDeleteModal && deleteTargetLogic && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center fade-in" onClick={() => setShowDeleteModal(false)}>
          <div className="relative w-full max-w-md m-4" onClick={(e) => e.stopPropagation()}>
            <div className="glass-card bg-gradient-to-br from-red-500/10 to-red-600/5 border-2 border-red-500/30 rounded-2xl p-8 backdrop-blur-xl shadow-2xl">
              {/* 경고 아이콘 */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500/40 flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              
              {/* 제목 */}
              <h2 className="text-2xl font-bold text-center mb-3 text-red-400">로직 삭제</h2>
              
              {/* 설명 */}
              <p className="text-center text-gray-300 mb-2">
                정말로 <span className="font-bold text-red-600">"{deleteTargetLogic.name}"</span> 로직을 삭제하시겠습니까?
              </p>
              <p className="text-center text-sm text-gray-400 mb-6">
                이 작업은 되돌릴 수 없습니다.
              </p>
              
              {/* 버튼 그룹 */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-3 rounded-lg font-semibold text-gray-300 bg-neutral-800/60 border border-neutral-700/50 hover:bg-neutral-700/60 hover:border-neutral-600/50 transition-all"
                >
                  취소
                </button>
                <button
                  onClick={() => {
                    onDeleteLogic(deleteTargetLogic.id);
                    setShowDeleteModal(false);
                    setDeleteTargetLogic(null);
                  }}
                  className="flex-1 py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 transition-all shadow-lg hover:shadow-red-500/30"
                >
                  삭제하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Performance Report 모달 */}
      {showReport && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center fade-in" onClick={() => setShowReport(false)}>
          <div className="relative w-full max-w-4xl m-4" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowReport(false)}
              className="absolute -top-2 -right-2 h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-gray-100 border-2 border-cyan-500/40 flex items-center justify-center shadow hover:border-cyan-500/70 hover:text-white transition-all hover:scale-110 z-10 backdrop-blur-sm"
              aria-label="닫기"
              title="닫기"
            >
              ×
            </button>
            
            <div className="glass-card bg-gradient-to-br from-cyan-500/5 to-blue-500/10 border border-cyan-500/30 rounded-2xl p-8 max-h-[85vh] overflow-y-auto backdrop-blur-xl">
              <div className="mb-6">
                <h2 className="text-3xl font-bold gradient-text mb-2">Performance Report</h2>
                <p className="text-sm text-gray-400">종합 성과 분석 및 통계</p>
              </div>

              {/* Overview Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 backdrop-blur-sm">
                  <div className="text-xs text-gray-400 mb-1">총 전략</div>
                  <div className="text-2xl font-bold text-cyan-400">{logics.length}</div>
                </div>
                <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 backdrop-blur-sm">
                  <div className="text-xs text-gray-400 mb-1">실행 중</div>
                  <div className={`text-2xl font-bold ${runningLogics.length > 0 ? 'text-success' : 'text-gray-600'}`}>
                    {runningLogics.length}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 backdrop-blur-sm">
                  <div className="text-xs text-gray-400 mb-1">누적 ROI</div>
                  <div className={`text-2xl font-bold ${roi >= 0 ? 'text-success' : 'text-error'}`}>
                    {roi >= 0 ? '+' : ''}{roi.toFixed(2)}%
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 backdrop-blur-sm">
                  <div className="text-xs text-gray-400 mb-1">오늘 P/L</div>
                  <div className={`text-2xl font-bold ${todayPnL >= 0 ? 'text-success' : 'text-error'}`}>
                    {todayPnL >= 0 ? '+' : ''}₩{Math.abs(todayPnL).toLocaleString('ko-KR')}
                  </div>
                </div>
              </div>

              {/* Strategy List */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-200 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  전략 목록
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {logics.length > 0 ? logics.map((logic, idx) => (
                    <div key={logic.id} className="flex items-center justify-between p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20 hover:border-cyan-500/40 transition-all backdrop-blur-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-400">#{idx + 1}</span>
                        <span className="text-sm font-medium text-gray-200">{logic.name}</span>
                        {logic.stock && (
                          <span className="text-xs px-2 py-0.5 rounded bg-neutral-700/50 text-gray-400">{logic.stock}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {runningLogics.some(r => r.logicId === logic.id) ? (
                          <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-success border border-green-500/30 font-medium">
                            ● Running
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded bg-neutral-700/30 text-gray-500 border border-neutral-700/50">
                            ○ Idle
                          </span>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-gray-500">전략이 없습니다</div>
                  )}
                </div>
              </div>

              {/* Assets Summary */}
              <div>
                <h3 className="text-lg font-bold text-gray-200 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  보유 자산
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {assets && assets.length > 0 ? (
                    assets.filter(a => parseFloat(a.balance) > 0).map((asset, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20 hover:border-cyan-500/30 transition-all backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-cyan-400">{asset.currency}</span>
                          <span className="text-xs text-gray-500">잔액: {parseFloat(asset.balance).toFixed(8)}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-200">
                            {asset.currency === 'KRW' 
                              ? `₩${parseFloat(asset.balance).toLocaleString('ko-KR')}`
                              : `₩${(parseFloat(asset.balance) * (currentPrices[`KRW-${asset.currency}`] || parseFloat(asset.avg_buy_price))).toLocaleString('ko-KR', {maximumFractionDigits: 0})}`
                            }
                          </div>
                          {asset.currency !== 'KRW' && (
                            <div className="text-xs text-gray-500">
                              평단가: ₩{parseFloat(asset.avg_buy_price).toLocaleString('ko-KR')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">자산 정보가 없습니다</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 헤더 카드 */}
      <div className="relative p-6 mb-6 rounded-2xl glass-card bg-neutral-900/70 border border-neutral-800/70 overflow-hidden">
        <div className="flex items-center justify-between">
          <h2 className="mb-2 text-3xl font-bold gradient-text tracking-tight">Trade Builder</h2>
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
        </div>

        <div className="mb-1 text-sm sm:text-base text-gray-400">
          실행중인 로직: <span className={`font-medium ${runningLogic ? 'text-cyan-400 pulse-running px-2 py-0.5 rounded' : 'text-gray-500'}`}>{runningLogic ? runningLogic.logicId : '없음'}</span>
        </div>
        <div className="text-sm sm:text-base text-gray-400">
          현재 수익률: <span className={`font-semibold number-animate ${roi >= 0 ? 'text-success' : 'text-error'}`}>{roi >= 0 ? '+' : ''}{roi.toFixed(2)}%</span>
        </div>
      </div>
      {/* 추후 협업 때 추가할만한 내용: API 키가 valid 상태일때는 Active로, invalid 상태일때는 Inactive로 표시해주기 */}

      {/* Control Panel */}
      <div className="mb-6 fade-in" style={{animationDelay: '0.2s'}}>
        <div className="flex items-center gap-3 p-3 rounded-xl border border-cyan-500/20 bg-gradient-to-r from-cyan-500/5 to-blue-500/5">
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowReport(true)}
              className="btn-primary flex items-center gap-2 px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-gray-300 hover:text-white transition-all text-sm font-medium"
              title="View Performance Report"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Report</span>
            </button>

            {!assetsLoading && onRefreshAssets && (
              <button
                onClick={onRefreshAssets}
                className="btn-primary flex items-center gap-2 px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-gray-300 hover:text-white transition-all text-sm font-medium"
                title="Refresh Portfolio Data"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh</span>
              </button>
            )}
            
            {runningLogics.length > 0 && (
              <button
                onClick={() => {
                  const confirmed = window.confirm(`Stop all ${runningLogics.length} running strategies?`);
                  if (confirmed) {
                    runningLogics.forEach(logic => onStopLogic(logic.logicId));
                  }
                }}
                className="btn-primary flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-900/20 border border-red-500/40 text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-all text-sm font-medium"
                title="Emergency Stop All"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                <span>Stop All</span>
              </button>
            )}
          </div>

          <div className="flex-grow"></div>

          {/* Status Indicators - Compact */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Strategies</span>
              <span className="text-lg font-bold text-cyan-400 tabular-nums">{logics.length}</span>
            </div>
            
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Active</span>
              <span className={`text-lg font-bold tabular-nums ${runningLogics.length > 0 ? 'text-success' : 'text-gray-600'}`}>
                {runningLogics.length}
              </span>
            </div>
            
            <button
              onClick={() => {
                const interval = prompt('Set execution interval (seconds):', String(runIntervalSeconds));
                if (interval && !isNaN(parseInt(interval))) {
                  onRunIntervalChange(Math.max(1, parseInt(interval)));
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 transition-all cursor-pointer"
              title="Click to change interval"
            >
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Interval</span>
              <span className="text-lg font-bold text-gray-300 hover:text-cyan-400 transition-colors tabular-nums">
                {runIntervalSeconds}s
              </span>
            </button>
          </div>

          <div className="w-px h-8 bg-cyan-500/20 mx-1"></div>

          {/* System Status */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10">
            <div className={`w-2 h-2 rounded-full ${runningLogics.length > 0 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-600'}`}></div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
              {runningLogics.length > 0 ? 'Live' : 'Standby'}
            </span>
          </div>
        </div>
      </div>

      {/* KPI 카드 4개 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[{
          title:'총 전략 수', value: String(logics.length||0), color: 'text-cyan-400'
        },{
          title:'실행 중', value: runningLogics.length > 0 ? String(runningLogics.length) : '0', color: runningLogics.length > 0 ? 'text-success' : 'text-gray-400', pulse: runningLogics.length > 0
        },{
          title:'누적 ROI', value: `${roi >= 0 ? '+' : ''}${roi.toFixed(2)}%`, color: roi >= 0 ? 'text-success' : 'text-error'
        },{
          title:'오늘 P/L', value: `${todayPnL >= 0 ? '+' : ''}₩${Math.abs(todayPnL) < 0.01 ? 0 : todayPnL.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`, color: todayPnL >= 0 ? 'text-success' : 'text-error'
        }].map((s,idx)=> (
          <div key={idx} className={`p-5 rounded-2xl glass-card bg-neutral-900/70 border border-neutral-800/70 hover:border-cyan-500/40 transition-all card-slide-in ${s.pulse ? 'pulse-running' : ''}`} style={{animationDelay: `${idx * 0.1}s`}}>
            <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">{s.title}</div>
            <div className={`text-3xl font-bold ${s.color} number-animate`}>{s.value}</div>
            {/* 미니 바 차트 */}
            <div className="mt-3 h-10 flex items-end gap-1">
              {[4,8,3,6,9,5,7,6,8,10].map((h,i)=> (
                <div key={i} className="w-1.5 bg-gradient-to-t from-cyan-500/30 to-cyan-500/5 rounded transition-all hover:from-cyan-400 hover:to-cyan-500/20" style={{height:`${h*6}%`}} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Market Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 fade-in" style={{animationDelay: '0.4s'}}>
        {/* Bitcoin Chart */}
        <div className="p-4 rounded-xl glass-card bg-neutral-900/60 border border-neutral-800/70 hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                <span className="text-orange-400 font-bold text-sm">₿</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-200">Bitcoin</h3>
                <p className="text-xs text-gray-500">KRW-BTC</p>
              </div>
            </div>
            {btcCandles.length > 0 && (
              <div className="text-right">
                <div className="text-lg font-bold text-gray-100 tabular-nums">
                  ₩{btcCandles[btcCandles.length - 1].trade_price.toLocaleString('ko-KR')}
                </div>
                <div className={`text-xs font-medium ${
                  btcCandles[btcCandles.length - 1].trade_price >= btcCandles[0].trade_price 
                    ? 'text-success' 
                    : 'text-error'
                }`}>
                  {btcCandles[btcCandles.length - 1].trade_price >= btcCandles[0].trade_price ? '▲' : '▼'} 
                  {' '}{(((btcCandles[btcCandles.length - 1].trade_price - btcCandles[0].trade_price) / btcCandles[0].trade_price) * 100).toFixed(2)}%
                </div>
              </div>
            )}
          </div>
          <div className="h-24 relative">
            {chartLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="shimmer h-full w-full rounded"></div>
              </div>
            ) : btcCandles.length > 0 ? (
              <svg className="w-full h-full" viewBox="0 0 200 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="btcGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgb(251, 146, 60)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="rgb(251, 146, 60)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {(() => {
                  const prices = btcCandles.map(c => c.trade_price);
                  const minPrice = Math.min(...prices);
                  const maxPrice = Math.max(...prices);
                  const priceRange = maxPrice - minPrice || 1;
                  
                  const points = btcCandles.map((candle, i) => {
                    const x = (i / (btcCandles.length - 1)) * 200;
                    const y = 100 - ((candle.trade_price - minPrice) / priceRange) * 100;
                    return `${x},${y}`;
                  }).join(' ');
                  
                  const areaPoints = `0,100 ${points} 200,100`;
                  
                  return (
                    <>
                      <polyline points={areaPoints} fill="url(#btcGradient)" />
                      <polyline points={points} fill="none" stroke="rgb(251, 146, 60)" strokeWidth="2" />
                    </>
                  );
                })()}
              </svg>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-xs">
                No data available
              </div>
            )}
          </div>
          <div className="mt-2 text-xs text-gray-500 text-center">Last 50 candles (5m)</div>
        </div>

        {/* Ethereum Chart */}
        <div className="p-4 rounded-xl glass-card bg-neutral-900/60 border border-neutral-800/70 hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                <span className="text-purple-400 font-bold text-sm">Ξ</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-200">Ethereum</h3>
                <p className="text-xs text-gray-500">KRW-ETH</p>
              </div>
            </div>
            {ethCandles.length > 0 && (
              <div className="text-right">
                <div className="text-lg font-bold text-gray-100 tabular-nums">
                  ₩{ethCandles[ethCandles.length - 1].trade_price.toLocaleString('ko-KR')}
                </div>
                <div className={`text-xs font-medium ${
                  ethCandles[ethCandles.length - 1].trade_price >= ethCandles[0].trade_price 
                    ? 'text-success' 
                    : 'text-error'
                }`}>
                  {ethCandles[ethCandles.length - 1].trade_price >= ethCandles[0].trade_price ? '▲' : '▼'} 
                  {' '}{(((ethCandles[ethCandles.length - 1].trade_price - ethCandles[0].trade_price) / ethCandles[0].trade_price) * 100).toFixed(2)}%
                </div>
              </div>
            )}
          </div>
          <div className="h-24 relative">
            {chartLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="shimmer h-full w-full rounded"></div>
              </div>
            ) : ethCandles.length > 0 ? (
              <svg className="w-full h-full" viewBox="0 0 200 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="ethGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgb(168, 85, 247)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="rgb(168, 85, 247)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {(() => {
                  const prices = ethCandles.map(c => c.trade_price);
                  const minPrice = Math.min(...prices);
                  const maxPrice = Math.max(...prices);
                  const priceRange = maxPrice - minPrice || 1;
                  
                  const points = ethCandles.map((candle, i) => {
                    const x = (i / (ethCandles.length - 1)) * 200;
                    const y = 100 - ((candle.trade_price - minPrice) / priceRange) * 100;
                    return `${x},${y}`;
                  }).join(' ');
                  
                  const areaPoints = `0,100 ${points} 200,100`;
                  
                  return (
                    <>
                      <polyline points={areaPoints} fill="url(#ethGradient)" />
                      <polyline points={points} fill="none" stroke="rgb(168, 85, 247)" strokeWidth="2" />
                    </>
                  );
                })()}
              </svg>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-xs">
                No data available
              </div>
            )}
          </div>
          <div className="mt-2 text-xs text-gray-500 text-center">Last 50 candles (5m)</div>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="logic-list">
          {(provided) => (
            <div className='flex flex-col gap-3' ref={provided.innerRef} {...provided.droppableProps}>
              {logics.length > 0 ? (
                logics.map((logic, index) => (
                  // wrapper: 외곽 윤곽선은 ring으로 강조하고, 내부 경계선 색은 유지
                  <div key={logic.id} className="flex flex-col group rounded-xl ring-1 ring-transparent hover:ring-cyan-500/40 transition-shadow card-slide-in" style={{animationDelay: `${index * 0.05}s`}}>
                    <Draggable draggableId={logic.id} index={index} isDragDisabled={logic.id === editingId}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`glass-card flex items-center justify-between p-4 transition-all duration-200 ease-in-out cursor-pointer 
                          bg-neutral-900/70 border border-neutral-800/70 hover:shadow-[0_8px_30px_rgba(0,0,0,0.35)] hover:-translate-y-0.5 
                          ${openedMenuId === logic.id ? 'rounded-t-xl rounded-b-none border-b-0' : 'rounded-xl'}
                          ${snapshot.isDragging ? 'ring-2 ring-cyan-400/30 scale-105' : ''}`}
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
                          {/* 실행/정지 토글 */}
                          {runningLogic ? (
                            <button
                              className="btn-primary px-3 py-1 rounded text-sm text-white bg-red-600 hover:bg-red-500 border border-red-500/40 transition-all"
                              onClick={(e) => {
                                e.stopPropagation();
                                onStopLogic(logic.id);
                              }}
                            >
                              ⏹ 정지하기
                            </button>
                          ) : (
                            <>
                              {showIntervalInput === logic.id ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={runIntervalSeconds}
                                    onChange={(e) => onRunIntervalChange(Math.max(1, parseInt(e.target.value) || 5))}
                                    className="w-16 px-2 py-1 text-sm bg-neutral-800 border border-neutral-700 rounded text-gray-200"
                                    placeholder="초"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <span className="text-xs text-gray-400">초</span>
                                  <button
                                    className="btn-primary px-3 py-1 rounded text-sm text-white bg-cyan-600 hover:bg-cyan-500 border border-cyan-500/40"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      
                                      // 로직 데이터 로드
                                      let logicData = null;
                                      try {
                                        // @ts-ignore
                                        if (window.electronAPI && window.electronAPI.loadLogic) {
                                          // @ts-ignore
                                          const loadedLogic = await window.electronAPI.loadLogic(logic.id);
                                          logicData = loadedLogic?.data;
                                        }
                                      } catch (error) {
                                        console.error('로직 데이터 로드 실패:', error);
                                      }

                                      if (!logicData) {
                                        alert('로직 데이터를 불러올 수 없습니다.');
                                        return;
                                      }

                                      // 종목 정보 확인
                                      const stock = logics.find(l => l.id === logic.id)?.stock || 'KRW-BTC';
                                      
                                      // 로그 함수
                                      const logFunc = (title, msg) => {
                                        console.log(`[${title}] ${msg}`);
                                      };

                                      // 로직 실행
                                      const success = runLogic(
                                        stock,
                                        logicData,
                                        logFunc,
                                        false, // logDetails
                                        logic.id,
                                        runIntervalSeconds * 1000 // 초를 밀리초로 변환
                                      );

                                      if (success) {
                                        setShowIntervalInput(null);
                                      }
                                    }}
                                  >
                                    확인
                                  </button>
                                  <button
                                    className="px-3 py-1 rounded text-sm text-gray-400 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowIntervalInput(null);
                                    }}
                                  >
                                    취소
                                  </button>
                                </div>
                              ) : (
                                <button
                                  className="btn-primary px-3 py-1 rounded text-sm text-white bg-cyan-600 hover:bg-cyan-500 border border-cyan-500/40"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowIntervalInput(logic.id);
                                  }}
                                >
                                  ▶ 실행하기
                                </button>
                              )}
                            </>
                          )}
                          <button
                            className="btn-primary px-3 py-1 rounded text-sm bg-neutral-800 text-gray-200 border border-neutral-700 hover:border-cyan-500/40 hover:text-white flex items-center gap-2 transition-all"
                            onClick={() => {
                              setSelectedLogicForApi(logic.id);
                              if (typeof onOpenApiKeySettings === 'function') onOpenApiKeySettings();
                            }}
                          >
                            <span>API 설정</span>
                            {(() => {
                              const st = apiValidityByLogic[logic.id];
                              const cls = st === true
                                ? 'bg-cyan-400 shadow-[0_0_10px_2px_rgba(34,211,238,0.5)]'
                                : st === false
                                  ? 'bg-red-400 shadow-[0_0_10px_2px_rgba(248,113,113,0.5)]'
                                  : 'bg-neutral-500';
                              return <span className={`inline-flex h-2.5 w-2.5 rounded-full ${cls}`}></span>;
                            })()}
                          </button>
                          {/* 수정하기 버튼을 삭제하기 왼쪽으로 이동 */}
                          <button
                            className="btn-primary px-3 py-1 rounded text-sm bg-neutral-800 text-gray-200 border border-neutral-700 hover:border-cyan-500/40 hover:text-white transition-all"
                            onClick={() => {
                              setOpenedMenuId(null);
                              onLogicClick(logic.id);
                            }}
                          >
                            ✏️ 수정하기
                          </button>
                          <button
                            className="btn-primary px-3 py-1 rounded text-sm text-red-400 bg-neutral-800 border border-neutral-700 hover:bg-red-500/10 hover:text-red-300 transition-all"
                            onClick={() => {
                              setOpenedMenuId(null);
                              setDeleteTargetLogic(logic);
                              setShowDeleteModal(true);
                            }}
                          >
                            🗑️ 삭제하기
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
        className="btn-primary flex items-center justify-center w-full p-4 mt-5 text-lg font-semibold text-white rounded-xl cursor-pointer transition-all duration-200 
        bg-cyan-600 hover:bg-cyan-500 shadow-[0_10px_30px_-10px_rgba(34,211,238,0.5)] hover:shadow-[0_15px_40px_-10px_rgba(34,211,238,0.7)]"
        onClick={startCreateNewLogic}
      >
        <span className="mr-2 text-2xl">+</span> 새 로직 추가하기
      </button>
    </div>
  );
};

export default AssetPage;

