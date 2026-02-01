import { X } from 'lucide-react';
import { SYMBOLS } from '../constants/gameData';

interface EvolutionModalProps {
    onClose: () => void;
}

export default function EvolutionModal({ onClose }: EvolutionModalProps) {
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
                    {SYMBOLS.map((symbol, index) => (
                        <div key={symbol.id} className="flex items-center gap-4 p-3 rounded-2xl bg-white/60 shadow-sm border border-white/50">
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
                                <div className="text-xs text-[#6B7684] font-medium mt-0.5">
                                    점수 +{symbol.score}
                                </div>
                            </div>

                            {/* Arrow for next (except last) */}
                            {index < SYMBOLS.length - 1 && (
                                <div className="text-[#B0B8C1]">
                                    ↓
                                </div>
                            )}
                        </div>
                    )).reverse()} {/* Show highest tier first? Or lowest? Usually lists go top-down. 
                                     Let's show Highest (King) at top? Or Smallest -> Largest?
                                     Reference image shows a cycle. List view is better for clear hierarchy.
                                     Let's reverse to show "Goal" (Engvidia) at top! 
                                  */}
                </div>

                <div className="p-4 bg-white/40 border-t border-white/20 text-center">
                    <p className="text-xs text-[#8B95A1] font-medium">
                        같은 종목 두 개를 합쳐<br />
                        <span className="text-[#3182F6] font-bold">대장주 엔비디아</span>를 만들어보세요!
                    </p>
                </div>
            </div>
        </div>
    );
}
