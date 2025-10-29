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
    <div className="api-key-settings" style={styles.container}>
      <h2 style={styles.title}>⚙️ Upbit API 키 설정</h2>

      <div style={styles.inputGroup}>
        <label style={styles.label}>Access Key</label>
        <input
          type="text"
          value={accessKey}
          onChange={(e) => setAccessKey(e.target.value)}
          placeholder="Access Key를 입력하세요"
          style={styles.input}
          disabled={isLoading}
        />
      </div>

      <div style={styles.inputGroup}>
        <label style={styles.label}>Secret Key</label>
        <input
          type="password"
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          placeholder="Secret Key를 입력하세요"
          style={styles.input}
          disabled={isLoading}
        />
      </div>

      <button
        onClick={handleSaveKeys}
        disabled={isLoading}
        style={{
          ...styles.button,
          ...(isLoading ? styles.buttonDisabled : {})
        }}
      >
        {isLoading ? '저장 중...' : '키 저장하기'}
      </button>

      {message && (
        <div style={{
          ...styles.message,
          ...(messageType === 'success' ? styles.successMessage : styles.errorMessage)
        }}>
          {message}
        </div>
      )}

      <div style={styles.info}>
        <p style={styles.infoText}>💡 API 키는 암호화되어 안전하게 저장됩니다.</p>
        <p style={styles.infoText}>📍 Upbit에서 API 키 생성 시 이 PC의 IP 주소를 등록해주세요.</p>
      </div>
    </div>
  );
};

// 스타일 정의
const styles = {
  container: {
    padding: '24px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    maxWidth: '500px',
    margin: '0 auto'
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '20px',
    color: '#333'
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
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s'
  },
  button: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: '#007bff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    marginTop: '8px',
    transition: 'background-color 0.2s'
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed'
  },
  message: {
    marginTop: '16px',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500'
  },
  successMessage: {
    backgroundColor: '#d4edda',
    color: '#155724',
    border: '1px solid #c3e6cb'
  },
  errorMessage: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    border: '1px solid #f5c6cb'
  },
  info: {
    marginTop: '20px',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    borderLeft: '4px solid #007bff'
  },
  infoText: {
    margin: '4px 0',
    fontSize: '13px',
    color: '#666'
  }
};

export default ApiKeySettings;
