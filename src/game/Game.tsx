import { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { SYMBOLS, PHYSICS_CONFIG, GAME_STATES } from '../constants/gameData';
import type { GameSymbol } from '../constants/gameData';

interface GameProps {
    onScoreUpdate: (score: number) => void;
    onNextItemUpdate: (symbol: GameSymbol) => void;
    setGameState: (state: string) => void;
    gameState: string;
}

const Game: React.FC<GameProps> = ({ onScoreUpdate, onNextItemUpdate, setGameState: _setGameState, gameState }) => {
    const sceneRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<Matter.Engine | null>(null);
    const renderRef = useRef<Matter.Render | null>(null);
    const runnerRef = useRef<Matter.Runner | null>(null);
    const groundRef = useRef<Matter.Body | null>(null);

    // Timer Ref for Danger Zone
    const dangerTimerRef = useRef(0);
    const isGameOverTriggeredRef = useRef(false); // Validated: Prevent multi-triggers
    const DANGER_LINE_Y = 150;

    // GameState Ref for closure access
    const gameStateRef = useRef(gameState);
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    // Interaction Mode State
    const [interactionMode, setInteractionMode] = useState<GameSymbol | null>(null);

    // Game Logic State
    const [currentSymbol, setCurrentSymbol] = useState<GameSymbol>(SYMBOLS[0]);
    const [nextSymbol, setNextSymbol] = useState<GameSymbol>(SYMBOLS[0]);
    const [canDrop, setCanDrop] = useState(true);
    const [dropPosition, setDropPosition] = useState(window.innerWidth / 2);
    const gracePeriodRef = useRef(0);


    // Helpers
    const getRandomSymbol = () => SYMBOLS[Math.floor(Math.random() * 4)];

    // Drop Logic
    const dropItem = (clientX: number) => {
        if (!engineRef.current) return;
        const width = sceneRef.current?.clientWidth || window.innerWidth;
        const rect = sceneRef.current?.getBoundingClientRect();
        const relativeX = clientX - (rect?.left || 0);
        const clampedX = Math.max(30, Math.min(width - 30, relativeX));

        const body = Matter.Bodies.circle(clampedX, 30, currentSymbol.radius, {
            label: `dropping_symbol_${currentSymbol.id}`,
            restitution: PHYSICS_CONFIG.RESTITUTION, friction: PHYSICS_CONFIG.FRICTION,
            render: {
                fillStyle: currentSymbol.color,
                sprite: currentSymbol.texture ? { texture: currentSymbol.texture, xScale: currentSymbol.scale || 1, yScale: currentSymbol.scale || 1 } : undefined
            }
        });
        Matter.World.add(engineRef.current.world, body);
        setCanDrop(false);

        setTimeout(() => {
            setCurrentSymbol(nextSymbol);
            if (etfQueueRef.current) {
                setNextSymbol(etfQueueRef.current);
                onNextItemUpdate(etfQueueRef.current);
                etfQueueRef.current = null;
            } else {
                const next = getRandomSymbol();
                setNextSymbol(next);
                onNextItemUpdate(next);
            }
            setCanDrop(true);
        }, 600);
    };

    // ETF Queue for 'DROP' type
    const etfQueueRef = useRef<GameSymbol | null>(null);

    // Multiplier Refs
    const scoreMultiplierRef = useRef(1);
    const stockMultipliersRef = useRef<Map<number, number>>(new Map());

    // Get Dynamic Score (with stock-specific multiplier)
    const getScore = (body: Matter.Body) => {
        const id = parseInt(body.label.split('_')[1]);
        const baseScore = SYMBOLS.find(s => s.id === id)?.score || 0;
        const stockMult = stockMultipliersRef.current.get(id) || 1;
        return baseScore * stockMult;
    };

    const applyScore = (points: number) => {
        // Global Multiplier (Bull Market)
        const finalScore = points * scoreMultiplierRef.current;
        onScoreUpdate(finalScore);
    };

    // --- ETF / Event Handlers ---
    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            const etf = detail.etf as GameSymbol;

            if (etf.actionType === 'DROP') {
                etfQueueRef.current = etf;
                setNextSymbol(etf);
                onNextItemUpdate(etf);
            } else if (etf.actionType === 'INTERACTION') {
                setInteractionMode(etf);
            } else if (etf.actionType === 'GLOBAL') {
                executeGlobalEffect(etf);
            }
        };
        window.addEventListener('trigger-etf-effect', handler);
        return () => window.removeEventListener('trigger-etf-effect', handler);
    }, []);

    const executeGlobalEffect = (etf: GameSymbol) => {
        if (!engineRef.current) return;
        const world = engineRef.current.world;
        const bodies = Matter.Composite.allBodies(world).filter(b => b.label.startsWith('symbol_'));

        switch (etf.effectId) {
            case 'DIVIDEND':
                applyScore(500);
                break;
            case 'BUYBACK':
                // Remove 5 lowest (highest Y) bodies
                const sorted = [...bodies].sort((a, b) => b.position.y - a.position.y);
                const toRemove = sorted.slice(0, 5);
                let buybackScore = 0;
                toRemove.forEach(b => {
                    const s = getScore(b);
                    buybackScore += s;
                    createExplosion(b.position.x, b.position.y, b.render.fillStyle?.toString() || '#fff', s);
                });
                applyScore(buybackScore);
                Matter.World.remove(world, toRemove);
                break;
            case 'DELISTING':
                // Remove items in bottom half
                const midH = window.innerHeight / 2;
                const bottomOnes = bodies.filter(b => b.position.y > midH);
                let delistScore = 0;
                bottomOnes.forEach(b => {
                    const s = getScore(b);
                    delistScore += s;
                    createExplosion(b.position.x, b.position.y, '#f00', s);
                });
                applyScore(delistScore);
                Matter.World.remove(world, bottomOnes);
                break;
            case 'BUBBLE':
                // Doge (0) Price Bubble x10
                stockMultipliersRef.current.set(0, 10);
                window.dispatchEvent(new CustomEvent('global-effect-active', { detail: { type: 'BUBBLE' } }));

                // Visual POP for existing Doges
                bodies.forEach(b => {
                    const id = parseInt(b.label.split('_')[1]);
                    if (id === 0) {
                        createExplosion(b.position.x, b.position.y, SYMBOLS[0].color, 0); // Visual cue
                    }
                });

                setTimeout(() => {
                    stockMultipliersRef.current.set(0, 1);
                    window.dispatchEvent(new CustomEvent('global-effect-active', { detail: { type: 'NONE' } }));
                }, 15000);
                break;

            case 'PANIC_SELL': // Bear Market
                // Remove bottom 30%
                const sortedByY = [...bodies].sort((a, b) => b.position.y - a.position.y); // Highest Y first (bottom)
                const countToRemove = Math.ceil(bodies.length * 0.3);
                const panicList = sortedByY.slice(0, countToRemove);

                let panicScore = 0;
                panicList.forEach(b => {
                    const s = getScore(b);
                    panicScore += s;
                    createExplosion(b.position.x, b.position.y, '#3B82F6', s);
                });
                applyScore(panicScore);
                Matter.World.remove(world, panicList);
                window.dispatchEvent(new CustomEvent('global-effect-active', { detail: { type: 'BEAR' } }));
                break;

            case 'BULL_MARKET':
                scoreMultiplierRef.current = 2;
                window.dispatchEvent(new CustomEvent('global-effect-active', { detail: { type: 'BULL' } }));
                setTimeout(() => {
                    scoreMultiplierRef.current = 1;
                    window.dispatchEvent(new CustomEvent('global-effect-active', { detail: { type: 'NONE' } }));
                }, 15000);
                break;

            case 'SUPER_CYCLE':
                // Semi Supercycle: Samsung(3), Hynix(4), Tesla(5) x3
                [3, 4, 5].forEach(id => stockMultipliersRef.current.set(id, 3));
                window.dispatchEvent(new CustomEvent('global-effect-active', { detail: { type: 'SUPER_CYCLE' } }));

                // Visual cue
                bodies.forEach(b => {
                    const id = parseInt(b.label.split('_')[1]);
                    if ([3, 4, 5].includes(id)) {
                        createExplosion(b.position.x, b.position.y, SYMBOLS[id].color, 0);
                    }
                });

                setTimeout(() => {
                    [3, 4, 5].forEach(id => stockMultipliersRef.current.set(id, 1));
                    window.dispatchEvent(new CustomEvent('global-effect-active', { detail: { type: 'NONE' } }));
                }, 20000); // 20s
                break;

            case 'BLACKHOLE':
                // Pull to center
                const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
                bodies.forEach(b => {
                    const dx = center.x - b.position.x;
                    const dy = center.y - b.position.y;
                    Matter.Body.applyForce(b, b.position, { x: dx * 0.0005, y: dy * 0.0005 });
                });
                break;
        }
    };

    const createExplosion = (x: number, y: number, color: string, score: number = 0) => {
        // Pass multiplier info if needed, or just let App handle simple display
        // We pass the calculated score to display, so we should check if we want to display raw or multiplied?
        // Usually visual popups show the actual points earned.
        // `applyScore` calls `onScoreUpdate` which updates the total.
        // But `createExplosion` usually shows the text at the spot.
        // If multiplier is active, we should multiply this value too.
        const finalS = score * scoreMultiplierRef.current;
        window.dispatchEvent(new CustomEvent('merge-effect', { detail: { x, y, color, score: finalS } }));
    };

    // --- Matter JS Setup ---
    useEffect(() => {
        if (!sceneRef.current) return;

        const Engine = Matter.Engine,
            Render = Matter.Render,
            Runner = Matter.Runner,
            Bodies = Matter.Bodies,
            Composite = Matter.Composite,
            Events = Matter.Events,
            World = Matter.World;

        const engine = Engine.create();
        const world = engine.world;
        engineRef.current = engine;

        const { clientWidth: width, clientHeight: height } = sceneRef.current;
        const render = Render.create({
            element: sceneRef.current,
            engine: engine,
            options: { width, height, wireframes: false, background: 'transparent', pixelRatio: window.devicePixelRatio },
        });
        renderRef.current = render;

        // Boundaries
        const wallOptions = { isStatic: true, render: { fillStyle: '#5D4037' } };
        const ground = Bodies.rectangle(width / 2, height + 30, width, 60, wallOptions);
        const leftWall = Bodies.rectangle(-30, height / 2, 60, height * 2, wallOptions);
        const rightWall = Bodies.rectangle(width + 30, height / 2, 60, height * 2, wallOptions);
        groundRef.current = ground;
        Composite.add(world, [ground, leftWall, rightWall]);

        // Collision Logic
        Events.on(engine, 'collisionStart', (event) => {
            const pairs = event.pairs;
            for (const pair of pairs) {
                const bodyA = pair.bodyA;
                const bodyB = pair.bodyB;

                if (bodyA.label.startsWith('dropping_')) {
                    if (bodyB === groundRef.current || bodyB.label.includes('symbol_')) {
                        bodyA.label = bodyA.label.replace('dropping_', '');
                    }
                }
                if (bodyB.label.startsWith('dropping_')) {
                    if (bodyA === groundRef.current || bodyA.label.includes('symbol_')) {
                        bodyB.label = bodyB.label.replace('dropping_', '');
                    }
                }

                if (bodyA.label.includes('symbol_') && bodyB.label.includes('symbol_')) {
                    const idA = parseInt(bodyA.label.split('_')[1]);
                    const idB = parseInt(bodyB.label.split('_')[1]);

                    const handleEtfCollision = (etfId: number, etfBody: Matter.Body, targetId: number, targetBody: Matter.Body) => {
                        // Split
                        if (etfId === 103) {
                            World.remove(world, [etfBody, targetBody]);
                            if (targetId === 0) return;
                            const small = SYMBOLS[targetId - 1];
                            const b1 = Matter.Bodies.circle(targetBody.position.x - 20, targetBody.position.y, small.radius, {
                                label: `symbol_${small.id}`, restitution: PHYSICS_CONFIG.RESTITUTION, friction: PHYSICS_CONFIG.FRICTION,
                                render: { fillStyle: small.color, sprite: small.texture ? { texture: small.texture, xScale: small.scale || 1, yScale: small.scale || 1 } : undefined }
                            });
                            const b2 = Matter.Bodies.circle(targetBody.position.x + 20, targetBody.position.y, small.radius, {
                                label: `symbol_${small.id}`, restitution: PHYSICS_CONFIG.RESTITUTION, friction: PHYSICS_CONFIG.FRICTION,
                                render: { fillStyle: small.color, sprite: small.texture ? { texture: small.texture, xScale: small.scale || 1, yScale: small.scale || 1 } : undefined }
                            });
                            World.add(world, [b1, b2]);
                            createExplosion(targetBody.position.x, targetBody.position.y, '#A855F7', 0);
                        }
                        // Joker
                        if (etfId === 104 && targetId < 10) {
                            World.remove(world, [etfBody, targetBody]);
                            const newSym = SYMBOLS[targetId + 1];
                            const newB = Matter.Bodies.circle(targetBody.position.x, targetBody.position.y, newSym.radius, {
                                label: `symbol_${newSym.id}`, restitution: PHYSICS_CONFIG.RESTITUTION, friction: PHYSICS_CONFIG.FRICTION,
                                render: { fillStyle: newSym.color, sprite: newSym.texture ? { texture: newSym.texture, xScale: newSym.scale || 1, yScale: newSym.scale || 1 } : undefined }
                            });
                            World.add(world, newB);
                            createExplosion(targetBody.position.x, targetBody.position.y, '#FF00FF', 0);
                        }
                        // Short Bomb
                        if (etfId === 207) {
                            World.remove(world, [etfBody, targetBody]);
                            const s = getScore(targetBody);
                            applyScore(s);
                            createExplosion(etfBody.position.x, etfBody.position.y, '#000', 0);
                            createExplosion(targetBody.position.x, targetBody.position.y, '#000', s);
                            const bodies = Composite.allBodies(world).filter(b => b.label.startsWith('symbol_'));
                            bodies.forEach(b => {
                                const dx = b.position.x - etfBody.position.x;
                                const dy = b.position.y - etfBody.position.y;
                                const dist = Math.sqrt(dx * dx + dy * dy);
                                if (dist < 200) {
                                    Matter.Body.applyForce(b, b.position, { x: dx * 0.05, y: dy * 0.05 });
                                }
                            });
                        }
                    };

                    if (idA >= 100) handleEtfCollision(idA, bodyA, idB, bodyB);
                    else if (idB >= 100) handleEtfCollision(idB, bodyB, idA, bodyA);
                    else if (idA === idB && idA < SYMBOLS.length - 1) {
                        // Merge
                        World.remove(world, [bodyA, bodyB]);
                        const newSym = SYMBOLS[idA + 1];
                        const midX = (bodyA.position.x + bodyB.position.x) / 2;
                        const midY = (bodyA.position.y + bodyB.position.y) / 2;
                        const newB = Matter.Bodies.circle(midX, midY, newSym.radius, {
                            label: `symbol_${newSym.id}`, restitution: PHYSICS_CONFIG.RESTITUTION, friction: PHYSICS_CONFIG.FRICTION,
                            render: { fillStyle: newSym.color, sprite: newSym.texture ? { texture: newSym.texture, xScale: newSym.scale || 1, yScale: newSym.scale || 1 } : undefined }
                        });
                        World.add(world, newB);
                        applyScore(newSym.score);
                        createExplosion(midX, midY, newSym.color, newSym.score);
                    }
                }
            }
        });

        // Danger Timer Logic
        const checkDanger = () => {
            const currentGameState = gameStateRef.current;
            // Check Game Over state OR Grace Period
            if (currentGameState !== GAME_STATES.PLAYING ||
                isGameOverTriggeredRef.current ||
                Date.now() < gracePeriodRef.current) {

                // If in grace period, force timer to 0 to be safe
                if (Date.now() < gracePeriodRef.current) {
                    dangerTimerRef.current = 0;
                    window.dispatchEvent(new CustomEvent('danger-level', { detail: { level: 0, timer: 0 } }));
                }
                return;
            }

            const bodies = Composite.allBodies(world).filter(b => b.label.startsWith('symbol_'));
            // Stable bodies (low velocity) are risky.
            // Also include all bodies? If we just drop one, it might be high.
            // We generally only count "settled" bodies or use a looser Y check.
            // Let's filter for velocity.
            const stableBodies = bodies.filter(b => Math.abs(b.velocity.y) < 1.0);

            const isOverflowing = stableBodies.some(b => b.position.y < DANGER_LINE_Y);

            if (isOverflowing) {
                dangerTimerRef.current += 1000 / 60; // 16ms
                if (dangerTimerRef.current > 5000) {
                    isGameOverTriggeredRef.current = true;
                    window.dispatchEvent(new Event('game-over'));
                    _setGameState(GAME_STATES.GAME_OVER);
                }
            } else {
                dangerTimerRef.current = 0;
            }

            // Emit visual update
            // Level 2 if > 2s, Level 1 if overflowing.
            const level = isOverflowing ? (dangerTimerRef.current > 2000 ? 2 : 1) : 0;
            window.dispatchEvent(new CustomEvent('danger-level', {
                detail: {
                    level,
                    timer: isOverflowing ? (5000 - dangerTimerRef.current) / 1000 : 0
                }
            }));
        };

        Events.on(engine, 'afterUpdate', checkDanger);

        Render.run(render);
        const runner = Runner.create();
        runnerRef.current = runner;
        Runner.run(runner, engine);

        return () => {
            Render.stop(render);
            Runner.stop(runner);
            Engine.clear(engine);
            if (render.canvas) render.canvas.remove();
        };
    }, []);

    // Pointer Handler
    const handlePointerDown = (e: React.PointerEvent) => {
        if (!engineRef.current || gameState !== GAME_STATES.PLAYING) return;

        const rect = sceneRef.current?.getBoundingClientRect();
        if (!rect) return;
        // const x = e.clientX;

        if (interactionMode) {
            const y = e.clientY - rect.top;
            const relativeX = e.clientX - rect.left;
            const bodies = Matter.Composite.allBodies(engineRef.current.world);
            const clicked = Matter.Query.point(bodies, { x: relativeX, y });
            const target = clicked.find(b => b.label.startsWith('symbol_'));

            if (target) {
                if (interactionMode.effectId === 'REMOVE_SINGLE') {
                    Matter.World.remove(engineRef.current.world, target);
                    const s = getScore(target);
                    applyScore(s);
                    createExplosion(target.position.x, target.position.y, '#f00', s);
                } else if (interactionMode.effectId === 'REMOVE_TYPE') {
                    const label = target.label;
                    const targets = bodies.filter(b => b.label === label);
                    let removeScore = 0;
                    targets.forEach(b => {
                        const s = getScore(b);
                        removeScore += s;
                        createExplosion(b.position.x, b.position.y, '#f00', s);
                    });
                    applyScore(removeScore);
                    Matter.World.remove(engineRef.current.world, targets);
                }
                setInteractionMode(null);
            }
            return;
        }

        // Update aim position only
        const relativeX = e.clientX - rect.left;
        setDropPosition(relativeX);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (gameState !== GAME_STATES.PLAYING) return;
        const rect = sceneRef.current?.getBoundingClientRect();
        if (rect) setDropPosition(e.clientX - rect.left);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!engineRef.current || gameState !== GAME_STATES.PLAYING) return;
        if (interactionMode) return;
        if (canDrop) dropItem(e.clientX);
    };

    return (
        <div
            className={`relative w-full h-full bg-slate-50 touch-none select-none outline-none ${interactionMode ? 'cursor-crosshair' : ''}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
        >
            <div ref={sceneRef} className="w-full h-full" />

            {/* Danger Line */}
            <div className="absolute left-0 w-full border-b-2 border-red-500/50 border-dashed pointer-events-none z-10"
                style={{ top: '150px' }}>
                <span className="absolute right-2 -top-6 text-red-500/70 text-xs font-bold">DANGER ZONE</span>
            </div>

            {/* Interaction Overlay */}
            {interactionMode && (
                <div className="absolute top-20 left-0 w-full text-center pointer-events-none animate-pulse z-20">
                    <span className="bg-black/70 text-white px-4 py-2 rounded-full font-bold">
                        {interactionMode.effectId === 'REMOVE_SINGLE' ? '삭제할 주식을 클릭하세요' : '삭제할 종목을 클릭하세요'}
                    </span>
                </div>
            )}

            {/* Drop Preview */}
            {canDrop && !interactionMode && (
                <>
                    <div className="absolute top-[30px] h-full w-0.5 bg-gray-400 opacity-40 border-dashed border-l-2 pointer-events-none" style={{ left: dropPosition }} />
                    <div className="absolute top-[30px] pointer-events-none transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full shadow-lg border-2 border-white/50"
                        style={{
                            left: dropPosition,
                            width: currentSymbol.radius * 2,
                            height: currentSymbol.radius * 2,
                            backgroundColor: currentSymbol.texture ? 'transparent' : currentSymbol.color
                        }}>
                        {currentSymbol.texture ? <img src={currentSymbol.texture} className="w-full h-full object-contain" /> : currentSymbol.label}
                    </div>
                </>
            )}
        </div>
    );
};

export default Game;
