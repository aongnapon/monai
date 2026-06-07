import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  LogBox,
  Modal,
  Pressable,
  Animated as RNAnimated,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

LogBox.ignoreLogs(['Unsupported top level event type "topSvgLayout"']);

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════
// SLIDE & COURSE TYPES (self-contained)
// ═══════════════════════════════════════════════════════════════
type SlideType =
  | 'TRANSLATION_BUILD'
  | 'TRANSLATION_SELECT'
  | 'VISUAL_GRID_SELECT'
  | 'COMPARE_EQUATION'
  | 'IMAGE_LABEL_MATCH'
  | 'TAP_PAIRS_MATCH'
  | 'SLIDER_GUESS_PERCENT'
  | 'CHART_STORY_TAP'
  | 'STANDARD_END';

interface MockSlide {
  id: string;
  type: SlideType;
  emoji: string;
  text: string;
  highlightText?: string;
  prompt?: string;
  tokens?: string[];
  correctAnswer?: string[];
  options?: { label: string; isCorrect: boolean; subtext?: string }[];
  centerEmoji?: string;
  showMascot: boolean;
  mascotAnimation?: 'welcome' | 'celebrate' | 'thinking' | 'caution';
  // TAP_PAIRS_MATCH
  leftTerms?: string[];
  rightMatches?: string[];
  // SLIDER_GUESS_PERCENT
  targetPercent?: number;
  // CHART_STORY_TAP
  choices?: string[];
  correctChoiceIndex?: number;
}

interface MockCourse {
  courseId: string;
  title: string;
  slides: MockSlide[];
}

