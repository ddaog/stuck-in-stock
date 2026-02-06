
import { SYMBOLS } from '../constants/gameData';

type PriceEvent = { text: string; color: string };

interface PriceTickerProps {
    stockMultipliers: Map<number, number>;
    event?: PriceEvent | null;
}

export default function PriceTicker({ stockMultipliers, event }: PriceTickerProps) {
    // Duplicate symbols to create seamless infinite scroll loop
    const tickerItems = [...SYMBOLS, ...SYMBOLS];

    return (
        <div className="fixed top-0 left-0 w-full h-10 bg-black/80 backdrop-blur-md z-40 overflow-hidden flex items-center border-b border-white/10 relative">
            {/* Event banner overlay (shown on top of ticker) */}
            {event && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div
                        className="max-w-[92vw] px-4 py-1 rounded-full text-sm font-black shadow-2xl border bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
                        style={{ borderColor: event.color, color: event.color }}
                    >
                        {event.text}
                    </div>
                </div>
            )}
            <div className="flex animate-marquee whitespace-nowrap">
                {tickerItems.map((symbol, index) => {
                    const multiplier = stockMultipliers.get(symbol.id) || 1.0;
                    const price = Math.round(symbol.score * multiplier);
                    const isUp = multiplier > 1.0;
                    const isDown = multiplier < 1.0;

                    return (
                        <div key={`${symbol.id}-${index}`} className="flex items-center mx-4 gap-2">
                            {/* Icon */}
                            <div className="w-5 h-5 rounded-full flex items-center justify-center bg-white/10 overflow-hidden">
                                {symbol.texture ? (
                                    <img src={symbol.texture} alt={symbol.name} className="w-full h-full object-contain" />
                                ) : (
                                    <span className="text-xs">{symbol.label}</span>
                                )}
                            </div>

                            {/* Symbol Name & Price */}
                            <div className="flex items-center gap-1.5 font-mono text-sm">
                                <span className="text-gray-400 font-bold">{symbol.name}</span>
                                <span className={`font-black ${isUp ? 'text-[#10B981]' : isDown ? 'text-[#EF4444]' : 'text-white'}`}>
                                    ${price}
                                </span>
                                <span className={`text-xs ${isUp ? 'text-[#10B981]' : isDown ? 'text-[#EF4444]' : 'text-gray-500'}`}>
                                    ({multiplier.toFixed(2)}x)
                                </span>
                                {isUp && <span className="text-[10px] text-[#10B981]">▲</span>}
                                {isDown && <span className="text-[10px] text-[#EF4444]">▼</span>}
                            </div>

                            {/* Separator */}
                            <div className="w-[1px] h-3 bg-white/20 ml-4" />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
