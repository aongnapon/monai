import React, { useState, useRef } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  LogBox,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ChevronRight, 
  BookOpen, 
  BrainCircuit, 
  BarChart4, 
  CheckCircle2, 
  X,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Zap
} from 'lucide-react-native';

// Task 1: Permanently kill 'topSvgLayout' crashes
LogBox.ignoreLogs(['Unsupported top level event type "topSvgLayout"']);

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * PRODUCTION DATA: Institutional Learning Modules
 */
const COURSES = [
  {
    id: '1',
    title: 'Foundations of Technical Analysis',
    subtitle: 'Master S&R and Market Structure',
    icon: BarChart4,
    color: '#34C759',
    slides: [
      { id: '1-1', emoji: '📈', title: 'The Architect\'s Eye', body: 'Welcome to the world of institutional charting. Technical Analysis is the study of human behavior mapped through price.', mascot: true },
      { id: '1-2', emoji: '🛡️', title: 'Support & Resistance', body: 'Think of Support as a floor and Resistance as a ceiling. These are zones where big players have parked their orders.' },
      { id: '1-3', emoji: '⛰️', title: 'Market Trends', body: 'Higher Highs and Higher Lows signal an Uptrend. Lower Highs and Lower Lows signal a Downtrend. Never fight the flow.' },
      { id: '1-4', emoji: '🕯️', title: 'Candlestick Anatomy', body: 'A single candle tells a story of a battle between Bulls and Bears. The "wick" shows price rejection, the "body" shows dominance.' },
      { id: '1-5', emoji: '💎', title: 'Module Certified', body: 'You now possess the foundational vision to read the charts. Great work, Architect!', mascot: true, celebration: true },
    ]
  },
  {
    id: '2',
    title: 'Psychology of Risk Management',
    subtitle: 'Protecting Your Capital Capital',
    icon: ShieldCheck,
    color: '#0EA5E9',
    slides: [
      { id: '2-1', emoji: '🧠', title: 'The Quant Mindset', body: 'Trading isn\'t about being right; it\'s about being profitable. Risk management is the only holy grail in this market.', mascot: true },
      { id: '2-2', emoji: '🛑', title: 'Strategic Stop Losses', body: 'A Stop Loss is your insurance. It marks the point where your trade idea is proven wrong. Respect it like a law.' },
      { id: '2-3', emoji: '⚖️', title: 'Position Sizing', body: 'Never risk more than 1-2% of your total account on a single idea. Survivability is the key to institutional growth.' },
      { id: '2-4', emoji: '🎯', title: 'The R:R Ratio', body: 'Target at least 2:1. If you risk ₩100 to make ₩200, you only need to be right 34% of the time to break even.' },
      { id: '2-5', emoji: '🏆', title: 'Risk Disciplined', body: 'You are no longer a gambler; you are a risk manager. The pink bear is proud of your discipline!', mascot: true, celebration: true },
    ]
  },
  {
    id: '3',
    title: 'Crypto vs. Traditional Assets',
    subtitle: 'Understanding Volatility Handles',
    icon: Zap,
    color: '#F59E0B',
    slides: [
      { id: '3-1', emoji: '🌐', title: 'Global Liquidity', body: 'Markets are interconnected. Gold is the ancient shield, while Bitcoin is the digital lightning.', mascot: true },
      { id: '3-2', emoji: '🔄', title: 'Market Cycles', body: 'Traditional markets move in years. Crypto moves in weeks. The cycles are faster, but the principles of supply remain identical.' },
      { id: '3-3', emoji: '🌪️', title: 'Volatility Handles', body: 'Volatility is not risk; it\'s opportunity. Institutional players use volatility to enter positions at better price points.' },
      { id: '3-4', emoji: '💧', title: 'Liquidity Basics', body: 'Liquidity is the lifeblood of a market. High liquidity means stable prices; low liquidity leads to "gaps" and slippage.' },
      { id: '3-5', emoji: '🌟', title: 'Asset Expert', body: 'You now understand the bridge between old world gold and new world code. Knowledge is power!', mascot: true, celebration: true },
    ]
  }
];

const ProgressBar = ({ total, current }: { total: number, current: number }) => (
  <View style={styles.progressContainer}>
    {Array.from({ length: total }).map((_, i) => (
      <View 
        key={i} 
        style={[
          styles.progressSegment, 
          { backgroundColor: i <= current ? '#FFF' : 'rgba(255,255,255,0.3)' }
        ]} 
      />
    ))}
  </View>
);

