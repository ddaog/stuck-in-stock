import React from 'react';
import type { GameSymbol } from '../constants/gameData';

interface EtfSelectionModalProps {
    options: GameSymbol[];
    onSelect: (etf: GameSymbol) => void;
    onClose: () => void; // In case they want to cancel? (Usually paid, so no cancel, but maybe close?)
}

const EtfSelectionModal: React.FC<EtfSelectionModalProps> = ({ options, onSelect }) => {
    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-[440px] px-4">
                <h2 className="text-white text-2xl font-black text-center mb-6 drop-shadow-lg tracking-wider">
                    ETF 포트폴리오 선택
                </h2>

                <div className="grid grid-cols-1 gap-3">
                    {options.map((etf) => (
                        <button
                            key={etf.id}
                            onClick={() => onSelect(etf)}
                            className="relative group bg-white/90 rounded-2xl p-4 flex items-center gap-4 transition-all hover:scale-105 hover:bg-white shadow-xl overflow-hidden text-left"
                        >
                            {/* Tier Indication */}
                            <div className={`absolute left-0 top-0 bottom-0 w-2 
                                ${etf.tier === 'Legendary' ? 'bg-gradient-to-b from-pink-500 to-rose-500' :
                                    etf.tier === 'Epic' ? 'bg-purple-600' :
                                        etf.tier === 'Rare' ? 'bg-blue-500' :
                                            etf.tier === 'Mythic' ? 'bg-yellow-400' : 'bg-gray-400'}
                            `} />

                            <div className="w-16 h-16 shrink-0 bg-gray-100 rounded-full flex items-center justify-center text-3xl shadow-inner">
                                {etf.texture ? <img src={etf.texture} className="w-10 h-10 object-contain" /> : etf.label}
                            </div>

                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                    <h3 className="font-bold text-gray-900 leading-none">{etf.name}</h3>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase text-white
                                         ${etf.tier === 'Legendary' ? 'bg-rose-500' :
                                            etf.tier === 'Epic' ? 'bg-purple-600' :
                                                etf.tier === 'Rare' ? 'bg-blue-500' :
                                                    etf.tier === 'Mythic' ? 'bg-yellow-500' : 'bg-gray-500'}
                                    `}>
                                        {etf.tier}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600 font-medium leading-tight word-keep pr-2">
                                    {etf.description}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default EtfSelectionModal;
