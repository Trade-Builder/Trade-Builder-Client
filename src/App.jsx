import { useState, useEffect } from 'react';
import AssetPage from './components/AssetPage';
import LogicEditorPage from './components/LogicEditorPage';
import { getMyAssetsWithKeys } from './communicator/upbit_api';

// ----------------------------------------------------------------
// App: 페이지 라우팅을 담당하는 메인 컴포넌트
// ----------------------------------------------------------------
const App = () => {
  const [currentPage, setCurrentPage] = useState('asset'); // 'asset' or 'editor'
  const [selectedLogicId, setSelectedLogicId] = useState(null);
  const [newLogicName, setNewLogicName] = useState('');
  const [logics, setLogics] = useState([]);
  const [assets, setAssets] = useState([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [assetsError, setAssetsError] = useState(null);

  // API 키 관련 상태
  const [hasApiKeys, setHasApiKeys] = useState(false);
  const [showApiKeySettings, setShowApiKeySettings] = useState(false);

  // 테마 관련 상태
  const [theme, setTheme] = useState('dark'); // 'dark' | 'light'

  // 데이터 로딩 및 초기화
  useEffect(() => {
    // 초기 테마 설정: localStorage > 시스템 선호
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') {
        setTheme(saved);
      } else {
        const preferDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(preferDark ? 'dark' : 'light');
      }
    } catch {}

    // --- 데모를 위한 기본 데이터 생성 ---
    if (!localStorage.getItem('userLogics')) {
      const mockLogics = [
        { id: 'logic-1', name: 'Upbit 단타 거래 로직', data: {} },
        { id: 'logic-2', name: '삼성 자동 투자', data: {} },
        { id: 'logic-3', name: 'S&P 500 장기 우상향 주식 투자', data: {} },
      ];
      localStorage.setItem('userLogics', JSON.stringify(mockLogics));
    }
    const savedLogics = JSON.parse(localStorage.getItem('userLogics') || '[]');
    setLogics(savedLogics);

    const loadKeysAndFetchAssets = async () => {
      try {
        // @ts-ignore
        if (!window.electronAPI) {
          setAssetsError('Electron 환경에서만 사용 가능합니다.');
          setAssetsLoading(false);
          return;
        }

        // --- 1단계: 저장된 API 키 불러오기 ---
        console.log("1단계: 저장된 API 키를 불러옵니다.");
        // @ts-ignore
        const savedKeys = await window.electronAPI.loadApiKeys();

        if (savedKeys && savedKeys.accessKey && savedKeys.secretKey) {
          // --- 2단계: API 키가 있으면 자산 정보 가져오기 ---
          console.log("2단계: 저장된 키를 찾았습니다. 자산 정보를 가져옵니다.");
          setHasApiKeys(true);

          try {
            const data = await getMyAssetsWithKeys(savedKeys.accessKey, savedKeys.secretKey);
            console.log("3단계: 자산 정보 조회 성공!", data);
            setAssets(data);
            setAssetsError(null);
          } catch (error) {
            console.error("3단계 (실패): 자산 정보 조회 실패", error);
            setAssetsError('자산 정보를 불러오는 데 실패했습니다. API 키가 정확한지, IP 주소가 등록되었는지 확인해주세요.');
          }
        } else {
          // --- 2단계 (실패): API 키가 없음 ---
          console.log("2단계: 저장된 API 키가 없습니다. 설정이 필요합니다.");
          setHasApiKeys(false);
          setShowApiKeySettings(true);
          setAssetsError('API 키가 설정되지 않았습니다. 설정 버튼을 눌러 키를 입력해주세요.');
        }
      } catch (error) {
        console.error("API 키 불러오기 실패:", error);
        setAssetsError('API 키를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setAssetsLoading(false);
      }
    };

    loadKeysAndFetchAssets();
  }, []);

  // 테마를 documentElement에 반영
  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
    } catch {}
  }, [theme]);

  const handleLogicClick = (logicId) => {
    setSelectedLogicId(logicId);
    setCurrentPage('editor');
  };

  const handleAddNewLogic = (name) => {
    setSelectedLogicId(null);
    setNewLogicName(name || '');
    setCurrentPage('editor');
  };

  const handleBackToAssetPage = () => {
    setCurrentPage('asset');
    setSelectedLogicId(null);
    setNewLogicName('');
  };
    
  const handleSaveLogic = (updatedLogic) => {
    const newLogics = [...logics];
    const index = newLogics.findIndex(l => l.id === updatedLogic.id);
    if (index > -1) {
      newLogics[index] = updatedLogic; // 기존 로직 업데이트
    } else {
      newLogics.push(updatedLogic); // 새 로직 추가
    }
    setLogics(newLogics);
    localStorage.setItem('userLogics', JSON.stringify(newLogics));
  };

  const handleDeleteLogic = (logicIdToDelete) => {
    const newLogics = logics.filter(logic => logic.id !== logicIdToDelete);
    setLogics(newLogics);
    localStorage.setItem('userLogics', JSON.stringify(newLogics));
    console.log('로직이 삭제되었습니다.');
  };

  /**
   * API 키 저장 후 호출되는 핸들러
   * - 저장된 키로 자산 정보를 다시 불러옴
   */
  const handleApiKeysSaved = async (accessKey, secretKey) => {
    setAssetsLoading(true);
    setShowApiKeySettings(false);

    try {
      const data = await getMyAssetsWithKeys(accessKey, secretKey);
      console.log("API 키 저장 후 자산 정보 조회 성공:", data);
      setAssets(data);
      setAssetsError(null);
      setHasApiKeys(true);
    } catch (error) {
      console.error("자산 정보 조회 실패:", error);
      setAssetsError('자산 정보를 불러오는 데 실패했습니다. API 키가 정확한지 확인해주세요.');
    } finally {
      setAssetsLoading(false);
    }
  };

  /**
   * 자산 정보 새로고침 핸들러
   * - 저장된 API 키로 자산 정보를 다시 불러옴
   */
  const handleRefreshAssets = async () => {
    setAssetsLoading(true);
    setAssetsError(null);

    try {
      // @ts-ignore
      if (!window.electronAPI) {
        throw new Error('Electron 환경에서만 사용 가능합니다.');
      }

      // 저장된 API 키 불러오기
      // @ts-ignore
      const savedKeys = await window.electronAPI.loadApiKeys();

      if (!savedKeys || !savedKeys.accessKey || !savedKeys.secretKey) {
        setAssetsError('저장된 API 키가 없습니다. API 키를 먼저 설정해주세요.');
        setShowApiKeySettings(true);
        return;
      }

      // 자산 정보 다시 불러오기
      const data = await getMyAssetsWithKeys(savedKeys.accessKey, savedKeys.secretKey);
      console.log("자산 정보 새로고침 성공:", data);
      setAssets(data);
      setAssetsError(null);
    } catch (error) {
      console.error("자산 정보 새로고침 실패:", error);
      setAssetsError('자산 정보를 새로고침하는 데 실패했습니다. API 키를 확인해주세요.');
    } finally {
      setAssetsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen font-sans bg-transparent">

      {/* Theme Toggle */}
      {currentPage === 'asset' && (
        <div style={{ position: 'fixed', top: 14, right: 14, zIndex: 1000 }}>
          <button
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid var(--panel-border)',
              background: 'var(--panel-bg)',
              color: 'var(--text-primary)',
              boxShadow: '0 6px 20px rgba(0,0,0,0.12)'
            }}
            title="테마 전환 (Dark/Light)"
          >
            {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>
      )}
      {currentPage === 'asset' ? (
        <AssetPage
          logics={logics}
          assets={assets}
          assetsLoading={assetsLoading}
          assetsError={assetsError}
          onLogicClick={handleLogicClick}
          onAddNewLogic={handleAddNewLogic}
          onDeleteLogic={handleDeleteLogic}
          onReorderLogics={setLogics}
          onRefreshAssets={handleRefreshAssets}
          onOpenApiKeySettings={() => setShowApiKeySettings(true)}
          showApiKeySettings={showApiKeySettings}
          onCloseApiKeySettings={() => setShowApiKeySettings(false)}
          onApiKeysSaved={handleApiKeysSaved}
        />
      ) : (
        <LogicEditorPage
          selectedLogicId={selectedLogicId}
          onBack={handleBackToAssetPage}
          onSave={handleSaveLogic}
          defaultNewLogicName={newLogicName}
        />
      )}
    </div>
  );
};

export default App;