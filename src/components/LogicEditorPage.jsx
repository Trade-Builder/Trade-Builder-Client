import React, { useState, useEffect } from 'react';

// ----------------------------------------------------------------
// LogicEditorPage: 매수 / 매도 로직을 편집하는 컴포넌트
// ----------------------------------------------------------------
const LogicEditorPage = ({ selectedLogicId, onBack, onSave }) => {
  const [logic, setLogic] = useState(null);
  const [logicName, setLogicName] = useState('');

  useEffect(() => {
    if (selectedLogicId) {
      const savedLogics = JSON.parse(localStorage.getItem('userLogics') || '[]');
      const currentLogic = savedLogics.find(l => l.id === selectedLogicId);
      if (currentLogic) {
        setLogic(currentLogic);
        setLogicName(currentLogic.name);
        // 여기서 Rete.js나 React Flow 같은 라이브러리를 사용해
        // currentLogic.data를 캔버스에 로드해야 합니다.
        console.log("Loading logic data:", currentLogic.data);
      }
    } else {
        // 새 로직 생성
        setLogicName('');
    }
  }, [selectedLogicId]);

  const handleSave = () => {
    // 여기서 캔버스의 현재 상태를 Rete.js를 API를 사용해 JSON으로 변환
    const updatedLogicData = { /* ... Rete.js에서 생성된 JSON 데이터 ... */ };
    
    onSave({
        id: selectedLogicId || `logic-${Date.now()}`, // 새 로직이면 ID 생성
        name: logicName,
        data: updatedLogicData,
    });
    console.log('로직이 저장되었습니다!');
    onBack(); // 저장 후 목록 페이지로 돌아가기
  };

  return (
    <div className="w-full max-w-[1600px] h-[90vh] p-4 sm:p-6 lg:p-8 bg-white rounded-2xl shadow-lg  flex flex-col">
        {/* 상단 헤더: 로직 이름 수정 및 저장/뒤로가기 버튼 */}
        <div className="flex items-center justify-between pb-4 border-b">
            <input 
                type="text"
                value={logicName}
                onChange={(e) => setLogicName(e.target.value)}
                placeholder="로직 이름을 입력하세요"
                className="text-2xl font-bold text-gray-800 border-b-2 border-transparent focus:border-blue-500 focus:outline-none focus:outline-none placeholder:text-gray-400"
            />
            <div className="flex gap-2">
                <button onClick={onBack} className="px-4 py-2 text-base font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">
                    &larr; 뒤로가기
                </button>
                <button onClick={handleSave} className="px-4 py-2 text-base font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                    저장하기
                </button>
            </div>
        </div>

        {/* 메인 컨텐츠: 왼쪽 노드 목록 + 중앙 캔버스 2영역 + 오른쪽 정보 패널 */}
        <div className="flex flex-grow mt-4 gap-6">
            {/* 1. RETE 노드 (왼쪽 사이드바), 차후에 구현 예정 */}
            <div className="w-1/5 p-4 bg-gray-50 rounded-lg border flex flex-col gap-3">
                <h3 className="text-lg font-bold text-center mb-2">노드 목록</h3>
                {['매수', '매도', '조건 분기', '데이터 분석'].map(nodeType => (
                    <div key={nodeType} className="p-3 text-center bg-white border rounded-md shadow-sm cursor-grab">
                        {nodeType}
                    </div>
                ))}
            </div>

            {/* 2. 노드 설정 공간 (중앙 캔버스) */}
           <div className="w-3/5 bg-gray-100 rounded-lg border flex flex-col">
    
            {/* 상단 영역 (Rete.js 캔버스) */}
                <div className="flex-1 border-b flex items-center justify-center text-gray-500">
                     {/* 이 영역에 Rete.js 캔버스를 렌더링하며 Rete.js가 이 div를 채우도록 설정해야 함.
                     내부의 p 태그는 Rete.js가 로드되기 전의 플레이스홀더.
                    */}
                    <p className="text-lg">매수 로직 표시 영역</p>
                </div>

            {/* 하단 영역 (Rete.js 캔버스) */}
              <div className="flex-1 border-b flex items-center justify-center text-gray-500">
                    {/* 이 영역에 Rete.js 캔버스를 렌더링하며 Rete.js가 이 div를 채우도록 설정해야 함.
                     내부의 p 태그는 Rete.js가 로드되기 전의 플레이스홀더.
                    */}
                        <p className="text-lg">매도 로직 표시 영역</p>
                     </div>

            </div>

            {/* 3. 정보 및 실행 패널 (오른쪽 사이드바) */}
            <div className="w-1/5 p-4 bg-gray-50 rounded-lg border flex flex-col">
                <h3 className="text-lg font-bold mb-2">내부 정보</h3>
                <div className="flex-grow p-2 bg-white rounded border text-sm text-gray-600">
                    <p>1. 로직 상태: 편집 중</p>
                    <p>2. 노드 개수: 0</p>
                    <p>3. 연결 상태: 미연결</p>
                </div>
                <button className="w-full p-3 mt-4 text-lg font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700">
                    매수 로직 실행
                </button>
                 <button className="w-full p-3 mt-2 text-lg font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700">
                    매도 로직 실행
                </button>
            </div>
        </div>
    </div>
  );
};
export default LogicEditorPage;