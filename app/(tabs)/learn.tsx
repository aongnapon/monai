import { useAuth } from '@/src/context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  doc,
  getFirestore,
  increment,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from '@react-native-firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  LogBox,
  Modal,
  Platform,
  Pressable,
  Animated as RNAnimated,
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
import { ACADEMY_COURSES, Course, Slide } from '../../src/data/coursesData';

LogBox.ignoreLogs(['Unsupported top level event type "topSvgLayout"']);

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── DESIGN TOKENS ────────────────────────────────────────────
const THEME = {
  bg: '#1B1D2A',
  bgElevated: '#232636',
  bgCard: '#2A2D3E',
  accent: '#CE82FF',
  accentDark: '#A568CC',
  green: '#58CC02',
  greenDark: '#46A302',
  red: '#FF4B4B',
  orange: '#FF9600',
  blue: '#1CB0F6',
  gold: '#FFD700',
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#6B7280',
  pillBg: 'rgba(255,255,255,0.08)',
  pillBorder: 'rgba(255,255,255,0.06)',
  lockedNode: '#3C3F4F',
  lockedNodeBorder: '#2E3040',
};

// ─── MASCOT REGISTRY ──────────────────────────────────────────
const MASCOT_REGISTRY: Record<
  number,
  { name: string; image: any; side: 'left' | 'right' }
> = {
  0: { name: 'shiba', image: require('../../assets/images/mascots/shiba.png'), side: 'right' },
  1: { name: 'cat', image: require('../../assets/images/mascots/cat.png'), side: 'left' },
  2: { name: 'pig', image: require('../../assets/images/mascots/pig.png'), side: 'right' },
  3: { name: 'fish', image: require('../../assets/images/mascots/fish.png'), side: 'left' },
  4: { name: 'flower', image: require('../../assets/images/mascots/flower.png'), side: 'right' },
};

// ─── SINE-WAVE CONSTANTS ──────────────────────────────────────
const SINE_AMPLITUDE = 55;  // px — how far left/right nodes weave
const SINE_FREQUENCY = 0.8; // rhythm of the curve

/** Returns the horizontal translateX for a node at a given index */
const getSineOffset = (index: number): number =>
  Math.sin(index * SINE_FREQUENCY) * SINE_AMPLITUDE;

// ─── LAYOUT CONSTANTS ─────────────────────────────────────────
const NODE_SIZE = 76;
const NODE_RADIUS = NODE_SIZE / 2;
const ROW_HEIGHT = 100; // stable, uniform step height

