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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as LucideIcons from 'lucide-react-native';
import { ACADEMY_COURSES, Course, Slide } from '../../src/data/coursesData';

// Task 1: Stability Guard
LogBox.ignoreLogs(['Unsupported top level event type "topSvgLayout"']);

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * LUCIDE ICON HELPER
 */
const DynamicLucideIcon = ({ name, size, color }: { name: string; size: number; color: string }) => {
  const IconComponent = (LucideIcons as any)[name];
  if (!IconComponent) return <LucideIcons.HelpCircle size={size} color={color} />;
  return <IconComponent size={size} color={color} />;
};

const ProgressBar = ({ total, current }: { total: number; current: number }) => (
  <View style={styles.progressContainer}>
    {Array.from({ length: total }).map((_, i) => (
      <View
        key={i}
        style={[
          styles.progressSegment,
          { backgroundColor: i <= current ? '#FFF' : 'rgba(255,255,255,0.2)' },
        ]}
      />
    ))}
  </View>
);

export default function LearnScreen() {
  // ATOMIC STATE: Simulation of course progress
  const [completedCourseIds, setCompletedCourseIds] = useState<string[]>(['1']);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const currentActiveCourseIndex = ACADEMY_COURSES.findIndex(
    (c) => !completedCourseIds.includes(c.course_id)
  );
  
  const score = completedCourseIds.length;
  const lives = 5;
  const streak = 12;

  const startCourse = (course: Course) => {
    setSelectedCourse(course);
    setActiveSlide(0);
  };

  const nextSlide = () => {
    if (selectedCourse && activeSlide < selectedCourse.slides.length - 1) {
      const nextIndex = activeSlide + 1;
      setActiveSlide(nextIndex);
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    } else {
      if (selectedCourse && !completedCourseIds.includes(selectedCourse.course_id)) {
        setCompletedCourseIds([...completedCourseIds, selectedCourse.course_id]);
      }
      setSelectedCourse(null);
    }
  };

  const renderSlide = ({ item, index }: { item: Slide; index: number }) => (
    <View style={styles.slideFrame}>
      <View style={styles.slideContent}>
        {item.showMascot && (
          <View style={styles.slideMascotContainer}>
            <Image
              source={require('../../assets/images/mascots/bear.png')}
              style={
                item.mascotAnimation === 'celebrate'
                  ? styles.mascotCelebration
                  : styles.mascotWelcome
              }
            />
          </View>
        )}
        <Text style={styles.slideEmoji}>{item.emoji}</Text>
        {item.highlightText && <Text style={styles.slideHighlight}>{item.highlightText}</Text>}
        <Text style={styles.slideBody}>{item.text}</Text>
      </View>

      <Pressable onPress={nextSlide} style={styles.slideActionBtn}>
        <Text style={styles.slideActionText}>
          {index === (selectedCourse?.slides.length || 0) - 1 ? 'Finish Module' : 'Continue'}
        </Text>
        <MaterialCommunityIcons name="arrow-right" size={24} color="#000" />
      </Pressable>
    </View>
  );

  /**
   * ZIGZAG LAYOUT LOGIC
   * mod 0: Center (0)
   * mod 1: Left (-60)
   * mod 2: Right (60)
   */
  const getAlignment = (index: number) => {
    const mod = index % 3;
    if (mod === 0) return 0;
    if (mod === 1) return -60;
    if (mod === 2) return 60;
    return 0;
  };

  /**
   * DYNAMIC CONNECTOR LINE
   * Calculates the rotation and length to connect current node to next node
   */
  const renderConnector = (index: number, isLast: boolean) => {
    if (isLast) return null;
    
    const currX = getAlignment(index);
    const nextX = getAlignment(index + 1);
    const deltaX = nextX - currX;
    const deltaY = 120; // Fixed vertical step
    
    const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const angle = Math.atan2(deltaX, deltaY) * (180 / Math.PI);

    return (
      <View 
        style={[
          styles.connector, 
          { 
            height: length,
            left: 30 + currX, // Center of 60px node
            transform: [
              { rotate: `${-angle}deg` },
              { translateY: 30 } // Start from node center
            ]
          }
        ]} 
      />
    );
  };

  const renderTrailNode = (course: Course | { course_id: string; title: string; isFinal?: boolean }, index: number) => {
    const isCompleted = 'course_id' in course && completedCourseIds.includes(course.course_id);
    const isActive = index === currentActiveCourseIndex;
    const isLocked = !isCompleted && !isActive;
    const isFinal = 'isFinal' in course;
    
    const translateX = getAlignment(index);
    const bearOnLeft = (index % 3) === 2; // If node is right, bear is left

    return (
      <View key={course.course_id} style={[styles.nodeContainer, { transform: [{ translateX }] }]}>
        {renderConnector(index, isFinal)}
        
        <View style={styles.nodeWrapper}>
          {/* Milestone Label */}
          <View style={styles.milestoneLabel}>
            <Text style={styles.milestoneText}>{isFinal ? 'FINAL' : `DAY ${index + 1}`}</Text>
          </View>

          {/* Main Node */}
          <Pressable
            onPress={() => !isLocked && !isFinal && startCourse(course as Course)}
            style={({ pressed }) => [
              styles.nodeBadge,
              isCompleted && styles.nodeBadgeCompleted,
              isActive && styles.nodeBadgeActive,
              isLocked && styles.nodeBadgeLocked,
              isFinal && styles.treasureChest,
              pressed && !isLocked && !isFinal && { transform: [{ scale: 0.9 }] },
            ]}
          >
            {isActive && <View style={styles.activePulse} />}
            
            {isFinal ? (
              <MaterialCommunityIcons name="treasure-chest" size={32} color={isLocked ? '#4B5563' : '#FBBF24'} />
            ) : isCompleted ? (
              <MaterialCommunityIcons name="check" size={32} color="#FFF" />
            ) : (
              <DynamicLucideIcon
                name={(course as Course).iconName}
                size={isActive ? 32 : 28}
                color={isLocked ? '#4B5563' : '#FFF'}
              />
            )}
          </Pressable>

          {/* Bear Mascot Integration */}
          {isActive && (
            <View style={[styles.bearContainer, bearOnLeft ? styles.bearLeft : styles.bearRight]}>
              <Image
                source={require('../../assets/images/mascots/bear.png')}
                style={[styles.trailMascot, bearOnLeft && { transform: [{ scaleX: -1 }] }]}
              />
              <View style={styles.speechBubble}>
                <Text style={styles.speechText}>GO!</Text>
              </View>
            </View>
          )}

          {/* Course Label for Active/Locked */}
          {(isActive || isLocked) && !isFinal && (
            <View style={[styles.nodeInfo, bearOnLeft ? styles.infoRight : styles.infoLeft]}>
              <Text style={[styles.nodeTitle, isLocked && { color: '#4B5563' }]} numberOfLines={1}>
                {course.title}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* GAMIFIED CURRENCY BAR */}
      <View style={styles.currencyBar}>
        <View style={styles.statChip}>
          <Text style={styles.statEmoji}>💎</Text>
          <Text style={styles.statVal}>{score}</Text>
        </View>
        <View style={styles.statChip}>
          <Text style={styles.statEmoji}>❤️</Text>
          <Text style={styles.statVal}>{lives}</Text>
        </View>
        <View style={styles.statChip}>
          <Text style={styles.statEmoji}>🔥</Text>
          <Text style={styles.statVal}>{streak}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* PREMIUM DARK CHALLENGE HEADER */}
        <View style={styles.darkHeader}>
          <View style={styles.headerTop}>
            <MaterialCommunityIcons name="trophy" size={20} color="#FBBF24" />
            <Text style={styles.headerLabel}>MONAI ACADEMY CHALLENGE</Text>
          </View>
          <Text style={styles.headerTitle}>28-Day AI Trader Challenge</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(score / (ACADEMY_COURSES.length + 1)) * 100}%` }]} />
          </View>
        </View>

        {/* THE ARCADE ZIGZAG TRAIL */}
        <View style={styles.trailWrapper}>
          {ACADEMY_COURSES.map((course, index) => renderTrailNode(course, index))}
          
          {/* FINAL NODE */}
          {renderTrailNode({ course_id: 'final', title: 'Institutional Reward', isFinal: true }, ACADEMY_COURSES.length)}
        </View>
      </ScrollView>

      {/* LESSON MODAL */}
      <Modal visible={!!selectedCourse} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.lessonStage, { backgroundColor: selectedCourse?.color || '#000' }]}>
            <SafeAreaView style={{ flex: 1 }}>
              <View style={styles.lessonTop}>
                <ProgressBar total={selectedCourse?.slides.length || 0} current={activeSlide} />
                <Pressable onPress={() => setSelectedCourse(null)} style={styles.exitBtn}>
                  <MaterialCommunityIcons name="close" size={28} color="#FFF" />
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
    backgroundColor: '#0d1117', // Deep Premium Dark
  },
  currencyBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
    paddingVertical: 15,
    backgroundColor: '#161b22',
    borderBottomWidth: 1,
    borderBottomColor: '#30363d',
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1117',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  statEmoji: { fontSize: 16, marginRight: 6 },
  statVal: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  
  darkHeader: {
    margin: 20,
    padding: 24,
    backgroundColor: '#161b22',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  headerLabel: { color: '#8b949e', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '800', marginBottom: 16 },
  progressTrack: { height: 10, backgroundColor: '#0d1117', borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#238636', borderRadius: 5 },

  scrollContent: { paddingBottom: 150 },
  trailWrapper: { marginTop: 20, alignItems: 'center' },
  nodeContainer: { height: 120, width: 60, justifyContent: 'center', alignItems: 'center' },
  nodeWrapper: { width: 60, height: 60, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  
  connector: {
    position: 'absolute',
    width: 6,
    backgroundColor: '#30363d',
    zIndex: -1,
    top: 0,
    borderRadius: 3,
  },
  
  milestoneLabel: { position: 'absolute', top: -20, width: 100, alignItems: 'center' },
  milestoneText: { color: '#484f58', fontSize: 9, fontWeight: '900' },
  
  nodeBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#161b22',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#30363d',
    zIndex: 2,
  },
  nodeBadgeCompleted: { backgroundColor: '#238636', borderColor: '#2ea043' },
  nodeBadgeActive: { 
    width: 76, 
    height: 76, 
    borderRadius: 38, 
    backgroundColor: '#5865f2', 
    borderColor: '#FFF',
    elevation: 10,
    shadowColor: '#5865f2',
    shadowOpacity: 0.8,
    shadowRadius: 15,
  },
  nodeBadgeLocked: { backgroundColor: '#0d1117', opacity: 0.6 },
  treasureChest: { backgroundColor: '#161b22', borderColor: '#30363d' },
  
  activePulse: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(88, 101, 242, 0.3)',
    zIndex: -1,
  },

  bearContainer: { position: 'absolute', width: 120, alignItems: 'center', zIndex: 10 },
  bearRight: { left: 70 },
  bearLeft: { right: 70 },
  trailMascot: { width: 85, height: 85, resizeMode: 'contain' },
  speechBubble: {
    position: 'absolute',
    top: 10,
    backgroundColor: '#FFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  speechText: { fontSize: 10, fontWeight: '900', color: '#000' },

  nodeInfo: { position: 'absolute', width: 150, zIndex: 1 },
  infoRight: { left: 80, alignItems: 'flex-start' },
  infoLeft: { right: 80, alignItems: 'flex-end' },
  nodeTitle: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  // MODAL STYLES
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  lessonStage: { flex: 1 },
  lessonTop: { flexDirection: 'row', alignItems: 'center', padding: 20, justifyContent: 'space-between' },
  progressContainer: { flexDirection: 'row', flex: 1, marginRight: 15 },
  progressSegment: { height: 4, flex: 1, borderRadius: 2, marginHorizontal: 2 },
  exitBtn: { padding: 8 },
  
  slideFrame: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.8, padding: 30, justifyContent: 'space-between' },
  slideContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  slideMascotContainer: { 
    marginBottom: 40, width: 180, height: 180, borderRadius: 90, 
    backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' 
  },
  mascotWelcome: { width: 130, height: 130, resizeMode: 'contain' },
  mascotCelebration: { width: 150, height: 150, resizeMode: 'contain', transform: [{ scale: 1.1 }] },
  slideEmoji: { fontSize: 60, marginBottom: 20 },
  slideHighlight: { fontSize: 24, fontWeight: '900', color: '#FFF', textAlign: 'center', marginBottom: 12, textTransform: 'uppercase' },
  slideBody: { fontSize: 18, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 26, fontWeight: '500' },
  slideActionBtn: { backgroundColor: '#FFF', paddingVertical: 18, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
  slideActionText: { fontSize: 18, fontWeight: '800', color: '#000', marginRight: 10 },
});
