import { useState, useEffect, useRef } from 'react';
import AssetPage from './components/AssetPage';
import LogicEditorPage from './components/LogicEditorPage';
import { getMyAssetsWithKeys } from './communicator/upbit_api';
import { runLogic } from './logic_interpreter/interpreter';

// ----------------------------------------------------------------
// App: 페이지 라우팅을 담당하는 메인 컴포넌트
// ----------------------------------------------------------------
const App = () => {
  const [currentPage, setCurrentPage] = useState('asset'); // 'asset' or 'editor'
  const [selectedLogicId, setSelectedLogicId] = useState(null);
  const [newLogicName, setNewLogicName] = useState('');
  // logics는 요약 메타만 보관: {id,name,stock?,order}
  const [logics, setLogics] = useState([]);
  const [assets, setAssets] = useState([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [assetsError, setAssetsError] = useState(null);
  const [runAllInBackground, setRunAllInBackground] = useState(true);
  // 비동기 목록 갱신의 경합을 방지하기 위한 시퀀스 카운터
  const listSeqRef = useRef(0);

  // API 키 관련 상태
  const [hasApiKeys, setHasApiKeys] = useState(false);
  const [showApiKeySettings, setShowApiKeySettings] = useState(false);

  // 테마 관련 상태
  const [theme, setTheme] = useState('dark'); // 'dark' | 'light'

  // 데이터 로딩 및 초기화
  useEffect(() => {
    // 초기 테마 설정: Electron Store > 시스템 선호
    (async () => {
      try {
        // @ts-ignore
        if (window.electronAPI && window.electronAPI.getTheme) {
          // @ts-ignore
          const saved = await window.electronAPI.getTheme();
          if (saved === 'light' || saved === 'dark') {
            setTheme(saved);
          } else {
            const preferDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            setTheme(preferDark ? 'dark' : 'light');
          }
        }
      } catch {}
    })();

    // --- 데모를 위한 기본 데이터 생성 ---
    const bootstrapLogics = async () => {
      try {
        // @ts-ignore
        if (!window.electronAPI || !window.electronAPI.listLogics) {
          console.error('Electron API가 필요합니다.');
          setLogics([]);
          return;
        }
        // @ts-ignore
        const index = await window.electronAPI.listLogics();
        setLogics(index || []);
      } catch (e) {}
    };
    bootstrapLogics();

    // 초기 로딩은 자산을 비워둠 (실행 중인 로직이 있을 때만 자산 조회)
    setAssetsLoading(false);
  }, []);

  // 모든 로직을 백그라운드 루틴으로 실행 (간단한 타이머 기반)
  useEffect(() => {
    if (!runAllInBackground) return;
    const id = setInterval(() => {
      try {
        logics.forEach((l) => {
          if (!l?.data?.buyGraph || !l?.data?.sellGraph) return;
          // 간단히 콘솔에만 로그 남김
          runLogic(l.stock ?? '', { buyGraph: l.data.buyGraph, sellGraph: l.data.sellGraph }, () => {}, false);
        });
      } catch {}
    }, 30000); // 30초마다 실행
    return () => clearInterval(id);
  }, [runAllInBackground, logics]);

  // 테마를 documentElement에 반영 + Electron Store에 저장
  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme);
      // @ts-ignore
      if (window.electronAPI && window.electronAPI.setTheme) {
        // @ts-ignore
        window.electronAPI.setTheme(theme);
      }
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
    
  const handleSaveLogic = async (updatedLogic) => {
    try {
      // @ts-ignore
      if (!window.electronAPI || !window.electronAPI.saveLogic) return;
      // @ts-ignore
      await window.electronAPI.saveLogic(updatedLogic);
      // 전체 재조회 없이 국소 업데이트로 메타 반영 (이름/종목 등)
      setLogics((prev) =>
        prev.map((l) =>
          l.id === updatedLogic.id
            ? { ...l, name: updatedLogic.name || l.name, stock: updatedLogic.stock }
            : l
        )
      );
    } catch {}
  };

  const handleDeleteLogic = async (logicIdToDelete) => {
    try {
      // 낙관적 업데이트로 즉시 UI 반영하고, 이후 비동기 저장
      setLogics((prev)=> prev.filter((l)=> l.id !== logicIdToDelete));
      // @ts-ignore
      if (!window.electronAPI || !window.electronAPI.deleteLogic) return;
      // @ts-ignore
      await window.electronAPI.deleteLogic(logicIdToDelete);
    } catch {}
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
   * @param {string} logicId - 로직 ID (선택사항, 제공되면 해당 로직의 API 키 사용)
   */
  const handleRefreshAssets = async (logicId = null) => {
    setAssetsLoading(true);
    setAssetsError(null);

    try {
      // @ts-ignore
      if (!window.electronAPI) {
        throw new Error('Electron 환경에서만 사용 가능합니다.');
      }

      let savedKeys = null;
      // 로직 ID가 제공되면 해당 로직의 API 키 로드, 아니면 전역 API 키 로드
      if (logicId) {
        // @ts-ignore
        savedKeys = await window.electronAPI.loadLogicApiKeys(logicId);
      } else {
        // @ts-ignore
        savedKeys = await window.electronAPI.loadApiKeys();
      }

      if (!savedKeys || !savedKeys.accessKey || !savedKeys.secretKey) {
        setAssetsError('저장된 API 키가 없습니다. API 키를 먼저 설정해주세요.');
        // setShowApiKeySettings(true); // 자동으로 열지 않음 - 버튼 클릭 시에만 열림
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
          onReorderLogics={async (items)=>{
            // items: [{id,name,stock?,order?, _temp?}]
            setLogics(items);
            // 임시 항목이 있으면 저장하지 않음
            if (items.some((i)=> i && i._temp)) return;
            try {
              // @ts-ignore
              if (window.electronAPI && window.electronAPI.reorderLogics) {
                const ids = items.map((i)=> i.id);
                // @ts-ignore
                await window.electronAPI.reorderLogics(ids);
              }
            } catch {}
          }}
          onCreateLogic={async (name)=>{
            try {
              // @ts-ignore
              if (window.electronAPI && window.electronAPI.createLogic) {
                // @ts-ignore
                const meta = await window.electronAPI.createLogic(name);
                // 인덱스 전체 재조회 없이 새 항목만 말단에 추가
                if (meta && meta.id) {
                  setLogics((prev)=> [...prev, meta]);
                }
              }
            } catch {}
          }}
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