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
    <div className="w-full max-w-6xl p-8 rounded-3xl shadow-2xl bg-neutral-950 text-gray-200 border border-neutral-800/70">
      {/* 헤더 카드 */}
      <div className="relative p-6 mb-6 rounded-2xl bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800/70 overflow-hidden">
        <div className="flex items-center justify-between">
          <h2 className="mb-2 text-2xl font-semibold text-gray-100 tracking-tight">트레이딩 대시보드</h2>
          {/* 탭 */}
          <div className="hidden sm:flex gap-2">
            {['Overview','Analytics','Monitoring'].map((t,i)=> (
              <button key={t} className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${i===0? 'bg-neutral-800/70 text-gray-100 border-neutral-700' : 'bg-neutral-900/60 text-gray-300 border-neutral-800 hover:border-cyan-500/40 hover:text-white'}`}>{t}</button>
            ))}
          </div>
        </div>
        <div className="mb-1 text-sm sm:text-base text-gray-400">
          실행중인 로직: <span className="font-medium text-cyan-400">{runningLogic ? runningLogic.name : '없음'}</span>
        </div>
        <div className="text-sm sm:text-base text-gray-400">
          현재 수익률: <span className="font-semibold text-cyan-400">{roi.toFixed(2)}%</span>
        </div>

        {/* 오버레이 미니 카드 */}
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6 backdrop-blur-md bg-neutral-900/80 border border-neutral-700/60 rounded-xl px-3 py-2 shadow-lg">
          <div className="text-[11px] uppercase tracking-wide text-gray-400">Status</div>
          <div className="flex items-end gap-2">
            <div className="text-lg font-semibold text-gray-100">Active</div>
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_12px_2px_rgba(34,211,238,0.6)]"></span>
          </div>
        </div>
      </div>

      {/* KPI 카드 4개 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[{
          title:'총 전략 수', value: String(logics.length||0)
        },{
          title:'실행 중', value: runningLogic? '1' : '0'
        },{
          title:'누적 ROI', value: `${roi.toFixed(2)}%`
        },{
          title:'오늘 P/L', value: `${(roi/100*1000).toFixed(0)}$`
        }].map((s,idx)=> (
          <div key={idx} className="p-5 rounded-2xl bg-neutral-900/70 border border-neutral-800/70 hover:border-cyan-500/40 transition">
            <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">{s.title}</div>
            <div className="text-3xl font-semibold text-gray-100">{s.value}</div>
            {/* 미니 바 차트 */}
            <div className="mt-3 h-10 flex items-end gap-1">
              {[4,8,3,6,9,5,7,6,8,10].map((h,i)=> (
                <div key={i} className="w-1.5 bg-neutral-700 rounded" style={{height:`${h*6}%`}} />
              ))}
            </div>
          </div>
        ))}
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
                          className={`flex items-center justify-between p-4 rounded-xl transition-all duration-200 ease-in-out cursor-pointer 
                          bg-neutral-900/70 border border-neutral-800/70 hover:border-cyan-500/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.35)] hover:-translate-y-0.5 
                          ${snapshot.isDragging ? 'ring-2 ring-cyan-400/30' : ''}`}
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
                                className="w-full px-3 py-2 text-sm rounded outline-none bg-neutral-800 text-gray-100 border border-neutral-700 focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400/50"
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
                              <span className="text-base font-medium text-gray-100">{index + 1}. {logic.name}</span>
                            )}
                          </div>
                          {/* 드래그 핸들: 드래그 시작 시 슬라이드 메뉴 닫기 */}
                          {logic.id !== editingId && (
                            <span
                              {...provided.dragHandleProps}
                              className="ml-4 mr-3 cursor-grab text-xl select-none text-gray-400 hover:text-gray-200"
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
                      className={`overflow-hidden transition-all duration-300 ${openedMenuId === logic.id ? 'max-h-16 opacity-100' : 'max-h-0 opacity-0'} 
                      bg-neutral-900/70 border-x border-b border-neutral-800/70 rounded-b-xl flex items-center`}
                      style={{ minWidth: '120px' }}
                    >
                      {openedMenuId === logic.id && (
                        <div className="flex flex-row justify-end w-full gap-2 px-4 py-2">
                        {/*  <button
                            className="px-3 py-1 bg-blue-50 hover:bg-blue-100 rounded text-sm"
                            onClick={() => {
                              setOpenedMenuId(null);
                              alert('로직 실행!');
                              runLogic(logic.id);
                            }}
                          >
                            실행하기 // 실행기능 임시로 뺌 
                          </button> */} 
                          <button
                            className="px-3 py-1 rounded text-sm bg-neutral-800 text-gray-200 border border-neutral-700 hover:border-cyan-500/40 hover:text-white"
                            onClick={() => {
                              setOpenedMenuId(null);
                              onLogicClick(logic.id);
                            }}
                          >
                            수정하기
                          </button>
                          <button
                            className="px-3 py-1 rounded text-sm text-red-400 bg-neutral-800 border border-neutral-700 hover:bg-red-500/10 hover:text-red-300"
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
                <p className="text-gray-400">저장된 로직이 없습니다.</p>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      <button
        className="flex items-center justify-center w-full p-4 mt-5 text-lg font-semibold text-white rounded-xl cursor-pointer transition-colors duration-200 
        bg-cyan-600 hover:bg-cyan-500 shadow-[0_10px_30px_-10px_rgba(34,211,238,0.5)]"
        onClick={startCreateNewLogic}
      >
        <span className="mr-2 text-xl">(+)</span> 새 로직 추가하기
      </button>
    </div>
  );
};

export default AssetPage;

