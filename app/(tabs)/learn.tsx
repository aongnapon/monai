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
import { ACADEMY_COURSES, Course, Slide } from '../../src/data/coursesData';

// Stability Guard for SVG Layout warnings
LogBox.ignoreLogs(['Unsupported top level event type "topSvgLayout"']);

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const NODE_SIZE = 140; 
const MASCOT_SIZE = 250; 

export default function LearnScreen() {
  // ATOMIC STATE: Progress tracking and interaction logic
  const [completedCourseIds, setCompletedCourseIds] = useState<string[]>(['1']);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [pressedNodeId, setPressedNodeId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const currentActiveCourseIndex = ACADEMY_COURSES.findIndex(
    (c) => !completedCourseIds.includes(c.course_id)
  );

  const score = completedCourseIds.length;
  const lives = 5;
  const streak = 12;

  /**
   * TWO-TAP INTERACTION LOGIC
   * 1st Tap: Show floating title label
   * 2nd Tap: Launch module
   */
  const handleNodePress = (course: Course) => {
    if (pressedNodeId === course.course_id) {
      setPressedNodeId(null);
      setSelectedCourse(course);
      setActiveSlide(0);
    } else {
      setPressedNodeId(course.course_id);
    }
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
      setPressedNodeId(null);
    }
  };

  const renderSlide = ({ item, index }: { item: Slide; index: number }) => (
    <View style={styles.slideFrame}>
      <View style={styles.slideContent}>
        {item.showMascot && (
          <View style={styles.slideMascotContainer}>
            <Image
              source={require('../../assets/images/mascots/bear.png')}
              style={styles.slideMascot}
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
        <MaterialCommunityIcons name="arrow-right" size={24} color="#FFF" />
      </Pressable>
    </View>
  );

  const renderTrailNode = (course: Course | { course_id: string; title: string; isFinal?: boolean }, index: number) => {
    const isCompleted = 'course_id' in course && completedCourseIds.includes(course.course_id);
    const isActive = index === currentActiveCourseIndex;
    const isLocked = !isCompleted && !isActive;
    const isFinal = 'isFinal' in course;
    const isPressed = pressedNodeId === course.course_id;

    // Alternating horizontal zigzag offset
    const isLeft = index % 2 === 0;
    const translateX = isLeft ? -40 : 40;

    return (
      <View key={course.course_id} style={styles.nodeRow}>
        {/* DAY MILESTONE MARKERS */}
        {!isFinal && (
          <View style={styles.milestoneContainer}>
            <Text style={styles.milestoneLabel}>DAY</Text>
            <Text style={styles.milestoneValue}>{index + 1}</Text>
          </View>
        )}

        <View style={[styles.nodeWrapper, { transform: [{ translateX }] }]}>
          {/* FLOATING TITLE LABEL (Visible on First Tap) */}
          {isPressed && (
            <View style={styles.floatingLabel}>
              <Text style={styles.floatingLabelText}>{course.title}</Text>
              <View style={styles.labelArrow} />
            </View>
          )}

          {/* MAIN ARCADE NODE */}
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
            {isFinal ? (
              <MaterialCommunityIcons name="treasure-chest" size={75} color={isLocked ? '#A0A0A0' : '#8B4513'} />
            ) : isCompleted ? (
              <MaterialCommunityIcons name="check-bold" size={70} color="#FFF" />
            ) : isActive ? (
              <MaterialCommunityIcons name="star" size={70} color="#FFF" />
            ) : (
              <MaterialCommunityIcons name="lock" size={60} color="#A0A0A0" />
            )}
          </Pressable>

          {/* DYNAMIC MASCOT POSITIONING */}
          {isActive && (
            <View style={[styles.mascotContainer, isLeft ? styles.mascotOnRight : styles.mascotOnLeft]}>
              <Image
                source={require('../../assets/images/mascots/bear.png')}
                style={[styles.trailMascot, !isLeft && { transform: [{ scaleX: -1 }] }]}
              />
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* GAMIFIED STAT TRACKING HEADER */}
      <View style={styles.header}>
        <View style={styles.statChip}>
          <MaterialCommunityIcons name="trophy-variant" size={24} color="#FFC800" />
          <Text style={styles.statValue}>{score}</Text>
        </View>
        <View style={styles.statChip}>
          <MaterialCommunityIcons name="heart" size={24} color="#FF4B4B" />
          <Text style={styles.statValue}>{lives}</Text>
        </View>
        <View style={styles.statChip}>
          <MaterialCommunityIcons name="fire" size={24} color="#FF9600" />
          <Text style={styles.statValue}>{streak}</Text>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.trailContainer}>
          {ACADEMY_COURSES.map((course, index) => renderTrailNode(course, index))}
          
          {/* FINAL REWARD NODE */}
          {renderTrailNode({ course_id: 'final', title: 'Ultimate Reward', isFinal: true }, ACADEMY_COURSES.length)}
        </View>
      </ScrollView>

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
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 3,
    borderBottomColor: '#E5E5E5',
    elevation: 4,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#4B4B4B',
  },
  scrollContent: {
    paddingBottom: 150,
  },
  trailContainer: {
    paddingTop: 40,
    alignItems: 'center',
  },
  nodeRow: {
    width: SCREEN_WIDTH,
    height: 220,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 25,
  },
  milestoneContainer: {
    position: 'absolute',
    left: 20,
    alignItems: 'center',
  },
  milestoneLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#BDBDBD',
    letterSpacing: 1,
  },
  milestoneValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#4B4B4B',
  },
  nodeWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeBadge: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 10,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  nodeBadgeCompleted: {
    backgroundColor: '#58CC02',
    borderBottomColor: '#46A302',
  },
  nodeBadgeActive: {
    backgroundColor: '#CE82FF',
    borderBottomColor: '#A568CC',
    shadowColor: '#CE82FF',
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  nodeBadgeLocked: {
    backgroundColor: '#E5E5E5',
    borderBottomColor: '#D0D0D0',
    opacity: 0.8,
  },
  nodeBadgeFinal: {
    backgroundColor: '#FFD700',
    borderBottomColor: '#D4AF37',
  },
  floatingLabel: {
    position: 'absolute',
    top: -75,
    backgroundColor: '#4B4B4B',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    zIndex: 1000,
    minWidth: 180,
    alignItems: 'center',
    elevation: 10,
  },
  floatingLabelText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 15,
    textAlign: 'center',
  },
  labelArrow: {
    position: 'absolute',
    bottom: -10,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderLeftColor: 'transparent',
    borderRightWidth: 10,
    borderRightColor: 'transparent',
    borderTopWidth: 10,
    borderTopColor: '#4B4B4B',
  },
  mascotContainer: {
    position: 'absolute',
    width: MASCOT_SIZE,
    height: MASCOT_SIZE,
    zIndex: -1,
  },
  mascotOnLeft: {
    right: NODE_SIZE * 0.75,
  },
  mascotOnRight: {
    left: NODE_SIZE * 0.75,
  },
  trailMascot: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  // SLIDE MODAL STYLES
  modalBackdrop: {
    flex: 1,
  },
  lessonStage: {
    flex: 1,
  },
  lessonTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    gap: 15,
  },
  progressBarBg: {
    flex: 1,
    height: 18,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  exitBtn: {
    padding: 4,
  },
  slideFrame: {
    width: SCREEN_WIDTH,
    padding: 35,
    justifyContent: 'space-between',
    paddingBottom: 60,
  },
  slideContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideMascotContainer: {
    marginBottom: 20,
    width: 240,
    height: 240,
  },
  slideMascot: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  slideEmoji: {
    fontSize: 90,
    marginBottom: 25,
  },
  slideHighlight: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  slideBody: {
    fontSize: 22,
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 32,
    fontWeight: '700',
  },
  slideActionBtn: {
    backgroundColor: '#FFF',
    paddingVertical: 22,
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  slideActionText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#4B4B4B',
    marginRight: 12,
  },
});
