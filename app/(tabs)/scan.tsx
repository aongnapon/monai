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
import { LinearGradient } from 'expo-linear-gradient';
import {
  CheckCircle2,
  ChevronRight,
  Landmark,
  Radar,
  Scan,
  Zap,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  UIManager,
  View
} from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { SafeAreaView } from 'react-native-safe-area-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── PALETTE (Premium Light Theme) ────────────────────────────
const C = {
  bg: '#FFFFFF',                     // Pure white background
  surface: '#F8FAFC',                // Soft slate tint surface depth
  card: '#FFFFFF',                   // Clean card base
  accent: '#1D4ED8',                 // Commanding vibrant royal blue accent
  green: '#10B981',                  // Modern light-mode emerald green
  red: '#EF4444',                    // Modern light-mode rose red
  amber: '#F59E0B',                  // Modern light-mode amber
  textPrimary: '#0A1128',            // Premium deep dark navy blue
  textSecondary: '#64748B',          // Slate grey subtitles/secondary labels
  textMuted: '#64748B',              // Slate grey muted
  border: '#E2E8F0',                 // Soft light slate border
  gradient: ['#FFFFFF', '#F8FAFC'] as const, // Subtle premium gradient
};

// ─── INTERFACES ──────────────────────────────────────────────
interface LocalScanResult extends ScanResultDoc {
  id?: string;
  imageUri?: string;
}

const MASCOT_MAP = {
  scan_active: require('../../assets/images/mascots/fed.png'),
  thinking: require('../../assets/images/mascots/shiba.png'),
  wave: require('../../assets/images/mascots/pig.png'),
  alert: require('../../assets/images/mascots/fish.png'),
};

const SCAN_TOOLS = [
  { id: 'fed',    title: 'Federal Macro-Pulse AI',   icon: 'landmark' as const, focus: 'FOMC and Macro Policy' },
  { id: 'bank',   title: 'Bank Alpha-Whale Scanner', icon: 'radar'    as const, focus: 'Institutional Liquidity' },
  { id: 'crypto', title: 'Crypto Momentum Engine',   icon: 'zap'      as const, focus: 'Crypto Volatility and On-chain' },
];

/** Renders the correct Lucide vector icon for a scan tool */
const ToolIcon = ({ iconName, active }: { iconName: string; active: boolean }) => {
  const color = active ? '#1E3A8A' : '#64748B';
  const size = 22;
  switch (iconName) {
    case 'landmark': return <Landmark size={size} color={color} />;
    case 'radar':    return <Radar    size={size} color={color} />;
    case 'zap':      return <Zap      size={size} color={color} />;
    default:         return <Scan     size={size} color={color} />;
  }
};

