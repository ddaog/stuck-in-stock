import React from 'react';
import { Tv, Siren, RefreshCw } from 'lucide-react';

interface AdModalProps {
    onConfirm: () => void;
    onCancel: () => void;
    type: 'SWAP' | 'DANGER' | 'REVIVE'; // DANGER/REVIVE can be same
}

const AdModal: React.FC<AdModalProps> = ({ onConfirm, onCancel, type }) => {
    const isDanger = type === 'DANGER';

    return (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className={`bg-white w-full max-w-xs rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center relative overflow-hidden anim-pop border-4 ${isDanger ? 'border-red-500' : 'border-transparent'}`}>

                {/* Decorative Background */}
                <div className={`absolute top-0 left-0 w-full h-24 bg-gradient-to-b ${isDanger ? 'from-red-100' : 'from-blue-50'} to-transparent z-0`} />

                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 z-10 shadow-inner ${isDanger ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                    {isDanger ? <Siren size={32} strokeWidth={2.5} className="animate-pulse" /> : <Tv size={32} strokeWidth={2.5} />}
                </div>

                <h3 className="text-xl font-black text-gray-900 z-10 mb-2">
                    {isDanger ? '긴급 구조 요청' : '다음 아이템 변경'}
                </h3>

                <p className="text-gray-500 text-sm mb-6 z-10 leading-relaxed font-medium">
                    {isDanger ? (
                        <>
                            <span className="text-red-600 font-bold">DANGER ZONE!</span><br />
                            광고를 보고 <span className="text-gray-900 font-bold">룰렛</span>을 돌려<br />
                            위기를 탈출하시겠습니까?
                        </>
                    ) : (
                        <>
                            짧은 광고를 시청하고<br />
                            <span className="text-blue-600 font-bold">NEXT 아이템</span>을 무료로<br />
                            변경하시겠습니까?
                        </>
                    )}
                </p>

                <div className="flex flex-col gap-3 w-full z-10">
                    <button
                        onClick={onConfirm}
                        className={`w-full py-4 text-white rounded-2xl font-bold text-lg active:scale-95 transition-transform shadow-lg flex items-center justify-center gap-2
                            ${isDanger ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}
                        `}
                    >
                        {isDanger ? <RefreshCw size={20} /> : <Tv size={20} />}
                        {isDanger ? '광고 보고 구조받기' : '광고 보고 변경하기'}
                    </button>

                    <button
                        onClick={onCancel}
                        className="w-full py-3 text-gray-400 font-medium text-sm active:text-gray-600 transition-colors"
                    >
                        {isDanger ? '포기하고 파산하기...' : '아니요, 괜찮습니다'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdModal;