// ─── BREATHING IDLE MASCOT ────────────────────────────────────
const MascotItem = ({ image }: { image: any }) => {
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
      style={[{ width: 80, height: 80, resizeMode: 'contain' }, animStyle]}
    />
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════
export default function LearnScreen() {
  const { user } = useAuth();
  const db = getFirestore();

  const [streak] = useState(12);
  const [gems] = useState(500);

  const [gameState, setGameState] = useState({
    currentStageIndex: 0,
    currentSlideIndex: 0,
    userHearts: 5,
    userStars: 0,
    cashBalance: 0,
  });

  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [pressedNodeId, setPressedNodeId] = useState<string | null>(null);
  const [isVictoryModalVisible, setVictoryModalVisible] = useState(false);
  const [isHealthModalVisible, setHealthModalVisible] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const bounceAnim = useRef(new RNAnimated.Value(0)).current;

  // ─── BOUNCE ANIMATION (treasure node) ────────────────────
  useEffect(() => {
    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(bounceAnim, { toValue: -10, duration: 600, useNativeDriver: true }),
        RNAnimated.timing(bounceAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, [bounceAnim]);

  // ─── FIRESTORE SYNC ───────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    const docRef = doc(db, 'portfolio_v2', user.uid);
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setGameState({
          currentStageIndex: d.currentStageIndex ?? 0,
          currentSlideIndex: d.currentSlideIndex ?? 0,
          userHearts: d.userHearts ?? 5,
          userStars: d.userStars ?? 0,
          cashBalance: d.cashBalance ?? 50000,
        });
      } else {
        setDoc(docRef, {
          currentStageIndex: 0,
          currentSlideIndex: 0,
          userHearts: 5,
          userStars: 0,
          cashBalance: 50000,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
      setLoading(false);
    });
    return () => unsub();
  }, [user?.uid]);

  // ─── INTERACTION HANDLERS ─────────────────────────────────
  const handleNodePress = (course: Course) => {
    if (gameState.userHearts <= 0) {
      setHealthModalVisible(true);
      return;
    }
    if (pressedNodeId === course.course_id) {
      setPressedNodeId(null);
      setSelectedCourse(course);
      setActiveSlide(gameState.currentSlideIndex);
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: gameState.currentSlideIndex,
          animated: false,
        });
      }, 150);
    } else {
      setPressedNodeId(course.course_id);
    }
  };

  const nextSlide = async () => {
    if (!selectedCourse || !user?.uid) return;
    if (activeSlide < selectedCourse.slides.length - 1) {
      const next = activeSlide + 1;
      setActiveSlide(next);
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      await updateDoc(doc(db, 'portfolio_v2', user.uid), { currentSlideIndex: next });
    } else {
      setVictoryModalVisible(true);
    }
  };

  const handleQuizAnswer = async (isCorrect: boolean) => {
    if (!user?.uid) return;
    const ref = doc(db, 'portfolio_v2', user.uid);
    if (isCorrect) {
      await updateDoc(ref, { userStars: increment(25) });
      nextSlide();
    } else {
      await updateDoc(ref, { userHearts: increment(-1) });
      Alert.alert('Incorrect!', "You lost a heart. Study the mascot's advice and try again!");
    }
  };

  const injectHearts = async () => {
    if (!user?.uid) return;
    await updateDoc(doc(db, 'portfolio_v2', user.uid), { userHearts: increment(5) });
  };

  const resetHeartsWithCash = async () => {
    if (!user?.uid) return;
    if (gameState.cashBalance < 10000) {
      Alert.alert('Insufficient Cash', 'You need $10,000 to recharge hearts.');
      return;
    }
    await updateDoc(doc(db, 'portfolio_v2', user.uid), {
      cashBalance: increment(-10000),
      userHearts: 5,
    });
    setHealthModalVisible(false);
  };

  const devBypass = () => {
    setHealthModalVisible(false);
    const c = ACADEMY_COURSES[gameState.currentStageIndex] || ACADEMY_COURSES[0];
    setSelectedCourse(c);
    setActiveSlide(0);
  };

  const continueJourney = async () => {
    if (!user?.uid) return;
    await updateDoc(doc(db, 'portfolio_v2', user.uid), {
      currentStageIndex: increment(1),
      currentSlideIndex: 0,
    });
    setVictoryModalVisible(false);
    setSelectedCourse(null);
    setPressedNodeId(null);
  };

  // ═══════════════════════════════════════════════════════════
  // SLIDE RENDERER
  // ═══════════════════════════════════════════════════════════
  const renderSlide = ({ item, index }: { item: Slide; index: number }) => {
    const isQuiz = item.type === 'quiz' || index === 2;
    const courseIndex = selectedCourse
      ? ACADEMY_COURSES.findIndex((c) => c.course_id === selectedCourse.course_id)
      : 0;
    const mascotImg = MASCOT_REGISTRY[courseIndex % 5].image;

    if (isQuiz) {
      return (
        <View style={styles.slideFrame}>
          <View style={styles.quizEngineCard}>
            <Image source={mascotImg} style={styles.tutorMascot} />
            <Text style={styles.quizQuestionText}>
              {item.text || 'Which asset class is historically the best hedge against inflation?'}
            </Text>
            <View style={styles.quizOptionDeck}>
              {['Cash', 'Gold', 'Penny Stocks', 'Bonds'].map((label, i) => (
                <Pressable key={i} onPress={() => handleQuizAnswer(i === 1)} style={styles.quizOptionPressable}>
                  <Text style={styles.quizOptionLabel}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.slideFrame}>
        <View style={styles.slideContent}>
          {item.showMascot && (
            <View style={styles.slideMascotContainer}>
              <Image source={mascotImg} style={styles.slideMascot} />
            </View>
          )}
          <Text style={styles.slideEmoji}>{item.emoji || '📗'}</Text>
          {item.highlightText && <Text style={styles.slideHighlight}>{item.highlightText}</Text>}
          <Text style={styles.slideBody}>{item.text}</Text>
        </View>
        <Pressable onPress={nextSlide} style={styles.slideActionBtn}>
          <Text style={styles.slideActionText}>
            {index === (selectedCourse?.slides.length || 0) - 1 ? 'Finish Module' : 'Continue'}
          </Text>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#FFF" />
        </Pressable>
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // TRAIL NODE RENDERER — sine-wave serpentine path
  // ═══════════════════════════════════════════════════════════
  const renderTrailNode = ({ item: course, index }: { item: Course | any; index: number }) => {
    const isCompleted = index < gameState.currentStageIndex;
    const isActive    = index === gameState.currentStageIndex;
    const isLocked    = index > gameState.currentStageIndex;
    const isFinal     = course.course_id === 'final';
    const isTreasure  = course.style === 'treasure';
    const isPressed   = pressedNodeId === course.course_id;

    // ── SINE-WAVE OFFSET ──────────────────────────────────
    const horizontalOffset = getSineOffset(index);
    const mascotOnRight    = horizontalOffset < 0; // node went left → mascot goes right

    const mascotData       = MASCOT_REGISTRY[index % 5];
    const showMascot       = index % 2 === 0 && !isFinal;

    // ── NODE CONTENT ──────────────────────────────────────
    const NodeContent = () => {
      if (isTreasure) {
        return (
          <Pressable
            onPress={() => !isLocked && handleNodePress(course as Course)}
            style={({ pressed }) => [pressed && { transform: [{ scale: 0.9 }] }]}
          >
            <View style={styles.treasureNodeWrap}>
              <View style={styles.treasureFloorShadow} />
              <RNAnimated.Text
                style={[
                  styles.treasureEmoji,
                  isActive && { transform: [{ translateY: bounceAnim }] },
                  isLocked && { opacity: 0.4 },
                ]}
              >
                🎁
              </RNAnimated.Text>
            </View>
          </Pressable>
        );
      }

      if (isCompleted) {
        return (
          <Pressable
            onPress={() => handleNodePress(course as Course)}
            style={({ pressed }) => [pressed && { transform: [{ scale: 0.95 }] }]}
          >
            <View style={styles.nodeOuter3D_completed}>
              <View style={styles.nodeInner_completed}>
                <MaterialCommunityIcons name="check-bold" size={32} color="#FFF" />
              </View>
            </View>
          </Pressable>
        );
      }

      if (isActive && !isFinal) {
        return (
          <Pressable
            onPress={() => handleNodePress(course as Course)}
            style={({ pressed }) => [pressed && { transform: [{ scale: 0.95 }] }]}
          >
            {/* START badge — absolutely positioned directly above node, tracks with translateX */}
            <View style={styles.startPillWrap}>
              <View style={styles.startPill}>
                <Text style={styles.startPillText}>START</Text>
              </View>
              <View style={styles.startPillArrow} />
            </View>

            <View style={styles.nodeOuter3D_active}>
              <View style={styles.nodeInner_active}>
                <MaterialCommunityIcons name="star-four-points" size={32} color="#FFF" />
              </View>
            </View>
          </Pressable>
        );
      }

      if (isFinal) {
        return (
          <View style={styles.nodeOuter3D_final}>
            <View style={styles.nodeInner_final}>
              <Text style={{ fontSize: 34 }}>🏆</Text>
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

    // ── ROW WRAPPER: fixed height, centered ───────────────
    return (
      <View style={styles.pathRow}>
        {/* Node wrapper — translateX drives the sine weave */}
        <View
          style={[
            styles.nodeWrapper,
            { transform: [{ translateX: horizontalOffset }] },
          ]}
        >
          {/* Tooltip (pressed state) */}
          {isPressed && (
            <View style={styles.floatingLabel}>
              <Text style={styles.floatingLabelText} numberOfLines={2}>
                {course.title}
              </Text>
              <View style={styles.floatingLabelArrow} />
            </View>
          )}

          <NodeContent />

          {/* Mascot — absolutely coupled to node, side flips with offset direction */}
          {showMascot && (
            <View
              style={[
                styles.mascotAnchor,
                mascotOnRight ? { right: -90 } : { left: -90 },
              ]}
            >
              <MascotItem image={mascotData.image} />
            </View>
          )}
        </View>
      </View>
    );
  };

  // ─── LOADING ──────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.container, styles.fullCenter]}>
        <ActivityIndicator size="large" color={THEME.accent} />
      </View>
    );
  }

  const trailData = [
    ...ACADEMY_COURSES,
    { course_id: 'final', title: 'Institutional Reward', style: 'boss' },
  ];

  const currentCourse = ACADEMY_COURSES[gameState.currentStageIndex];

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container} edges={['top']}>

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
          <Text style={styles.statusPillText}>
            {gameState.userHearts > 99 ? '∞' : gameState.userHearts}
          </Text>
        </View>
      </View>

      {/* ─── UNIT HEADER CARD ──────────────────────────────── */}
      <View style={styles.unitHeaderCard}>
        <View style={styles.unitHeaderLeft}>
          <Text style={styles.unitHeaderLabel}>
            SECTION 1, UNIT {gameState.currentStageIndex + 1}
          </Text>
          <Text style={styles.unitHeaderTitle}>
            {currentCourse?.chapter || 'Technical Analysis'}
          </Text>
        </View>
        <Pressable style={styles.unitHeaderBtn}>
          <MaterialCommunityIcons name="notebook-outline" size={28} color="#FFF" />
        </Pressable>
      </View>

      {/* ─── SERPENTINE PATH ───────────────────────────────── */}
      <FlatList
        data={trailData}
        renderItem={renderTrailNode}
        keyExtractor={(item) => item.course_id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      />

      {/* ─── DEBUG BUTTON ──────────────────────────────────── */}
      <Pressable style={styles.debugBtn} onPress={injectHearts}>
        <Text style={styles.debugBtnText}>DEBUG: +5 HEARTS</Text>
      </Pressable>

      {/* ─── HEALTH GATEWAY MODAL ──────────────────────────── */}
      <Modal visible={isHealthModalVisible} transparent animationType="fade">
        <View style={styles.gatewayBackdrop}>
          <View style={styles.gatewayCard}>
            <Text style={styles.gatewayTitle}>OUT OF HEARTS</Text>
            <Image
              source={MASCOT_REGISTRY[gameState.currentStageIndex % 5].image}
              style={styles.gatewayMascot}
            />
            <Text style={styles.gatewayBody}>
              You need more energy to start this module. Recharge using your portfolio cash!
            </Text>
            <View style={styles.gatewayActionRow}>
              <Pressable style={styles.gatewayActionBtn} onPress={resetHeartsWithCash}>
                <Text style={styles.gatewayActionText}>RECHARGE ($10,000)</Text>
              </Pressable>
              <Pressable style={[styles.gatewayActionBtn, styles.devBypassBtn]} onPress={devBypass}>
                <Text style={styles.gatewayActionText}>DEV BYPASS (TEST)</Text>
              </Pressable>
            </View>
            <Pressable onPress={() => setHealthModalVisible(false)} style={styles.closeGateway}>
              <Text style={styles.closeGatewayText}>Dismiss</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ─── LESSON MODAL ──────────────────────────────────── */}
      <Modal visible={!!selectedCourse} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.lessonStage, { backgroundColor: selectedCourse?.color || '#5865F2' }]}>
            <SafeAreaView style={{ flex: 1 }}>
              <View style={styles.lessonTop}>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${((activeSlide + 1) / (selectedCourse?.slides.length || 1)) * 100}%`,
                      },
                    ]}
                  />
                </View>
                <Pressable onPress={() => setSelectedCourse(null)} style={styles.exitBtn}>
                  <MaterialCommunityIcons name="close" size={32} color="#FFF" />
                </Pressable>
              </View>
              <FlatList
                ref={flatListRef}
                data={selectedCourse?.slides}
                renderItem={renderSlide}
                horizontal
                pagingEnabled
                scrollEnabled={false}
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                onScrollToIndexFailed={(info) => {
                  setTimeout(() => {
                    flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
                  }, 100);
                }}
              />
            </SafeAreaView>
          </View>
        </View>
      </Modal>

      {/* ─── VICTORY MODAL ─────────────────────────────────── */}
      <Modal visible={isVictoryModalVisible} transparent animationType="fade">
        <View style={styles.victoryBackdrop}>
          <View style={styles.victoryCard}>
            <Image
              source={MASCOT_REGISTRY[gameState.currentStageIndex % 5].image}
              style={styles.victoryMascot}
            />
            <Text style={styles.victoryHeader}>Stage Conquered</Text>
            <View style={styles.victoryStats}>
              <Text style={styles.statLabel}>XP GAINED</Text>
              <Text style={styles.statVal}>+100 ⭐</Text>
            </View>
            <Pressable style={styles.continueJourneyBtn} onPress={continueJourney}>
              <Text style={styles.continueJourneyText}>CONTINUE JOURNEY</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({

  // ─── ROOT ─────────────────────────────────────────────────
  container:  { flex: 1, backgroundColor: THEME.bg },
  fullCenter: { justifyContent: 'center', alignItems: 'center' },

  // ─── STATUS BAR ───────────────────────────────────────────
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: THEME.bg,
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
  flagEmoji:      { fontSize: 18 },
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
    backgroundColor: THEME.green,
    borderRadius: 16,
  },
  unitHeaderLeft:  { flex: 1, marginRight: 12 },
  unitHeaderLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  unitHeaderTitle: { fontSize: 18, fontWeight: '900', color: '#FFFFFF' },
  unitHeaderBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── SERPENTINE PATH ──────────────────────────────────────
  scrollContent: {
    paddingBottom: 120,
    paddingTop: 30,
    // Extra horizontal padding so mascots (±90px from node) don't clip at screen edges
    paddingHorizontal: 16,
  },

  /**
   * pathRow — uniform height container for each step.
   * width: '100%' + overflow:visible so mascots can bleed past edges.
   */
  pathRow: {
    height: ROW_HEIGHT,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    // overflow must be visible for absolute-positioned mascots
    overflow: 'visible',
  },

  /**
   * nodeWrapper — the element that receives `transform: [{ translateX }]`.
   * Must be `position: 'relative'` so its absolute children (mascot, tooltip) anchor to it.
   */
  nodeWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    // Give it enough breathing room for the START badge above and mascot on sides
    width: NODE_SIZE,
    height: NODE_SIZE,
  },

  /**
   * mascotAnchor — absolute, vertically centred beside the node.
   * `left: -90` or `right: -90` is set inline based on offset direction.
   */
  mascotAnchor: {
    position: 'absolute',
    top: '50%',
    marginTop: -40, // half of mascot height (80/2) to truly centre
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── NODE DESIGNS ─────────────────────────────────────────
  nodeOuter3D_active: {
    width: NODE_SIZE,
    height: NODE_SIZE + 6,
    borderRadius: NODE_RADIUS,
    backgroundColor: THEME.accentDark,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  nodeInner_active: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_RADIUS,
    backgroundColor: THEME.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 6,
    borderBottomColor: 'rgba(0,0,0,0.2)',
    elevation: 8,
    shadowColor: THEME.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  nodeOuter3D_completed: {
    width: NODE_SIZE,
    height: NODE_SIZE + 6,
    borderRadius: NODE_RADIUS,
    backgroundColor: THEME.greenDark,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  nodeInner_completed: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_RADIUS,
    backgroundColor: THEME.green,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 6,
    borderBottomColor: 'rgba(0,0,0,0.2)',
    elevation: 6,
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
  nodeOuter3D_final: {
    width: NODE_SIZE,
    height: NODE_SIZE + 6,
    borderRadius: NODE_RADIUS,
    backgroundColor: '#D4AF37',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  nodeInner_final: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_RADIUS,
    backgroundColor: THEME.gold,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 6,
    borderBottomColor: 'rgba(0,0,0,0.2)',
    elevation: 8,
  },

  // ─── TREASURE NODE ────────────────────────────────────────
  treasureNodeWrap: {
    width: NODE_SIZE + 10,
    height: NODE_SIZE + 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  treasureFloorShadow: {
    position: 'absolute',
    bottom: 2,
    width: 60,
    height: 16,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  treasureEmoji: { fontSize: 42, textAlign: 'center' },

  // ─── START BADGE ──────────────────────────────────────────
  /**
   * Absolutely positioned above the node — it naturally inherits translateX
   * from its parent nodeWrapper, so it tracks perfectly as the node weaves.
   */
  startPillWrap: {
    position: 'absolute',
    top: -35,
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  startPill: {
    backgroundColor: THEME.green,
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 12,
  },
  startPillText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  startPillArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderLeftColor: 'transparent',
    borderRightWidth: 6,
    borderRightColor: 'transparent',
    borderTopWidth: 6,
    borderTopColor: THEME.green,
  },

  // ─── TOOLTIP (pressed title) ──────────────────────────────
  floatingLabel: {
    position: 'absolute',
    bottom: NODE_SIZE + 18,
    backgroundColor: THEME.bgCard,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    zIndex: 1000,
    minWidth: 150,
    maxWidth: 190,
    alignItems: 'center',
    alignSelf: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  floatingLabelText: {
    color: THEME.textPrimary,
    fontWeight: '800',
    fontSize: 13,
    textAlign: 'center',
  },
  floatingLabelArrow: {
    position: 'absolute',
    bottom: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderLeftColor: 'transparent',
    borderRightWidth: 8,
    borderRightColor: 'transparent',
    borderTopWidth: 8,
    borderTopColor: THEME.bgCard,
  },

  // ─── LESSON MODAL ─────────────────────────────────────────
  modalBackdrop: { flex: 1 },
  lessonStage:   { flex: 1 },
  lessonTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    gap: 12,
  },
  progressBarBg: {
    flex: 1,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
  },
  exitBtn:    { padding: 4 },
  slideFrame: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 30,
    paddingTop: 5,
    paddingBottom: 30,
    justifyContent: 'space-between',
    flex: 1,
  },
  slideContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideMascotContainer: { marginBottom: 10, width: 130, height: 130 },
  slideMascot:          { width: '100%', height: '100%', resizeMode: 'contain' },
  slideEmoji:           { fontSize: 60, marginBottom: 10 },
  slideHighlight: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  slideBody: {
    fontSize: 17,
    color: '#FFF',
    textAlign: 'center',
    fontWeight: '700',
  },
  slideActionBtn: {
    backgroundColor: '#FFF',
    paddingVertical: 16,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  slideActionText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#4B4B4B',
    marginRight: 10,
  },

  // ─── QUIZ ENGINE ──────────────────────────────────────────
  quizEngineCard: {
    backgroundColor: '#FFF',
    borderRadius: 30,
    padding: 25,
    alignItems: 'center',
    flex: 1,
    marginTop: 20,
  },
  tutorMascot: {
    width: 110,
    height: 110,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  quizQuestionText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 25,
  },
  quizOptionDeck:      { width: '100%', gap: 10 },
  quizOptionPressable: {
    backgroundColor: '#F8F9FB',
    padding: 18,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  quizOptionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#444',
    textAlign: 'center',
  },

  // ─── HEALTH GATEWAY ───────────────────────────────────────
  gatewayBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  gatewayCard: {
    backgroundColor: THEME.bgElevated,
    borderRadius: 35,
    padding: 30,
    alignItems: 'center',
    width: '100%',
    borderWidth: 3,
    borderColor: THEME.accent,
  },
  gatewayTitle:  { fontSize: 24, fontWeight: '900', color: THEME.red, marginBottom: 20 },
  gatewayMascot: { width: 120, height: 120, resizeMode: 'contain', marginBottom: 20 },
  gatewayBody: {
    fontSize: 16,
    color: THEME.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
    fontWeight: '600',
  },
  gatewayActionRow: { width: '100%', gap: 12 },
  gatewayActionBtn: {
    backgroundColor: THEME.accent,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
  },
  gatewayActionText: { color: '#FFF', fontSize: 15, fontWeight: '900' },
  devBypassBtn:      { backgroundColor: THEME.green },
  closeGateway:      { marginTop: 20, padding: 10 },
  closeGatewayText:  { color: THEME.textMuted, fontWeight: '800' },

  // ─── DEBUG BUTTON ─────────────────────────────────────────
  debugBtn: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: '#FF00FF',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    elevation: 10,
  },
  debugBtnText: { color: '#FFF', fontWeight: '900', fontSize: 12 },

  // ─── VICTORY MODAL ────────────────────────────────────────
  victoryBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
  },
  victoryCard: {
    backgroundColor: THEME.bgElevated,
    borderRadius: 40,
    padding: 35,
    alignItems: 'center',
    width: '100%',
    borderWidth: 4,
    borderColor: THEME.accent,
  },
  victoryMascot: { width: 140, height: 140, resizeMode: 'contain', marginBottom: 25 },
  victoryHeader: {
    fontSize: 30,
    fontWeight: '900',
    color: THEME.textPrimary,
    marginBottom: 15,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
  },
  victoryStats:  { alignItems: 'center', marginBottom: 35 },
  statLabel:     { fontSize: 12, fontWeight: '900', color: THEME.textSecondary, marginBottom: 5 },
  statVal:       { fontSize: 24, fontWeight: '900', color: THEME.gold },
  continueJourneyBtn: {
    backgroundColor: THEME.accent,
    width: '100%',
    paddingVertical: 20,
    borderRadius: 22,
    alignItems: 'center',
  },
  continueJourneyText: { color: '#FFF', fontSize: 18, fontWeight: '900' },
});