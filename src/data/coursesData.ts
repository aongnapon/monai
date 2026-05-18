import { LucideIcon } from 'lucide-react-native';

export interface Slide {
  id: string;
  text: string;
  highlightText?: string;
  emoji: string;
  showMascot: boolean;
  mascotAnimation?: 'welcome' | 'celebrate' | 'thinking' | 'caution';
}

export interface Course {
  course_id: string;
  title: string;
  chapter: string;
  iconName: string; // Used for Lucide icons
  color: string;
  slides: Slide[];
}

/**
 * MONAI ACADEMY: Institutional Learning Engine
 * 3.5-minute micro-lesson architecture
 */
export const ACADEMY_COURSES: Course[] = [
  {
    course_id: '1',
    title: 'Foundations of Technical Analysis',
    chapter: 'Technical Analysis',
    iconName: 'BarChart3',
    color: '#34C759',
    slides: [
      { 
        id: '1-1', 
        emoji: '📈', 
        text: 'Welcome to the world of institutional charting. Technical Analysis is the study of human behavior mapped through price.', 
        highlightText: 'Technical Analysis',
        showMascot: true,
        mascotAnimation: 'welcome'
      },
      { 
        id: '1-2', 
        emoji: '🛡️', 
        text: 'Think of Support as a floor and Resistance as a ceiling. These are zones where big players have parked their orders.', 
        highlightText: 'Support & Resistance',
        showMascot: false 
      },
      { 
        id: '1-3', 
        emoji: '⛰️', 
        text: 'Higher Highs and Higher Lows signal an Uptrend. Lower Highs and Lower Lows signal a Downtrend. Never fight the flow.', 
        highlightText: 'Never fight the flow',
        showMascot: false 
      },
      { 
        id: '1-4', 
        emoji: '🕯️', 
        text: 'A single candle tells a story of a battle between Bulls and Bears. The "wick" shows price rejection, the "body" shows dominance.', 
        highlightText: 'Candlestick Anatomy',
        showMascot: true,
        mascotAnimation: 'thinking'
      },
      { 
        id: '1-5', 
        emoji: '💎', 
        text: 'You now possess the foundational vision to read the charts. Great work, Architect!', 
        highlightText: 'Module Certified',
        showMascot: true, 
        mascotAnimation: 'celebrate' 
      },
    ]
  },
  {
    course_id: '2',
    title: 'Psychology of Risk Management',
    chapter: 'Risk Management',
    iconName: 'ShieldCheck',
    color: '#0EA5E9',
    slides: [
      { 
        id: '2-1', 
        emoji: '🧠', 
        text: 'Trading isn\'t about being right; it\'s about being profitable. Risk management is the only holy grail in this market.', 
        highlightText: 'Risk management',
        showMascot: true,
        mascotAnimation: 'welcome'
      },
      { 
        id: '2-2', 
        emoji: '🛑', 
        text: 'A Stop Loss is your insurance. It marks the point where your trade idea is proven wrong. Respect it like a law.', 
        highlightText: 'Stop Loss',
        showMascot: false 
      },
      { 
        id: '2-3', 
        emoji: '⚖️', 
        text: 'Never risk more than 1-2% of your total account on a single idea. Survivability is the key to institutional growth.', 
        highlightText: '1-2% of your total account',
        showMascot: true,
        mascotAnimation: 'caution'
      },
      { 
        id: '2-4', 
        emoji: '🎯', 
        text: 'Target at least 2:1. If you risk ₩100 to make ₩200, you only need to be right 34% of the time to break even.', 
        highlightText: '2:1 R:R Ratio',
        showMascot: false 
      },
      { 
        id: '2-5', 
        emoji: '🏆', 
        text: 'You are no longer a gambler; you are a risk manager. The pink bear is proud of your discipline!', 
        highlightText: 'Risk Disciplined',
        showMascot: true, 
        mascotAnimation: 'celebrate' 
      },
    ]
  },
  {
    course_id: '3',
    title: 'Crypto vs. Traditional Assets',
    chapter: 'Crypto Mechanics',
    iconName: 'Zap',
    color: '#F59E0B',
    slides: [
      { 
        id: '3-1', 
        emoji: '🌐', 
        text: 'Markets are interconnected. Gold is the ancient shield, while Bitcoin is the digital lightning.', 
        highlightText: 'Interconnected',
        showMascot: true,
        mascotAnimation: 'welcome'
      },
      { 
        id: '3-2', 
        emoji: '🔄', 
        text: 'Traditional markets move in years. Crypto moves in weeks. The cycles are faster, but principles remain identical.', 
        highlightText: 'Market Cycles',
        showMascot: false 
      },
      { 
        id: '3-3', 
        emoji: '🌪️', 
        text: 'Volatility is not risk; it\'s opportunity. Institutional players use volatility to enter positions at better prices.', 
        highlightText: 'Volatility = Opportunity',
        showMascot: true,
        mascotAnimation: 'thinking'
      },
      { 
        id: '3-4', 
        emoji: '💧', 
        text: 'Liquidity is the lifeblood of a market. High liquidity means stable prices; low liquidity leads to "gaps" and slippage.', 
        highlightText: 'Liquidity Basics',
        showMascot: false 
      },
      { 
        id: '3-5', 
        emoji: '🌟', 
        text: 'You now understand the bridge between old world gold and new world code. Knowledge is power!', 
        highlightText: 'Asset Expert',
        showMascot: true, 
        mascotAnimation: 'celebrate' 
      },
    ]
  },
  {
    course_id: '4',
    title: 'Volume & Liquidity Outflows',
    chapter: 'Technical Analysis',
    iconName: 'Waves',
    color: '#8B5CF6',
    slides: [
      { 
        id: '4-1', 
        emoji: '🌊', 
        text: 'Volume is the fuel of the market. Without volume, price movements are often "fakeouts" designed to trap retail traders.', 
        highlightText: 'Volume is fuel',
        showMascot: true,
        mascotAnimation: 'welcome'
      },
      { 
        id: '4-2', 
        emoji: '🧱', 
        text: 'Buying and Selling Walls are clusters of limit orders. When price hits a "Wall," it either bounces or breaks with extreme force.', 
        highlightText: 'Order Walls',
        showMascot: false 
      },
      { 
        id: '4-3', 
        emoji: '📉', 
        text: 'Liquidity Outflows happen when big players exit. If price rises while volume falls, the trend is "exhausted" and ready to flip.', 
        highlightText: 'Trend Exhaustion',
        showMascot: true,
        mascotAnimation: 'caution'
      },
      { 
        id: '4-4', 
        emoji: '🔦', 
        text: 'Look for volume spikes at key support levels. This usually signals "Absorption" where whales are buying up every sell order.', 
        highlightText: 'Absorption',
        showMascot: false 
      },
      { 
        id: '4-5', 
        emoji: '📊', 
        text: 'You can now read the invisible pressure behind every price tick. Your market vision has evolved!', 
        highlightText: 'Volume Mastered',
        showMascot: true, 
        mascotAnimation: 'celebrate' 
      },
    ]
  },
  {
    course_id: '5',
    title: 'Chart Pattern Architecture',
    chapter: 'Technical Analysis',
    iconName: 'LayoutDashboard',
    color: '#EC4899',
    slides: [
      { 
        id: '5-1', 
        emoji: '🏰', 
        text: 'Chart patterns are visual representations of mass psychology. They show the tug-of-war between greed and fear.', 
        highlightText: 'Mass Psychology',
        showMascot: true,
        mascotAnimation: 'welcome'
      },
      { 
        id: '5-2', 
        emoji: '👥', 
        text: 'The Double Bottom resembles a "W". It shows that the market tried twice to break lower and failed, signaling a strong reversal.', 
        highlightText: 'Double Bottom (W)',
        showMascot: false 
      },
      { 
        id: '5-3', 
        emoji: '🚀', 
        text: 'Breakout Mechanics: A true breakout requires a candle close above resistance with high volume. Avoid "wicking" through levels.', 
        highlightText: 'Candle Close Confirmation',
        showMascot: true,
        mascotAnimation: 'thinking'
      },
      { 
        id: '5-4', 
        emoji: '📐', 
        text: 'Triangles represent volatility compression. Like a coiled spring, the longer the compression, the more explosive the breakout.', 
        highlightText: 'Volatility Compression',
        showMascot: false 
      },
      { 
        id: '5-5', 
        emoji: '📐', 
        text: 'Pattern recognition is the first step to becoming a Quant Architect. Keep your eyes on the structure!', 
        highlightText: 'Structure is King',
        showMascot: true, 
        mascotAnimation: 'celebrate' 
      },
    ]
  },
  {
    course_id: '6',
    title: 'Advanced Stop-Loss Automation',
    chapter: 'Risk Management',
    iconName: 'Settings',
    color: '#6366F1',
    slides: [
      { 
        id: '6-1', 
        emoji: '🛡️', 
        text: 'Static stops are for beginners. Professional quants use dynamic levels that move with the market flow.', 
        highlightText: 'Dynamic Levels',
        showMascot: true,
        mascotAnimation: 'welcome'
      },
      { 
        id: '6-2', 
        emoji: '🎢', 
        text: 'Trailing Stops lock in profit as price moves in your favor. They allow you to capture "Moon Bag" gains safely.', 
        highlightText: 'Trailing Stops',
        showMascot: false 
      },
      { 
        id: '6-3', 
        emoji: '⚠️', 
        text: 'Invalidation Levels: This is the price point where your trade thesis is officially dead. If it hits, you exit without emotion.', 
        highlightText: 'Exit without emotion',
        showMascot: true,
        mascotAnimation: 'caution'
      },
      { 
        id: '6-4', 
        emoji: '📐', 
        text: 'ATR-based Stops adjust your stop distance based on current market noise and volatility.', 
        highlightText: 'ATR-based Stops',
        showMascot: false 
      },
      { 
        id: '6-5', 
        emoji: '🤖', 
        text: 'Automating your exits is the ultimate way to remove human bias. Your capital is now bulletproof!', 
        highlightText: 'Automation Protocol',
        showMascot: true, 
        mascotAnimation: 'celebrate' 
      },
    ]
  },
  {
    course_id: '7',
    title: 'The Whale Tracker',
    chapter: 'Market Mechanics',
    iconName: 'Eye',
    color: '#14B8A6',
    slides: [
      { 
        id: '7-1', 
        emoji: '🐋', 
        text: 'Whales are institutional players with enough capital to move the market. We don\'t fight them; we follow them.', 
        highlightText: 'Follow the Whales',
        showMascot: true,
        mascotAnimation: 'welcome'
      },
      { 
        id: '7-2', 
        emoji: '🔥', 
        text: 'Order Book Heatmaps show where massive buy/sell orders are "resting". Whales often use these to manipulate retail sentiment.', 
        highlightText: 'Resting Liquidity',
        showMascot: false 
      },
      { 
        id: '7-3', 
        emoji: '⛓️', 
        text: 'On-chain signals like "Exchange Inflows" suggest whales are ready to sell, while "Outflows" suggest long-term cold storage.', 
        highlightText: 'Exchange Flows',
        showMascot: true,
        mascotAnimation: 'thinking'
      },
      { 
        id: '7-4', 
        emoji: '🕶️', 
        text: 'Dark Pools are private exchanges where institutions trade massive blocks without alerting the public order books.', 
        highlightText: 'Dark Pool Trading',
        showMascot: false 
      },
      { 
        id: '7-5', 
        emoji: '🎯', 
        text: 'You can now spot the fingerprints of big money. Trade with the giants, not against them!', 
        highlightText: 'Whale Tracker Active',
        showMascot: true, 
        mascotAnimation: 'celebrate' 
      },
    ]
  },
  {
    course_id: '8',
    title: 'Volatility Handles',
    chapter: 'Risk Management',
    iconName: 'Activity',
    color: '#F97316',
    slides: [
      { 
        id: '8-1', 
        emoji: '🌪️', 
        text: 'Volatility is the speed of price change. High volatility means bigger swings, but also higher potential for "Slippage".', 
        highlightText: 'Volatility = Speed',
        showMascot: true,
        mascotAnimation: 'welcome'
      },
      { 
        id: '8-2', 
        emoji: '📏', 
        text: 'When volatility spikes, you must reduce your position size. A wide swing shouldn\'t wipe out your account.', 
        highlightText: 'Reduce Position Size',
        showMascot: false 
      },
      { 
        id: '8-3', 
        emoji: '📉', 
        text: 'The "VIX" for crypto tracks fear. High readings often mark market bottoms where the "Weak Hands" have been liquidated.', 
        highlightText: 'Market Bottoms',
        showMascot: true,
        mascotAnimation: 'thinking'
      },
      { 
        id: '8-4', 
        emoji: '🎣', 
        text: 'Shakeouts are rapid price drops designed to trigger stop losses before a massive move up. Stay calm during the shake.', 
        highlightText: 'Stay calm',
        showMascot: false 
      },
      { 
        id: '8-5', 
        emoji: '🧘', 
        text: 'The Architect remains calm while the world panics. You have mastered the handles of volatility!', 
        highlightText: 'Zen Architect',
        showMascot: true, 
        mascotAnimation: 'celebrate' 
      },
    ]
  }
];

