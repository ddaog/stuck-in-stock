import { X } from 'lucide-react';
import { SYMBOLS } from '../constants/gameData';

interface EvolutionModalProps {
    onClose: () => void;
    stockMultipliers?: Map<number, number>;
}

export default function EvolutionModal({ onClose, stockMultipliers }: EvolutionModalProps) {
    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 anim-pop">
            <div className="glass-panel w-full max-w-sm rounded-[32px] overflow-hidden flex flex-col max-h-[85vh]">

                {/* Header */}
                <div className="p-5 border-b border-white/20 flex justify-between items-center bg-white/40">
                    <h2 className="text-xl font-bold text-[#191F28] tracking-tight">주식 계급도 (Tier)</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-black/5 active:scale-95 transition-transform"
                    >
                        <X size={24} className="text-[#333D4B]" />
                    </button>
                </div>

                {/* Content - Scrollable List */}
                <div className="overflow-y-auto p-5 space-y-3 custom-scrollbar">
                    {SYMBOLS.map((symbol, index) => {
                        const multiplier = stockMultipliers?.get(symbol.id) || 1.0;
                        const isHigh = multiplier > 1.2;
                        const isLow = multiplier < 0.8;

                        return (
                            <div key={symbol.id} className={`flex items-center gap-4 p-3 rounded-2xl shadow-sm border
                             ${isHigh ? 'bg-green-50 border-green-200' : isLow ? 'bg-red-50 border-red-200' : 'bg-white/60 border-white/50'}
                             transition-colors duration-300`}>
                                {/* Circle Preview */}
                                <div
                                    className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center shadow-lg border border-white/20"
                                    style={{ backgroundColor: symbol.texture ? 'transparent' : symbol.color }}
                                >
                                    {symbol.texture ? (
                                        <img src={symbol.texture} alt={symbol.name} className="w-full h-full object-contain drop-shadow-md" />
                                    ) : (
                                        <span className="text-xl">{symbol.label}</span>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-[#8B95A1] bg-[#F2F4F6] px-2 py-0.5 rounded-full">
                                            Lv.{index + 1}
                                        </span>
                                        <h3 className="text-lg font-bold text-[#333D4B]">{symbol.name}</h3>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <div className="text-xs text-[#6B7684] font-medium">
                                            점수 +{symbol.score}
                                        </div>

                                        {/* Multiplier Badge */}
                                        {Math.abs(multiplier - 1.0) > 0.01 && (
                                            <div className={`text-xs font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1
                                            ${isHigh ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
                                        `}>
                                                <span>
                                                    {isHigh ? '▲' : '▼'} x{multiplier.toFixed(2)}
                                                </span>
                                                {multiplier > 1.5 && <span className="text-[10px] ml-1">💎</span>}
                                                {multiplier < 0.5 && <span className="text-[10px] ml-1">⚠️</span>}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Arrow for next (except last) */}
                                {index < SYMBOLS.length - 1 && (
                                    <div className="text-[#B0B8C1]">
                                        ↓
                                    </div>
                                )}
                            </div>
                        )
                    }).reverse()}
                </div>

                <div className="p-4 bg-white/40 border-t border-white/20 text-center">
                    <p className="text-xs text-[#8B95A1] font-medium">
                        같은 주식을 합칠 때마다<br />
                        <span className="text-[#3182F6] font-bold">가격(배율)이 상승</span>합니다!
                    </p>
                </div>
            </div>
        </div>
    );
}
