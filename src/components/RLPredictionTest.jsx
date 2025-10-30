import React, { useState } from 'react';

/**
 * RL 모델 추론 테스트 컴포넌트
 *
 * Electron에서 Python 스크립트를 실행하여 RL 모델의 매매 신호를 받습니다.
 */
const RLPredictionTest = () => {
  const [market, setMarket] = useState('KRW-BTC');
  const [timeframe, setTimeframe] = useState('1h');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  /**
   * RL 모델 추론 실행
   */
  const handlePredict = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // @ts-ignore - window.electronAPI는 preload.js에서 노출됨
      if (!window.electronAPI || !window.electronAPI.predictWithRL) {
        throw new Error('Electron 환경에서만 사용 가능합니다.');
      }

      console.log(`🤖 RL 추론 요청: ${market} ${timeframe}`);

      // Python 스크립트 실행 및 결과 받기
      // @ts-ignore
      const prediction = await window.electronAPI.predictWithRL(market, timeframe, 200);

      console.log('✅ RL 추론 결과:', prediction);
      setResult(prediction);

    } catch (err) {
      console.error('❌ RL 추론 실패:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🤖 RL 모델 추론 테스트</h2>

      {/* 입력 폼 */}
      <div style={styles.form}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>마켓</label>
          <select
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            style={styles.select}
            disabled={loading}
          >
            <option value="KRW-BTC">Bitcoin (BTC)</option>
            <option value="KRW-ETH">Ethereum (ETH)</option>
            <option value="KRW-XRP">Ripple (XRP)</option>
            <option value="KRW-ADA">Cardano (ADA)</option>
          </select>
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>타임프레임</label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            style={styles.select}
            disabled={loading}
          >
            <option value="1m">1분봉</option>
            <option value="5m">5분봉</option>
            <option value="15m">15분봉</option>
            <option value="1h">1시간봉</option>
            <option value="4h">4시간봉</option>
            <option value="1d">일봉</option>
          </select>
        </div>

        <button
          onClick={handlePredict}
          disabled={loading}
          style={{
            ...styles.button,
            ...(loading ? styles.buttonDisabled : {})
          }}
        >
          {loading ? '⏳ 추론 중...' : '🎯 추론 실행'}
        </button>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div style={styles.error}>
          ❌ 에러: {error}
        </div>
      )}

      {/* 추론 결과 */}
      {result && (
        <div style={styles.result}>
          <h3 style={styles.resultTitle}>📊 추론 결과</h3>

          <div style={styles.resultItem}>
            <span style={styles.resultLabel}>매매 신호:</span>
            <span style={{
              ...styles.signal,
              ...(result.signal === 'BUY' ? styles.signalBuy :
                  result.signal === 'SELL' ? styles.signalSell :
                  styles.signalHold)
            }}>
              {result.signal}
            </span>
          </div>

          <div style={styles.resultItem}>
            <span style={styles.resultLabel}>신뢰도:</span>
            <span style={styles.resultValue}>{(result.confidence * 100).toFixed(2)}%</span>
          </div>

          <div style={styles.resultItem}>
            <span style={styles.resultLabel}>거래 비율:</span>
            <span style={styles.resultValue}>{(result.trade_unit * 100).toFixed(4)}%</span>
          </div>

          <div style={styles.resultItem}>
            <span style={styles.resultLabel}>예상 포트폴리오:</span>
            <span style={styles.resultValue}>{result.portfolio_value.toLocaleString()} KRW</span>
          </div>

          <div style={styles.resultItem}>
            <span style={styles.resultLabel}>사용된 캔들:</span>
            <span style={styles.resultValue}>{result.candles_used}개</span>
          </div>
        </div>
      )}

      {/* 사용법 안내 */}
      <div style={styles.info}>
        <p style={styles.infoText}>💡 이 기능은 학습된 RL 모델을 사용하여 매매 신호를 생성합니다.</p>
        <p style={styles.infoText}>📌 Python 환경과 필요한 라이브러리가 설치되어 있어야 합니다.</p>
      </div>
    </div>
  );
};

// 스타일
const styles = {
  container: {
    padding: '24px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    maxWidth: '600px',
    margin: '0 auto'
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '24px',
    color: '#333',
    textAlign: 'center'
  },
  form: {
    marginBottom: '24px'
  },
  inputGroup: {
    marginBottom: '16px'
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#555'
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    boxSizing: 'border-box'
  },
  button: {
    width: '100%',
    padding: '14px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: '#4CAF50',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '8px',
    transition: 'background-color 0.2s'
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed'
  },
  error: {
    padding: '12px',
    backgroundColor: '#ffebee',
    color: '#c62828',
    borderRadius: '6px',
    marginBottom: '16px',
    border: '1px solid #ef5350'
  },
  result: {
    padding: '20px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    marginBottom: '16px'
  },
  resultTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: '#333'
  },
  resultItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid #ddd'
  },
  resultLabel: {
    fontSize: '14px',
    color: '#666',
    fontWeight: '500'
  },
  resultValue: {
    fontSize: '14px',
    color: '#333',
    fontWeight: '600'
  },
  signal: {
    fontSize: '16px',
    fontWeight: 'bold',
    padding: '4px 12px',
    borderRadius: '4px'
  },
  signalBuy: {
    backgroundColor: '#4CAF50',
    color: '#fff'
  },
  signalSell: {
    backgroundColor: '#f44336',
    color: '#fff'
  },
  signalHold: {
    backgroundColor: '#ff9800',
    color: '#fff'
  },
  info: {
    padding: '12px',
    backgroundColor: '#e3f2fd',
    borderRadius: '6px',
    borderLeft: '4px solid #2196F3'
  },
  infoText: {
    margin: '4px 0',
    fontSize: '13px',
    color: '#666'
  }
};

export default RLPredictionTest;
