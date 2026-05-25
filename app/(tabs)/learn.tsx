import React, { useState, useRef, useEffect } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  LogBox,
  Platform,
  ActivityIndicator,
  Alert,
  Animated as RNAnimated,
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  Easing 
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ACADEMY_COURSES, Course, Slide } from '../../src/data/coursesData';
import { useAuth } from '@/src/context/AuthContext';
import { 
  getFirestore, 
  doc, 
  onSnapshot, 
  updateDoc, 
  increment, 
  setDoc, 
  serverTimestamp 
} from '@react-native-firebase/firestore';

// Stability Guard for SVG Layout warnings
LogBox.ignoreLogs(['Unsupported top level event type "topSvgLayout"']);

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// MASCOT ASSET REGISTRY
const MASCOT_REGISTRY: Record<number, { name: string; image: any; side: 'left' | 'right' }> = {
  0: { name: 'shiba', image: require('../../assets/images/mascots/shiba.png'), side: 'right' },
  1: { name: 'cat', image: require('../../assets/images/mascots/cat.png'), side: 'left' },
  2: { name: 'pig', image: require('../../assets/images/mascots/pig.png'), side: 'right' },
  3: { name: 'fish', image: require('../../assets/images/mascots/fish.png'), side: 'left' },
  4: { name: 'flower', image: require('../../assets/images/mascots/flower.png'), side: 'right' }
};

// BREATHING IDLE COMPONENT
const MascotItem = ({ image }: { image: any }) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.06, { duration: 1500, easing: Easing.bezier(0.4, 0, 0.6, 1) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.Image
      source={image}
      style={[
        { width: 65, height: 65, resizeMode: 'contain' },
        animatedStyle
      ]}
    />
  );
};

// MODERN UI CONSTANTS
const NODE_SIZE = 70; 
const ROW_HEIGHT = 110;

const getArchetypeEmoji = (style: string) => {
  switch (style) {
    case 'normal': return '📈';
    case 'speedrun': return '⚡';
    case 'boss': return '🏆';
    case 'treasure': return '👑';
    default: return '📈';
  }
};

