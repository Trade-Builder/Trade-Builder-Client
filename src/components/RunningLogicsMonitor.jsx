// RunningLogicsMonitor.jsx - 실행 중인 모든 로직을 모니터링하고 제어하는 컴포넌트
import React, { useState, useEffect } from 'react';
import { getAllRunningLogics, stopLogic } from '../logic_interpreter/logic_runner';

const RunningLogicsMonitor = ({ onClose }) => {
    const [runningLogics, setRunningLogics] = useState([]);

    useEffect(() => {
        // 초기 로드
        updateRunningLogics();

        // 1초마다 업데이트
        const interval = setInterval(() => {
            updateRunningLogics();
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const updateRunningLogics = () => {
        const logics = getAllRunningLogics();
        setRunningLogics(logics);
    };

    const handleStop = (logicId) => {
        const success = stopLogic(logicId);
        if (success) {
            updateRunningLogics();
        }
    };

    const formatDuration = (startTime) => {
        const seconds = Math.floor((Date.now() - startTime) / 1000);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}시간 ${minutes}분 ${secs}초`;
        } else if (minutes > 0) {
            return `${minutes}분 ${secs}초`;
        } else {
            return `${secs}초`;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-3xl max-h-[80vh] overflow-auto">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-semibold text-gray-200">
                        실행 중인 로직 ({runningLogics.length}개)
                    </h2>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-300 hover:text-white"
                    >
                        ✕ 닫기
                    </button>
                </div>

                {runningLogics.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        실행 중인 로직이 없습니다.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {runningLogics.map((logic) => (
                            <div
                                key={logic.logicId}
                                className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-4"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                            <h3 className="text-lg font-semibold text-gray-200">
                                                {logic.logicId}
                                            </h3>
                                        </div>
                                        <div className="space-y-1 text-sm text-gray-400">
                                            <div>
                                                <span className="font-medium text-gray-300">종목:</span> {logic.stock}
                                            </div>
                                            <div>
                                                <span className="font-medium text-gray-300">실행 간격:</span> {(logic.interval / 1000).toFixed(0)}초
                                            </div>
                                            <div>
                                                <span className="font-medium text-gray-300">실행 시간:</span> {formatDuration(logic.startTime)}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleStop(logic.logicId)}
                                        className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg"
                                    >
                                        정지
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RunningLogicsMonitor;
