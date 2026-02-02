export interface GameSymbol {
    id: number;
    name: string;
    radius: number;
    color: string;
    score: number;
    label: string;
    texture?: string;
    scale?: number;
    description?: string;
    tier?: string;
    actionType?: 'DROP' | 'INTERACTION' | 'GLOBAL'; // How it is used
    effectId?: string;    // Logic identifier
}

export const SYMBOLS: GameSymbol[] = [
    { id: 0, name: 'Doge Coin', radius: 20, color: '#F0C330', score: 1, label: '🐕', texture: '/assets/stock_0.svg', scale: 0.2 },
    { id: 1, name: 'Cacao', radius: 32, color: '#FAE100', score: 3, label: '💬', texture: '/assets/stock_1.svg', scale: 0.32 },
    { id: 2, name: 'Neighbor', radius: 44, color: '#03C75A', score: 6, label: 'N', texture: '/assets/stock_2.svg', scale: 0.44 },
    { id: 3, name: 'Samsong', radius: 56, color: '#1428A0', score: 10, label: '🔵', texture: '/assets/stock_3.svg', scale: 0.56 },
    { id: 4, name: 'SKY Hynix', radius: 70, color: '#DB0025', score: 15, label: '🦋', texture: '/assets/stock_4.svg', scale: 0.7 },
    { id: 5, name: 'Te-seul-la', radius: 86, color: '#E82127', score: 21, label: 'T', texture: '/assets/stock_5.svg', scale: 0.86 },
    { id: 6, name: 'Go-gull', radius: 104, color: '#4285F4', score: 28, label: 'G', texture: '/assets/stock_6.svg', scale: 1.04 },
    { id: 7, name: 'Ama-zone', radius: 124, color: '#FF9900', score: 36, label: '📦', texture: '/assets/stock_7.svg', scale: 1.24 },
    { id: 8, name: 'Micros-oft', radius: 145, color: '#00A4EF', score: 45, label: '🪟', texture: '/assets/stock_8.svg', scale: 1.45 },
    { id: 9, name: 'A-Plus', radius: 168, color: '#A2AAAD', score: 55, label: '🍎', texture: '/assets/stock_9.svg', scale: 0.66 },
    { id: 10, name: 'Engvidia', radius: 195, color: '#76B900', score: 66, label: '👁️', texture: '/assets/stock_10.svg', scale: 0.76 },
];

// Reusing Icons for new ETFs (generic fallbacks or specific logic)
// We will use id > 100 for ETFs.

