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
    const getScore = (body: Matter.Body) => {
        const id = parseInt(body.label.split('_')[1]);
        return SYMBOLS.find(s => s.id === id)?.score || 0;
    };

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

    // --- ETF / Event Handlers ---
    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            const etf = detail.etf as GameSymbol;

            if (etf.actionType === 'DROP') {
                // Queue for next drop
                etfQueueRef.current = etf;
                setNextSymbol(etf);
                onNextItemUpdate(etf);
            } else if (etf.actionType === 'INTERACTION') {
                // Enable Interaction Mode
                setInteractionMode(etf);
            } else if (etf.actionType === 'GLOBAL') {
                // Execute Immediately
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
            case 'COIN_SHOWER':
                for (let i = 0; i < 15; i++) {
                    setTimeout(() => {
                        const x = Math.random() * window.innerWidth;
                        const symbol = SYMBOLS[0]; // Doge
                        const body = Matter.Bodies.circle(x, -50, symbol.radius, {
                            label: `symbol_${symbol.id}`,
                            restitution: 0.5,
                            friction: 0.1,
                            render: {
                                fillStyle: symbol.color,
                                sprite: symbol.texture ? { texture: symbol.texture, xScale: 0.15, yScale: 0.15 } : undefined
                            }
                        });
                        Matter.World.add(world, body);
                    }, i * 100);
                }
                break;
            case 'DIVIDEND':
                onScoreUpdate(500);
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
                onScoreUpdate(buybackScore);
                Matter.World.remove(world, toRemove);
                break;
            case 'SHUFFLE':
                bodies.forEach(b => {
                    Matter.Body.setVelocity(b, {
                        x: (Math.random() - 0.5) * 20,
                        y: (Math.random() - 0.5) * 20
                    });
                    Matter.Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.5);
                });
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
                onScoreUpdate(delistScore);
                Matter.World.remove(world, bottomOnes);
                break;
            case 'BUBBLE':
                // Doge (0) -> Samsung (3) ?! Or just upgrade all Doge
                bodies.forEach(b => {
                    const id = parseInt(b.label.split('_')[1]);
                    if (id === 0) {
                        const targetSym = SYMBOLS[3]; // Samsung
                        Matter.World.remove(world, b);
                        const newBody = Matter.Bodies.circle(b.position.x, b.position.y, targetSym.radius, {
                            label: `symbol_${targetSym.id}`,
                            restitution: PHYSICS_CONFIG.RESTITUTION,
                            render: {
                                fillStyle: targetSym.color,
                                sprite: targetSym.texture ? { texture: targetSym.texture, xScale: 0.3, yScale: 0.3 } : undefined
                            }
                        });
                        Matter.World.add(world, newBody);
                    }
                });
                break;
            case 'FREEZE':
                bodies.forEach(b => Matter.Body.setStatic(b, true));
                setTimeout(() => {
                    bodies.forEach(b => Matter.Body.setStatic(b, false));
                }, 3000);
                break;
        }
    };

    const createExplosion = (x: number, y: number, color: string, score: number = 0) => {
        window.dispatchEvent(new CustomEvent('merge-effect', { detail: { x, y, color, score } }));
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

                // Handle Dropping State: Only activate if hitting Ground or another Symbol (not side walls)
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
                        // Bear
                        if (etfId === 101 && targetId <= 1) {
                            World.remove(world, [etfBody, targetBody]);
                            const s = getScore(targetBody);
                            onScoreUpdate(s);
                            createExplosion(etfBody.position.x, etfBody.position.y, '#3B82F6', 0); // ETF explosion
                            createExplosion(targetBody.position.x, targetBody.position.y, '#3B82F6', s); // Target score
                        }
                        // Bull
                        if (etfId === 102 && targetId <= 2) {
                            World.remove(world, targetBody);
                            Matter.Body.scale(etfBody, 1.1, 1.1);
                            const s = getScore(targetBody);
                            onScoreUpdate(s);
                            createExplosion(targetBody.position.x, targetBody.position.y, '#EF4444', s);
                        }
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
                        // Fed
                        if (etfId === 105 && targetId < 4) {
                            World.remove(world, etfBody);
                            const bodies = Composite.allBodies(world).filter(b => b.label.startsWith('symbol_'));
                            bodies.forEach(b => {
                                const bId = parseInt(b.label.split('_')[1]);
                                if (bId < 4) {
                                    const up = SYMBOLS[4];
                                    World.remove(world, b);
                                    const upB = Matter.Bodies.circle(b.position.x, b.position.y, up.radius, {
                                        label: `symbol_${up.id}`, restitution: PHYSICS_CONFIG.RESTITUTION, friction: PHYSICS_CONFIG.FRICTION,
                                        render: { fillStyle: up.color, sprite: up.texture ? { texture: up.texture, xScale: up.scale || 1, yScale: up.scale || 1 } : undefined }
                                    });
                                    World.add(world, upB);
                                }
                            });
                        }
                        // Short Bomb (New)
                        if (etfId === 207) {
                            World.remove(world, [etfBody, targetBody]);
                            const s = getScore(targetBody);
                            onScoreUpdate(s);
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
                        onScoreUpdate(newSym.score);
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
                    onScoreUpdate(s);
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
                    onScoreUpdate(removeScore);
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