export default function LearnScreen() {
  const { user } = useAuth();
  const db = getFirestore();

  // FIRESTORE GAME LIFECYCLE SYNC
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

  // BOUNCE ANIMATION FOR ACTIVE TREASURE
  useEffect(() => {
    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(bounceAnim, {
          toValue: -10,
          duration: 600,
          useNativeDriver: true,
        }),
        RNAnimated.timing(bounceAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [bounceAnim]);

  // REAL-TIME FIRESTORE CONNECTION
  useEffect(() => {
    if (!user?.uid) return;

    const docRef = doc(db, 'portfolio_v2', user.uid);
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setGameState({
          currentStageIndex: data.currentStageIndex ?? 0,
          currentSlideIndex: data.currentSlideIndex ?? 0,
          userHearts: data.userHearts ?? 5,
          userStars: data.userStars ?? 0,
          cashBalance: data.cashBalance ?? 50000,
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

    return () => unsubscribe();
  }, [user?.uid]);

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
        if (flatListRef.current) {
          flatListRef.current.scrollToIndex({ 
            index: gameState.currentSlideIndex, 
            animated: false 
          });
        }
      }, 150);
    } else {
      setPressedNodeId(course.course_id);
    }
  };

  const nextSlide = async () => {
    if (!selectedCourse || !user?.uid) return;

    if (activeSlide < selectedCourse.slides.length - 1) {
      const nextIndex = activeSlide + 1;
      setActiveSlide(nextIndex);
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      
      const docRef = doc(db, 'portfolio_v2', user.uid);
      await updateDoc(docRef, { currentSlideIndex: nextIndex });
    } else {
      setVictoryModalVisible(true);
    }
  };

  const handleQuizAnswer = async (isCorrect: boolean) => {
    if (!user?.uid) return;
    const docRef = doc(db, 'portfolio_v2', user.uid);

    if (isCorrect) {
      await updateDoc(docRef, { userStars: increment(25) });
      nextSlide();
    } else {
      await updateDoc(docRef, { userHearts: increment(-1) });
      Alert.alert('Incorrect!', 'You lost a heart. Study the bear\'s advice and try again!');
    }
  };

  const injectHearts = async () => {
    if (!user?.uid) return;
    const docRef = doc(db, 'portfolio_v2', user.uid);
    await updateDoc(docRef, { userHearts: increment(5) });
  };

  const resetHeartsWithCash = async () => {
    if (!user?.uid) return;
    if (gameState.cashBalance < 10000) {
      Alert.alert('Insufficient Cash', 'You need $10,000 to recharge hearts.');
      return;
    }

    const docRef = doc(db, 'portfolio_v2', user.uid);
    await updateDoc(docRef, {
      cashBalance: increment(-10000),
      userHearts: 5,
    });
    setHealthModalVisible(false);
  };

  const devBypass = () => {
    setHealthModalVisible(false);
    const firstCourse = ACADEMY_COURSES[gameState.currentStageIndex] || ACADEMY_COURSES[0];
    setSelectedCourse(firstCourse);
    setActiveSlide(0);
  };

  const continueJourney = async () => {
    if (!user?.uid) return;
    const docRef = doc(db, 'portfolio_v2', user.uid);
    
    await updateDoc(docRef, {
      currentStageIndex: increment(1),
      currentSlideIndex: 0,
    });
    
    setVictoryModalVisible(false);
    setSelectedCourse(null);
    setPressedNodeId(null);
  };

  const renderSlide = ({ item, index }: { item: Slide; index: number }) => {
    const isQuizMode = item.type === 'quiz' || index === 2;
    const courseIndex = selectedCourse ? ACADEMY_COURSES.findIndex(c => c.course_id === selectedCourse.course_id) : 0;
    const currentMascot = MASCOT_REGISTRY[courseIndex % 5].image;

    if (isQuizMode) {
      return (
        <View style={styles.slideFrame}>
          <View style={styles.quizEngineCard}>
            <Image
              source={currentMascot}
              style={styles.tutorMascot}
            />
            <Text style={styles.quizQuestionText}>
              {item.text || "Which asset class is historically considered the best hedge against inflation?"}
            </Text>
            
            <View style={styles.quizOptionDeck}>
              {['Cash', 'Gold', 'Penny Stocks', 'Bonds'].map((label, i) => (
                <Pressable 
                  key={i} 
                  onPress={() => handleQuizAnswer(i === 1)} 
                  style={styles.quizOptionPressable}
                >
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
              <Image
                source={currentMascot}
                style={styles.slideMascot}
              />
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

  const renderTrailNode = ({ item: course, index }: { item: Course | any; index: number }) => {
    const isCompleted = index < gameState.currentStageIndex;
    const isActive = index === gameState.currentStageIndex;
    const isLocked = index > gameState.currentStageIndex;
    const isFinal = course.course_id === 'final';
    const isPressed = pressedNodeId === course.course_id;
    const isTreasure = course.style === 'treasure';

    // SNAKE CURVATURE MATH
    let translateX = 0;
    if (index % 3 === 1) translateX = -45;
    if (index % 3 === 2) translateX = 45;

    // DYNAMIC MASCOT LOGIC
    const mascotData = MASCOT_REGISTRY[index % 5];
    const shouldShowMascot = index % 2 === 0;

    return (
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        width: '100%', 
        justifyContent: 'center', 
        height: ROW_HEIGHT,
        transform: [{ translateX }]
      }}>
        {/* Left Slot */}
        <View style={{ width: 80, alignItems: 'center', justifyContent: 'center' }}>
          {shouldShowMascot && mascotData.side === 'left' ? (
            <MascotItem image={mascotData.image} />
          ) : (
            <View style={{ width: 65, height: 65 }} />
          )}
        </View>

        <View style={styles.nodeAnchor}>
          {isPressed && (
            <View style={[styles.floatingLabel, styles.labelAbove]}>
              <View style={styles.arrowBottom} />
              <Text style={styles.floatingLabelText}>{course.title}</Text>
            </View>
          )}

          {isTreasure ? (
            <Pressable
              onPress={() => !isLocked && handleNodePress(course as Course)}
              style={({ pressed }) => [
                styles.treasureNode,
                pressed && { transform: [{ scale: 0.9 }] },
              ]}
            >
              <RNAnimated.Text style={[
                styles.nodeEmoji, 
                isActive && { transform: [{ translateY: bounceAnim }] },
                isLocked && { opacity: 0.5 }
              ]}>
                {getArchetypeEmoji(course.style)}
              </RNAnimated.Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => !isLocked && !isFinal && handleNodePress(course as Course)}
              style={({ pressed }) => [
                styles.nodeBadge,
                isCompleted && styles.nodeBadgeCompleted,
                isActive && styles.nodeBadgeActive,
                isLocked && styles.nodeBadgeLocked,
                isFinal && styles.nodeBadgeFinal,
                pressed && !isLocked && !isFinal && { transform: [{ scale: 0.95 }] },
              ]}
            >
              {isCompleted ? (
                <MaterialCommunityIcons name="check-bold" size={32} color="#FFF" />
              ) : (
                <Text style={styles.nodeEmoji}>{getArchetypeEmoji(course.style || 'normal')}</Text>
              )}
            </Pressable>
          )}
        </View>

        {/* Right Slot */}
        <View style={{ width: 80, alignItems: 'center', justifyContent: 'center' }}>
          {shouldShowMascot && mascotData.side === 'right' ? (
            <MascotItem image={mascotData.image} />
          ) : (
            <View style={{ width: 65, height: 65 }} />
          )}
        </View>
      </View>
    );
  };

  if (loading) return <View style={styles.fullCenter}><ActivityIndicator size="large" color="#CE82FF" /></View>;

  const trailData = [
    ...ACADEMY_COURSES,
    { course_id: 'final', title: 'Institutional Reward', style: 'boss' }
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.statChip}>
          <MaterialCommunityIcons name="trophy-variant" size={22} color="#FFC800" />
          <Text style={styles.statValue}>{gameState.currentStageIndex}</Text>
        </View>
        <View style={styles.statChip}>
          <MaterialCommunityIcons name="heart" size={22} color="#FF4B4B" />
          <Text style={styles.statValue}>{gameState.userHearts}</Text>
        </View>
        <View style={styles.statChip}>
          <MaterialCommunityIcons name="star" size={22} color="#FFD700" />
          <Text style={styles.statValue}>{gameState.userStars}</Text>
        </View>
      </View>

      <FlatList
        data={trailData}
        renderItem={renderTrailNode}
        keyExtractor={(item) => item.course_id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      />

      {/* DEBUG BUTTON */}
      <Pressable style={styles.debugBtn} onPress={injectHearts}>
        <Text style={styles.debugBtnText}>DEBUG: +5 HEARTS</Text>
      </Pressable>

      {/* HEALTH GATEWAY MODAL */}
      <Modal visible={isHealthModalVisible} transparent animationType="fade">
        <View style={styles.gatewayBackdrop}>
          <View style={styles.gatewayCard}>
            <Text style={styles.gatewayTitle}>OUT OF HEARTS</Text>
            <Image source={MASCOT_REGISTRY[gameState.currentStageIndex % 5].image} style={styles.gatewayMascot} />
            <Text style={styles.gatewayBody}>You need more energy to start this module. Recharge using your portfolio cash!</Text>
            
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

      {/* LESSON MODAL OVERLAY */}
      <Modal visible={!!selectedCourse} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.lessonStage, { backgroundColor: selectedCourse?.color || '#5865F2' }]}>
            <SafeAreaView style={{ flex: 1 }}>
              <View style={styles.lessonTop}>
                <View style={styles.progressBarBg}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { width: `${((activeSlide + 1) / (selectedCourse?.slides.length || 1)) * 100}%` }
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

      {/* VICTORY MODAL */}
      <Modal visible={isVictoryModalVisible} transparent animationType="fade">
        <View style={styles.victoryBackdrop}>
          <View style={styles.victoryCard}>
            <Image source={MASCOT_REGISTRY[gameState.currentStageIndex % 5].image} style={styles.victoryMascot} />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  fullCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 15, borderBottomWidth: 2, borderBottomColor: '#F2F2F2' },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statValue: { fontSize: 18, fontWeight: '900', color: '#4B4B4B' },
  scrollContent: { paddingBottom: 100, paddingTop: 40 },
  nodeRow: { width: SCREEN_WIDTH, height: ROW_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  nodeAnchor: { position: 'relative', width: NODE_SIZE, height: NODE_SIZE, justifyContent: 'center', alignItems: 'center' },
  nodeBadge: { width: NODE_SIZE, height: NODE_SIZE, borderRadius: NODE_SIZE / 2, backgroundColor: '#E5E5E5', justifyContent: 'center', alignItems: 'center', borderBottomWidth: 6, borderBottomColor: 'rgba(0,0,0,0.15)', elevation: 6 },
  nodeBadgeCompleted: { backgroundColor: '#58CC02', borderBottomColor: '#46A302' },
  nodeBadgeActive: { backgroundColor: '#CE82FF', borderBottomColor: '#A568CC' },
  nodeBadgeLocked: { backgroundColor: '#E5E5E5', borderBottomColor: '#D0D0D0', opacity: 0.7 },
  nodeBadgeFinal: { backgroundColor: '#FFD700', borderBottomColor: '#D4AF37' },
  treasureNode: { width: NODE_SIZE, height: NODE_SIZE, justifyContent: 'center', alignItems: 'center' },
  nodeEmoji: { fontSize: 34, textAlign: 'center' },
  floatingLabel: { position: 'absolute', backgroundColor: '#4B4B4B', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, zIndex: 1000, minWidth: 150, alignItems: 'center' },
  labelAbove: { bottom: NODE_SIZE + 15 },
  floatingLabelText: { color: '#FFF', fontWeight: '800', fontSize: 13, textAlign: 'center' },
  arrowBottom: { position: 'absolute', bottom: -8, width: 0, height: 0, borderLeftWidth: 8, borderLeftColor: 'transparent', borderRightWidth: 8, borderRightColor: 'transparent', borderTopWidth: 8, borderTopColor: '#4B4B4B' },
  modalBackdrop: { flex: 1 },
  lessonStage: { flex: 1 },
  lessonTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, gap: 12 },
  progressBarBg: { flex: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 6, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#FFFFFF', borderRadius: 6 },
  exitBtn: { padding: 4 },
  slideFrame: { width: SCREEN_WIDTH, paddingHorizontal: 30, paddingTop: 5, paddingBottom: 30, justifyContent: 'space-between', flex: 1 },
  slideContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  slideMascotContainer: { marginBottom: 10, width: 130, height: 130 },
  slideMascot: { width: '100%', height: '100%', resizeMode: 'contain' },
  slideEmoji: { fontSize: 60, marginBottom: 10 },
  slideHighlight: { fontSize: 24, fontWeight: '900', color: '#FFF', textAlign: 'center', marginBottom: 8 },
  slideBody: { fontSize: 17, color: '#FFF', textAlign: 'center', fontWeight: '700' },
  slideActionBtn: { backgroundColor: '#FFF', paddingVertical: 16, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 4 },
  slideActionText: { fontSize: 18, fontWeight: '900', color: '#4B4B4B', marginRight: 10 },
  quizEngineCard: { backgroundColor: '#FFF', borderRadius: 30, padding: 25, alignItems: 'center', flex: 1, marginTop: 20 },
  tutorMascot: { width: 110, height: 110, resizeMode: 'contain', marginBottom: 20 },
  quizQuestionText: { fontSize: 20, fontWeight: '800', color: '#2C3E50', textAlign: 'center', marginBottom: 25 },
  quizOptionDeck: { width: '100%', gap: 10 },
  quizOptionPressable: { backgroundColor: '#F8F9FB', padding: 18, borderRadius: 15, borderWidth: 1, borderColor: '#EEE' },
  quizOptionLabel: { fontSize: 16, fontWeight: '700', color: '#444', textAlign: 'center' },
  gatewayBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  gatewayCard: { backgroundColor: '#FFF', borderRadius: 35, padding: 30, alignItems: 'center', width: '100%', borderWidth: 4, borderColor: '#CE82FF' },
  gatewayTitle: { fontSize: 24, fontWeight: '900', color: '#FF4B4B', marginBottom: 20 },
  gatewayMascot: { width: 120, height: 120, resizeMode: 'contain', marginBottom: 20 },
  gatewayBody: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 30, fontWeight: '600' },
  gatewayActionRow: { width: '100%', gap: 12 },
  gatewayActionBtn: { backgroundColor: '#CE82FF', paddingVertical: 16, borderRadius: 18, alignItems: 'center' },
  gatewayActionText: { color: '#FFF', fontSize: 15, fontWeight: '900' },
  devBypassBtn: { backgroundColor: '#34C759' },
  closeGateway: { marginTop: 20, padding: 10 },
  closeGatewayText: { color: '#94A3B8', fontWeight: '800' },
  debugBtn: { position: 'absolute', bottom: 30, right: 30, backgroundColor: '#FF00FF', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 10, elevation: 10 },
  debugBtnText: { color: '#FFF', fontWeight: '900', fontSize: 12 },
  victoryBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 25 },
  victoryCard: { backgroundColor: '#FFF', borderRadius: 40, padding: 35, alignItems: 'center', width: '100%', borderWidth: 5, borderColor: '#CE82FF' },
  victoryMascot: { width: 140, height: 140, resizeMode: 'contain', marginBottom: 25 },
  victoryHeader: { fontSize: 30, fontWeight: '900', color: '#2C3E50', marginBottom: 15, fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium' },
  victoryStats: { alignItems: 'center', marginBottom: 35 },
  statLabel: { fontSize: 12, fontWeight: '900', color: '#94A3B8', marginBottom: 5 },
  statVal: { fontSize: 24, fontWeight: '900', color: '#FFD700' },
  continueJourneyBtn: { backgroundColor: '#CE82FF', width: '100%', paddingVertical: 20, borderRadius: 22, alignItems: 'center' },
  continueJourneyText: { color: '#FFF', fontSize: 18, fontWeight: '900' },
});