export default function ScanScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'scan' | 'history'>('scan');
  const [selectedTool, setSelectedTool] = useState(SCAN_TOOLS[0]);
  const [isScanning, setIsScanning] = useState(false);
  const [history, setHistory] = useState<LocalScanResult[]>([]);
  const [activeAnalysis, setActiveAnalysis] = useState<LocalScanResult | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [selectedScenario, setSelectedScenario] = useState<'Bullish' | 'Sideways' | 'Bearish'>('Bullish');
  const [scanError, setScanError] = useState<string | null>(null);

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
    setScanError(null);

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
      setScanError('Analysis failed: Could not locate key ticker metrics or process chart patterns.');
    } finally {
      setIsScanning(false);
    }
  };

  const renderSlideContent = (item: PresentationSlide, record: ScanResultDoc) => {
    const { slideHeading, bulletPointsList } = item;

    // Slide 1: Market Structure
    if (slideHeading.includes('Market Structure')) {
      const resistance = bulletPointsList[0]?.split(': ')[1] || 'N/A';
      const support = bulletPointsList[1]?.split(': ')[1] || 'N/A';
      const trendAnalysisText = bulletPointsList[2]?.replace('Trend Analysis: ', '') || bulletPointsList[2] || '';

      const { trend, confidenceScore, sentimentLevel } = record.dashboardData;
      const trendColor = trend === 'Bullish' ? C.green : trend === 'Bearish' ? C.red : C.amber;

      // Safe parsing of numerical values for the chart
      const cleanValue = (valStr: string) => {
        const cleaned = valStr.replace(/[^0-9.]/g, '');
        return parseFloat(cleaned) || 0;
      };

      const val1 = cleanValue(support) || 100;
      const val2 = cleanValue(resistance) || 150;
      const supNum = Math.min(val1, val2);
      const resNum = Math.max(val1, val2);
      const diff = resNum - supNum || 50;

      let chartData = [];
      if (trend === 'Bullish') {
        chartData = [
          { value: supNum },
          { value: supNum + diff * 0.15 },
          { value: supNum + diff * 0.35 },
          { value: supNum + diff * 0.30 },
          { value: supNum + diff * 0.65 },
          { value: supNum + diff * 0.80 },
          { value: resNum },
        ];
      } else if (trend === 'Bearish') {
        chartData = [
          { value: resNum },
          { value: resNum - diff * 0.15 },
          { value: resNum - diff * 0.35 },
          { value: resNum - diff * 0.30 },
          { value: resNum - diff * 0.65 },
          { value: resNum - diff * 0.80 },
          { value: supNum },
        ];
      } else {
        // Sideways / Consolidation
        chartData = [
          { value: supNum + diff * 0.40 },
          { value: supNum + diff * 0.65 },
          { value: supNum + diff * 0.30 },
          { value: supNum + diff * 0.70 },
          { value: supNum + diff * 0.45 },
          { value: supNum + diff * 0.50 },
        ];
      }

      return (
        <View style={styles.specializedContent}>
          {/* Elegant horizontal metric row deck */}
          <View style={styles.luxuryMetricRowDeck}>
            <View style={styles.luxuryMetricCell}>
              <Text style={styles.luxuryMetricLabel}>TREND</Text>
              <Text style={[styles.luxuryMetricVal, { color: trendColor }]}>{trend.toUpperCase()}</Text>
            </View>
            <View style={styles.luxuryDivider} />
            <View style={styles.luxuryMetricCell}>
              <Text style={styles.luxuryMetricLabel}>CONFIDENCE</Text>
              <Text style={styles.luxuryMetricVal}>{confidenceScore}%</Text>
            </View>
            <View style={styles.luxuryDivider} />
            <View style={styles.luxuryMetricCell}>
              <Text style={styles.luxuryMetricLabel}>SENTIMENT</Text>
              <View style={styles.sentimentPips}>
                {[1, 2, 3, 4, 5].map(s => (
                  <View key={s} style={[styles.sentimentPip, { backgroundColor: s <= sentimentLevel ? C.accent : '#E2E8F0' }]} />
                ))}
              </View>
            </View>
          </View>

          {/* Resistance & Support side-by-side cards */}
          <View style={styles.metricGrid}>
            <View style={styles.luxuryMetricCard}>
              <Text style={styles.blockLabelMuted}>RESISTANCE</Text>
              <Text style={[styles.blockValueBold, { color: C.red }]}>{resistance}</Text>
            </View>
            <View style={styles.luxuryMetricCard}>
              <Text style={styles.blockLabelMuted}>SUPPORT</Text>
              <Text style={[styles.blockValueBold, { color: C.green }]}>{support}</Text>
            </View>
          </View>

          {/* Luxury Area Chart Asset representing Trend Path */}
          <View style={styles.chartWrapper}>
            <LineChart
              areaChart
              curved
              data={chartData}
              width={SCREEN_WIDTH - 96}
              height={70}
              thickness={2.5}
              color={C.accent}
              startFillColor="rgba(29, 78, 216, 0.12)"
              endFillColor="rgba(29, 78, 216, 0.00)"
              hideRules
              hideAxesAndRules
              hideDataPoints
              initialSpacing={10}
              endSpacing={10}
            />
          </View>

          {/* Executive Brief Container Box */}
          <View style={styles.executiveBriefContainer}>
            <Text style={styles.executiveBriefLabel}>EXECUTIVE BRIEF</Text>
            <Text style={styles.executiveBriefText}>{trendAnalysisText}</Text>
          </View>
        </View>
      );
    }

    // Slide 2: Strategic Outlook
    if (slideHeading.includes('Strategic Outlook')) {
      const targetStr = bulletPointsList[0]?.split(': ')[1] || '';
      const targets = targetStr.split(' | ');
      const shortTermVal = targets[0]?.replace('Short: ', '') || 'N/A';
      const midTermVal = targets[1]?.replace('Mid: ', '') || 'N/A';
      const longTermVal = targets[2]?.replace('Long: ', '') || 'N/A';

      const probability = bulletPointsList[1]?.match(/\d+%/)?.[0] || '0%';
      const probValue = parseInt(probability) || 0;
      const strategyText = bulletPointsList[2]?.split(': ')[1] || bulletPointsList[2] || '';

      const { trend } = record.dashboardData;

      return (
        <View style={styles.specializedContent}>

          {/* Probability Indicator */}
          <View style={styles.luxuryProbContainer}>
            <View style={styles.probHeader}>
              <Text style={styles.blockLabelMuted}>PROBABILITY FORECAST</Text>
              <Text style={styles.luxuryProbValueText}>{probability}</Text>
            </View>
            <View style={styles.luxuryProbTrack}>
              <View style={[styles.luxuryProbFill, { width: `${probValue}%` }]} />
            </View>
          </View>

          {/* Strategy / Executive Brief */}
          <View style={styles.executiveBriefContainer}>
            <Text style={styles.executiveBriefLabel}>STRATEGIC RECOMMENDATION</Text>
            <Text style={styles.executiveBriefText}>{strategyText}</Text>
          </View>
        </View>
      );
    }

    // Slide 3: Catalysts & Risks
    if (slideHeading.includes('Catalysts & Risks')) {
      const triggerPoint = bulletPointsList[0] || '';
      const riskPoint = bulletPointsList[1] || '';
      const catalystPoint = bulletPointsList[2] || '';

      const triggerLabel = triggerPoint.split(': ')[0] || 'TRIGGER';
      const triggerContent = triggerPoint.split(': ').slice(1).join(': ') || triggerPoint;

      const riskLabel = riskPoint.split(': ')[0] || 'RISK FACTOR';
      const riskContent = riskPoint.split(': ').slice(1).join(': ') || riskPoint;

      const catalystLabel = catalystPoint.split(': ')[0] || 'MACRO CATALYST';
      const catalystContent = catalystPoint.split(': ').slice(1).join(': ') || catalystPoint;

      return (
        <View style={styles.specializedContent}>
          {/* Trigger events slot - clean borders-only presentation slot */}
          <View style={styles.bordersOnlySlot}>
            <Text style={styles.slotLabelMuted}>{triggerLabel.toUpperCase()}</Text>
            <Text style={styles.slotContentText}>{triggerContent}</Text>
          </View>

          {/* Possible Risks slot - clean borders-only presentation slot */}
          <View style={styles.bordersOnlySlot}>
            <Text style={styles.slotLabelMuted}>{riskLabel.toUpperCase()}</Text>
            <Text style={styles.slotContentText}>{riskContent}</Text>
          </View>

          {/* Final analytical summary paragraph wrapped inside an authoritative, wide-margined "Executive Brief" container box */}
          <View style={styles.executiveBriefContainer}>
            <Text style={styles.executiveBriefLabel}>{catalystLabel.toUpperCase()}</Text>
            <Text style={styles.executiveBriefText}>{catalystContent}</Text>
          </View>
        </View>
      );
    }

    // Fallback slide content
    return (
      <View style={styles.bulletContainer}>
        {bulletPointsList.map((point, index) => {
          const [label, ...rest] = point.split(': ');
          const content = rest.join(': ');
          
          return (
            <View key={index} style={styles.bordersOnlySlot}>
              {content ? (
                <View style={{ flex: 1 }}>
                  <Text style={styles.slotLabelMuted}>{label.toUpperCase()}</Text>
                  <Text style={styles.slotContentText}>{content}</Text>
                </View>
              ) : (
                <Text style={styles.slotContentText}>{point}</Text>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const renderSlideItem = ({ item, record }: { item: PresentationSlide; record: ScanResultDoc }) => (
    <View style={styles.slideFrame}>
      <LinearGradient
        colors={C.gradient}
        style={styles.slideCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.slideHeader}>
          <Image source={MASCOT_MAP[item.mascotExpression]} style={styles.slideMascot} />
          <Text style={styles.slideHeading}>{item.slideHeading}</Text>
        </View>
        {renderSlideContent(item, record)}
      </LinearGradient>
    </View>
  );

  const renderDashboard = (record: ScanResultDoc) => {
    return (
      <View style={styles.dashboard}>
        <View style={styles.viewport}>
          <FlatList
            ref={slideListRef}
            data={record.presentationSlides}
            renderItem={({ item }) => renderSlideItem({ item, record })}
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

        <Pressable onPress={() => { setActiveAnalysis(null); setScanError(null); }} style={styles.dismissBtn}>
          <Text style={styles.dismissText}>Run New Scan</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.tabNav}>
        <Pressable onPress={() => setActiveTab('scan')} style={[styles.tab, activeTab === 'scan' && styles.tabActive]}>
          <Text style={[styles.tabLabel, activeTab === 'scan' && styles.tabLabelActive]}>Analyzer</Text>
        </Pressable>
        <Pressable onPress={() => setActiveTab('history')} style={[styles.tab, activeTab === 'history' && styles.tabActive]}>
          <Text style={[styles.tabLabel, activeTab === 'history' && styles.tabLabelActive]}>Records</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        {activeTab === 'scan' ? (
          scanError ? (
            <View style={styles.errorContainer}>
              <View style={styles.errorSlide}>
                <View style={styles.errorHeader}>
                  <Text style={styles.errorEmoji}>⚠️</Text>
                  <Text style={styles.errorTitle}>Ticker Identification Alert</Text>
                </View>
                <View style={styles.executiveBriefContainer}>
                  <Text style={styles.executiveBriefLabel}>DIAGNOSTIC STATUS</Text>
                  <Text style={styles.executiveBriefText}>{scanError}</Text>
                </View>
                <Pressable onPress={() => setScanError(null)} style={styles.dismissBtn}>
                  <Text style={styles.dismissText}>Reset Selector</Text>
                </Pressable>
              </View>
            </View>
          ) : activeAnalysis ? (
            renderDashboard(activeAnalysis)
          ) : (
            <View style={styles.home}>
              <View style={styles.homeSlide}>
                <View style={styles.hero}>
                  <Image source={require('../../assets/images/mascots/fed.png')} style={styles.heroImg} />
                  <Text style={styles.heroTitle}>Multi-Modal Vision</Text>
                  <Text style={styles.heroSub}>Select target filters and upload your chart to begin.</Text>
                </View>


                {/* Engine Selector */}
                <View style={styles.sectionDivider} />
                <Text style={styles.sectionLabelMuted}>SELECT ANALYSIS ENGINE</Text>
                <View style={styles.toolStack}>
                  {SCAN_TOOLS.map(tool => (
                    <Pressable 
                      key={tool.id} 
                      onPress={() => setSelectedTool(tool)}
                      style={[styles.toolRow, selectedTool.id === tool.id && styles.toolRowActive]}
                    >
                      <View style={[styles.toolIcon, selectedTool.id === tool.id && styles.toolIconActive]}>
                      <ToolIcon iconName={tool.icon} active={selectedTool.id === tool.id} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.toolName}>{tool.title}</Text>
                      <Text style={styles.toolFocus}>{tool.focus}</Text>
                    </View>
                    {selectedTool.id === tool.id && <CheckCircle2 color={C.accent} size={16} />}
                    </Pressable>
                  ))}
                </View>

                <Animated.View style={{ transform: [{ scale: pulseAnim }], marginTop: 24 }}>
                  <Pressable onPress={executeScan} disabled={isScanning} style={styles.scanBtn}>
                    {isScanning ? <ActivityIndicator color="#FFF" /> : (
                      <>
                        <Scan color="#FFF" size={20} />
                        <Text style={styles.scanBtnText}>Analyze Chart</Text>
                      </>
                    )}
                  </Pressable>
                </Animated.View>
              </View>
            </View>
          )
        ) : (
          <View style={styles.history}>
            {history.map(item => (
              <Pressable key={item.id} style={styles.historyCard} onPress={() => { setActiveAnalysis(item); setActiveTab('scan'); }}>
                <View style={styles.historyIcon}><ToolIcon iconName={SCAN_TOOLS.find(t => t.id === item.scanCategory)?.icon || 'scan'} active={false} /></View>
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
  tabNav: { flexDirection: 'row', padding: 12, gap: 10 },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 14, backgroundColor: C.surface },
  tabActive: { backgroundColor: C.accent },
  tabLabel: { color: C.textSecondary, fontWeight: '800', fontSize: 13 },
  tabLabelActive: { color: '#FFFFFF' },

  home: { paddingBottom: 0 },
  homeSlide: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    padding: 20, 
    borderWidth: 1, 
    borderColor: C.border, 
    shadowColor: '#0A1128', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 12, 
    elevation: 3, 
    marginHorizontal: 20, 
    marginVertical: 10 
  },
  hero: { alignItems: 'center', marginTop: -5, marginBottom: 0 },
  heroImg: { width: 320, height: 160, resizeMode: 'contain', marginBottom: 5 },
  heroTitle: { color: C.textPrimary, fontSize: 22, fontWeight: '900' },
  heroSub: { color: C.textSecondary, fontSize: 12, marginTop: 4, textAlign: 'center', paddingHorizontal: 10 },
  sectionDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 16 },
  sectionLabelMuted: { color: C.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 0.8, marginBottom: 12 },
  
  toolStack: { gap: 6 },
  toolRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: 'transparent' },
  toolRowActive: { borderColor: C.accent, backgroundColor: '#FFFFFF' },
  toolIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  toolIconActive: { backgroundColor: 'rgba(29, 78, 216, 0.06)' },
  toolName: { color: C.textPrimary, fontSize: 13, fontWeight: '800' },
  toolFocus: { color: C.textMuted, fontSize: 10, marginTop: 1 },
  scanBtn: { backgroundColor: C.accent, paddingVertical: 14, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  scanBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },

  errorContainer: { paddingHorizontal: 20, marginVertical: 10 },
  errorSlide: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    padding: 24, 
    borderWidth: 1, 
    borderColor: C.border, 
    shadowColor: '#0A1128', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 12, 
    elevation: 3 
  },
  errorHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  errorEmoji: { fontSize: 28 },
  errorTitle: { color: C.textPrimary, fontSize: 16, fontWeight: '800' },

  dashboard: { paddingHorizontal: 0 },
  viewport: { height: 510 },
  slideFrame: { width: SCREEN_WIDTH, paddingHorizontal: 20, paddingVertical: 10 },
  slideCard: { 
    flex: 1, 
    borderRadius: 20, 
    padding: 20, 
    borderWidth: 1, 
    borderColor: '#E2E8F0',
    shadowColor: '#0A1128',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  slideHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  slideMascot: { width: 44, height: 44, resizeMode: 'contain' },
  slideHeading: { flex: 1, color: C.textPrimary, fontSize: 18, fontWeight: '900' },
  bulletContainer: { gap: 8 },
  
  paginationRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E2E8F0' },
  dotActive: { width: 24, backgroundColor: C.accent },

  dismissBtn: { marginHorizontal: 20, marginTop: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border },
  dismissText: { color: C.textPrimary, fontWeight: '800', fontSize: 13 },

  history: { paddingHorizontal: 20 },
  historyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, padding: 16, borderRadius: 16, marginBottom: 8 },
  historyIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
  historyTitle: { color: C.textPrimary, fontSize: 14, fontWeight: '800' },
  historyMeta: { color: C.textMuted, fontSize: 10, marginTop: 4, fontWeight: '700' },

  // Specialized Slide Styles
  specializedContent: { flex: 1, gap: 10 },
  metricGrid: { flexDirection: 'row', gap: 10 },
  
  chartWrapper: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    paddingVertical: 4,
    marginVertical: 2,
  },
  
  // Slide 1 Market Structure styles
  luxuryMetricRowDeck: { 
    flexDirection: 'row', 
    backgroundColor: C.surface, 
    borderRadius: 14, 
    padding: 12, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: C.border 
  },
  luxuryMetricCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  luxuryDivider: { width: 1, height: '60%', backgroundColor: '#E2E8F0' },
  luxuryMetricLabel: { color: C.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 0.5, marginBottom: 4 },
  luxuryMetricVal: { color: C.textPrimary, fontSize: 13, fontWeight: '900' },
  sentimentPips: { flexDirection: 'row', gap: 3, marginTop: 4 },
  sentimentPip: { width: 6, height: 10, borderRadius: 1.5 },

  luxuryMetricCard: { flex: 1, backgroundColor: '#FFFFFF', padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, alignItems: 'center' },
  blockLabelMuted: { color: C.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 0.5, marginBottom: 4 },
  blockValueBold: { fontSize: 13, fontWeight: '900' },

  executiveBriefContainer: { 
    backgroundColor: '#F8FAFC', 
    padding: 14, 
    borderRadius: 14, 
    borderWidth: 1, 
    borderColor: C.border, 
    borderLeftWidth: 4, 
    borderLeftColor: C.accent 
  },
  executiveBriefLabel: { color: C.accent, fontSize: 8, fontWeight: '900', letterSpacing: 1, marginBottom: 6 },
  executiveBriefText: { color: C.textPrimary, fontSize: 11, lineHeight: 16, fontWeight: '700' },


  luxuryProbContainer: { backgroundColor: C.surface, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  luxuryProbValueText: { color: C.textPrimary, fontSize: 13, fontWeight: '900' },
  luxuryProbTrack: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden', marginTop: 4 },
  luxuryProbFill: { height: '100%', backgroundColor: C.accent },

  // Slide 3 Catalysts & Risks styles
  bordersOnlySlot: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: C.border },
  slotLabelMuted: { color: C.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 0.5, marginBottom: 4 },
  slotContentText: { color: C.textPrimary, fontSize: 11, lineHeight: 16, fontWeight: '700' },
});