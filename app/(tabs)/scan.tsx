import { useAuth } from '@/src/context/AuthContext';
import { firebaseDb } from '@/src/lib/firebase';
import { analyzeMarketScan, PresentationSlide, ScanResultDoc } from '@/src/lib/gemini';
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where
} from '@react-native-firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import {
  CheckCircle2,
  ChevronRight,
  CloudOff,
  Scan,
  ShieldCheck,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── PALETTE (Luxury Dark) ────────────────────────────────────
const C = {
  bg: '#141924',
  surface: '#1E2433',
  card: '#252D3D',
  accent: '#CE82FF',
  green: '#58CC02',
  red: '#FF4B4B',
  amber: '#FF9600',
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: 'rgba(255,255,255,0.08)',
};

// ─── INTERFACES ──────────────────────────────────────────────
interface LocalScanResult extends ScanResultDoc {
  id?: string;
  imageUri?: string;
}

const MASCOT_MAP = {
  scan_active: require('../../assets/images/mascots/cat.png'),
  thinking: require('../../assets/images/mascots/shiba.png'),
  wave: require('../../assets/images/mascots/pig.png'),
  alert: require('../../assets/images/mascots/fish.png'),
};

const SCAN_TOOLS = [
  { id: 'fed', title: 'Federal Macro-Pulse AI', emoji: '🏛️', focus: 'FOMC and Macro Policy' },
  { id: 'bank', title: 'Bank Alpha-Whale Scanner', emoji: '🏦', focus: 'Institutional Liquidity' },
  { id: 'crypto', title: 'Crypto Momentum Engine', emoji: '⚡', focus: 'Crypto Volatility and On-chain' },
];