// ═══════════════════════════════════════════════════════════════
// MOCK COURSE DATA — 3 interactive courses for nodes 0-2
// ═══════════════════════════════════════════════════════════════
const MOCK_COURSES: Record<string, MockCourse> = {
  // ── COURSE 1 (Node 0): Investment Mechanics 101 ──
  n1: {
    courseId: 'n1',
    title: 'Investment Mechanics 101',
    slides: [
      {
        id: 'c1-s1',
        type: 'TRANSLATION_BUILD',
        emoji: '🌱',
        text: 'How does wealth grow over time?',
        prompt: 'Build the definition of Compound Interest:',
        tokens: ['Interest', 'on', 'interest', 'earned', 'previously'],
        correctAnswer: ['Interest', 'on', 'interest', 'earned', 'previously'],
        showMascot: true,
        mascotAnimation: 'welcome',
      },
      {
        id: 'c1-s2',
        type: 'TRANSLATION_SELECT',
        emoji: '💸',
        text: 'Macro Risk Analysis',
        prompt: 'What happens to your purchasing power during high inflation?',
        options: [
          { label: 'It stays exactly the same', isCorrect: false },
          { label: 'It decreases significantly', isCorrect: true },
          { label: 'It increases over time', isCorrect: false },
        ],
        showMascot: true,
        mascotAnimation: 'thinking',
      },
      {
        id: 'c1-s3',
        type: 'VISUAL_GRID_SELECT',
        emoji: '📊',
        text: 'Asset Ownership',
        prompt: "Which asset represents direct ownership in a corporation?",
        options: [
          { label: '📈 Stocks', isCorrect: true },
          { label: '📜 Bonds', isCorrect: false },
          { label: '🐷 Savings', isCorrect: false },
          { label: '💵 Cash', isCorrect: false },
        ],
        showMascot: false,
      },
      {
        id: 'c1-s4',
        type: 'COMPARE_EQUATION',
        emoji: '🔢',
        text: 'Compounding Strategy',
        prompt: 'Select the superior option for long-term compounding:',
        options: [
          { label: '🤖 Low-Fee Index Fund', subtext: '+8% Diversified', isCorrect: true },
          { label: '🎰 Speculative Token', subtext: 'Variable', isCorrect: false },
        ],
        showMascot: false,
      },
      {
        id: 'c1-s5',
        type: 'STANDARD_END',
        emoji: '💎',
        text: 'You have mastered the basic mechanics of institutional growth. Your journey is just beginning!',
        highlightText: 'Wealth Protocol Initialized',
        showMascot: true,
        mascotAnimation: 'celebrate',
      },
    ],
  },

  // ── COURSE 2 (Node 1): Anatomy of a Candlestick ──
  n2: {
    courseId: 'n2',
    title: 'Anatomy of a Candlestick',
    slides: [
      {
        id: 'c2-s1',
        type: 'TRANSLATION_SELECT',
        emoji: '🕯️',
        text: 'Reading the Shadows',
        prompt: 'What does a long upper shadow (wick) on a candlestick indicate?',
        options: [
          { label: 'Strong buying momentum continuing', isCorrect: false },
          { label: 'Sellers pushing back against high prices', isCorrect: true },
          { label: 'The market is closing permanently', isCorrect: false },
        ],
        showMascot: true,
        mascotAnimation: 'thinking',
      },
      {
        id: 'c2-s2',
        type: 'TRANSLATION_BUILD',
        emoji: '📈',
        text: 'Bullish Formations',
        prompt: 'Assemble the core criteria for a Bullish Engulfing Candle:',
        tokens: ['Green', 'body', 'completely', 'covers', 'previous', 'red', 'candle'],
        correctAnswer: ['Green', 'body', 'completely', 'covers', 'previous', 'red', 'candle'],
        showMascot: false,
      },
      {
        id: 'c2-s3',
        type: 'COMPARE_EQUATION',
        emoji: '🔢',
        text: 'Candle Closes',
        prompt: 'Select the candlestick indicating maximum upward conviction:',
        options: [
          { label: '⚡ Marubozu (Full Green Body)', subtext: 'No shadow', isCorrect: true },
          { label: '⚖️ Doji (Cross Shape)', subtext: 'Indecision', isCorrect: false },
        ],
        showMascot: false,
      },
      {
        id: 'c2-s4',
        type: 'STANDARD_END',
        emoji: '🏆',
        text: 'You can now read the battlefield of price action! Candlestick structure initialized.',
        highlightText: 'Candlestick Protocol Mastered',
        showMascot: true,
        mascotAnimation: 'celebrate',
      },
    ],
  },

  // ── COURSE 3 (Node 2): Support & Resistance Order Books ──
  n3: {
    courseId: 'n3',
    title: 'Support & Resistance Order Books',
    slides: [
      {
        id: 'c3-s1',
        type: 'VISUAL_GRID_SELECT',
        emoji: '🧱',
        text: 'The Floor and Ceiling',
        prompt: "Which level represents a psychological 'floor' where big banks place massive buy orders?",
        options: [
          { label: '📉 Support Level', isCorrect: true },
          { label: '📈 Resistance Level', isCorrect: false },
          { label: '🔄 Sideways Matrix', isCorrect: false },
        ],
        showMascot: true,
        mascotAnimation: 'welcome',
      },
      {
        id: 'c3-s2',
        type: 'IMAGE_LABEL_MATCH',
        emoji: '🐋',
        text: 'Whale Liquidity Tracking',
        prompt: 'Identify what happens when price breaches a major Resistance ceiling:',
        centerEmoji: '💥',
        options: [
          { label: 'Aggressive short covering & breakout rally', isCorrect: true },
          { label: 'Instant systemic market collapse', isCorrect: false },
        ],
        showMascot: false,
      },
      {
        id: 'c3-s3',
        type: 'STANDARD_END',
        emoji: '💎',
        text: 'You can now locate institutional liquidity clusters. Chart defense parameters initialized!',
        highlightText: 'Whale Scanner Mode Unlocked',
        showMascot: true,
        mascotAnimation: 'celebrate',
      },
    ],
  },

  // ── COURSE 4 (Node 3): Corporate Microstructure ──
  n4: {
    courseId: 'n4',
    title: 'Corporate Microstructure',
    slides: [
      {
        id: 'c4-s1',
        type: 'TAP_PAIRS_MATCH',
        emoji: '🧩',
        text: 'Vocabulary Sync',
        prompt: 'Match the macro term to its institutional definition:',
        leftTerms: ['Federal Reserve', 'Liquidity', 'Inflation'],
        rightMatches: ['Central Bank', 'Available Cash', 'Price Rise'],
        showMascot: false,
      },
      {
        id: 'c4-s2',
        type: 'SLIDER_GUESS_PERCENT',
        emoji: '🎛️',
        text: 'Risk Parameters',
        prompt: 'What percentage of retail options traders lose money due to implied volatility crush?',
        targetPercent: 85,
        showMascot: false,
      },
      {
        id: 'c4-s3',
        type: 'CHART_STORY_TAP',
        emoji: '📊',
        text: 'Simulated Price Action',
        prompt: 'The Federal Reserve unexpectedly hikes rates by 50bps. Evaluate the immediate corporate bond market reaction:',
        choices: ['🟢 Liquidity Surge / Rally', '🔴 Capital Flight / Breakdown'],
        correctChoiceIndex: 1,
        showMascot: false,
      },
      {
        id: 'c4-s4',
        type: 'STANDARD_END',
        emoji: '🏛️',
        text: 'Microstructure parameters calibrated. You are ready to analyze corporate asset sheets!',
        highlightText: 'Corporate Protocol Initialized',
        showMascot: true,
        mascotAnimation: 'celebrate',
      },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════
// MOCK MAP NODES — 8 nodes (4 per set)
// ═══════════════════════════════════════════════════════════════
type MockNode = {
  id: string;
  title: string;
  status: 'completed' | 'active' | 'locked';
  isLandmark?: boolean;
};

const MOCK_NODES: MockNode[] = [
  // ── Global Macro & Fed Policy (Indices 0–3) ──
  { id: 'n1', title: 'Macro Fundamentals',         status: 'completed' },
  { id: 'n2', title: 'Candlestick Anatomy',        status: 'completed' },
  { id: 'n3', title: 'Support & Resistance',       status: 'completed' },
  { id: 'n4', title: 'Federal Macro-Pulse Landmark', status: 'active', isLandmark: true },
  // ── Corporate Finance & Microstructure (Indices 4–7) ──
  { id: 'n5', title: 'Credit Analysis',            status: 'locked' },
  { id: 'n6', title: 'Corporate Bonds',            status: 'locked' },
  { id: 'n7', title: 'Equity Valuation',           status: 'locked' },
  { id: 'n8', title: 'Institutional Liquidity Landmark', status: 'locked', isLandmark: true },
];

// ─── DESIGN TOKENS ────────────────────────────────────────────
const THEME = {
  bg: '#FFFFFF',
  bgElevated: '#F8FAFC',
  bgCard: '#F8FAFC',
  // Institutional Navy (indices 0–3: Global Macro & Fed Policy)
  blueAccent: '#1E3A8A',
  blueDark: '#1E3370',
  blueGlow: 'rgba(30, 58, 138, 0.35)',
  // Deep Crimson (indices 4–7: Corporate Finance & Microstructure)
  redAccent: '#7F1D1D',
  redDark: '#6B1616',
  redMid: '#991B1B',
  redGlow: 'rgba(127, 29, 29, 0.35)',
  gold: '#F59E0B',
  orange: '#F59E0B',
  red: '#EF4444',
  blue: '#1D4ED8',
  textPrimary: '#0A1128',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  pillBg: '#F8FAFC',
  pillBorder: '#E2E8F0',
  lockedNode: '#E2E8F0',
  lockedNodeBorder: '#CBD5E1',
};

// ─── MASCOT ASSETS ────────────────────────────────────────────
const SHIBA_SUIT_IMG = require('../../assets/images/mascots/shiba_suit.png');
const SHIBA_CASH_IMG = require('../../assets/images/mascots/shiba_cash.png');

const MASCOT_SLOTS: Record<number, { image: any; side: 'left' | 'right'; size?: number }> = {
  2: { image: SHIBA_SUIT_IMG, side: 'left' },
  6: { image: SHIBA_CASH_IMG, side: 'right', size: 120 },
};

// ─── SINE-WAVE & LAYOUT CONSTANTS ─────────────────────────────
const SINE_AMPLITUDE = 55;
const SINE_FREQUENCY = 0.8;
const getSineOffset = (index: number): number =>
  Math.sin(index * SINE_FREQUENCY) * SINE_AMPLITUDE;

const NODE_SIZE = 76;
const NODE_RADIUS = NODE_SIZE / 2;
const ROW_HEIGHT = 90;

// ─── BREATHING IDLE MASCOT ────────────────────────────────────
const MascotItem = ({ image, style }: { image: any; style?: any }) => {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.07, { duration: 1500, easing: Easing.bezier(0.4, 0, 0.6, 1) }),
      -1,
      true
    );
  }, []);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.Image
      source={image}
      style={[{ width: 100, height: 100, resizeMode: 'contain' }, animStyle, style]}
    />
  );
};

