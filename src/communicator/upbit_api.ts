// UpbitAccount 인터페이스 정의는 동일합니다.
interface UpbitAccount {
  currency: string;
  balance: string;
  locked: string;
  avg_buy_price: string;
  avg_buy_price_modified: boolean;
  unit_currency: string;
}

/**
 * preload.js를 통해 Electron의 Main 프로세스에게 업비트 계좌 정보 조회를 요청합니다.
 * @param accessKey - 사용자가 입력한 Access Key
 * @param secretKey - 사용자가 입력한 Secret Key
 * @returns 계좌 정보 배열이 담긴 프로미스(Promise) 객체
 * @throws API 요청이 실패하면 에러를 발생시킵니다.
 */
export const getMyAssetsWithKeys = async (accessKey: string, secretKey: string): Promise<UpbitAccount[]> => {
  try {
    // preload.js에서 window 객체에 노출시킨 electronAPI를 사용합니다.
    // @ts-ignore
    if (window.electronAPI) {
      // 'upbit:fetchAccounts' 채널로 키를 전달하고, Main 프로세스의 응답을 기다립니다.
      // @ts-ignore
      const assets = await window.electronAPI.fetchUpbitAccounts(accessKey, secretKey);
      return assets;
    } else {
      throw new Error('It seems you are not running in an Electron environment.');
    }
  } catch (error) {
    console.error("자산을 가져오는 데 실패했습니다 (Renderer):", error);
    throw error;
  }
};

/**
 * Upbit 현재가 조회 (여러 마켓 동시 조회 가능)
 * @param markets - 마켓 코드 배열 (예: ['KRW-BTC', 'KRW-ETH'])
 * @returns 현재가 정보 객체 { 'KRW-BTC': 50000000, 'KRW-ETH': 3000000 }
 */
export const getCurrentPrices = async (markets: string[]): Promise<Record<string, number>> => {
  try {
    // @ts-ignore
    if (!window.electronAPI) {
      throw new Error('Electron 환경에서만 사용 가능합니다.');
    }

    // markets가 빈 배열이면 빈 객체 반환
    if (markets.length === 0) {
      return {};
    }

    // Electron Main Process를 통해 현재가 조회
    // @ts-ignore
    const result = await window.electronAPI.getCurrentPrices(markets);

    if (!result.success) {
      throw new Error(result.error || '현재가 조회 실패');
    }

    // { 'KRW-BTC': 50000000, 'KRW-ETH': 3000000 } 형태로 반환
    return result.data || {};
  } catch (error) {
    console.error('현재가 조회 실패:', error);
    throw error;
  }
};