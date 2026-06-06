import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
  Dimensions,
  Image,
  LogBox,
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
// MOCK DATA — 12 nodes for visual layout test
// ═══════════════════════════════════════════════════════════════
type MockNode = {
  id: string;
  title: string;
  status: 'completed' | 'active' | 'locked';
  /** If true, this is the landmark checkpoint node */
  isLandmark?: boolean;
};

const MOCK_NODES: MockNode[] = [
  { id: 'n1',  title: 'Market Basics',         status: 'completed' },
  { id: 'n2',  title: 'Candlestick Patterns',  status: 'completed' },
  { id: 'n3',  title: 'Support & Resistance',  status: 'completed' },
  { id: 'n4',  title: 'Moving Averages',        status: 'active' },
  { id: 'n5',  title: 'Volume Analysis',        status: 'locked' },
  { id: 'n6',  title: 'Bullish Milestone',      status: 'locked', isLandmark: true },
  { id: 'n7',  title: 'Short Selling 101',      status: 'locked' },
  { id: 'n8',  title: 'Put Options',            status: 'locked' },
  { id: 'n9',  title: 'Bear Flags & Wedges',    status: 'locked' },
  { id: 'n10', title: 'Inverse ETFs',           status: 'locked' },
  { id: 'n11', title: 'Risk Management',        status: 'locked' },
  { id: 'n12', title: 'Bearish Milestone',       status: 'locked', isLandmark: true },
];

// ─── DESIGN TOKENS ────────────────────────────────────────────
const THEME = {
  bg: '#FFFFFF',
  bgElevated: '#F8FAFC',
  bgCard: '#F8FAFC',

  // Blue track (nodes 1–6)
  blueAccent: '#1D4ED8',
  blueDark: '#1E40AF',
  blueGlow: 'rgba(29, 78, 216, 0.35)',

  // Red track (nodes 7–12)
  redAccent: '#991B1B',
  redDark: '#7F1D1D',
  redMid: '#B91C1C',
  redGlow: 'rgba(153, 27, 27, 0.35)',

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

  connectorBlue: '#1D4ED8',
  connectorRed: '#991B1B',
  connectorLocked: '#E2E8F0',
};

// ─── MASCOT REGISTRY ──────────────────────────────────────────
const SHIBA_SUIT_IMG = require('../../assets/images/mascots/shiba_suit.png');
const SHIBA_CASH_IMG = require('../../assets/images/mascots/shiba_cash.png');

// ─── SINE-WAVE CONSTANTS ──────────────────────────────────────
const SINE_AMPLITUDE = 55;
const SINE_FREQUENCY = 0.8;

/** Returns the horizontal translateX for a node at a given index */
const getSineOffset = (index: number): number =>
  Math.sin(index * SINE_FREQUENCY) * SINE_AMPLITUDE;

// ─── LAYOUT CONSTANTS ─────────────────────────────────────────
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

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.Image
      source={image}
      style={[{ width: 80, height: 80, resizeMode: 'contain' }, animStyle, style]}
    />
  );
};

// ─── HELPER: Is this node in the red (bearish) section? ───────
const isRedSection = (index: number): boolean => index >= 6;

// ─── HELPER: Get accent color for a node by index ─────────────
const getNodeAccent = (index: number) =>
  isRedSection(index) ? THEME.redAccent : THEME.blueAccent;

const getNodeDark = (index: number) =>
  isRedSection(index) ? THEME.redDark : THEME.blueDark;

const getConnectorColor = (index: number, status: string) => {
  if (status === 'locked') return THEME.connectorLocked;
  return isRedSection(index) ? THEME.connectorRed : THEME.connectorBlue;
};

