import { useRef, useState, useEffect } from 'react';
import Game from './game/Game';
import { GAME_STATES, SYMBOLS, ETFS } from './constants/gameData';
import type { GameSymbol } from './constants/gameData';
import { X, Tv, History } from 'lucide-react';
import EvolutionModal from './components/EvolutionModal';
import AdModal from './components/AdModal';
import EtfSelectionModal from './components/EtfSelectionModal';
import PriceTicker from './components/PriceTicker';

interface Particle {
  id: number;
  x: number;
  y: number;
  velocity: { x: number; y: number };
  symbol: string;
  life: number;
  color: string;
}

function App() {
  const [seedMoney, setSeedMoney] = useState(0);

  // Ad Limits
  const [adSwapCount, setAdSwapCount] = useState(0);
  const MAX_SWAP_ADS = 3;
  const [adDangerCount, setAdDangerCount] = useState(0);
  const MAX_DANGER_ADS = 1;

  const [particles, setParticles] = useState<Particle[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const requestRef = useRef<number>(undefined);

  const [bestScore, setBestScore] = useState(() => {
    return parseInt(localStorage.getItem('nirvana_best_score') || '0');
  });

  const [gameState, setGameState] = useState<string>(GAME_STATES.PLAYING);
  const [nextSymbol, setNextSymbol] = useState<GameSymbol>(SYMBOLS[0]);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showEvolutionModal, setShowEvolutionModal] = useState(false);

  // Modals & ETF
  const [isGameOver, setIsGameOver] = useState(false);

  // ETF Choice
  const [showEtfSelection, setShowEtfSelection] = useState(false);
  const [etfOptions, setEtfOptions] = useState<GameSymbol[]>([]);

  // Danger Zone
  const [dangerLevel, setDangerLevel] = useState(0);

  // Ad Modal State
  const [showAdModal, setShowAdModal] = useState(false);
  const [adModalType, setAdModalType] = useState<'SWAP' | 'DANGER'>('SWAP');

  const handleScoreUpdate = (points: number) => {
    setSeedMoney(prev => {
      const newScore = prev + points;
      if (newScore > bestScore) {
        setBestScore(newScore);
        localStorage.setItem('nirvana_best_score', newScore.toString());
      }
      return newScore;
    });
  };

  const handleEtfSelect = (etf: GameSymbol) => {
    setShowEtfSelection(false);
    window.dispatchEvent(new CustomEvent('trigger-etf-effect', { detail: { etf } }));

    // Particle Effect for Feedback
    window.dispatchEvent(new CustomEvent('merge-effect', {
      detail: { x: window.innerWidth / 2, y: window.innerHeight / 2, color: etf.color }
    }));
  };

  const handleAdSwapTrigger = () => {
    if (adSwapCount >= MAX_SWAP_ADS) {
      alert('이번 게임의 NEXT 변경 횟수를 모두 소진했습니다.');
      return;
    }
    setAdModalType('SWAP');
    setShowAdModal(true);
  };

  const handleConfirmAd = () => {
    setShowAdModal(false);

    if (adModalType === 'SWAP') {
      setAdSwapCount(prev => prev + 1);
      window.dispatchEvent(new Event('trigger-next-swap'));
    } else if (adModalType === 'DANGER') {
      setAdDangerCount(prev => prev + 1);
      setIsGameOver(false);
      // Danger Rescue: Trigger Short Squeeze effect (remove small bodies)
      // We must manually construct the "Short Bomb" or similar reset effect
      // Or reuse 'roulette-outcome' if Game handles it.
      // Game.tsx still listens to 'roulette-outcome' ? NO, I rewrote Game.tsx and didn't include it.
      // I replaced it with 'trigger-etf-effect'.
      // I should trigger a 'GLOBAL' ETF that clears space. E.g. 'BUYBACK' or 'SHORT'.
      // Let's trigger 'BUYBACK' effect.
      const rescueEtf = ETFS.find(e => e.effectId === 'BUYBACK') || ETFS[0];
      window.dispatchEvent(new CustomEvent('trigger-etf-effect', { detail: { etf: rescueEtf } }));

      // Dispatch Resume event (Reset Game.tsx flags)
      window.dispatchEvent(new Event('resume-game'));

      setGameState(GAME_STATES.PLAYING);
    }
  };

  const handleNextItemUpdate = (symbol: GameSymbol) => {
    setNextSymbol(symbol);
  };

  const handleRestart = () => {
    setIsGameOver(false);
    setSeedMoney(0);
    setAdSwapCount(0);
    setAdDangerCount(0);
    setDangerLevel(0);
    window.dispatchEvent(new Event('restart-game'));
    setGameState(GAME_STATES.PLAYING);
  };

  const handleExit = () => {
    console.log('App closing...');
    window.close();
    alert("앱을 종료합니다.");
  };

  // Game Over Handler
  useEffect(() => {
    const handler = () => {
      if (adDangerCount < MAX_DANGER_ADS) {
        setAdModalType('DANGER');
        setShowAdModal(true);
      } else {
        setIsGameOver(true);
      }
    };
    window.addEventListener('game-over', handler);
    return () => window.removeEventListener('game-over', handler);
  }, [adDangerCount]);

  const [dangerTimer, setDangerTimer] = useState(0);

  // Price Event Message (also used for ETF effect notices in ticker)
  const [priceEvent, setPriceEvent] = useState<{ text: string, color: string } | null>(null);

  // Drop Counter
  const [dropCount, setDropCount] = useState(0);

  // Danger Level Listener
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setDangerLevel(detail.level);
      setDangerTimer(detail.timer || 0);
    };
    window.addEventListener('danger-level', handler);
    return () => window.removeEventListener('danger-level', handler);
  }, []);

  // Global Effect → show in ticker only (no full-screen overlay)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const type = detail.type;
      if (type === 'NONE') return;
      const messages: Record<string, { text: string; color: string }> = {
        BULL: { text: '🚀 불장 · SCORE x2', color: '#EF4444' },
        BEAR: { text: '📉 물장 · PANIC SELL', color: '#3B82F6' },
        SUPER_CYCLE: { text: '💾 반도체 슈퍼사이클', color: '#10B981' },
        BUBBLE: { text: '🫧 테마주 열풍', color: '#EC4899' },
      };
      const msg = messages[type];
      if (msg) {
        setPriceEvent(msg);
        setTimeout(() => setPriceEvent(null), 3000);
      }
    };
    window.addEventListener('global-effect-active', handler);
    return () => window.removeEventListener('global-effect-active', handler);
  }, []);

  // Price Event Listener
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setPriceEvent({ text: detail.text, color: detail.color });
      setTimeout(() => setPriceEvent(null), 3000); // Clear after 3s
    };
    window.addEventListener('price-event', handler);
    return () => window.removeEventListener('price-event', handler);
  }, []);

  // Drop Count Listener
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setDropCount(detail.count);
    };
    window.addEventListener('drop-count', handler);
    return () => window.removeEventListener('drop-count', handler);
  }, []);

  // Stock Multipliers Listener
  const [stockMultipliers, setStockMultipliers] = useState<Map<number, number>>(new Map());
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setStockMultipliers(detail.multipliers);
    };
    window.addEventListener('stock-multiplier-update', handler);
    return () => window.removeEventListener('stock-multiplier-update', handler);
  }, []);

  // 10-drop ETF event: open ETF selection modal with 3 random options (no cost)
  useEffect(() => {
    const handler = () => {
      const pool = [...ETFS];
      const choices: GameSymbol[] = [];
      while (choices.length < 3 && pool.length > 0) {
        const idx = Math.floor(Math.random() * pool.length);
        const picked = pool[idx];
        choices.push(picked);
        pool.splice(idx, 1);
      }
      setEtfOptions(choices);
      setShowEtfSelection(true);
    };
    window.addEventListener('open-etf-selection', handler);
    return () => window.removeEventListener('open-etf-selection', handler);
  }, []);




  // Particle Logic
  useEffect(() => {
    const updateParticles = () => {
      if (particlesRef.current.length > 0) {
        particlesRef.current = particlesRef.current
          .map(p => ({
            ...p,
            x: p.x + p.velocity.x,
            y: p.y + p.velocity.y,
            life: p.life - 0.02, // Slower fade for text
            velocity: { x: p.velocity.x, y: p.velocity.y * 0.95 } // Friction/Decay for movement
          }))
          .filter(p => p.life > 0);
        setParticles([...particlesRef.current]);
      }
      requestRef.current = requestAnimationFrame(updateParticles);
    };
    requestRef.current = requestAnimationFrame(updateParticles);
    return () => cancelAnimationFrame(requestRef.current!);
  }, []);

  // Listen for merge and roulette triggers/outcomes
  useEffect(() => {
    const mergeHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const score = detail.score || 0;

      // If it's a scoring event (Merge), show Floating Text
      if (score > 0) {
        const newParticle: Particle = {
          id: Math.random(),
          x: detail.x,
          y: detail.y,  // Start at event location
          color: '#10B981', // Emerald Green for money
          symbol: `+$${score.toLocaleString()}`, // Text content
          life: 1.5,      // Longer life for text
          velocity: {
            x: 0,
            y: -2 // Float UP
          }
        };
        particlesRef.current = [...particlesRef.current, newParticle];
      } else {
        // Non-scoring explosion (e.g. Remove), just a small puff or nothing?
        // User asked to replace effect with "How many dollars".
        // If there is no dollars, maybe just a small visual POP?
        // Let's keep a minimal effect for non-scoring actions to provide feedback
        const newParticles: Particle[] = [];
        for (let i = 0; i < 5; i++) {
          newParticles.push({
            id: Math.random(),
            x: detail.x,
            y: detail.y,
            color: detail.color,
            symbol: '💥',
            life: 0.5,
            velocity: { x: (Math.random() - 0.5) * 10, y: (Math.random() - 0.5) * 10 }
          });
        }
        particlesRef.current = [...particlesRef.current, ...newParticles];
      }
    };

    window.addEventListener('merge-effect', mergeHandler);

    return () => {
      window.removeEventListener('merge-effect', mergeHandler);
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-[#FAFAFA] overflow-hidden select-none">

      {/* Price Ticker Bar (Top Fixed) */}
      <PriceTicker stockMultipliers={stockMultipliers} eventMessage={priceEvent} />

      {/* Event/ETF notification (bottom) */}
      {priceEvent && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div
            className="max-w-[92vw] px-5 py-2 rounded-full text-sm font-black shadow-2xl border-2 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
            style={{ borderColor: priceEvent.color, color: priceEvent.color }}
          >
            {priceEvent.text}
          </div>
        </div>
      )}

      {/* UI Layer */}
      <div className="absolute inset-0 z-30 pointer-events-none mt-10"> {/* Add margin-top for ticker */}

        {/* Top Left: Seed Money & Best Score */}
        <div className="absolute top-4 left-4 pointer-events-auto transition-transform hover:scale-105 active:scale-95">
          <div className="glass-panel rounded-[24px] p-5 pr-8 shadow-sm bg-white/60 backdrop-blur-md border border-white/50">
            <h1 className="text-[10px] font-bold text-gray-400 tracking-widest mb-1 uppercase">Seed Money</h1>
            <div className={`text-4xl font-black tracking-tight flex items-baseline gap-1
                ${seedMoney < 0 ? 'text-red-500' : 'text-[#191F28]'}
            `}>
              <span className="text-2xl opacity-60">$</span>
              {seedMoney.toLocaleString()}
            </div>
            <div className="text-[10px] font-medium text-gray-400 mt-1">
              BEST ${bestScore.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Top Right: Buttons (Reset, Evolution) */}
        <div className="absolute top-4 right-4 flex gap-2 pointer-events-auto">
          <button
            onClick={() => setShowEvolutionModal(true)}
            className="w-10 h-10 rounded-full glass-panel flex items-center justify-center text-gray-400 hover:text-gray-900 active:scale-90 transition-all shadow-sm bg-white/60"
          >
            <div className="text-xl">🏆</div>
          </button>
          <button
            onClick={() => setShowExitModal(true)}
            className="w-10 h-10 rounded-full glass-panel flex items-center justify-center text-gray-400 hover:text-red-500 active:scale-90 transition-all shadow-sm bg-white/60"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Right Side Control Panel (Compact Group) */}
        <div className="absolute right-4 top-1/3 transform -translate-y-1/2 flex flex-col gap-4 pointer-events-auto">

          {/* 1. Next Item & Change */}
          <div className="flex flex-col items-center gap-2">
            <div className="glass-panel rounded-2xl p-2 flex flex-col items-center w-[64px] bg-white/60 backdrop-blur-md shadow-sm">
              <span className="text-[9px] text-gray-400 font-bold mb-1 tracking-wider uppercase">Next</span>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg overflow-hidden shadow-inner bg-white/50"
                style={{ backgroundColor: nextSymbol.texture ? 'transparent' : nextSymbol.color }}
              >
                {nextSymbol.texture ? (
                  <img src={nextSymbol.texture} alt={nextSymbol.name} className="w-full h-full object-contain drop-shadow-sm" />
                ) : (
                  nextSymbol.label
                )}
              </div>
            </div>

            <button
              onClick={handleAdSwapTrigger}
              className={`bg-white/80 hover:bg-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1 text-gray-500 shadow-sm border border-gray-100 active:scale-95 transition-all
                            ${adSwapCount >= MAX_SWAP_ADS ? 'opacity-50 grayscale' : ''}
                        `}
            >
              <Tv size={10} strokeWidth={2.5} />
              <span>Change</span>
            </button>
          </div>

          {/* 2. Drop Counter */}
          <div className="glass-panel rounded-xl px-2 py-1 text-center bg-white/60">
            <div className="text-[10px] font-black text-gray-600">
              🎲 {10 - (dropCount % 10)}
            </div>
          </div>

        </div>

      </div>

      {/* Main Game */}
      <div className="absolute inset-0 z-0 pt-[60px] pb-[40px]"> {/* Adjusted pt for Ticker */}

        {/* DANGER OVERLAY & TIMER */}
        <div className={`absolute top-0 left-0 w-full h-[200px] bg-gradient-to-b from-red-600/40 to-transparent pointer-events-none transition-opacity duration-300 z-20 flex justify-center pt-8
                      ${dangerLevel > 0 ? 'opacity-100' : 'opacity-0'}
                   `}>
          {dangerTimer > 0 && (
            <div className="text-center animate-pulse">
              <div className="text-white font-black text-4xl drop-shadow-md">{Math.ceil(dangerTimer)}</div>
              <div className="text-white text-xs font-bold uppercase tracking-widest mt-1">Danger</div>
            </div>
          )}
        </div>

        {/* Danger Line (Static Visual) */}
        <div className="absolute top-[150px] left-0 w-full z-0 border-b-2 border-red-500/30 border-dashed pointer-events-none flex justify-end px-2">
          <span className={`text-[10px] font-bold tracking-widest uppercase mt-[-16px] transition-colors duration-300
                    ${dangerLevel > 0 ? 'text-red-500' : 'text-red-500/50'}
                `}>Danger Zone</span>
        </div>

        <Game
          onScoreUpdate={handleScoreUpdate}
          onNextItemUpdate={handleNextItemUpdate}
          setGameState={setGameState}
          gameState={gameState}
        />
      </div>

      {/* Particles */}
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full pointer-events-none z-20"
          style={{
            left: p.x,
            top: p.y, // Removed +100 offset
            width: 'auto', // Auto width for text
            height: 30,
            opacity: p.life,
            transform: `scale(${1 + (1 - p.life)})`, // Grow slightly as it fades
            color: p.symbol.startsWith('+') ? '#10B981' : p.color, // Force Green for score
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            fontWeight: 900,
            fill: 'currentColor',
            fontSize: p.symbol.startsWith('+') ? '24px' : '20px', // Larger for score
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 50,
          }}
        >
          {p.symbol}
        </div>
      ))}

      {/* Exit Modal */}
      {showExitModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-xs rounded-2xl p-6 shadow-xl flex flex-col gap-4 text-center anim-pop">
            <h3 className="text-lg font-bold">Nirvana Game을<br />종료할까요?</h3>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setShowExitModal(false)}
                className="flex-1 py-3 bg-gray-100 rounded-xl font-medium active:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleExit}
                className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium active:bg-blue-600 transition-colors"
              >
                종료하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ad Modal */}
      {showAdModal && (
        <AdModal
          onConfirm={handleConfirmAd}
          onCancel={() => {
            setShowAdModal(false);
            // If denied danger help, die
            if (adModalType === 'DANGER') setIsGameOver(true);
          }}
          type={adModalType}
        />
      )}

      {/* ETF Selection Modal */}
      {showEtfSelection && (
        <EtfSelectionModal
          options={etfOptions}
          onSelect={handleEtfSelect}
          onClose={() => setShowEtfSelection(false)}
        />
      )}

      {showEvolutionModal && (
        <EvolutionModal
          onClose={() => setShowEvolutionModal(false)}
          stockMultipliers={stockMultipliers}
        />
      )}

      {/* Version Indicator */}
      <div className="absolute bottom-1 left-2 text-[10px] text-gray-400 font-mono opacity-50 pointer-events-none z-50">
        v1.3.0 ({new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })})
      </div>

      {/* Game Over Modal */}
      {isGameOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-500">
          <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 to-orange-500" />
            <div className="text-6xl mb-4">💀</div>
            <h2 className="text-3xl font-black text-gray-900 mb-2">GAME OVER</h2>
            <p className="text-gray-500 mb-6">시장이 마감되었습니다.</p>

            <div className="bg-gray-100 rounded-2xl p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-500 font-bold">최종 자산 (Seed Money)</span>
                <span className="text-2xl font-black text-gray-800">${seedMoney.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Historical High</span>
                <span className="text-sm font-bold text-blue-600">${bestScore.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mb-4 text-gray-400 text-xs">
              <History size={12} />
              <span>Rescue Used: {adDangerCount}/{MAX_DANGER_ADS}</span>
            </div>

            <button
              onClick={handleRestart}
              className="w-full py-4 bg-black text-white rounded-2xl font-bold text-lg active:scale-95 transition-transform shadow-lg hover:shadow-xl"
            >
              시장 재진입 (Restart)
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