export default function LearnScreen() {
  const [selectedCourse, setSelectedCourse] = useState<typeof COURSES[0] | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const startCourse = (course: typeof COURSES[0]) => {
    setSelectedCourse(course);
    setActiveSlide(0);
  };

  const nextSlide = () => {
    if (selectedCourse && activeSlide < selectedCourse.slides.length - 1) {
      const nextIndex = activeSlide + 1;
      setActiveSlide(nextIndex);
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    } else {
      setSelectedCourse(null);
    }
  };

  const renderSlide = ({ item, index }: { item: any, index: number }) => (
    <View style={styles.slideFrame}>
      <View style={styles.slideContent}>
        {item.mascot && (
          <View style={styles.slideMascotContainer}>
            <Image 
              source={require('../../assets/images/mascots/bear.png')} 
              style={item.celebration ? styles.mascotCelebration : styles.mascotWelcome} 
            />
          </View>
        )}
        
        <Text style={styles.slideEmoji}>{item.emoji}</Text>
        <Text style={styles.slideTitle}>{item.title}</Text>
        <Text style={styles.slideBody}>{item.body}</Text>
      </View>

      <Pressable onPress={nextSlide} style={styles.slideActionBtn}>
        <Text style={styles.slideActionText}>
          {index === (selectedCourse?.slides.length || 0) - 1 ? 'Finish Module' : 'Continue'}
        </Text>
        <ArrowRight size={20} color="#000" />
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerLabel}>INTELLIGENCE ACADEMY</Text>
            <Text style={styles.headerTitle}>Learning</Text>
          </View>
          <View style={styles.mascotAura}>
            <Image source={require('../../assets/images/mascots/bear.png')} style={styles.mainMascot} />
          </View>
        </View>

        <View style={styles.introCard}>
          <View style={styles.glassBackground} />
          <BrainCircuit size={24} color="#6366F1" style={{ marginBottom: 12 }} />
          <Text style={styles.introTitle}>Sharpen Your Edge</Text>
          <Text style={styles.introSubtitle}>
            Monai Architect uses institutional-grade modules to bridge the gap between retail trading and professional quant analysis.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>AVAILABLE MODULES</Text>

        {COURSES.map((course) => (
          <Pressable 
            key={course.id} 
            onPress={() => startCourse(course)}
            style={({ pressed }) => [styles.courseCard, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
          >
            <View style={styles.glassBackground} />
            <View style={[styles.iconBox, { backgroundColor: course.color + '15' }]}>
              <course.icon size={24} color={course.color} />
            </View>
            <View style={styles.courseInfo}>
              <Text style={styles.courseTitle}>{course.title}</Text>
              <Text style={styles.courseSubtitle}>{course.subtitle}</Text>
            </View>
            <ChevronRight size={20} color="#94A3B8" />
          </Pressable>
        ))}
      </ScrollView>

      {/* INTERACTIVE LESSON CAROUSEL */}
      <Modal visible={!!selectedCourse} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.lessonContainer, { backgroundColor: selectedCourse?.color || '#000' }]}>
            <SafeAreaView style={{ flex: 1 }}>
              <View style={styles.lessonHeader}>
                <ProgressBar 
                  total={selectedCourse?.slides.length || 0} 
                  current={activeSlide} 
                />
                <Pressable onPress={() => setSelectedCourse(null)} style={styles.closeBtn}>
                  <X size={24} color="#FFF" />
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
              />
            </SafeAreaView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 10,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 2,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#0F172A',
  },
  mascotAura: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  mainMascot: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
  },
  introCard: {
    padding: 24,
    borderRadius: 28,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  introSubtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  courseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 24,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  courseInfo: {
    flex: 1,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  courseSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFF',
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  lessonContainer: {
    flex: 1,
  },
  lessonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    justifyContent: 'space-between',
  },
  progressContainer: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 15,
  },
  progressSegment: {
    height: 3,
    flex: 1,
    borderRadius: 2,
    marginHorizontal: 2,
  },
  closeBtn: {
    padding: 8,
  },
  slideFrame: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
    padding: 30,
    justifyContent: 'space-between',
  },
  slideContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideMascotContainer: {
    marginBottom: 40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mascotWelcome: {
    width: 140,
    height: 140,
    resizeMode: 'contain',
  },
  mascotCelebration: {
    width: 160,
    height: 160,
    resizeMode: 'contain',
    transform: [{ scale: 1.1 }],
  },
  slideEmoji: {
    fontSize: 64,
    marginBottom: 24,
  },
  slideTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  slideBody: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '500',
    paddingHorizontal: 10,
  },
  slideActionBtn: {
    backgroundColor: '#FFF',
    paddingVertical: 20,
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  slideActionText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
    marginRight: 10,
  },
});
