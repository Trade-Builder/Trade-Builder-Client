import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// ---------------------------------------------------------------
// AssetPage: 기존의 로직 목록 페이지
// ----------------------------------------------------------------
const AssetPage = ({ logics, onLogicClick, onAddNewLogic, onDeleteLogic, onReorderLogics }) => {
  const [runningLogic, setRunningLogic] = useState(null);
  const [roi, setRoi] = useState(0);
  const [openedMenuId, setOpenedMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState('');

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

  // 새 로직 인라인 생성 시작
  const startCreateNewLogic = () => {
    // 이미 편집 중이면 무시
    if (editingId) return;
    const tempId = `temp-${Date.now()}`;
    const items = [...logics, { id: tempId, name: '', data: {}, _temp: true }];
    onReorderLogics && onReorderLogics(items);
    setOpenedMenuId(null);
    setEditingId(tempId);
    setEditingValue('');
  };

  // 생성 확정 (Enter 또는 blur 시)
  const commitCreateNewLogic = () => {
    if (!editingId) return;
    const name = editingValue.trim();
    if (!name) {
      cancelCreateNewLogic();
      return;
    }
    const newId = `logic-${Date.now()}`;
    const updated = logics.map((l) => (l.id === editingId ? { id: newId, name, data: {} } : l));
    onReorderLogics && onReorderLogics(updated);
    localStorage.setItem('userLogics', JSON.stringify(updated));
    setEditingId(null);
    setEditingValue('');
  };

  // 생성 취소 (Esc 또는 빈 값)
  const cancelCreateNewLogic = () => {
    if (!editingId) return;
    const updated = logics.filter((l) => l.id !== editingId);
    onReorderLogics && onReorderLogics(updated);
    localStorage.setItem('userLogics', JSON.stringify(updated));
    setEditingId(null);
    setEditingValue('');
  };

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
                  <React.Fragment key={logic.id}>
                    <Draggable draggableId={logic.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-md hover:border-blue-500 ${snapshot.isDragging ? 'bg-blue-50' : ''} cursor-pointer`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (logic.id === editingId) return; // 편집 중에는 토글하지 않음
                            setOpenedMenuId(logic.id === openedMenuId ? null : logic.id);
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          {/* 로직 이름 영역 (행 전체가 클릭 가능하므로 별도 onClick 불필요) */}
                          <div className="flex-grow">
                            {logic.id === editingId ? (
                              <input
                                className="w-full px-3 py-2 text-sm border rounded outline-none focus:ring-2 focus:ring-blue-400"
                                placeholder="새 로직 이름을 입력하고 Enter를 누르세요"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitCreateNewLogic();
                                  if (e.key === 'Escape') cancelCreateNewLogic();
                                }}
                                onBlur={commitCreateNewLogic}
                                autoFocus
                              />
                            ) : (
                              <span className="text-base font-medium">{index + 1}. {logic.name}</span>
                            )}
                          </div>
                          {/* 드래그 핸들: 드래그 시작 시 슬라이드 메뉴 닫기 */}
                          {logic.id !== editingId && (
                            <span
                              {...provided.dragHandleProps}
                              className="ml-4 mr-3 cursor-grab text-xl select-none"
                              aria-label="드래그 핸들"
                              onMouseDown={(e) => {
                                setOpenedMenuId(null);
                                if (provided.dragHandleProps && typeof provided.dragHandleProps.onMouseDown === 'function') {
                                  provided.dragHandleProps.onMouseDown(e);
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              ☰
                            </span>
                          )}
                        </div>
                      )}
                    </Draggable>
                    {/* 슬라이드 메뉴 영역 */}
                    <div
                      className={`overflow-hidden transition-all duration-300 ${openedMenuId === logic.id ? 'max-h-16 opacity-100' : 'max-h-0 opacity-0'} bg-white border-x border-b rounded-b-lg flex items-center`}
                      style={{ minWidth: '120px' }}
                    >
                      {openedMenuId === logic.id && (
                        <div className="flex flex-row justify-end w-full gap-2 px-4 py-2">
                          <button
                            className="px-3 py-1 bg-blue-50 hover:bg-blue-100 rounded text-sm"
                            onClick={() => {
                              setOpenedMenuId(null);
                              alert('실행 기능은 추후 구현!');
                            }}
                          >
                            실행하기
                          </button>
                          <button
                            className="px-3 py-1 bg-blue-50 hover:bg-blue-100 rounded text-sm"
                            onClick={() => {
                              setOpenedMenuId(null);
                              onLogicClick(logic.id);
                            }}
                          >
                            수정하기
                          </button>
                          <button
                            className="px-3 py-1 bg-red-50 hover:bg-red-100 rounded text-sm text-red-600"
                            onClick={() => {
                              setOpenedMenuId(null);
                              const confirmed = window.confirm(`정말로 "${logic.name}" 로직을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`);
                              if (confirmed) {
                                onDeleteLogic(logic.id);
                              }
                            }}
                          >
                            삭제하기
                          </button>
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                ))
              ) : (
                <p>저장된 로직이 없습니다.</p>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      <button
        className="flex items-center justify-center w-full p-4 mt-5 text-lg font-semibold text-white bg-blue-600 rounded-lg cursor-pointer transition-colors duration-200 hover:bg-blue-700"
        onClick={startCreateNewLogic}
      >
        <span className="mr-2 text-xl">(+)</span> 새 로직 추가하기
      </button>
    </div>
  );
};

export default AssetPage;