// ─── HELPERS ──────────────────────────────────────────────────
const isRedSection = (index: number): boolean => index >= 4;
const getNodeAccent = (index: number) =>
  isRedSection(index) ? THEME.redAccent : THEME.blueAccent;
const getNodeDark = (index: number) =>
  isRedSection(index) ? THEME.redDark : THEME.blueDark;

// ═══════════════════════════════════════════════════════════════
// SLIDE VIEW COMPONENTS
// ═══════════════════════════════════════════════════════════════

// ─── TRANSLATION SELECT ─────────────────────────────────────
const TranslationSelectView = ({ slide, mascotImg, onNext }: { slide: MockSlide; mascotImg: any; onNext: () => void }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const canContinue = selectedIndex !== null;

  return (
    <View style={s.slideFrame}>
      <View style={s.slideContent}>
        {slide.showMascot && <Image source={mascotImg} style={s.slideMascot} />}
        <Text style={s.slideEmoji}>{slide.emoji}</Text>
        <Text style={s.slidePrompt}>{slide.prompt}</Text>
        <View style={s.selectionStack}>
          {slide.options?.map((opt, i) => {
            const isActive = selectedIndex === i;
            return (
              <Pressable key={i} onPress={() => setSelectedIndex(i)} style={[s.selectionButton, isActive && s.selectionButtonActive]}>
                <Text style={[s.selectionLabel, isActive && s.selectionLabelActive]}>{opt.label}</Text>
                <View style={[s.radioBadge, isActive && s.radioBadgeActive]}>
                  {isActive && <MaterialCommunityIcons name="check" size={14} color="#FFF" />}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Pressable onPress={() => canContinue && onNext()} disabled={!canContinue} style={[s.slideActionBtn, !canContinue && { opacity: 0.5, backgroundColor: '#E5E5E5' }]}>
        <Text style={[s.slideActionText, !canContinue && { color: '#AAA' }]}>Continue</Text>
        <MaterialCommunityIcons name="arrow-right" size={24} color={canContinue ? '#FFF' : '#AAA'} />
      </Pressable>
    </View>
  );
};

// ─── TRANSLATION BUILD ──────────────────────────────────────
const TranslationBuildView = ({ slide, mascotImg, onNext }: { slide: MockSlide; mascotImg: any; onNext: () => void }) => {
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [shuffledTokens, setShuffledTokens] = useState<string[]>([]);

  useEffect(() => {
    if (slide.tokens) setShuffledTokens([...slide.tokens].sort(() => Math.random() - 0.5));
  }, [slide.tokens]);

  const toggleToken = (token: string) => {
    if (selectedTokens.includes(token)) setSelectedTokens(selectedTokens.filter(t => t !== token));
    else setSelectedTokens([...selectedTokens, token]);
  };

  const canContinue = selectedTokens.length === (slide.tokens?.length || 0);

  return (
    <View style={s.slideFrame}>
      <View style={s.slideContent}>
        {slide.showMascot && <Image source={mascotImg} style={s.slideMascot} />}
        <Text style={s.slideEmoji}>{slide.emoji}</Text>
        <Text style={s.slidePrompt}>{slide.prompt}</Text>
        <View style={s.wordSlotArea}>
          {selectedTokens.map((token, i) => (
            <Pressable key={`sel-${i}`} onPress={() => toggleToken(token)} style={s.wordBrick}>
              <Text style={s.wordBrickText}>{token}</Text>
            </Pressable>
          ))}
        </View>
        <View style={s.tokenPool}>
          {shuffledTokens.map((token, i) => {
            const isUsed = selectedTokens.includes(token);
            return (
              <Pressable key={`pool-${i}`} onPress={() => !isUsed && toggleToken(token)} style={[s.wordBrick, isUsed && s.tokenBrickHidden]}>
                <Text style={[s.wordBrickText, isUsed && { color: 'transparent' }]}>{token}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Pressable onPress={() => canContinue && onNext()} disabled={!canContinue} style={[s.slideActionBtn, !canContinue && { opacity: 0.5, backgroundColor: '#E5E5E5' }]}>
        <Text style={[s.slideActionText, !canContinue && { color: '#AAA' }]}>Check Result</Text>
        <MaterialCommunityIcons name="check-bold" size={24} color={canContinue ? '#FFF' : '#AAA'} />
      </Pressable>
    </View>
  );
};

// ─── VISUAL GRID SELECT ─────────────────────────────────────
const VisualGridSelectView = ({ slide, mascotImg, onNext }: { slide: MockSlide; mascotImg: any; onNext: () => void }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const canContinue = selectedIndex !== null;

  return (
    <View style={s.slideFrame}>
      <View style={s.slideContent}>
        {slide.showMascot && <Image source={mascotImg} style={s.slideMascot} />}
        <Text style={s.slidePrompt}>{slide.prompt}</Text>
        <View style={s.visualGrid}>
          {slide.options?.map((opt, i) => {
            const isActive = selectedIndex === i;
            return (
              <Pressable key={i} onPress={() => setSelectedIndex(i)} style={[s.gridCard, isActive && s.gridCardActive]}>
                <Text style={s.gridEmoji}>{opt.label.split(' ')[0]}</Text>
                <Text style={[s.gridLabel, isActive && s.gridLabelActive]}>{opt.label.split(' ').slice(1).join(' ')}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Pressable onPress={() => canContinue && onNext()} disabled={!canContinue} style={[s.slideActionBtn, !canContinue && { opacity: 0.5, backgroundColor: '#E5E5E5' }]}>
        <Text style={[s.slideActionText, !canContinue && { color: '#AAA' }]}>Check Result</Text>
        <MaterialCommunityIcons name="check-bold" size={24} color={canContinue ? '#FFF' : '#AAA'} />
      </Pressable>
    </View>
  );
};

// ─── COMPARE EQUATION ───────────────────────────────────────
const CompareEquationView = ({ slide, onNext }: { slide: MockSlide; onNext: () => void }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const canContinue = selectedIndex !== null;

  return (
    <View style={s.slideFrame}>
      <View style={s.slideContent}>
        <Text style={s.slideEmoji}>{slide.emoji}</Text>
        <Text style={s.slidePrompt}>{slide.prompt}</Text>
        <View style={s.compareRow}>
          {slide.options?.map((opt, i) => {
            const isActive = selectedIndex === i;
            return (
              <Pressable key={i} onPress={() => setSelectedIndex(i)} style={[s.compareBox, isActive && s.compareBoxActive]}>
                <Text style={s.compareEmoji}>{opt.label.split(' ')[0]}</Text>
                <Text style={[s.compareLabel, isActive && s.compareLabelActive]}>{opt.label.split(' ').slice(1).join(' ')}</Text>
                {opt.subtext && <Text style={s.compareSubtext}>{opt.subtext}</Text>}
              </Pressable>
            );
          })}
        </View>
      </View>
      <Pressable onPress={() => canContinue && onNext()} disabled={!canContinue} style={[s.slideActionBtn, !canContinue && { opacity: 0.5, backgroundColor: '#E5E5E5' }]}>
        <Text style={[s.slideActionText, !canContinue && { color: '#AAA' }]}>Continue</Text>
        <MaterialCommunityIcons name="arrow-right" size={24} color={canContinue ? '#FFF' : '#AAA'} />
      </Pressable>
    </View>
  );
};

// ─── IMAGE LABEL MATCH ──────────────────────────────────────
const ImageLabelMatchView = ({ slide, onNext }: { slide: MockSlide; onNext: () => void }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const canContinue = selectedIndex !== null;

  return (
    <View style={s.slideFrame}>
      <View style={s.slideContent}>
        <Text style={s.slidePrompt}>{slide.prompt}</Text>
        <View style={s.illustrativeBadge}>
          <Text style={s.badgeEmoji}>{slide.centerEmoji}</Text>
        </View>
        <View style={s.radioStack}>
          {slide.options?.map((opt, i) => {
            const isActive = selectedIndex === i;
            return (
              <Pressable key={i} onPress={() => setSelectedIndex(i)} style={[s.radioRow, isActive && s.radioRowActive]}>
                <View style={[s.radioCircle, isActive && s.radioCircleActive]}>
                  {isActive && <View style={s.radioInner} />}
                </View>
                <Text style={[s.radioText, isActive && s.radioTextActive]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Pressable onPress={() => canContinue && onNext()} disabled={!canContinue} style={[s.slideActionBtn, !canContinue && { opacity: 0.5, backgroundColor: '#E5E5E5' }]}>
        <Text style={[s.slideActionText, !canContinue && { color: '#AAA' }]}>Check Result</Text>
        <MaterialCommunityIcons name="check-bold" size={24} color={canContinue ? '#FFF' : '#AAA'} />
      </Pressable>
    </View>
  );
};
// ─── TAP PAIRS MATCH ────────────────────────────────────────
const TapPairsMatchView = ({ slide, onNext }: { slide: MockSlide; onNext: () => void }) => {
  const left = slide.leftTerms || [];
  const right = slide.rightMatches || [];
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [matchedIndices, setMatchedIndices] = useState<Set<number>>(new Set());
  const [flashError, setFlashError] = useState<number | null>(null);

  const handleRightTap = (ri: number) => {
    if (selectedLeft === null || matchedIndices.has(ri)) return;
    if (selectedLeft === ri) {
      // correct match (same index pairing)
      setMatchedIndices(prev => new Set([...prev, ri]));
      setSelectedLeft(null);
    } else {
      // wrong
      setFlashError(ri);
      setTimeout(() => setFlashError(null), 500);
      setSelectedLeft(null);
    }
  };

  const canContinue = matchedIndices.size === left.length;

  return (
    <View style={s.slideFrame}>
      <View style={s.slideContent}>
        <Text style={s.slideEmoji}>{slide.emoji}</Text>
        <Text style={s.slidePrompt}>{slide.prompt}</Text>
        <View style={s.pairsContainer}>
          {/* Left column */}
          <View style={s.pairsColumn}>
            {left.map((term, i) => {
              const isMatched = matchedIndices.has(i);
              const isActive = selectedLeft === i;
              return (
                <Pressable key={`l-${i}`} onPress={() => !isMatched && setSelectedLeft(i)} style={[s.pairBtn, isMatched && s.pairBtnMatched, isActive && s.pairBtnActive]}>
                  <Text style={[s.pairBtnText, isMatched && { color: '#166534' }, isActive && { color: '#6D28D9' }]}>{term}</Text>
                </Pressable>
              );
            })}
          </View>
          {/* Right column */}
          <View style={s.pairsColumn}>
            {right.map((term, i) => {
              const isMatched = matchedIndices.has(i);
              const isError = flashError === i;
              return (
                <Pressable key={`r-${i}`} onPress={() => handleRightTap(i)} style={[s.pairBtn, isMatched && s.pairBtnMatched, isError && s.pairBtnError]}>
                  <Text style={[s.pairBtnText, isMatched && { color: '#166534' }, isError && { color: '#B91C1C' }]}>{term}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
      <Pressable onPress={() => canContinue && onNext()} disabled={!canContinue} style={[s.slideActionBtn, !canContinue && { opacity: 0.5, backgroundColor: '#E5E5E5' }]}>
        <Text style={[s.slideActionText, !canContinue && { color: '#AAA' }]}>Continue</Text>
        <MaterialCommunityIcons name="arrow-right" size={24} color={canContinue ? '#FFF' : '#AAA'} />
      </Pressable>
    </View>
  );
};

// ─── SLIDER GUESS PERCENT ───────────────────────────────────
const SliderGuessPercentView = ({ slide, onNext }: { slide: MockSlide; onNext: () => void }) => {
  const target = slide.targetPercent || 50;
  const [guess, setGuess] = useState(50);
  const [revealed, setRevealed] = useState(false);

  const handleCheck = () => setRevealed(true);
  const diff = Math.abs(guess - target);
  const isClose = diff <= 10;

  return (
    <View style={s.slideFrame}>
      <View style={s.slideContent}>
        <Text style={s.slideEmoji}>{slide.emoji}</Text>
        <Text style={s.slidePrompt}>{slide.prompt}</Text>

        {/* Big % display */}
        <View style={s.percentDisplay}>
          <Text style={[s.percentNumber, revealed && { color: isClose ? '#059669' : '#DC2626' }]}>
            {revealed ? target : guess}%
          </Text>
          {revealed && (
            <Text style={[s.percentLabel, { color: isClose ? '#059669' : '#DC2626' }]}>
              {isClose ? '✅ Excellent Estimate!' : `Your guess: ${guess}%`}
            </Text>
          )}
        </View>

        {/* Track */}
        <View style={s.sliderTrack}>
          <View style={[s.sliderFill, { width: `${revealed ? target : guess}%`, backgroundColor: revealed ? (isClose ? '#059669' : '#DC2626') : '#7C3AED' }]} />
          {revealed && (
            <View style={[s.sliderMarker, { left: `${target}%` }]}>
              <Text style={s.sliderMarkerText}>{target}%</Text>
            </View>
          )}
        </View>

        {/* Adjust buttons */}
        {!revealed && (
          <View style={s.sliderControls}>
            <Pressable onPress={() => setGuess(Math.max(0, guess - 5))} style={s.sliderAdjustBtn}><Text style={s.sliderAdjustText}>−5</Text></Pressable>
            <Pressable onPress={() => setGuess(Math.max(0, guess - 1))} style={s.sliderAdjustBtn}><Text style={s.sliderAdjustText}>−1</Text></Pressable>
            <Text style={s.sliderCurrentText}>{guess}%</Text>
            <Pressable onPress={() => setGuess(Math.min(100, guess + 1))} style={s.sliderAdjustBtn}><Text style={s.sliderAdjustText}>+1</Text></Pressable>
            <Pressable onPress={() => setGuess(Math.min(100, guess + 5))} style={s.sliderAdjustBtn}><Text style={s.sliderAdjustText}>+5</Text></Pressable>
          </View>
        )}
      </View>
      <Pressable onPress={revealed ? onNext : handleCheck} style={s.slideActionBtn}>
        <Text style={s.slideActionText}>{revealed ? 'Continue' : 'Check Answer'}</Text>
        <MaterialCommunityIcons name={revealed ? 'arrow-right' : 'eye-outline'} size={24} color="#FFF" />
      </Pressable>
    </View>
  );
};

// ─── CHART STORY TAP ────────────────────────────────────────
const ChartStoryTapView = ({ slide, onNext }: { slide: MockSlide; onNext: () => void }) => {
  const choices = slide.choices || [];
  const correctIndex = slide.correctChoiceIndex ?? 0;
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const revealed = selectedChoice !== null;
  const isCorrect = selectedChoice === correctIndex;

  // Mini chart data: simulated price bars
  const chartBars = [40, 48, 42, 55, 60, 52, 58, 50, 45, 38, 42];
  const resultBars = isCorrect ? [30, 22, 18] : [50, 55, 62]; // down vs up

  return (
    <View style={s.slideFrame}>
      <View style={s.slideContent}>
        <Text style={s.slideEmoji}>{slide.emoji}</Text>
        <Text style={s.slidePrompt}>{slide.prompt}</Text>

        {/* Mini chart visualization */}
        <View style={s.miniChart}>
          <View style={s.chartBarsRow}>
            {chartBars.map((h, i) => (
              <View key={`b-${i}`} style={[s.chartBar, { height: h }]} />
            ))}
            {revealed && resultBars.map((h, i) => (
              <View key={`r-${i}`} style={[s.chartBar, { height: h, backgroundColor: isCorrect ? '#059669' : '#DC2626' }]} />
            ))}
            {!revealed && (
              <View style={s.chartCutoff}>
                <Text style={s.chartCutoffText}>?</Text>
              </View>
            )}
          </View>
        </View>

        {/* Choice buttons */}
        <View style={s.chartChoices}>
          {choices.map((choice, i) => {
            const isActive = selectedChoice === i;
            const isRight = revealed && i === correctIndex;
            const isWrong = revealed && isActive && !isRight;
            return (
              <Pressable key={i} onPress={() => !revealed && setSelectedChoice(i)} style={[s.chartChoiceBtn, isRight && s.chartChoiceBtnCorrect, isWrong && s.chartChoiceBtnWrong, isActive && !revealed && s.chartChoiceBtnActive]}>
                <Text style={[s.chartChoiceText, (isRight || isWrong) && { color: '#FFF' }]}>{choice}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Pressable onPress={() => revealed && onNext()} disabled={!revealed} style={[s.slideActionBtn, !revealed && { opacity: 0.5, backgroundColor: '#E5E5E5' }]}>
        <Text style={[s.slideActionText, !revealed && { color: '#AAA' }]}>Continue</Text>
        <MaterialCommunityIcons name="arrow-right" size={24} color={revealed ? '#FFF' : '#AAA'} />
      </Pressable>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════
export default function LearnScreen() {
  const streak = 12;
  const gems = 500;
  const hearts = 5;

  const bounceAnim = useRef(new RNAnimated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  // ─── Lesson modal state ───────────────────────────────────
  const [selectedCourse, setSelectedCourse] = useState<MockCourse | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [pressedNodeId, setPressedNodeId] = useState<string | null>(null);

  useEffect(() => {
    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(bounceAnim, { toValue: -10, duration: 600, useNativeDriver: true }),
        RNAnimated.timing(bounceAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, [bounceAnim]);

  // ─── NODE PRESS (double-tap to open) ──────────────────────
  const handleNodePress = (node: MockNode) => {
    if (node.status === 'locked') return;
    const course = MOCK_COURSES[node.id];
    if (!course) return;

    if (pressedNodeId === node.id) {
      // Second tap: open lesson
      setPressedNodeId(null);
      setSelectedCourse(course);
      setActiveSlide(0);
    } else {
      setPressedNodeId(node.id);
    }
  };

  // ─── NEXT SLIDE ───────────────────────────────────────────
  const nextSlide = () => {
    if (!selectedCourse) return;
    if (activeSlide < selectedCourse.slides.length - 1) {
      const next = activeSlide + 1;
      setActiveSlide(next);
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
    } else {
      setSelectedCourse(null);
    }
  };

  // ─── SLIDE RENDERER ───────────────────────────────────────
  const renderSlide = ({ item }: { item: MockSlide }) => {
    const mascotImg = SHIBA_SUIT_IMG;

    switch (item.type) {
      case 'TRANSLATION_SELECT':
        return <TranslationSelectView slide={item} mascotImg={mascotImg} onNext={nextSlide} />;
      case 'TRANSLATION_BUILD':
        return <TranslationBuildView slide={item} mascotImg={mascotImg} onNext={nextSlide} />;
      case 'VISUAL_GRID_SELECT':
        return <VisualGridSelectView slide={item} mascotImg={mascotImg} onNext={nextSlide} />;
      case 'COMPARE_EQUATION':
        return <CompareEquationView slide={item} onNext={nextSlide} />;
      case 'IMAGE_LABEL_MATCH':
        return <ImageLabelMatchView slide={item} onNext={nextSlide} />;
      case 'TAP_PAIRS_MATCH':
        return <TapPairsMatchView slide={item} onNext={nextSlide} />;
      case 'SLIDER_GUESS_PERCENT':
        return <SliderGuessPercentView slide={item} onNext={nextSlide} />;
      case 'CHART_STORY_TAP':
        return <ChartStoryTapView slide={item} onNext={nextSlide} />;
      case 'STANDARD_END':
      default:
        return (
          <View style={s.slideFrame}>
            <View style={s.slideContent}>
              {item.showMascot && <Image source={mascotImg} style={s.slideMascot} />}
              <Text style={s.slideEmoji}>{item.emoji}</Text>
              {item.highlightText && <Text style={s.slideHighlight}>{item.highlightText}</Text>}
              <Text style={s.slideBody}>{item.text}</Text>
            </View>
            <Pressable onPress={nextSlide} style={s.slideActionBtn}>
              <Text style={s.slideActionText}>
                {activeSlide === (selectedCourse?.slides.length || 0) - 1 ? 'Finish Module' : 'Continue'}
              </Text>
              <MaterialCommunityIcons name="arrow-right" size={24} color="#FFF" />
            </Pressable>
          </View>
        );
    }
  };

  // ─── NODE CIRCLE ──────────────────────────────────────────
  const renderNodeCircle = (node: MockNode, index: number) => {
    const accent = getNodeAccent(index);
    const dark = getNodeDark(index);
    const hasCourse = !!MOCK_COURSES[node.id];

    const circle = (() => {
      if (node.status === 'completed') {
        return (
          <View style={[s.nodeOuter3D, { backgroundColor: dark }]}>
            <View style={[s.nodeInner, { backgroundColor: accent, shadowColor: accent }]}>
              <MaterialCommunityIcons name="check-bold" size={32} color="#FFF" />
            </View>
          </View>
        );
      }
      if (node.status === 'active') {
        return (
          <View style={[s.nodeOuter3D, { backgroundColor: dark }]}>
            <View style={[s.nodeInner, { backgroundColor: accent, shadowColor: accent, shadowOpacity: 0.5, shadowRadius: 12, elevation: 10 }]}>
              <MaterialCommunityIcons name="star-four-points" size={32} color="#FFF" />
            </View>
          </View>
        );
      }
      return (
        <View style={s.nodeOuter3D_locked}>
          <View style={s.nodeInner_locked}>
            <MaterialCommunityIcons name="lock" size={26} color={THEME.textMuted} />
          </View>
        </View>
      );
    })();

    if (hasCourse && node.status !== 'locked') {
      return (
        <Pressable onPress={() => handleNodePress(node)} style={({ pressed }) => [pressed && { transform: [{ scale: 0.95 }] }]}>
          {circle}
        </Pressable>
      );
    }
    return circle;
  };

  // ─── TRAIL ROW ────────────────────────────────────────────
  const renderTrailRow = (node: MockNode, index: number) => {
    const horizontalOffset = getSineOffset(index);
    const isLandmark = node.isLandmark === true;
    const accent = getNodeAccent(index);
    const mascotSlot = MASCOT_SLOTS[index];
    const isPressed = pressedNodeId === node.id;

    const hasCourseForLandmark = !!MOCK_COURSES[node.id];

    const nodeElement = isLandmark ? (
      <View style={s.nodeWrapper}>
        {/* Landmark tooltip */}
        {isPressed && hasCourseForLandmark && (
          <View style={s.floatingLabel}>
            <Text style={s.floatingLabelText}>{node.title}</Text>
            <Text style={s.floatingLabelHint}>Tap again to start</Text>
            <View style={s.floatingLabelArrow} />
          </View>
        )}
        {hasCourseForLandmark && node.status !== 'locked' ? (
          <Pressable onPress={() => handleNodePress(node)} style={({ pressed }) => [pressed && { transform: [{ scale: 0.95 }] }]}>
            <RNAnimated.Text style={[s.landmarkEmoji, node.status === 'active' && { transform: [{ translateY: bounceAnim }] }]}>
              🏛️
            </RNAnimated.Text>
          </Pressable>
        ) : (
          <RNAnimated.Text style={[s.landmarkEmoji, node.status === 'active' && { transform: [{ translateY: bounceAnim }] }, node.status === 'locked' && { opacity: 0.45 }]}>
            🏛️
          </RNAnimated.Text>
        )}
        <Text style={[s.landmarkLabel, { color: node.status === 'locked' ? THEME.textMuted : accent }]}>{node.title}</Text>
      </View>
    ) : (
      <View style={s.nodeWrapper}>
        {/* Tooltip */}
        {isPressed && (
          <View style={s.floatingLabel}>
            <Text style={s.floatingLabelText}>{node.title}</Text>
            <Text style={s.floatingLabelHint}>Tap again to start</Text>
            <View style={s.floatingLabelArrow} />
          </View>
        )}
        {renderNodeCircle(node, index)}
      </View>
    );

    if (mascotSlot) {
      const mascotSize = mascotSlot.size;
      const mascotView = (
        <View style={[s.mascotSlotContainer, mascotSize && { width: mascotSize, height: mascotSize }]}>
          <MascotItem image={mascotSlot.image} style={mascotSize ? { width: mascotSize, height: mascotSize } : undefined} />
        </View>
      );
      return (
        <View key={node.id} style={s.mascotRow}>
          {mascotSlot.side === 'left' ? (
            <>
              {mascotView}
              <View style={[s.nodeCenter, { transform: [{ translateX: horizontalOffset }] }]}>{nodeElement}</View>
              <View style={s.mascotSlotSpacer} />
            </>
          ) : (
            <>
              <View style={s.mascotSlotSpacer} />
              <View style={[s.nodeCenter, { transform: [{ translateX: horizontalOffset }] }]}>{nodeElement}</View>
              {mascotView}
            </>
          )}
        </View>
      );
    }

    return (
      <View key={node.id} style={s.pathRow}>
        <View style={{ transform: [{ translateX: horizontalOffset }] }}>{nodeElement}</View>
      </View>
    );
  };

  const renderSectionDivider = () => (
    <View style={s.sectionDivider}>
      <View style={s.dividerLine} />
      <View style={s.dividerPill}><Text style={s.dividerPillText}>🏦  CORPORATE FINANCE</Text></View>
      <View style={s.dividerLine} />
    </View>
  );

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Status Bar */}
      <View style={s.statusBar}>
        <View style={s.statusPill}><Text style={s.flagEmoji}>🇫🇷</Text></View>
        <View style={s.statusPill}>
          <MaterialCommunityIcons name="fire" size={20} color={THEME.orange} />
          <Text style={s.statusPillText}>{streak}</Text>
        </View>
        <View style={s.statusPill}>
          <MaterialCommunityIcons name="diamond-stone" size={20} color={THEME.blue} />
          <Text style={s.statusPillText}>{gems}</Text>
        </View>
        <View style={s.statusPill}>
          <MaterialCommunityIcons name="heart" size={20} color={THEME.red} />
          <Text style={s.statusPillText}>{hearts}</Text>
        </View>
      </View>

      {/* Unit Header */}
      <View style={s.unitHeaderCard}>
        <View style={s.unitHeaderLeft}>
          <Text style={s.unitHeaderLabel}>SECTION 1, UNIT 1</Text>
          <Text style={s.unitHeaderTitle}>Technical Analysis</Text>
        </View>
        <View style={s.unitHeaderBtn}>
          <MaterialCommunityIcons name="notebook-outline" size={28} color="#FFFFFF" />
        </View>
      </View>

      {/* Serpentine Path */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {MOCK_NODES.map((node, index) => {
          const elements = [];
          if (index === 4) elements.push(<React.Fragment key="divider">{renderSectionDivider()}</React.Fragment>);
          elements.push(renderTrailRow(node, index));
          return elements;
        })}
        <View style={{ height: 60 }} />
      </ScrollView>

      {/* ─── LESSON MODAL ─────────────────────────────────── */}
      <Modal visible={!!selectedCourse} animationType="slide" transparent>
        <View style={s.modalBackdrop}>
          <View style={s.lessonStage}>
            <SafeAreaView style={{ flex: 1 }}>
              {/* Progress bar + close */}
              <View style={s.lessonTop}>
                <View style={s.progressBarBg}>
                  <View style={[s.progressBarFill, { width: `${((activeSlide + 1) / (selectedCourse?.slides.length || 1)) * 100}%` }]} />
                </View>
                <Pressable onPress={() => setSelectedCourse(null)} style={s.exitBtn}>
                  <MaterialCommunityIcons name="close" size={32} color={THEME.textMuted} />
                </Pressable>
              </View>

              {/* Slides */}
              <FlatList
                ref={flatListRef}
                data={selectedCourse?.slides}
                renderItem={renderSlide}
                horizontal
                pagingEnabled
                scrollEnabled={false}
                showsHorizontalScrollIndicator={false}
                keyExtractor={item => item.id}
                onScrollToIndexFailed={info => {
                  setTimeout(() => flatListRef.current?.scrollToIndex({ index: info.index, animated: false }), 100);
                }}
              />
            </SafeAreaView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  // ─── STATUS BAR ──────────────────────────────────────────
  statusBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF' },
  statusPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.pillBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: THEME.pillBorder, gap: 4 },
  flagEmoji: { fontSize: 18 },
  statusPillText: { fontSize: 15, fontWeight: '800', color: THEME.textPrimary },

  // ─── UNIT HEADER ─────────────────────────────────────────
  unitHeaderCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 8, marginBottom: 4, paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#1D4ED8', borderRadius: 16 },
  unitHeaderLeft: { flex: 1, marginRight: 12 },
  unitHeaderLabel: { fontSize: 12, fontWeight: '800', color: '#E2E8F0', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 },
  unitHeaderTitle: { fontSize: 18, fontWeight: '900', color: '#FFFFFF' },
  unitHeaderBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },

  // ─── SERPENTINE PATH ─────────────────────────────────────
  scrollContent: { paddingBottom: 10, paddingTop: 14, paddingHorizontal: 16 },
  pathRow: { height: ROW_HEIGHT, width: '100%', justifyContent: 'center', alignItems: 'center', overflow: 'visible' },
  nodeWrapper: { position: 'relative', alignItems: 'center', justifyContent: 'center', width: NODE_SIZE, height: NODE_SIZE, zIndex: 2 },

  // ─── NODE DESIGNS ────────────────────────────────────────
  nodeOuter3D: { width: NODE_SIZE, height: NODE_SIZE + 6, borderRadius: NODE_RADIUS, justifyContent: 'flex-start', alignItems: 'center' },
  nodeInner: { width: NODE_SIZE, height: NODE_SIZE, borderRadius: NODE_RADIUS, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 6, borderBottomColor: 'rgba(0,0,0,0.2)', elevation: 8, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
  nodeOuter3D_locked: { width: NODE_SIZE, height: NODE_SIZE + 6, borderRadius: NODE_RADIUS, backgroundColor: THEME.lockedNodeBorder, justifyContent: 'flex-start', alignItems: 'center', opacity: 0.7 },
  nodeInner_locked: { width: NODE_SIZE, height: NODE_SIZE, borderRadius: NODE_RADIUS, backgroundColor: THEME.lockedNode, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 6, borderBottomColor: 'rgba(0,0,0,0.15)' },

  // ─── LANDMARK ────────────────────────────────────────────
  landmarkEmoji: { fontSize: 52, textAlign: 'center' },
  landmarkLabel: { fontSize: 11, fontWeight: '900', textAlign: 'center', letterSpacing: 0.5, marginTop: 2 },

  // ─── TOOLTIP ─────────────────────────────────────────────
  floatingLabel: { position: 'absolute', bottom: NODE_SIZE + 14, backgroundColor: THEME.bgCard, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, zIndex: 1000, minWidth: 140, maxWidth: 190, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 6 },
  floatingLabelText: { color: THEME.textPrimary, fontWeight: '800', fontSize: 13, textAlign: 'center' },
  floatingLabelHint: { color: THEME.blueAccent, fontWeight: '700', fontSize: 10, marginTop: 3 },
  floatingLabelArrow: { position: 'absolute', bottom: -8, width: 0, height: 0, borderLeftWidth: 8, borderLeftColor: 'transparent', borderRightWidth: 8, borderRightColor: 'transparent', borderTopWidth: 8, borderTopColor: THEME.bgCard },

  // ─── SECTION DIVIDER ─────────────────────────────────────
  sectionDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 18, paddingHorizontal: 10 },
  dividerLine: { flex: 1, height: 2, backgroundColor: '#E2E8F0', borderRadius: 1 },
  dividerPill: { backgroundColor: THEME.redAccent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginHorizontal: 10 },
  dividerPillText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 1 },

  // ─── MASCOT ROW ──────────────────────────────────────────
  mascotRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 20, height: ROW_HEIGHT, overflow: 'visible' },
  mascotSlotContainer: { width: 100, height: 100, justifyContent: 'center', alignItems: 'center' },
  mascotSlotSpacer: { width: 100 },
  nodeCenter: { alignItems: 'center', justifyContent: 'center' },

  // ─── LESSON MODAL ────────────────────────────────────────
  modalBackdrop: { flex: 1 },
  lessonStage: { flex: 1, backgroundColor: '#FFFFFF' },
  lessonTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10, gap: 12 },
  progressBarBg: { flex: 1, height: 12, backgroundColor: 'rgba(124,58,237,0.15)', borderRadius: 6, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#7C3AED', borderRadius: 6 },
  exitBtn: { padding: 4 },

  // ─── SLIDE FRAME ─────────────────────────────────────────
  slideFrame: { width: SCREEN_WIDTH, paddingHorizontal: 30, paddingTop: 5, paddingBottom: 30, justifyContent: 'space-between', flex: 1 },
  slideContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  slideMascot: { width: 120, height: 120, resizeMode: 'contain', marginBottom: 10 },
  slideEmoji: { fontSize: 56, marginBottom: 10 },
  slideHighlight: { fontSize: 24, fontWeight: '900', color: '#0A192F', textAlign: 'center', marginBottom: 8 },
  slideBody: { fontSize: 17, color: '#1E3A8A', textAlign: 'center', fontWeight: '700' },
  slidePrompt: { fontSize: 18, fontWeight: '800', color: '#0A192F', textAlign: 'center', marginBottom: 20, paddingHorizontal: 10 },
  slideActionBtn: { backgroundColor: '#7C3AED', paddingVertical: 16, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 4 },
  slideActionText: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', marginRight: 10 },

  // ─── TRANSLATION SELECT ──────────────────────────────────
  selectionStack: { width: '100%', gap: 12 },
  selectionButton: { backgroundColor: '#FFF', borderWidth: 2, borderColor: '#E5E5E5', borderBottomWidth: 4, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectionButtonActive: { borderColor: '#7C3AED', backgroundColor: '#EDE9FE' },
  selectionLabel: { fontSize: 15, fontWeight: '700', color: '#4B4B4B', flex: 1 },
  selectionLabelActive: { color: '#6D28D9' },
  radioBadge: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#E5E5E5', backgroundColor: '#FFF' },
  radioBadgeActive: { borderColor: '#7C3AED', backgroundColor: '#7C3AED', justifyContent: 'center', alignItems: 'center' },

  // ─── TRANSLATION BUILD ───────────────────────────────────
  wordSlotArea: { minHeight: 80, width: '100%', borderTopWidth: 2, borderBottomWidth: 2, borderColor: '#E5E5E5', paddingVertical: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20, justifyContent: 'center' },
  wordBrick: { backgroundColor: '#FFF', borderWidth: 2, borderColor: '#E5E5E5', borderBottomWidth: 4, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 10 },
  wordBrickText: { fontSize: 16, fontWeight: '700', color: '#4B4B4B' },
  tokenPool: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', width: '100%' },
  tokenBrickHidden: { opacity: 0.2, backgroundColor: '#E5E5E5' },

  // ─── VISUAL GRID SELECT ──────────────────────────────────
  visualGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, width: '100%' },
  gridCard: { width: (SCREEN_WIDTH - 92) / 2, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#E5E5E5', borderBottomWidth: 5, borderRadius: 20, padding: 20, alignItems: 'center', justifyContent: 'center' },
  gridCardActive: { borderColor: '#7C3AED', backgroundColor: '#EDE9FE', borderBottomWidth: 2 },
  gridEmoji: { fontSize: 42, marginBottom: 10 },
  gridLabel: { fontSize: 14, fontWeight: '700', color: '#4B4B4B', textAlign: 'center' },
  gridLabelActive: { color: '#6D28D9' },

  // ─── COMPARE EQUATION ────────────────────────────────────
  compareRow: { flexDirection: 'row', gap: 12, width: '100%', paddingHorizontal: 10 },
  compareBox: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#E5E5E5', borderBottomWidth: 5, borderRadius: 20, padding: 16, alignItems: 'center' },
  compareBoxActive: { borderColor: '#7C3AED', backgroundColor: '#EDE9FE', borderBottomWidth: 2 },
  compareEmoji: { fontSize: 36, marginBottom: 8 },
  compareLabel: { fontSize: 13, fontWeight: '800', color: '#4B4B4B', textAlign: 'center' },
  compareLabelActive: { color: '#6D28D9' },
  compareSubtext: { fontSize: 11, fontWeight: '600', color: '#777', marginTop: 4, textAlign: 'center' },

  // ─── IMAGE LABEL MATCH ───────────────────────────────────
  illustrativeBadge: { backgroundColor: '#F7F7F7', borderRadius: 24, padding: 30, width: SCREEN_WIDTH - 100, alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 2, borderColor: '#E5E5E5' },
  badgeEmoji: { fontSize: 64 },
  radioStack: { width: '100%', gap: 10 },
  radioRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FC', borderWidth: 2, borderColor: '#E2E8F0', borderRadius: 16, padding: 16, gap: 12 },
  radioRowActive: { borderColor: '#7C3AED', backgroundColor: '#EDE9FE' },
  radioCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  radioCircleActive: { borderColor: '#7C3AED', backgroundColor: '#7C3AED' },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFFFFF' },
  radioText: { fontSize: 14, fontWeight: '700', color: '#0A192F', flex: 1 },
  radioTextActive: { color: '#6D28D9' },
});