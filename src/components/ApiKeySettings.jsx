import React, { useState } from 'react';

/**
 * API 키 설정 컴포넌트
 * - Upbit Access Key와 Secret Key를 입력받아 암호화 저장
 * - 저장된 키로 자동으로 자산 정보를 불러옴
 */
const ApiKeySettings = ({ onKeysSaved }) => {
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  /**
   * API 키 저장 핸들러
   * - 입력 검증 후 Electron Main Process에 저장 요청
   */
  const handleSaveKeys = async () => {
    // 입력 검증
    if (!accessKey.trim() || !secretKey.trim()) {
      setMessage('Access Key와 Secret Key를 모두 입력해주세요.');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      // @ts-ignore - window.electronAPI는 preload.js에서 노출됨
      if (!window.electronAPI) {
        throw new Error('Electron 환경에서만 사용 가능합니다.');
      }

      // API 키 저장
      // @ts-ignore
      await window.electronAPI.saveApiKeys(accessKey, secretKey);

      setMessage('API 키가 안전하게 저장되었습니다!');
      setMessageType('success');

      // 부모 컴포넌트에 저장 완료 알림 (자산 정보 갱신용)
      if (onKeysSaved) {
        onKeysSaved(accessKey, secretKey);
      }

      // 입력 필드 초기화 (보안상)
      setAccessKey('');
      setSecretKey('');
    } catch (error) {
      console.error('API 키 저장 실패:', error);
      setMessage('API 키 저장에 실패했습니다: ' + error.message);
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="api-key-settings w-[min(92vw,520px)] max-w-xl rounded-2xl shadow-2xl border border-neutral-800/70 bg-neutral-900/70 p-6 text-gray-200">
      <h2 className="text-xl font-bold mb-5 text-gray-100 flex items-center gap-2">
        ⚙️ Upbit API 키 설정
      </h2>

      <div className="mb-4">
        <label className="block mb-2 text-sm font-semibold text-gray-400">Access Key</label>
        <input
          type="text"
          value={accessKey}
          onChange={(e) => setAccessKey(e.target.value)}
          placeholder="Access Key를 입력하세요"
          className="w-full px-3 py-2 text-sm rounded-md bg-neutral-900 border border-neutral-700 text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400/50"
          disabled={isLoading}
        />
      </div>

      <div className="mb-4">
        <label className="block mb-2 text-sm font-semibold text-gray-400">Secret Key</label>
        <input
          type="password"
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          placeholder="Secret Key를 입력하세요"
          className="w-full px-3 py-2 text-sm rounded-md bg-neutral-900 border border-neutral-700 text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400/50"
          disabled={isLoading}
        />
      </div>

      <button
        onClick={handleSaveKeys}
        disabled={isLoading}
        className={`w-full py-3 mt-1 rounded-md font-bold text-white transition-colors border border-transparent shadow-sm ${isLoading ? 'bg-neutral-700 cursor-not-allowed' : 'bg-cyan-600 hover:bg-cyan-500'}`}
      >
        {isLoading ? '저장 중...' : '키 저장하기'}
      </button>

      {message && (
        <div
          className={`mt-4 px-3 py-3 rounded-md text-sm border ${messageType === 'success' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-red-500/10 text-red-300 border-red-500/30'}`}
        >
          {message}
        </div>
      )}

      <div className="mt-5 px-3 py-3 rounded-lg bg-neutral-900 border border-neutral-800/70 flex items-start gap-3">
     
        <div className="text-[13px] text-gray-400 leading-relaxed">
          <p className="mb-1">💡 API 키는 암호화되어 안전하게 저장됩니다.</p>
          <p>📍 Upbit에서 API 키 생성 시 이 PC의 IP 주소를 등록해주세요.</p>
        </div>
      </div>
    </div>
  );
};

export default ApiKeySettings;
