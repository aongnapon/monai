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
// MOCK DATA — 8 nodes (4 per set) for visual layout test
// ═══════════════════════════════════════════════════════════════
type MockNode = {
  id: string;
  title: string;
  status: 'completed' | 'active' | 'locked';
  /** If true, this is the landmark checkpoint node */
  isLandmark?: boolean;
};

const MOCK_NODES: MockNode[] = [
  // ── Blue / Bullish Set (Indices 0–3) ──
  { id: 'n1', title: 'Market Basics',        status: 'completed' },
  { id: 'n2', title: 'Candlestick Patterns', status: 'completed' },
  { id: 'n3', title: 'Support & Resistance', status: 'active' },
  { id: 'n4', title: 'Bullish Milestone',    status: 'locked', isLandmark: true },
  // ── Red / Bearish Set (Indices 4–7) ──
  { id: 'n5', title: 'Short Selling 101',    status: 'locked' },
  { id: 'n6', title: 'Put Options',          status: 'locked' },
  { id: 'n7', title: 'Bear Flags & Wedges',  status: 'locked' },
  { id: 'n8', title: 'Bearish Milestone',    status: 'locked', isLandmark: true },
];

// ─── DESIGN TOKENS ────────────────────────────────────────────
const THEME = {
  bg: '#FFFFFF',
  bgElevated: '#F8FAFC',
  bgCard: '#F8FAFC',

  // Blue track (indices 0–3)
  blueAccent: '#1D4ED8',
  blueDark: '#1E40AF',
  blueGlow: 'rgba(29, 78, 216, 0.35)',

  // Red track (indices 4–7)
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
};

// ─── MASCOT ASSETS ────────────────────────────────────────────
const SHIBA_SUIT_IMG = require('../../assets/images/mascots/shiba_suit.png');
const SHIBA_CASH_IMG = require('../../assets/images/mascots/shiba_cash.png');
const PIG_IMG = require('../../assets/images/mascots/pig.png');
const CAT_IMG = require('../../assets/images/mascots/cat.png');

// Mascots anchored to specific node indices and curve sides
const MASCOT_SLOTS: Record<number, { image: any; side: 'left' | 'right' }> = {
  1: { image: SHIBA_SUIT_IMG, side: 'left' },   // Blue set, node curves right → mascot LEFT
  2: { image: PIG_IMG,        side: 'right' },  // Blue set, node curves left  → mascot RIGHT
  4: { image: CAT_IMG,        side: 'right' },  // Red set, node curves right  → mascot RIGHT
  5: { image: SHIBA_CASH_IMG, side: 'left' },   // Red set, node curves left   → mascot LEFT
};

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
      style={[{ width: 100, height: 100, resizeMode: 'contain' }, animStyle, style]}
    />
  );
};

// ─── HELPER: Is this node in the red (bearish) section? ───────
const isRedSection = (index: number): boolean => index >= 4;

// ─── HELPER: Get accent color for a node by index ─────────────
const getNodeAccent = (index: number) =>
  isRedSection(index) ? THEME.redAccent : THEME.blueAccent;

const getNodeDark = (index: number) =>
  isRedSection(index) ? THEME.redDark : THEME.blueDark;



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

  // ─── NODE CIRCLE (pure visual, no lines) ──────────────────
  const renderNodeCircle = (node: MockNode, index: number) => {
    const isCompleted = node.status === 'completed';
    const isActive = node.status === 'active';
    const isLocked = node.status === 'locked';
    const accent = getNodeAccent(index);
    const dark = getNodeDark(index);

    if (isCompleted) {
      return (
        <View style={[styles.nodeOuter3D, { backgroundColor: dark }]}>
          <View style={[styles.nodeInner, { backgroundColor: accent, shadowColor: accent }]}>
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
              { backgroundColor: accent, shadowColor: accent, shadowOpacity: 0.5, shadowRadius: 12, elevation: 10 },
            ]}
          >
            <MaterialCommunityIcons name="star-four-points" size={32} color="#FFF" />
          </View>
        </View>
      );
    }
    return (
      <View style={styles.nodeOuter3D_locked}>
        <View style={styles.nodeInner_locked}>
          <MaterialCommunityIcons name="lock" size={26} color={THEME.textMuted} />
        </View>
      </View>
    );
  };

  // ─── RENDER A SINGLE TRAIL ROW ────────────────────────────
  // At mascot indices (1, 4, 7, 10) the node sits inside a
  // horizontal row with the mascot on the opposite curve side.
  // All other indices render a plain centred node row.
  const renderTrailRow = (node: MockNode, index: number) => {
    const horizontalOffset = getSineOffset(index);
    const isLandmark = node.isLandmark === true;
    const accent = getNodeAccent(index);
    const mascotSlot = MASCOT_SLOTS[index];

    // ── Build the node element ──────────────────────────
    const nodeElement = isLandmark ? (
      <View style={styles.nodeWrapper}>
        <RNAnimated.Text
          style={[
            styles.landmarkEmoji,
            node.status === 'active' && { transform: [{ translateY: bounceAnim }] },
            node.status === 'locked' && { opacity: 0.45 },
          ]}
        >
          🏛️
        </RNAnimated.Text>
        <Text style={[styles.landmarkLabel, { color: node.status === 'locked' ? THEME.textMuted : accent }]}>
          {node.title}
        </Text>
      </View>
    ) : (
      <View style={styles.nodeWrapper}>
        {renderNodeCircle(node, index)}
      </View>
    );

    // ── Mascot row: node + mascot side-by-side ──────────
    if (mascotSlot) {
      const mascotView = (
        <View style={styles.mascotSlotContainer}>
          <MascotItem image={mascotSlot.image} />
        </View>
      );

      return (
        <View key={node.id} style={styles.mascotRow}>
          {mascotSlot.side === 'left' ? (
            <>
              {mascotView}
              <View style={[styles.nodeCenter, { transform: [{ translateX: horizontalOffset }] }]}>
                {nodeElement}
              </View>
              <View style={styles.mascotSlotSpacer} />
            </>
          ) : (
            <>
              <View style={styles.mascotSlotSpacer} />
              <View style={[styles.nodeCenter, { transform: [{ translateX: horizontalOffset }] }]}>
                {nodeElement}
              </View>
              {mascotView}
            </>
          )}
        </View>
      );
    }

    // ── Plain row: just the node centred ─────────────────
    return (
      <View key={node.id} style={styles.pathRow}>
        <View style={{ transform: [{ translateX: horizontalOffset }] }}>
          {nodeElement}
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
        {MOCK_NODES.map((node, index) => {
          const elements = [];
          // Inject the section divider between blue set (index 3) and red set (index 4)
          if (index === 4) {
            elements.push(<React.Fragment key="divider">{renderSectionDivider()}</React.Fragment>);
          }
          elements.push(renderTrailRow(node, index));
          return elements;
        })}

        {/* Bottom padding */}
        <View style={{ height: 60 }} />
      </ScrollView>
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

  // ─── INLINE MASCOT ROW ─────────────────────────────────────
  mascotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    height: ROW_HEIGHT,
    overflow: 'visible',
  },
  mascotSlotContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mascotSlotSpacer: {
    width: 100,
  },
  nodeCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});