const BASE_ETFS: GameSymbol[] = [
    {
        id: 101, name: '물장 (Bear) ETF', radius: 35, color: '#3B82F6', score: 0, label: '🐻', texture: '/assets/etf_bear.svg',
        tier: 'Common', description: '가장 작은 주식만 제거합니다. (하락장 방어)', actionType: 'DROP', effectId: 'BEAR', scale: 0.35
    },
    {
        id: 102, name: '불장 (Bull) ETF', radius: 40, color: '#EF4444', score: 0, label: '🐂', texture: '/assets/etf_bull.svg',
        tier: 'Rare', description: '주변 주식을 흡수하여 성장합니다!', actionType: 'DROP', effectId: 'BULL', scale: 0.4
    },
    {
        id: 103, name: '액면분할 (Split) ETF', radius: 35, color: '#A855F7', score: 0, label: '✂️', texture: '/assets/etf_clone.svg',
        tier: 'Epic', description: '주식을 두 개의 하위 단계 주식으로 쪼갭니다.', actionType: 'DROP', effectId: 'SPLIT', scale: 0.35
    },
    {
        id: 104, name: 'Joker ETF', radius: 35, color: '#FF00FF', score: 0, label: '🃏', texture: '/assets/etf_joker.svg',
        tier: 'Legendary', description: '어떤 주식과도 즉시 합쳐집니다! (만능 키)', actionType: 'DROP', effectId: 'JOKER', scale: 0.35
    },
    {
        id: 105, name: 'Fed Stimulus', radius: 45, color: '#FCD34D', score: 0, label: '🏛️', texture: '/assets/etf_fed.svg',
        tier: 'Mythic', description: '모든 주식의 단계를 한 단계 올려버립니다! (대폭등)', actionType: 'DROP', effectId: 'FED', scale: 0.45
    },
    // NEW ONES
    {
        id: 201, name: '코인 샤워 (Coin Shower)', radius: 0, color: '#F0C330', score: 0, label: '🌧️',
        tier: 'Rare', description: '하늘에서 도지코인이 쏟아집니다!', actionType: 'GLOBAL', effectId: 'COIN_SHOWER'
    },
    {
        id: 202, name: '강제 청산 (Sell Single)', radius: 0, color: '#EF4444', score: 0, label: '🔨',
        tier: 'Common', description: '원하는 주식 하나를 클릭하여 즉시 제거합니다.', actionType: 'INTERACTION', effectId: 'REMOVE_SINGLE'
    },
    {
        id: 203, name: '섹터 매도 (Sell All)', radius: 0, color: '#EF4444', score: 0, label: '📉',
        tier: 'Epic', description: '원하는 주식 종류를 클릭하면 해당 종류가 모두 사라집니다.', actionType: 'INTERACTION', effectId: 'REMOVE_TYPE'
    },
    {
        id: 204, name: '배당금 (Dividend)', radius: 0, color: '#10B981', score: 0, label: '💰',
        tier: 'Common', description: '즉시 $500을 획득합니다.', actionType: 'GLOBAL', effectId: 'DIVIDEND'
    },
    {
        id: 205, name: '자사주 매입 (Buyback)', radius: 0, color: '#2563EB', score: 0, label: '♻️',
        tier: 'Rare', description: '바닥에 있는 주식 5개를 제거합니다.', actionType: 'GLOBAL', effectId: 'BUYBACK'
    },
    {
        id: 206, name: '시장 셔플 (Shuffle)', radius: 0, color: '#8B5CF6', score: 0, label: '🌪️',
        tier: 'Common', description: '시장을 뒤섞어 새로운 기회를 만듭니다.', actionType: 'GLOBAL', effectId: 'SHUFFLE'
    },
    {
        id: 207, name: '공매도 폭격 (Short Bomb)', radius: 40, color: '#1F2937', score: 0, label: '💣',
        tier: 'Epic', description: '떨어뜨리면 폭발하여 주변 주식을 날려버립니다.', actionType: 'DROP', effectId: 'BOMB', scale: 0.4,
        texture: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48dGV4dCB5PSI1MCUiIHg9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9ImNlbnRyYWwiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iODAiPvCfkow8L3RleHQ+PC9zdmc+'
    },
    {
        id: 208, name: '상장 폐지 (Delisting)', radius: 0, color: '#991B1B', score: 0, label: '🚫',
        tier: 'Legendary', description: '화면의 절반(아래쪽)을 날려버립니다.', actionType: 'GLOBAL', effectId: 'DELISTING'
    },
    {
        id: 209, name: '유상증자 (Capital Increase)', radius: 0, color: '#60A5FA', score: 0, label: '📈',
        tier: 'Rare', description: '무작위 주식 3개를 한 단계 업그레이드합니다.', actionType: 'GLOBAL', effectId: 'UPGRADE_RANDOM'
    },
    {
        id: 210, name: '구조조정 (Restructure)', radius: 0, color: '#F59E0B', score: 0, label: '🏗️',
        tier: 'Rare', description: '무작위 주식 3개를 한 단계 다운그레이드합니다. (소형화)', actionType: 'GLOBAL', effectId: 'DOWNGRADE_RANDOM'
    },
    {
        id: 211, name: 'CEO 교체', radius: 0, color: '#4B5563', score: 0, label: '👔',
        tier: 'Common', description: '다음 아이템 5개를 좋은 것으로 바꿉니다.', actionType: 'GLOBAL', effectId: 'BETTER_NEXT'
    },
    {
        id: 212, name: '블랙홀 (Blackhole)', radius: 0, color: '#000000', score: 0, label: '⚫',
        tier: 'Epic', description: '중앙으로 모든 주식을 끌어당깁니다.', actionType: 'GLOBAL', effectId: 'BLACKHOLE'
    },
    {
        id: 213, name: '서킷 브레이커 (Freeze)', radius: 0, color: '#3B82F6', score: 0, label: '❄️',
        tier: 'Common', description: '일시적으로 모든 주식의 움직임을 멈춥니다.', actionType: 'GLOBAL', effectId: 'FREEZE'
    },
    {
        id: 214, name: '세무 조사 (Audit)', radius: 0, color: '#DC2626', score: 0, label: '👮',
        tier: 'Rare', description: '가장 큰 주식 하나를 강제로 분할시킵니다.', actionType: 'GLOBAL', effectId: 'AUDIT'
    },
    {
        id: 215, name: '테마주 열풍 (Bubble)', radius: 0, color: '#EC4899', score: 0, label: '🫧',
        tier: 'Legendary', description: '모든 도지코인을 삼성전자로 바꿉니다!', actionType: 'GLOBAL', effectId: 'BUBBLE'
    }
];

export const ETFS = BASE_ETFS;

export const PHYSICS_CONFIG = {
    FRICTION: 0.5,
    RESTITUTION: 0.1,
    DENSITY: 0.002,
    WALL_THICKNESS: 50,
};

export const GAME_STATES = {
    PLAYING: 'playing',
    GAME_OVER: 'game_over',
    PAUSED: 'paused',
} as const;
