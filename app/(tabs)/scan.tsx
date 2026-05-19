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
  Activity,
  CandlestickChart,
  CheckCircle2,
  CloudOff,
  Database,
  Scan,
  ShieldCheck,
  Target
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
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

/**
 * INSTITUTIONAL MODEL LOCK: GEMINI 3.1 FLASH-LITE
 */
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-3.1-flash-lite",
  systemInstruction: "You are a Senior Multi-Modal Financial AI Architect. Analyze financial charts and return STRICT JSON. No markdown blocks."
});

/**
 * SCALABLE SCANNER TOOLS CONFIGURATION
 */
const SCAN_TOOLS = [
  {
    id: 'patterns',
    title: 'Technical Pattern Pulse',
    desc: 'Scan for Candlestick, Breakouts & Channel setups',
    Icon: CandlestickChart,
    color: '#CE82FF',
    focus: 'Japanese candlestick patterns, breakout channels, and geometric price structures'
  },
  {
    id: 'sentiment',
    title: 'Sentiment Momentum Matrix',
    desc: 'Score retail enthusiasm, volume trends & whale tracking',
    Icon: Activity,
    color: '#CE82FF',
    focus: 'market sentiment indicators, retail momentum vs institutional flow, and volume-price divergence'
  }
];

interface AnalysisRecord {
  id: string;
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

  /**
   * SECURE FIRESTORE HYDRATION LISTENER
   */
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

