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

// REFINED SCALING FOR MAXIMUM BREATHING ROOM
const NODE_SIZE = 92; 
const MASCOT_SIZE = 135; 
const ROW_HEIGHT = 150;

export default function LearnScreen() {
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

    // Horizontal Zigzag Logic
    const isLeftTrack = index % 2 === 0;
    
    // Boundary collision fix for first chapter
    const renderLabelBelow = index === 0;

    return (
      <View key={course.course_id} style={styles.nodeRow}>
        {/* ZONE 1: LEFT SIDE (Milestone or Mascot) */}
        <View style={styles.sideZone}>
          {!isFinal && isLeftTrack && (
            <View style={styles.milestoneBox}>
              <Text style={styles.milestoneLabel}>DAY</Text>
              <Text style={styles.milestoneValue}>{index + 1}</Text>
            </View>
          )}
          {isActive && !isLeftTrack && (
            <Image
              source={require('../../assets/images/mascots/bear.png')}
              style={[styles.sideMascot, { transform: [{ scaleX: -1 }] }]}
            />
          )}
        </View>

        {/* ZONE 2: CENTER TRACK (Node + Floating Label) */}
        <View style={styles.centerZone}>
          <View style={styles.nodeAnchor}>
            {isPressed && (
              <View style={[
                styles.floatingLabel, 
                renderLabelBelow ? styles.labelBelow : styles.labelAbove
              ]}>
                <View style={renderLabelBelow ? styles.arrowTop : styles.arrowBottom} />
                <Text style={styles.floatingLabelText}>{course.title}</Text>
              </View>
            )}

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
                <MaterialCommunityIcons name="treasure-chest" size={50} color={isLocked ? '#A0A0A0' : '#8B4513'} />
              ) : isCompleted ? (
                <MaterialCommunityIcons name="check-bold" size={45} color="#FFF" />
              ) : isActive ? (
                <MaterialCommunityIcons name="star" size={45} color="#FFF" />
              ) : (
                <MaterialCommunityIcons name="lock" size={40} color="#A0A0A0" />
              )}
            </Pressable>
          </View>
        </View>

        {/* ZONE 3: RIGHT SIDE (Milestone or Mascot) */}
        <View style={styles.sideZone}>
          {!isFinal && !isLeftTrack && (
            <View style={styles.milestoneBox}>
              <Text style={styles.milestoneLabel}>DAY</Text>
              <Text style={styles.milestoneValue}>{index + 1}</Text>
            </View>
          )}
          {isActive && isLeftTrack && (
            <Image
              source={require('../../assets/images/mascots/bear.png')}
              style={styles.sideMascot}
            />
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* MODERN VIBRANT HEADER */}
      <View style={styles.header}>
        <View style={styles.statChip}>
          <MaterialCommunityIcons name="trophy-variant" size={22} color="#FFC800" />
          <Text style={styles.statValue}>{score}</Text>
        </View>
        <View style={styles.statChip}>
          <MaterialCommunityIcons name="heart" size={22} color="#FF4B4B" />
          <Text style={styles.statValue}>{lives}</Text>
        </View>
        <View style={styles.statChip}>
          <MaterialCommunityIcons name="fire" size={22} color="#FF9600" />
          <Text style={styles.statValue}>{streak}</Text>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.trailContainer}>
          {ACADEMY_COURSES.map((course, index) => renderTrailNode(course, index))}
          {renderTrailNode({ course_id: 'final', title: 'Institutional Reward', isFinal: true }, ACADEMY_COURSES.length)}
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
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: '#F2F2F2',
    elevation: 2,
    zIndex: 10,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#4B4B4B',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  trailContainer: {
    paddingTop: 20,
    alignItems: 'center',
  },
  nodeRow: {
    width: SCREEN_WIDTH,
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  sideZone: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerZone: {
    width: NODE_SIZE + 40,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nodeAnchor: {
    position: 'relative',
    width: NODE_SIZE,
    height: NODE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  milestoneBox: {
    alignItems: 'center',
  },
  milestoneLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#D0D0D0',
    letterSpacing: 1,
  },
  milestoneValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#888888',
  },
  sideMascot: {
    width: MASCOT_SIZE,
    height: MASCOT_SIZE,
    resizeMode: 'contain',
  },
  nodeBadge: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 6,
    borderBottomColor: 'rgba(0,0,0,0.15)',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  nodeBadgeCompleted: {
    backgroundColor: '#58CC02',
    borderBottomColor: '#46A302',
  },
  nodeBadgeActive: {
    backgroundColor: '#CE82FF',
    borderBottomColor: '#A568CC',
  },
  nodeBadgeLocked: {
    backgroundColor: '#E5E5E5',
    borderBottomColor: '#D0D0D0',
    opacity: 0.7,
  },
  nodeBadgeFinal: {
    backgroundColor: '#FFD700',
    borderBottomColor: '#D4AF37',
  },
  // ADAPTIVE FLOATING LABEL
  floatingLabel: {
    position: 'absolute',
    backgroundColor: '#4B4B4B',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    zIndex: 1000,
    minWidth: 150,
    alignItems: 'center',
    elevation: 8,
  },
  labelAbove: {
    bottom: NODE_SIZE + 15,
  },
  labelBelow: {
    top: NODE_SIZE + 15,
  },
  floatingLabelText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
    textAlign: 'center',
  },
  arrowBottom: {
    position: 'absolute',
    bottom: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderLeftColor: 'transparent',
    borderRightWidth: 8,
    borderRightColor: 'transparent',
    borderTopWidth: 8,
    borderTopColor: '#4B4B4B',
  },
  arrowTop: {
    position: 'absolute',
    top: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderLeftColor: 'transparent',
    borderRightWidth: 8,
    borderRightColor: 'transparent',
    borderBottomWidth: 8,
    borderBottomColor: '#4B4B4B',
  },
  // LESSON SLIDE VIEWER STYLES
  modalBackdrop: { flex: 1 },
  lessonStage: { flex: 1 },
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
  exitBtn: { padding: 4 },
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
  slideMascotContainer: {
    marginBottom: 10,
    width: 130,
    height: 130,
  },
  slideMascot: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  slideEmoji: {
    fontSize: 60,
    marginBottom: 10,
  },
  slideHighlight: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  slideBody: {
    fontSize: 17,
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 24,
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
});