export default function ScanScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'scan' | 'history'>('scan');
  const [selectedTool, setSelectedTool] = useState(SCAN_TOOLS[0]);
  const [isScanning, setIsScanning] = useState(false);
  const [history, setHistory] = useState<LocalScanResult[]>([]);
  const [activeAnalysis, setActiveAnalysis] = useState<LocalScanResult | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (isScanning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.03, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isScanning]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(firebaseDb, 'user_analyses_v2'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setHistory(records);
    });
    return () => unsubscribe();
  }, [user]);

  const executeScan = async () => {
    if (!user) return;
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });
    
    if (pickerResult.canceled || !pickerResult.assets[0].base64) return;

    setIsScanning(true);
    setActiveAnalysis(null);

    try {
      const result = await analyzeMarketScan(
        selectedTool.id as any,
        pickerResult.assets[0].base64,
        pickerResult.assets[0].mimeType || 'image/jpeg'
      );

      // Save to Firestore
      const docRef = await addDoc(collection(firebaseDb, 'user_analyses_v2'), {
        ...result,
        userId: user.uid,
        timestamp: Timestamp.now(),
        imageUri: pickerResult.assets[0].uri,
      });

      const finalResult = { ...result, id: docRef.id, imageUri: pickerResult.assets[0].uri };
      setActiveAnalysis(finalResult);
      setActiveSlideIndex(0);
    } catch (error: any) {
      console.error('Scan Error:', error);
      Alert.alert('Analysis Failed', 'Could not process the chart. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const renderSlideContent = (item: PresentationSlide) => {
    const { slideHeading, bulletPointsList } = item;

    // Slide 1: Market Structure
    if (slideHeading.includes('Market Structure')) {
      const resistance = bulletPointsList[0]?.split(': ')[1] || 'N/A';
      const support = bulletPointsList[1]?.split(': ')[1] || 'N/A';
      const trend = bulletPointsList[2] || '';

      return (
        <View style={styles.specializedContent}>
          <View style={styles.metricGrid}>
            <View style={[styles.metricBlock, { borderLeftColor: C.red }]}>
              <Text style={styles.blockLabel}>RESISTANCE</Text>
              <Text style={styles.blockValue}>{resistance}</Text>
            </View>
            <View style={[styles.metricBlock, { borderLeftColor: C.green }]}>
              <Text style={styles.blockLabel}>SUPPORT</Text>
              <Text style={styles.blockValue}>{support}</Text>
            </View>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryText}>{trend}</Text>
          </View>
        </View>
      );
    }

    // Slide 2: Strategic Outlook
    if (slideHeading.includes('Strategic Outlook')) {
      const targetStr = bulletPointsList[0]?.split(': ')[1] || '';
      const targets = targetStr.split(' | ');
      const probability = bulletPointsList[1]?.match(/\d+%/)?.[0] || '0%';
      const probValue = parseInt(probability) || 0;
      const strategy = bulletPointsList[2]?.split(': ')[1] || bulletPointsList[2] || '';

      return (
        <View style={styles.specializedContent}>
          <View style={styles.targetsRow}>
            {targets.map((t, i) => (
              <View key={i} style={styles.targetBadge}>
                <Text style={styles.targetBadgeText}>{t}</Text>
              </View>
            ))}
          </View>
          
          <View style={styles.probContainer}>
            <View style={styles.probHeader}>
              <Text style={styles.blockLabel}>PROBABILITY</Text>
              <Text style={styles.probValueText}>{probability}</Text>
            </View>
            <View style={styles.probTrack}>
              <View style={[styles.probFill, { width: `${probValue}%` }]} />
            </View>
          </View>

          <View style={styles.strategyBox}>
            <ShieldCheck size={16} color={C.accent} />
            <Text style={styles.strategyText}>{strategy}</Text>
          </View>
        </View>
      );
    }

    // Slide 3: Catalysts & Risks (or default)
    return (
      <View style={styles.bulletContainer}>
        {bulletPointsList.map((point, index) => {
          const [label, ...rest] = point.split(': ');
          const content = rest.join(': ');
          
          return (
            <View key={index} style={styles.bulletRow}>
              {content ? (
                <View style={{ flex: 1 }}>
                  <Text style={styles.blockLabel}>{label.toUpperCase()}</Text>
                  <Text style={styles.bulletText}>{content}</Text>
                </View>
              ) : (
                <>
                  <View style={styles.bulletAccent} />
                  <Text style={styles.bulletText}>{point}</Text>
                </>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const renderSlideItem = ({ item }: { item: PresentationSlide }) => (
    <View style={styles.slideFrame}>
      <View style={styles.slideCard}>
        <View style={styles.slideHeader}>
          <Image source={MASCOT_MAP[item.mascotExpression]} style={styles.slideMascot} />
          <Text style={styles.slideHeading}>{item.slideHeading}</Text>
        </View>
        {renderSlideContent(item)}
      </View>
    </View>
  );

  const renderDashboard = (record: ScanResultDoc) => {
    const { trend, confidenceScore, sentimentLevel } = record.dashboardData;
    const trendColor = trend === 'Bullish' ? C.green : trend === 'Bearish' ? C.red : C.amber;

    return (
      <View style={styles.dashboard}>
        <View style={styles.metricRow}>
          <View style={styles.miniCard}>
            <Text style={styles.miniLabel}>TREND</Text>
            <Text style={[styles.miniValue, { color: trendColor }]}>{trend.toUpperCase()}</Text>
          </View>
          <View style={styles.miniCard}>
            <Text style={styles.miniLabel}>CONFIDENCE</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <ShieldCheck size={14} color={C.accent} />
              <Text style={styles.miniValue}>{confidenceScore}%</Text>
            </View>
          </View>
          <View style={styles.miniCard}>
            <Text style={styles.miniLabel}>SENTIMENT</Text>
            <View style={styles.stepGrid}>
              {[1, 2, 3, 4, 5].map(s => (
                <View key={s} style={[styles.step, { backgroundColor: s <= sentimentLevel ? C.accent : '#2D3548' }]} />
              ))}
            </View>
          </View>
        </View>

        <View style={styles.viewport}>
          <FlatList
            ref={slideListRef}
            data={record.presentationSlides}
            renderItem={renderSlideItem}
            keyExtractor={item => item.slideOrder.toString()}
            horizontal
            pagingEnabled
            snapToInterval={SCREEN_WIDTH}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setActiveSlideIndex(index);
            }}
          />
          
          <View style={styles.paginationRow}>
            {record.presentationSlides.map((_, i) => (
              <View key={i} style={[styles.dot, activeSlideIndex === i && styles.dotActive]} />
            ))}
          </View>
        </View>

        <Pressable onPress={() => setActiveAnalysis(null)} style={styles.dismissBtn}>
          <Text style={styles.dismissText}>Run New Scan</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.tabNav}>
        <Pressable onPress={() => setActiveTab('scan')} style={[styles.tab, activeTab === 'scan' && styles.tabActive]}>
          <Text style={[styles.tabLabel, activeTab === 'scan' && styles.tabLabelActive]}>Analyzer</Text>
        </Pressable>
        <Pressable onPress={() => setActiveTab('history')} style={[styles.tab, activeTab === 'history' && styles.tabActive]}>
          <Text style={[styles.tabLabel, activeTab === 'history' && styles.tabLabelActive]}>Records</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {activeTab === 'scan' ? (
          activeAnalysis ? renderDashboard(activeAnalysis) : (
            <View style={styles.home}>
              <View style={styles.hero}>
                <Image source={require('../../assets/images/mascots/cat.png')} style={styles.heroImg} />
                <Text style={styles.heroTitle}>Multi-Modal Vision</Text>
                <Text style={styles.heroSub}>Select an engine and upload a chart to begin.</Text>
              </View>

              <View style={styles.toolStack}>
                {SCAN_TOOLS.map(tool => (
                  <Pressable 
                    key={tool.id} 
                    onPress={() => setSelectedTool(tool)}
                    style={[styles.toolRow, selectedTool.id === tool.id && styles.toolRowActive]}
                  >
                    <View style={styles.toolIcon}>
                      <Text style={{ fontSize: 22 }}>{tool.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.toolName}>{tool.title}</Text>
                      <Text style={styles.toolFocus}>{tool.focus}</Text>
                    </View>
                    {selectedTool.id === tool.id && <CheckCircle2 color={C.accent} size={20} />}
                  </Pressable>
                ))}
              </View>

              <Animated.View style={{ transform: [{ scale: pulseAnim }], marginTop: 20, paddingHorizontal: 20 }}>
                <Pressable onPress={executeScan} disabled={isScanning} style={styles.scanBtn}>
                  {isScanning ? <ActivityIndicator color="#FFF" /> : (
                    <>
                      <Scan color="#FFF" size={24} />
                      <Text style={styles.scanBtnText}>Analyze Chart</Text>
                    </>
                  )}
                </Pressable>
              </Animated.View>
            </View>
          )
        ) : (
          <View style={styles.history}>
            {history.map(item => (
              <Pressable key={item.id} style={styles.historyCard} onPress={() => { setActiveAnalysis(item); setActiveTab('scan'); }}>
                <View style={styles.historyIcon}><Text style={{ fontSize: 20 }}>{SCAN_TOOLS.find(t => t.id === item.scanCategory)?.emoji || '📊'}</Text></View>
                <View style={{ flex: 1, marginLeft: 15 }}>
                  <Text style={styles.historyTitle}>{item.presentationSlides?.[0]?.slideHeading || 'Analysis'}</Text>
                  <Text style={styles.historyMeta}>{(item.scanCategory || 'crypto').toUpperCase()} • COMPLETED</Text>
                </View>
                <ChevronRight color={C.textMuted} size={20} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  tabNav: { flexDirection: 'row', padding: 20, gap: 10 },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 14, backgroundColor: C.surface },
  tabActive: { backgroundColor: C.accent },
  tabLabel: { color: C.textSecondary, fontWeight: '800', fontSize: 13 },
  tabLabelActive: { color: '#FFF' },

  home: { paddingBottom: 40 },
  hero: { alignItems: 'center', marginVertical: 30 },
  heroImg: { width: 90, height: 90, resizeMode: 'contain', marginBottom: 15 },
  heroTitle: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  heroSub: { color: C.textSecondary, fontSize: 14, marginTop: 8 },
  toolStack: { paddingHorizontal: 20, gap: 12 },
  toolRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 18, backgroundColor: C.surface, borderWidth: 1, borderColor: 'transparent' },
  toolRowActive: { borderColor: C.accent, backgroundColor: C.card },
  toolIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  toolName: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  toolFocus: { color: C.textMuted, fontSize: 11, marginTop: 2 },
  scanBtn: { backgroundColor: C.accent, paddingVertical: 18, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  scanBtnText: { color: '#FFF', fontSize: 17, fontWeight: '900' },

  dashboard: { paddingHorizontal: 0 },
  metricRow: { flexDirection: 'row', gap: 10, marginHorizontal: 20, marginBottom: 20 },
  miniCard: { flex: 1, backgroundColor: C.surface, padding: 14, borderRadius: 16, alignItems: 'center' },
  miniLabel: { color: C.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 1, marginBottom: 6 },
  miniValue: { color: '#FFF', fontSize: 14, fontWeight: '900' },
  stepGrid: { flexDirection: 'row', gap: 3 },
  step: { width: 5, height: 10, borderRadius: 2 },

  viewport: { height: 360 },
  slideFrame: { width: SCREEN_WIDTH, paddingHorizontal: 20 },
  slideCard: { flex: 1, backgroundColor: C.card, borderRadius: 28, padding: 25, justifyContent: 'center' },
  slideHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 15 },
  slideMascot: { width: 64, height: 64, resizeMode: 'contain' },
  slideHeading: { flex: 1, color: '#FFF', fontSize: 20, fontWeight: '900' },
  bulletContainer: { gap: 12 },
  bulletRow: { flexDirection: 'row', backgroundColor: '#1E2433', padding: 16, borderRadius: 16, alignItems: 'center' },
  bulletAccent: { width: 4, height: '100%', backgroundColor: C.accent, borderRadius: 2, marginRight: 15 },
  bulletText: { flex: 1, color: C.textSecondary, fontSize: 13, fontWeight: '600', lineHeight: 20 },
  
  paginationRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2D3548' },
  dotActive: { width: 24, backgroundColor: C.accent },

  dismissBtn: { marginHorizontal: 20, marginTop: 30, paddingVertical: 16, alignItems: 'center', backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border },
  dismissText: { color: '#FFF', fontWeight: '800', fontSize: 14 },

  history: { paddingHorizontal: 20 },
  historyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, padding: 16, borderRadius: 18, marginBottom: 12 },
  historyIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  historyTitle: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  historyMeta: { color: C.textMuted, fontSize: 10, marginTop: 4, fontWeight: '700' },

  // Specialized Slide Styles
  specializedContent: { flex: 1, gap: 15 },
  metricGrid: { flexDirection: 'row', gap: 12 },
  metricBlock: { flex: 1, backgroundColor: '#1E2433', padding: 12, borderRadius: 16, borderLeftWidth: 4 },
  blockLabel: { color: C.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  blockValue: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  summaryBox: { backgroundColor: '#1E2433', padding: 16, borderRadius: 16 },
  summaryText: { color: C.textSecondary, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  
  targetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  targetBadge: { backgroundColor: 'rgba(206, 130, 255, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(206, 130, 255, 0.2)' },
  targetBadgeText: { color: C.accent, fontSize: 10, fontWeight: '800' },
  
  probContainer: { backgroundColor: '#1E2433', padding: 16, borderRadius: 16 },
  probHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  probValueText: { color: '#FFF', fontSize: 14, fontWeight: '900' },
  probTrack: { height: 6, backgroundColor: '#2D3548', borderRadius: 3, overflow: 'hidden' },
  probFill: { height: '100%', backgroundColor: C.accent },
  
  strategyBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(88, 204, 2, 0.05)', padding: 16, borderRadius: 16, borderLeftWidth: 3, borderLeftColor: C.green },
  strategyText: { flex: 1, color: '#FFF', fontSize: 12, fontWeight: '700', lineHeight: 18 },
});