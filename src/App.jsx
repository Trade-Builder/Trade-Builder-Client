import { useState, useEffect } from 'react'; 
import AssetPage from './components/AssetPage';
import LogicEditorPage from './components/LogicEditorPage';
// ----------------------------------------------------------------
// App: 페이지 라우팅을 담당하는 메인 컴포넌트
// ----------------------------------------------------------------
const App = () => {
  const [currentPage, setCurrentPage] = useState('asset'); // 'asset' or 'editor'
  const [selectedLogicId, setSelectedLogicId] = useState(null);
  const [logics, setLogics] = useState([]);

  // 데이터 로딩 및 초기화
  useEffect(() => {
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
  }, []);

  const handleLogicClick = (logicId) => {
    setSelectedLogicId(logicId);
    setCurrentPage('editor');
  };

  const handleAddNewLogic = () => {
    setSelectedLogicId(null);
    setCurrentPage('editor');
  };

  const handleBackToAssetPage = () => {
    setCurrentPage('asset');
    setSelectedLogicId(null);
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


  return (
    <div className="flex items-center justify-center min-h-screen font-sans bg-gray-100">
      {currentPage === 'asset' ? (
        <AssetPage 
          logics={logics}
          onLogicClick={handleLogicClick} 
          onAddNewLogic={handleAddNewLogic} 
          onDeleteLogic={handleDeleteLogic}
          onReorderLogics={setLogics} // 순서 변경 시 logics 상태 업데이트
        />
      ) : (
        <LogicEditorPage 
          selectedLogicId={selectedLogicId} 
          onBack={handleBackToAssetPage}
          onSave={handleSaveLogic}
        />
      )}
    </div>
  );
};

export default App;