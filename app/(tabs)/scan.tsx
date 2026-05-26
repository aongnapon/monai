import { useAuth } from '@/src/context/AuthContext';
import { firebaseDb } from '@/src/lib/firebase';
import { GoogleGenerativeAI } from "@google/generative-ai";
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
  CloudOff,
  Scan,
  ShieldCheck,
  Target,
  XCircle
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
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

// ─── PALETTE ──────────────────────────────────────────────────
const C = {
  bg:           '#F7F8FA',
  surface:      '#FFFFFF',
  surfaceAlt:   '#F0F2F5',
  border:       '#E8ECF0',
  borderMuted:  '#F0F2F5',
  accent:       '#3B6EF6',          // electric indigo
  accentLight:  'rgba(59,110,246,0.08)',
  accentMid:    'rgba(59,110,246,0.18)',
  green:        '#10B981',
  greenLight:   'rgba(16,185,129,0.10)',
  red:          '#EF4444',
  redLight:     'rgba(239,68,68,0.10)',
  amber:        '#F59E0B',
  text:         '#0F172A',
  textSub:      '#64748B',
  textMuted:    '#A0AEC0',
  charcoal:     '#1E2433',
  charcoalDark: '#141924',
};

// ─── API ───────────────────────────────────────────────────────
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI   = new GoogleGenerativeAI(API_KEY);
const model   = genAI.getGenerativeModel({
  model: 'gemini-3.1-flash-lite',
  systemInstruction:
    'You are a Senior Multi-Modal Financial AI Architect. Analyze financial charts and return STRICT JSON. No markdown blocks.',
});

// ─── SCAN TOOLS ────────────────────────────────────────────────
const SCAN_TOOLS = [
  {
    id:    'federal',
    title: 'Federal Macro-Pulse AI',
    desc:  'Scans FOMC transcripts, Federal Reserve interest rate projections, and central bank liquidity indicators.',
    emoji: '🏛️',
    tag:   'MACRO',
    tagColor: C.accent,
    tagBg:    C.accentLight,
    color: '#1A365D',
    focus: 'FOMC transcripts, Federal Reserve interest rate projections, central bank liquidity indicators, and macro-economic policy signals',
  },
  {
    id:    'bank',
    title: 'Bank Alpha-Whale Scanner',
    desc:  'Tracks tier-1 commercial banking liquidity adjustments, institutional order blocks, and volume footprints.',
    emoji: '🏦',
    tag:   'INSTITUTIONAL',
    tagColor: C.green,
    tagBg:    C.greenLight,
    color: '#2D3748',
    focus: 'tier-1 commercial banking liquidity adjustments, institutional order blocks, volume footprints, and dark pool activity',
  },
  {
    id:    'crypto',
    title: 'Crypto Bro Momentum-X Engine',
    desc:  'Analyzes real-time cryptocurrency volatility trends, on-chain whale distributions, and breakout patterns.',
    emoji: '⚡',
    tag:   'MOMENTUM',
    tagColor: C.amber,
    tagBg:    'rgba(245,158,11,0.10)',
    color: '#7C3AED',
    focus: 'real-time cryptocurrency volatility trends, on-chain whale distributions, breakout patterns, and momentum oscillators',
    badge: '🚀',
  },
];

interface AnalysisRecord {
  id: string;
  toolId: string;
  reportTitle: string;
  reportTimestamp: string;
  overallTrend: 'Bullish' | 'Bearish' | 'Neutral';
  levelsSupport: string;
  levelsResistance: string;
  sentimentScore: string;
  confidenceScore: string;
  markdownSummary: string;
  imageUri?: string;
  timestamp: any;
}

