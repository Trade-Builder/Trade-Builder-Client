import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// ---------------------------------------------------------------
// AssetPage: 기존의 로직 목록 페이지
// ----------------------------------------------------------------
const AssetPage = ({ logics, onLogicClick, onAddNewLogic, onDeleteLogic, onReorderLogics }) => {
  const [runningLogic, setRunningLogic] = useState(null);
  const [roi, setRoi] = useState(0);
  const [openedMenuId, setOpenedMenuId] = useState(null);

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

  // 드래그 앤 드롭 순서 변경 핸들러
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(logics);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    if (onReorderLogics) {
      onReorderLogics(items);
      localStorage.setItem('userLogics', JSON.stringify(items));
    }
  };

  // 메뉴 외 영역 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = () => setOpenedMenuId(null);
    if (openedMenuId) {
      window.addEventListener('click', handleClickOutside);
      return () => window.removeEventListener('click', handleClickOutside);
    }
  }, [openedMenuId]);

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

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="logic-list">
          {(provided) => (
            <div className='flex flex-col gap-3' ref={provided.innerRef} {...provided.droppableProps}>
              {logics.length > 0 ? (
                logics.map((logic, index) => (
                  <Draggable key={logic.id} draggableId={logic.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-md hover:border-blue-500 ${snapshot.isDragging ? 'bg-blue-50' : ''}`}
                      >
                        {/* 로직 이름 영역 */}
                        <div
                          className="flex-grow cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenedMenuId(logic.id === openedMenuId ? null : logic.id);
                          }}
                          role="button"
                          tabIndex="0"
                        >
                          <span className="text-base font-medium">{index + 1}. {logic.name}</span>
                        </div>
                        {/* 메뉴 영역 */}
                        {openedMenuId === logic.id && (
                          <div
                            className="absolute z-10 right-20 bg-white border rounded-lg shadow-lg flex flex-col"
                            style={{ minWidth: '120px' }}
                            onClick={e => e.stopPropagation()}
                          >
                            <button
                              className="px-4 py-2 border-b hover:bg-blue-50 text-left"
                              onClick={() => {
                                setOpenedMenuId(null);
                                alert('실행 기능은 추후 구현!');
                              }}
                            >
                              실행하기
                            </button>
                            <button
                              className="px-4 py-2 border-b hover:bg-blue-50 text-left"
                              onClick={() => {
                                setOpenedMenuId(null);
                                onLogicClick(logic.id);
                              }}
                            >
                              수정하기
                            </button>
                            <button
                              className="px-4 py-2 hover:bg-red-50 text-left text-red-600"
                              onClick={() => {
                                setOpenedMenuId(null);
                                onDeleteLogic(logic.id);
                              }}
                            >
                              삭제하기
                            </button>
                          </div>
                        )}
                        {/* 드래그 핸들 */}
                        <span
                          {...provided.dragHandleProps}
                          className="ml-4 mr-3 cursor-grab text-xl"
                          aria-label="드래그 핸들"
                          onClick={e => e.stopPropagation()}
                        >
                          ☰
                        </span>
                      </div>
                    )}
                  </Draggable>
                ))
              ) : (
                <p>저장된 로직이 없습니다.</p>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      <button className="flex items-center justify-center w-full p-4 mt-5 text-lg font-semibold text-white bg-blue-600 rounded-lg cursor-pointer transition-colors duration-200 hover:bg-blue-700" onClick={onAddNewLogic}>
        <span className="mr-2 text-xl">(+)</span> 새 로직 추가하기
      </button>
    </div>
  );
};

export default AssetPage;

