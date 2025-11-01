import React from 'react';

/**
 * AssetInfoPanel: 자산 정보를 보기 좋게 표시하는 컴포넌트
 */
const AssetInfoPanel = ({ assets, assetsLoading, assetsError, onRefresh }) => {
  // 총 자산 계산 (KRW 기준)
  const calculateTotalAsset = () => {
    if (!assets || assets.length === 0) return 0;
    return assets.reduce((sum, asset) => {
      const balance = parseFloat(asset.balance) || 0;
      const avgBuyPrice = parseFloat(asset.avg_buy_price) || 0;
      return sum + (balance * avgBuyPrice);
    }, 0);
  };

  // 원화 자산 찾기
  const krwAsset = assets?.find(asset => asset.currency === 'KRW');
  const krwBalance = krwAsset ? parseFloat(krwAsset.balance) : 0;

  // 코인 자산들 (KRW 제외)
  const coinAssets = assets?.filter(asset => asset.currency !== 'KRW') || [];

  // 코인 자산 총액
  const coinTotalValue = calculateTotalAsset() - krwBalance;

  // 총 자산
  const totalAsset = krwBalance + coinTotalValue;

  if (assetsLoading) {
    return (
      <div className="mb-6 p-6 rounded-2xl bg-neutral-900/70 border border-neutral-800/70">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
          <span className="ml-3 text-gray-400">자산 정보 불러오는 중...</span>
        </div>
      </div>
    );
  }

  if (assetsError) {
    return (
      <div className="mb-6 p-6 rounded-2xl bg-neutral-900/70 border border-red-900/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-red-400 mb-2">⚠️ 자산 정보 오류</h3>
            <p className="text-sm text-gray-400">{assetsError}</p>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-4 py-2 rounded-lg bg-neutral-800 text-gray-100 border border-neutral-700 hover:border-cyan-500/40 transition"
            >
              다시 시도
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      {/* 자산 요약 카드 */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-neutral-900/90 to-neutral-900/70 border border-neutral-800/70 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-100">💰 내 자산</h3>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-3 py-1.5 rounded-lg bg-neutral-800/70 text-gray-300 border border-neutral-700 hover:border-cyan-500/40 hover:text-white transition text-sm"
              title="자산 정보 새로고침"
            >
              🔄 새로고침
            </button>
          )}
        </div>

        {/* 총 자산 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="p-4 rounded-xl bg-neutral-800/50 border border-neutral-700/50">
            <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">총 자산</div>
            <div className="text-2xl font-bold text-cyan-400">
              ₩{totalAsset.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-neutral-800/50 border border-neutral-700/50">
            <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">보유 원화</div>
            <div className="text-2xl font-bold text-gray-100">
              ₩{krwBalance.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-neutral-800/50 border border-neutral-700/50">
            <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">코인 자산</div>
            <div className="text-2xl font-bold text-gray-100">
              ₩{coinTotalValue.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>

        {/* 보유 코인 목록 */}
        {coinAssets.length > 0 && (
          <div>
            <div className="text-sm font-medium text-gray-400 mb-3">보유 코인</div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {coinAssets.map((asset, index) => {
                const balance = parseFloat(asset.balance) || 0;
                const avgBuyPrice = parseFloat(asset.avg_buy_price) || 0;
                const totalValue = balance * avgBuyPrice;
                const locked = parseFloat(asset.locked) || 0;

                return (
                  <div
                    key={index}
                    className="p-3 rounded-lg bg-neutral-800/40 border border-neutral-700/40 hover:border-cyan-500/30 transition"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold text-gray-100">{asset.currency}</span>
                        {locked > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                            🔒 일부 잠김
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-cyan-400">
                          ₩{totalValue.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <div>
                        보유량: <span className="text-gray-300">{balance.toFixed(8)}</span>
                      </div>
                      <div>
                        평단가: <span className="text-gray-300">₩{avgBuyPrice.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}</span>
                      </div>
                    </div>
                    {locked > 0 && (
                      <div className="mt-1 text-xs text-gray-500">
                        잠김: {locked.toFixed(8)} {asset.currency}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {coinAssets.length === 0 && (
          <div className="text-center py-6 text-gray-500">
            보유 중인 코인이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetInfoPanel;