export default function ScanScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'scan' | 'history'>('scan');
  const [selectedTool, setSelectedTool] = useState(SCAN_TOOLS[0]);
  const [isScanning, setIsScanning] = useState(false);
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisRecord | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;

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

    const analysesRef = collection(firebaseDb, 'user_analyses_v2');
    const q = query(
      analysesRef,
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data
        } as AnalysisRecord;
      });
      setHistory(records);
    }, (error) => {
      console.error("[Firestore] Snapshot Error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSelectRecord = (record: AnalysisRecord) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveAnalysis(record);
    setActiveTab('scan');
  };

  const closeAnalysis = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveAnalysis(null);
  };

  const executeScan = async () => {
    if (!API_KEY) {
      Alert.alert("Error", "Gemini API Key missing.");
      return;
    }
    if (!user) return;

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (pickerResult.canceled) return;

    const base64Data = pickerResult.assets[0].base64;
    const localUri = pickerResult.assets[0].uri;

    setIsScanning(true);
    closeAnalysis();

    try {
      const prompt = `
        Analyze this chart for ${selectedTool.focus}.
        Return STRICT JSON. NO MARKDOWN.
        {
          "reportTitle": "Title",
          "reportTimestamp": "Date",
          "overallTrend": "Bullish" | "Bearish" | "Neutral",
          "levelsSupport": "Prices",
          "levelsResistance": "Prices",
          "sentimentScore": "e.g. 4/5",
          "confidenceScore": "e.g. 80%",
          "markdownSummary": "Full Analysis"
        }
      `;

      const result = await model.generateContent([
        prompt,
        { inlineData: { data: base64Data!, mimeType: "image/jpeg" } },
      ]);
      
      const responseText = result.response.text().trim();
      const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(cleanedJson);

      const docData = {
        userId: user.uid,
        userEmail: user.email,
        toolId: selectedTool.id,
        timestamp: Timestamp.now(),
        ...parsedData,
        imageUri: localUri,
      };

      const docRef = await addDoc(collection(firebaseDb, 'user_analyses_v2'), docData);
      
      const newRecord: AnalysisRecord = {
        id: docRef.id,
        ...docData
      };

      setActiveAnalysis(newRecord);

    } catch (error) {
      console.error("[Gemini] API Failure:", error);
      Alert.alert("Analysis Error", "Processing failed. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  const renderCircularGauge = (score: string) => {
    const percentage = parseInt(score) || 50;
    return (
      <View style={styles.gaugeContainer}>
        <View style={styles.gaugeBackground}>
          <View style={[styles.gaugeFill, { height: `${percentage}%` }]} />
        </View>
        <Text style={styles.gaugeText}>{score}</Text>
      </View>
    );
  };

  const renderSentimentBar = (score: string) => {
    const match = score.match(/(\d+)/);
    const value = match ? parseInt(match[0]) : 3;
    return (
      <View style={styles.sentimentBarContainer}>
        {[1, 2, 3, 4, 5].map((step) => (
          <View 
            key={step} 
            style={[styles.sentimentStep, { backgroundColor: step <= value ? '#CE82FF' : '#F0F0F0' }]} 
          />
        ))}
        <Text style={styles.barEmoji}>⚖️</Text>
      </View>
    );
  };

  const renderMiniLine = () => (
    <View style={styles.miniLineContainer}>
      <View style={styles.lineSegment} />
      <View style={[styles.lineSegment, { transform: [{ translateY: -4 }] }]} />
      <View style={[styles.lineSegment, { transform: [{ translateY: -10 }] }]} />
      <View style={[styles.lineSegment, { transform: [{ translateY: -2 }] }]} />
      <View style={styles.lineDot} />
    </View>
  );

  const renderDashboard = (record: AnalysisRecord) => {
    const isBullish = record.overallTrend === 'Bullish';
    const isBearish = record.overallTrend === 'Bearish';
    const trendColor = isBullish ? '#58CC02' : isBearish ? '#FF4B4B' : '#CE82FF';
    
    const tool = SCAN_TOOLS.find(t => t.id === record.toolId) || SCAN_TOOLS[0];
    const actionPrefix = tool.id === 'federal' ? 'FED' : tool.id === 'bank' ? 'BANK' : 'CRYPTO';
    const actionType = isBullish ? 'BUY' : isBearish ? 'SELL' : 'HOLD';
    const actionEmoji = isBullish ? '📈' : isBearish ? '📉' : '⚖️';
    const actionColor = isBullish ? '#22C55E' : isBearish ? '#EF4444' : '#EAB308';

    return (
      <View style={styles.dashboardContainer}>
        <View style={styles.reportHeader}>
          <View>
            <Text style={styles.reportBanner}>INSTITUTIONAL ANALYTICS CORE</Text>
            <Text style={styles.reportDate}>{record.reportTimestamp || 'SYNCHRONIZED DATA'}</Text>
          </View>
          <Pressable onPress={closeAnalysis} style={styles.topCloseBtn}>
            <XCircle color="#A0A0A0" size={24} />
          </Pressable>
        </View>

        <View style={styles.institutionalTitleRow}>
          <Text style={styles.institutionalEmoji}>{tool.emoji}</Text>
          <Text style={styles.institutionalTitle}>{tool.title}</Text>
        </View>

        <View style={styles.suggestedActionContainer}>
          <Text style={styles.suggestedActionLabel}>SUGGESTED ACTION</Text>
          <View style={[styles.actionBadge, { borderColor: actionColor }]}>
            <Text style={[styles.actionText, { color: actionColor }]}>
              {actionPrefix} {actionType} {actionEmoji}
            </Text>
          </View>
        </View>

        {record.imageUri && (
          <View style={styles.imagePreviewFrame}>
            <Image source={{ uri: record.imageUri }} style={styles.imagePreview} />
          </View>
        )}

        <Text style={styles.reportReportTitle}>{record.reportTitle}</Text>

        <View style={styles.dashboardRow}>
          <View style={styles.dashBox}>
            <Text style={styles.boxLabel}>OVERALL TREND</Text>
            <View style={styles.trendValueContainer}>
              <Text style={styles.trendEmoji}>{isBullish ? '📈' : isBearish ? '📉' : '⚖️'}</Text>
              <Text style={[styles.trendText, { color: trendColor }]}>{record.overallTrend?.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.dashBox}>
            <Text style={styles.boxLabel}>CONFIDENCE</Text>
            <View style={styles.gaugeWrapper}>
              {renderCircularGauge(record.confidenceScore)}
              <ShieldCheck size={14} color="#007AFF" style={styles.gaugeIcon} />
            </View>
          </View>
        </View>

        <View style={styles.dashboardRow}>
          <View style={styles.dashBox}>
            <Text style={styles.boxLabel}>SENTIMENT SCORE</Text>
            {renderSentimentBar(record.sentimentScore)}
            <Text style={styles.boxSubText}>{record.sentimentScore}</Text>
          </View>

          <View style={styles.dashBox}>
            <Text style={styles.boxLabel}>S&R LEVELS</Text>
            {renderMiniLine()}
            <View style={styles.levelsGrid}>
              <View>
                <Text style={styles.levelType}>RES</Text>
                <Text style={styles.levelValue}>{record.levelsResistance?.split(',')[0]}</Text>
              </View>
              <View>
                <Text style={styles.levelType}>SUP</Text>
                <Text style={styles.levelValue}>{record.levelsSupport?.split(',')[0]}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.summaryContainer}>
          <View style={styles.summaryHeader}>
            <Target size={18} color="#4B4B4B" />
            <Text style={styles.summaryTitle}>DETAILED ANALYSIS</Text>
          </View>
          <ScrollView style={styles.summaryScroll} nestedScrollEnabled>
            <Text style={styles.summaryBody}>{record.markdownSummary}</Text>
          </ScrollView>
        </View>

        <Pressable onPress={closeAnalysis} style={styles.dismissBtn}>
          <Text style={styles.dismissText}>Close Report</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.tabNav}>
        <Pressable 
          onPress={() => { setActiveTab('scan'); closeAnalysis(); }} 
          style={[styles.tab, activeTab === 'scan' && styles.tabActive]}
        >
          <Text style={[styles.tabLabel, activeTab === 'scan' && styles.tabLabelActive]}>AI Scanner</Text>
        </Pressable>
        <Pressable 
          onPress={() => setActiveTab('history')} 
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
        >
          <Text style={[styles.tabLabel, activeTab === 'history' && styles.tabLabelActive]}>Records</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {activeTab === 'scan' ? (
          <>
            <View style={styles.assistantRow}>
              <View style={styles.mascotBadge}>
                <Image source={require('../../assets/images/mascots/cat.png')} style={styles.bearIcon} />
                <View style={styles.processorLabel}>
                  <Text style={styles.processorText}>AI PROCESSOR</Text>
                </View>
              </View>
              <View style={styles.headerInfo}>
                <Text style={styles.mainTitle}>Multi-Modal Vision</Text>
                <Text style={styles.subTitle}>Engine: gemini-3.1-flash-lite</Text>
              </View>
            </View>

            {activeAnalysis ? renderDashboard(activeAnalysis) : (
              <>
                <View style={styles.toolList}>
                  {SCAN_TOOLS.map((tool) => {
                    const isSelected = selectedTool.id === tool.id;
                    return (
                      <Pressable
                        key={tool.id}
                        onPress={() => setSelectedTool(tool)}
                        style={[
                          styles.toolItem,
                          isSelected ? styles.toolItemActive : styles.toolItemInactive,
                        ]}
                      >
                        <View style={[styles.iconBox, { backgroundColor: isSelected ? C.accentLight : '#F4F4F6' }]}>
                          <Text style={{ fontSize: 24 }}>{tool.emoji}</Text>
                        </View>
                        <View style={styles.toolMeta}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[styles.toolTitle, isSelected && { color: C.accent }]}>{tool.title}</Text>
                            {tool.badge && <Text style={{ fontSize: 12 }}>{tool.badge}</Text>}
                          </View>
                          <Text style={styles.toolDesc} numberOfLines={2}>{tool.desc}</Text>
                        </View>
                        {isSelected && (
                          <View style={styles.activeCheck}>
                            <CheckCircle2 color={C.green} size={22} />
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.actionZone}>
                  <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <Pressable 
                      onPress={executeScan} 
                      disabled={isScanning}
                      style={[styles.scanActionBtn, isScanning && styles.btnDisabled]}
                    >
                      {isScanning ? <ActivityIndicator color="#FFF" /> : (
                        <>
                          <Scan color="#FFF" size={26} />
                          <Text style={styles.scanBtnText}>Analyze Now</Text>
                        </>
                      )}
                    </Pressable>
                  </Animated.View>
                </View>
              </>
            )}
          </>
        ) : (
          <View style={styles.historyContainer}>
            <Text style={styles.sectionHeader}>SYNCHRONIZED ANALYTICS HISTORY</Text>
            
            {history.map((item) => {
              const tool = SCAN_TOOLS.find(t => t.id === item.toolId) || SCAN_TOOLS[0];
              return (
                <Pressable 
                  key={item.id} 
                  style={styles.logCard}
                  onPress={() => handleSelectRecord(item)}
                >
                  <View style={styles.logIconFrame}>
                    <Text style={{ fontSize: 20 }}>{tool.emoji}</Text>
                  </View>
                  <View style={styles.logContent}>
                    <Text style={styles.logTitle}>{item.reportTitle}</Text>
                    <Text style={styles.logTime}>{item.timestamp?.toDate ? item.timestamp.toDate().toLocaleString() : 'Processing'}</Text>
                  </View>
                  <View style={[styles.pillBadge, { backgroundColor: item.overallTrend === 'Bullish' ? '#58CC0220' : '#FF4B4B20' }]}>
                    <Text style={[styles.pillText, { color: item.overallTrend === 'Bullish' ? '#58CC02' : '#FF4B4B' }]}>{(item.overallTrend || 'Neutral').toUpperCase()}</Text>
                  </View>
                </Pressable>
              );
            })}

            {history.length === 0 && (
              <View style={styles.emptyContainer}>
                <CloudOff color="#D0D0D0" size={48} />
                <Text style={styles.emptyMsg}>No analysis records found.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  tabNav: { flexDirection: 'row', marginHorizontal: 20, marginTop: 15, backgroundColor: '#F8F8F8', borderRadius: 18, padding: 6, zIndex: 10 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 14 },
  tabActive: { backgroundColor: '#FFFFFF', elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  tabLabel: { fontSize: 14, fontWeight: '800', color: '#C0C0C0' },
  tabLabelActive: { color: '#4B4B4B' },
  scrollContent: { paddingBottom: 100 },
  assistantRow: { flexDirection: 'row', padding: 25, alignItems: 'center' },
  mascotBadge: { alignItems: 'center' },
  bearIcon: { width: 62, height: 62, resizeMode: 'contain' },
  processorLabel: { backgroundColor: '#4B4B4B', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, marginTop: -10 },
  processorText: { color: '#FFF', fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
  headerInfo: { flex: 1, marginLeft: 20 },
  mainTitle: { fontSize: 20, fontWeight: '900', color: '#4B4B4B' },
  subTitle: { fontSize: 12, color: '#A0A0A0', marginTop: 4 },
  institutionalTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 15 },
  institutionalEmoji: { fontSize: 32 },
  institutionalTitle: { fontSize: 22, fontWeight: '900', color: '#1A365D', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  suggestedActionContainer: { alignItems: 'center', marginBottom: 25 },
  suggestedActionLabel: { fontSize: 9, fontWeight: '900', color: '#A0A0A0', letterSpacing: 1.5, marginBottom: 8 },
  actionBadge: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, borderWidth: 2, backgroundColor: '#FFFFFF' },
  actionText: { fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  reportReportTitle: { fontSize: 14, fontWeight: '700', color: '#4B4B4B', marginBottom: 20, textAlign: 'center', fontStyle: 'italic' },
  dashboardContainer: { marginHorizontal: 20, backgroundColor: '#FFFFFF', borderRadius: 32, borderWidth: 1, borderColor: '#F0F0F0', padding: 20, elevation: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, marginBottom: 20 },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', paddingBottom: 10 },
  reportBanner: { fontSize: 10, fontWeight: '900', color: '#007AFF', letterSpacing: 1 },
  reportDate: { fontSize: 10, color: '#A0A0A0', fontWeight: '700', marginTop: 2 },
  topCloseBtn: { padding: 4 },
  imagePreviewFrame: { width: '100%', height: 180, borderRadius: 20, overflow: 'hidden', backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#EEE', marginBottom: 15 },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  dashboardRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  dashBox: { flex: 1, backgroundColor: '#F9F9FB', borderRadius: 20, padding: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F0F0F0' },
  boxLabel: { fontSize: 8, fontWeight: '900', color: '#A0A0A0', letterSpacing: 0.5, marginBottom: 8 },
  trendValueContainer: { alignItems: 'center' },
  trendEmoji: { fontSize: 24, marginBottom: 4 },
  trendText: { fontSize: 14, fontWeight: '900' },
  gaugeWrapper: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
  gaugeContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0E0E0', overflow: 'hidden', justifyContent: 'flex-end' },
  gaugeBackground: { width: '100%', height: '100%', backgroundColor: '#E0E0E0' },
  gaugeFill: { width: '100%', backgroundColor: '#007AFF', position: 'absolute', bottom: 0 },
  gaugeText: { position: 'absolute', fontSize: 9, fontWeight: '900', color: '#2D2D2D' },
  gaugeIcon: { position: 'absolute', bottom: -5, right: -5, backgroundColor: '#FFF', borderRadius: 10, padding: 2 },
  sentimentBarContainer: { flexDirection: 'row', gap: 3, alignItems: 'flex-end', height: 25, marginBottom: 5 },
  sentimentStep: { width: 6, height: 20, borderRadius: 2 },
  barEmoji: { fontSize: 14, marginLeft: 5 },
  boxSubText: { fontSize: 10, fontWeight: '700', color: '#4B4B4B' },
  miniLineContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 20, marginBottom: 8 },
  lineSegment: { width: 12, height: 2, backgroundColor: '#007AFF', borderRadius: 1 },
  lineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#007AFF' },
  levelsGrid: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  levelType: { fontSize: 7, fontWeight: '900', color: '#A0A0A0' },
  levelValue: { fontSize: 11, fontWeight: '800', color: '#2D2D2D' },
  summaryContainer: { marginTop: 15, backgroundColor: '#F9F9FB', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#F0F0F0' },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  summaryTitle: { fontSize: 12, fontWeight: '900', color: '#4B4B4B', letterSpacing: 1 },
  summaryScroll: { maxHeight: 150 },
  summaryBody: { fontSize: 13, color: '#555', lineHeight: 20, fontWeight: '600' },
  dismissBtn: { marginTop: 20, paddingVertical: 15, alignItems: 'center', backgroundColor: '#F8F8F8', borderRadius: 15, borderWidth: 1, borderColor: '#EEE' },
  dismissText: { fontSize: 14, fontWeight: '800', color: '#4B4B4B' },
  toolList: { paddingHorizontal: 20 },
  toolItem: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 18, marginBottom: 12, borderWidth: 2 },
  toolItemActive: { borderColor: '#3B6EF6', backgroundColor: '#FFFFFF', elevation: 4, shadowColor: '#3B6EF6', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  toolItemInactive: { borderColor: '#F0F0F2', backgroundColor: '#FAFAFB', elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  iconBox: { width: 50, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  toolMeta: { flex: 1, marginLeft: 16 },
  toolTitle: { fontSize: 15, fontWeight: '800', color: '#4B4B4B', fontFamily: Platform.OS === 'ios' ? 'Helvetica' : 'sans-serif' },
  toolDesc: { fontSize: 11, color: '#9CA3AF', marginTop: 3, lineHeight: 16 },
  activeCheck: { marginLeft: 8 },
  actionZone: { paddingHorizontal: 20, marginTop: 16 },
  scanActionBtn: { backgroundColor: '#232533', paddingVertical: 18, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, elevation: 6, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  btnDisabled: { opacity: 0.6 },
  scanBtnText: { color: '#FFF', fontSize: 17, fontWeight: '900', letterSpacing: 0.3 },
  historyContainer: { paddingHorizontal: 20 },
  sectionHeader: { fontSize: 10, fontWeight: '900', color: '#D0D0D0', letterSpacing: 2, marginBottom: 20, textAlign: 'center' },
  logCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 22, marginBottom: 12, borderWidth: 1, borderColor: '#F0F0F0', elevation: 2 },
  logIconFrame: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F9F9F9', justifyContent: 'center', alignItems: 'center' },
  logContent: { flex: 1, marginLeft: 15 },
  logTitle: { fontSize: 14, fontWeight: '800', color: '#4B4B4B' },
  logTime: { fontSize: 11, color: '#BDBDBD', marginTop: 2 },
  pillBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  pillText: { fontSize: 9, fontWeight: '900' },
  emptyContainer: { marginTop: 60, alignItems: 'center' },
  emptyMsg: { marginTop: 15, color: '#D0D0D0' },
});