  const toggleResult = (record: AnalysisRecord | null) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveAnalysis(record);
    if (record) {
      // Ensure we switch view to see the dashboard if coming from history
      // (Scroll to top logic could be added here if needed)
    }
  };

  /**
   * CORE MULTI-MODAL SCAN EXECUTION
   */
  const executeScan = async () => {
    if (!API_KEY) {
      Alert.alert("Error", "Gemini API Key missing.");
      return;
    }
    if (!user) return;

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (pickerResult.canceled) return;

    const base64Data = pickerResult.assets[0].base64;
    const localUri = pickerResult.assets[0].uri;

    setIsScanning(true);
    toggleResult(null);

    try {
      const prompt = `
        You are a Senior Multi-Modal Financial AI Architect. Analyze this financial chart image focusing specifically on ${selectedTool.focus}.
        Return a strictly structured JSON object.
        NO MARKDOWN CODE BLOCKS. NO EXTRA TEXT. JUST THE JSON.

        {
          "reportTitle": "Clear title of the asset analysis",
          "reportTimestamp": "Current date",
          "overallTrend": "Bullish" | "Bearish" | "Neutral",
          "levelsSupport": "Comma separated support levels",
          "levelsResistance": "Comma separated resistance levels",
          "sentimentScore": "e.g. Neutral (3/5)",
          "confidenceScore": "e.g. 75%",
          "markdownSummary": "Detailed markdown analysis block"
        }
      `;

      const imagePart = {
        inlineData: {
          data: base64Data!,
          mimeType: "image/jpeg",
        },
      };

      const result = await model.generateContent([prompt, imagePart]);
      const responseText = result.response.text().trim();
      
      const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(cleanedJson);

      const docData = {
        userId: user.uid,
        userEmail: user.email,
        timestamp: Timestamp.now(),
        ...parsedData,
        imageUri: localUri, // PERSIST IMAGE URI TO FIRESTORE
      };

      const docRef = await addDoc(collection(firebaseDb, 'user_analyses_v2'), docData);
      
      const newRecord: AnalysisRecord = {
        id: docRef.id,
        ...docData
      };

      toggleResult(newRecord);

    } catch (error) {
      console.error("[Gemini] API Failure:", error);
      Alert.alert("Analysis Error", "Failed to parse chart data. Please try a clearer image.");
    } finally {
      setIsScanning(false);
    }
  };

  /**
   * PURE NATIVE VISUALIZATION COMPONENTS (ZERO DEPENDENCY)
   */
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
    const match = score.match(/(\d+)\/(\d+)/);
    const value = match ? parseInt(match[1]) : 3;
    const max = match ? parseInt(match[2]) : 5;

    return (
      <View style={styles.sentimentBarContainer}>
        {[1, 2, 3, 4, 5].map((step) => (
          <View 
            key={step} 
            style={[
              styles.sentimentStep, 
              { backgroundColor: step <= value ? '#CE82FF' : '#F0F0F0' }
            ]} 
          />
        ))}
        <Text style={styles.barEmoji}>⚖️</Text>
      </View>
    );
  };

  const renderMiniLine = () => (
    <View style={styles.miniLineContainer}>
      <View style={styles.lineSegment} />
      <View style={[styles.lineSegment, { transform: [{ translateY: -5 }] }]} />
      <View style={[styles.lineSegment, { transform: [{ translateY: -10 }] }]} />
      <View style={[styles.lineSegment, { transform: [{ translateY: -2 }] }]} />
      <View style={styles.lineDot} />
    </View>
  );

  /**
   * DASHBOARD MODULE HYDRATION & VIEW
   */
  const renderDashboard = (record: AnalysisRecord) => {
    const isBullish = record.overallTrend === 'Bullish';
    const trendColor = isBullish ? '#58CC02' : record.overallTrend === 'Bearish' ? '#FF4B4B' : '#CE82FF';

    return (
      <View style={styles.dashboardContainer}>
        <View style={styles.reportHeader}>
          <Text style={styles.reportBanner}>FINELO AI REPORT INSIGHTS</Text>
          <Text style={styles.reportDate}>{record.reportTimestamp || (record.timestamp?.toDate ? record.timestamp.toDate().toLocaleDateString() : '')}</Text>
        </View>

        {/* HYDRATED IMAGE PREVIEW */}
        {record.imageUri && (
          <View style={styles.imagePreviewFrame}>
            <Image source={{ uri: record.imageUri }} style={styles.imagePreview} />
          </View>
        )}

        <Text style={styles.reportMainTitle}>{record.reportTitle}</Text>

        <View style={styles.dashboardRow}>
          <View style={styles.dashBox}>
            <Text style={styles.boxLabel}>OVERALL TREND</Text>
            <View style={styles.trendValueContainer}>
              <Text style={styles.trendEmoji}>{isBullish ? '📈' : record.overallTrend === 'Bearish' ? '📉' : '⚖️'}</Text>
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

        <Pressable onPress={() => toggleResult(null)} style={styles.dismissBtn}>
          <Text style={styles.dismissText}>Close Report</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.tabNav}>
        <Pressable onPress={() => setActiveTab('scan')} style={[styles.tab, activeTab === 'scan' && styles.tabActive]}>
          <Text style={[styles.tabLabel, activeTab === 'scan' && styles.tabLabelActive]}>AI Scanner</Text>
        </Pressable>
        <Pressable onPress={() => setActiveTab('history')} style={[styles.tab, activeTab === 'history' && styles.tabActive]}>
          <Text style={[styles.tabLabel, activeTab === 'history' && styles.tabLabelActive]}>Records</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {activeTab === 'scan' ? (
          <>
            <View style={styles.assistantRow}>
              <View style={styles.mascotBadge}>
                <Image source={require('../../assets/images/mascots/bear.png')} style={styles.bearIcon} />
                <View style={styles.processorLabel}>
                  <Text style={styles.processorText}>AI PROCESSOR</Text>
                </View>
              </View>
              <View style={styles.headerInfo}>
                <Text style={styles.mainTitle}>Multi-Modal Vision</Text>
                <Text style={styles.subTitle}>Engine: gemini-3.1-flash-lite</Text>
              </View>
            </View>

            {activeAnalysis && renderDashboard(activeAnalysis)}

            {!activeAnalysis && (
              <>
                <View style={styles.toolList}>
                  {SCAN_TOOLS.map((tool) => (
                    <Pressable
                      key={tool.id}
                      onPress={() => setSelectedTool(tool)}
                      style={[
                        styles.toolItem,
                        selectedTool.id === tool.id && { borderColor: tool.color, backgroundColor: 'transparent' }
                      ]}
                    >
                      <View style={[styles.iconBox, { backgroundColor: tool.color + '15' }]}>
                        <tool.Icon color={tool.color} size={24} />
                      </View>
                      <View style={styles.toolMeta}>
                        <Text style={styles.toolTitle}>{tool.title}</Text>
                        <Text style={styles.toolDesc} numberOfLines={1}>{tool.desc}</Text>
                      </View>
                      {selectedTool.id === tool.id && (
                        <CheckCircle2 color={tool.color} size={22} />
                      )}
                    </Pressable>
                  ))}
                </View>

                <View style={styles.actionZone}>
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
                </View>
              </>
            )}
          </>
        ) : (
          <View style={styles.historyContainer}>
            <Text style={styles.sectionHeader}>SYNCHRONIZED ANALYTICS HISTORY</Text>
            
            {activeAnalysis && renderDashboard(activeAnalysis)}

            {history.map((item) => (
              <Pressable 
                key={item.id} 
                style={styles.logCard}
                onPress={() => toggleResult(item)}
              >
                <View style={styles.logIconFrame}><Database color="#4B4B4B" size={22} /></View>
                <View style={styles.logContent}>
                  <Text style={styles.logTitle}>{item.reportTitle}</Text>
                  <Text style={styles.logTime}>{item.timestamp?.toDate ? item.timestamp.toDate().toLocaleString() : 'Processing'}</Text>
                </View>
                <View style={[styles.pillBadge, { backgroundColor: item.overallTrend === 'Bullish' ? '#58CC0220' : '#FF4B4B20' }]}>
                  <Text style={[styles.pillText, { color: item.overallTrend === 'Bullish' ? '#58CC02' : '#FF4B4B' }]}>{(item.overallTrend || 'Neutral').toUpperCase()}</Text>
                </View>
              </Pressable>
            ))}

            {history.length === 0 && (
              <View style={styles.emptyContainer}>
                <CloudOff color="#F0F0F0" size={48} />
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
  
  dashboardContainer: { marginHorizontal: 20, backgroundColor: '#FFFFFF', borderRadius: 32, borderWidth: 1, borderColor: '#F0F0F0', padding: 20, elevation: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, marginBottom: 20 },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', paddingBottom: 10 },
  reportBanner: { fontSize: 10, fontWeight: '900', color: '#007AFF', letterSpacing: 1 },
  reportDate: { fontSize: 10, color: '#A0A0A0', fontWeight: '700' },
  imagePreviewFrame: { width: '100%', height: 180, borderRadius: 20, overflow: 'hidden', backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#EEE', marginBottom: 15 },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  reportMainTitle: { fontSize: 22, fontWeight: '900', color: '#2D2D2D', marginBottom: 20, textAlign: 'center' },
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
  dismissBtn: { marginTop: 20, paddingVertical: 15, alignItems: 'center', backgroundColor: '#F0F0F0', borderRadius: 15 },
  dismissText: { fontSize: 14, fontWeight: '800', color: '#4B4B4B' },
  
  toolList: { paddingHorizontal: 20 },
  toolItem: { flexDirection: 'row', alignItems: 'center', padding: 18, backgroundColor: '#FFFFFF', borderRadius: 22, marginBottom: 12, borderWidth: 2, borderColor: '#F8F8F8' },
  iconBox: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  toolMeta: { flex: 1, marginLeft: 16 },
  toolTitle: { fontSize: 15, fontWeight: '800', color: '#4B4B4B' },
  toolDesc: { fontSize: 12, color: '#A0A0A0', marginTop: 2 },
  actionZone: { paddingHorizontal: 20, marginTop: 10 },
  scanActionBtn: { backgroundColor: '#4B4B4B', paddingVertical: 18, borderRadius: 22, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  btnDisabled: { opacity: 0.6 },
  scanBtnText: { color: '#FFF', fontSize: 17, fontWeight: '900' },

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
  emptyMsg: { marginTop: 15, color: '#D0D0D0', fontSize: 14, fontWeight: '700' },
});