// ═══════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════
export default function LearnScreen() {
  const streak = 12;
  const gems = 500;
  const hearts = 5;

  const bounceAnim = useRef(new RNAnimated.Value(0)).current;

  // ─── BOUNCE ANIMATION (landmark node) ────────────────────
  useEffect(() => {
    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(bounceAnim, { toValue: -10, duration: 600, useNativeDriver: true }),
        RNAnimated.timing(bounceAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, [bounceAnim]);

  // ─── RENDER A SINGLE TRAIL NODE ───────────────────────────
  const renderTrailNode = (node: MockNode, index: number) => {
    const isCompleted = node.status === 'completed';
    const isActive = node.status === 'active';
    const isLocked = node.status === 'locked';
    const isLandmark = node.isLandmark === true;

    const horizontalOffset = getSineOffset(index);
    const accent = getNodeAccent(index);
    const dark = getNodeDark(index);

    // ── LANDMARK CHECKPOINT NODE ──────────────────────────
    if (isLandmark) {
      return (
        <View key={node.id} style={styles.pathRow}>
          {/* Node wrapper */}
          <View
            style={[
              styles.nodeWrapper,
              { transform: [{ translateX: horizontalOffset }] },
            ]}
          >
            <RNAnimated.Text
              style={[
                styles.landmarkEmoji,
                isActive && { transform: [{ translateY: bounceAnim }] },
                isLocked && { opacity: 0.45 },
              ]}
            >
              🏛️
            </RNAnimated.Text>
            <Text
              style={[
                styles.landmarkLabel,
                { color: isLocked ? THEME.textMuted : accent },
              ]}
            >
              {node.title}
            </Text>
          </View>
        </View>
      );
    }

    // ── STANDARD CIRCLE NODE ──────────────────────────────
    const NodeCircle = () => {
      if (isCompleted) {
        return (
          <View style={[styles.nodeOuter3D, { backgroundColor: dark }]}>
            <View
              style={[
                styles.nodeInner,
                {
                  backgroundColor: accent,
                  shadowColor: accent,
                },
              ]}
            >
              <MaterialCommunityIcons name="check-bold" size={32} color="#FFF" />
            </View>
          </View>
        );
      }

      if (isActive) {
        return (
          <View style={[styles.nodeOuter3D, { backgroundColor: dark }]}>
            <View
              style={[
                styles.nodeInner,
                {
                  backgroundColor: accent,
                  shadowColor: accent,
                  shadowOpacity: 0.5,
                  shadowRadius: 12,
                  elevation: 10,
                },
              ]}
            >
              <MaterialCommunityIcons name="star-four-points" size={32} color="#FFF" />
            </View>
          </View>
        );
      }

      // Locked
      return (
        <View style={[styles.nodeOuter3D_locked]}>
          <View style={styles.nodeInner_locked}>
            <MaterialCommunityIcons name="lock" size={26} color={THEME.textMuted} />
          </View>
        </View>
      );
    };

    return (
      <View key={node.id} style={styles.pathRow}>
        {/* Node wrapper — translateX drives the sine weave */}
        <View
          style={[
            styles.nodeWrapper,
            { transform: [{ translateX: horizontalOffset }] },
          ]}
        >
          <NodeCircle />
        </View>
      </View>
    );
  };

  // ─── SECTION DIVIDER between blue & red tracks ────────────
  const renderSectionDivider = () => (
    <View style={styles.sectionDivider}>
      <View style={styles.dividerLine} />
      <View style={styles.dividerPill}>
        <Text style={styles.dividerPillText}>📉  BEARISH TRACK</Text>
      </View>
      <View style={styles.dividerLine} />
    </View>
  );

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* ─── TOP STATUS BAR ────────────────────────────────── */}
      <View style={styles.statusBar}>
        <View style={styles.statusPill}>
          <Text style={styles.flagEmoji}>🇫🇷</Text>
        </View>
        <View style={styles.statusPill}>
          <MaterialCommunityIcons name="fire" size={20} color={THEME.orange} />
          <Text style={styles.statusPillText}>{streak}</Text>
        </View>
        <View style={styles.statusPill}>
          <MaterialCommunityIcons name="diamond-stone" size={20} color={THEME.blue} />
          <Text style={styles.statusPillText}>{gems}</Text>
        </View>
        <View style={styles.statusPill}>
          <MaterialCommunityIcons name="heart" size={20} color={THEME.red} />
          <Text style={styles.statusPillText}>{hearts}</Text>
        </View>
      </View>

      {/* ─── UNIT HEADER CARD ──────────────────────────────── */}
      <View style={styles.unitHeaderCard}>
        <View style={styles.unitHeaderLeft}>
          <Text style={styles.unitHeaderLabel}>SECTION 1, UNIT 1</Text>
          <Text style={styles.unitHeaderTitle}>Technical Analysis</Text>
        </View>
        <View style={styles.unitHeaderBtn}>
          <MaterialCommunityIcons name="notebook-outline" size={28} color="#FFFFFF" />
        </View>
      </View>

      {/* ─── SCROLLING SERPENTINE PATH ─────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Blue section nodes (indices 0–5) */}
        {MOCK_NODES.slice(0, 6).map((node, index) => renderTrailNode(node, index))}

        {/* Section divider */}
        {renderSectionDivider()}

        {/* Red section nodes (indices 6–11) */}
        {MOCK_NODES.slice(6).map((node, index) => renderTrailNode(node, index + 6))}

        {/* Bottom padding */}
        <View style={{ height: 60 }} />
      </ScrollView>

      {/* ═══════════════════════════════════════════════════════
          STATIC MASCOT OVERLAYS — absolutely positioned,
          anchored to the scroll container, NOT following screen
          ═══════════════════════════════════════════════════════ */}

      {/* Mascot #1 — Blue Section: Shiba Suit near node 2-3 (left side) */}
      <View style={styles.mascotBlueSection} pointerEvents="none">
        <MascotItem image={SHIBA_SUIT_IMG} />
      </View>

      {/* Mascot #2 — Red Section: Shiba Suit near node 7 (left side) */}
      <View style={styles.mascotRedLeft} pointerEvents="none">
        <MascotItem image={SHIBA_SUIT_IMG} />
      </View>

      {/* Mascot #3 — Red Section: Shiba Cash near node 10 (right side) */}
      <View style={styles.mascotRedRight} pointerEvents="none">
        <MascotItem image={SHIBA_CASH_IMG} />
      </View>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  // ─── ROOT ─────────────────────────────────────────────────
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  // ─── STATUS BAR ───────────────────────────────────────────
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.pillBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.pillBorder,
    gap: 4,
  },
  flagEmoji: { fontSize: 18 },
  statusPillText: { fontSize: 15, fontWeight: '800', color: THEME.textPrimary },

  // ─── UNIT HEADER ──────────────────────────────────────────
  unitHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1D4ED8',
    borderRadius: 16,
  },
  unitHeaderLeft: { flex: 1, marginRight: 12 },
  unitHeaderLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E2E8F0',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  unitHeaderTitle: { fontSize: 18, fontWeight: '900', color: '#FFFFFF' },
  unitHeaderBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── SERPENTINE PATH ──────────────────────────────────────
  scrollContent: {
    paddingBottom: 10,
    paddingTop: 14,
    paddingHorizontal: 16,
  },

  /**
   * pathRow — uniform height container for each step.
   * overflow: 'visible' so mascots can bleed past edges.
   */
  pathRow: {
    height: ROW_HEIGHT,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },

  /**
   * nodeWrapper — receives `transform: [{ translateX }]`.
   */
  nodeWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: NODE_SIZE,
    height: NODE_SIZE,
    zIndex: 2,
  },

  // ─── NODE DESIGNS ─────────────────────────────────────────
  nodeOuter3D: {
    width: NODE_SIZE,
    height: NODE_SIZE + 6,
    borderRadius: NODE_RADIUS,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  nodeInner: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_RADIUS,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 6,
    borderBottomColor: 'rgba(0,0,0,0.2)',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },

  nodeOuter3D_locked: {
    width: NODE_SIZE,
    height: NODE_SIZE + 6,
    borderRadius: NODE_RADIUS,
    backgroundColor: THEME.lockedNodeBorder,
    justifyContent: 'flex-start',
    alignItems: 'center',
    opacity: 0.7,
  },
  nodeInner_locked: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_RADIUS,
    backgroundColor: THEME.lockedNode,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 6,
    borderBottomColor: 'rgba(0,0,0,0.15)',
  },

  // ─── LANDMARK CHECKPOINT ──────────────────────────────────
  landmarkEmoji: {
    fontSize: 52,
    textAlign: 'center',
  },
  landmarkLabel: {
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginTop: 2,
  },

  // ─── SECTION DIVIDER ─────────────────────────────────────
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    paddingHorizontal: 10,
  },
  dividerLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    borderRadius: 1,
  },
  dividerPill: {
    backgroundColor: THEME.redAccent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 10,
  },
  dividerPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },

  // ─── STATIC MASCOT PLACEMENTS ─────────────────────────────
  // Mascot #1: Blue section, near node 2-3, left side
  mascotBlueSection: {
    position: 'absolute',
    // Approximate vertical position for node index ~2–3
    // statusBar(~50) + unitHeader(~80) + scrollPaddingTop(14) + 2.5*ROW_HEIGHT
    top: 370,
    left: 16,
    zIndex: 99,
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Mascot #2: Red section, near node 7, left side
  mascotRedLeft: {
    position: 'absolute',
    // ~statusBar + unitHeader + 7*ROW_HEIGHT + sectionDivider
    top: 830,
    left: 16,
    zIndex: 99,
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Mascot #3: Red section, near node 10, right side
  mascotRedRight: {
    position: 'absolute',
    top: 1080,
    right: 16,
    zIndex: 99,
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
});