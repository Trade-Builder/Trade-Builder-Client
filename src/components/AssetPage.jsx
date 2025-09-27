import React, { useState, useEffect } from 'react';


// ---------------------------------------------------------------
// AssetPage: 기존의 로직 목록 페이지
// ----------------------------------------------------------------
const AssetPage = ({ logics, onLogicClick, onAddNewLogic, onDeleteLogic }) => {
  const [runningLogic, setRunningLogic] = useState(null);
  const [roi, setRoi] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem('runningLogic')) {
        const mockRunningLogic = { id: 'logic-1', name: 'Upbit 단타 거래 로직' };
        localStorage.setItem('runningLogic', JSON.stringify(mockRunningLogic));
    }
    const savedRunningLogic = localStorage.getItem('runningLogic');
    if (savedRunningLogic) {
        setRunningLogic(JSON.parse(savedRunningLogic));
    }
    setRoi(7.25);
  }, []);

  return (
      <div className="w-full max-w-2xl p-8 bg-white rounded-2xl shadow-lg">
        <div className='p-6 mb-6 bg-gray-50 border border-gray-200 rounded-xl'>
          <h2 className="mb-4 text-2xl font-bold text-center text-gray-800">자산 정보</h2>
          <div className="mb-2 text-base text-gray-600">
            실행중인 로직: <span className="font-semibold text-blue-600">{runningLogic ? runningLogic.name : '없음'}</span>
          </div>
          <div className="text-base text-gray-600">
            현재 수익률: <span className="font-semibold text-blue-600">{roi.toFixed(2)}%</span>
          </div>
        </div>


        <div className='flex flex-col gap-3'>
          {logics.length > 0 ? (
            logics.map((logic, index) => (
              <div
                key={logic.id}
                className='flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-md hover:border-blue-500'
              >
                <div 
                  className="flex-grow cursor-pointer" 
                  onClick={() => onLogicClick(logic.id)}
                  role="button"
                  tabIndex="0"
                  >
                     <span className="text-base font-medium">{index + 1}. {logic.name}</span>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation(); // 편집 페이지로 넘어가는 것을 방지하는 propagation
                    onDeleteLogic(logic.id);
                  }}
                  className="ml-4 p-1 leading-none text-xl text-gray-400 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors"
                  aria-label={`${logic.name} 로직 삭제`}
                >
                  &times;
                </button>
              </div>
            ))
          ) : (
            <p>저장된 로직이 없습니다.</p>
          )}
        </div>
        <button className="flex items-center justify-center w-full p-4 mt-5 text-lg font-semibold text-white bg-blue-600 rounded-lg cursor-pointer transition-colors duration-200 hover:bg-blue-700" onClick={onAddNewLogic}>
           <span className="mr-2 text-xl">(+)</span> 새 로직 추가하기
        </button>
      </div>
  );
};

export default AssetPage;

