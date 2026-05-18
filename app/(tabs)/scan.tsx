import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as LucideIcons from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  Timestamp 
} from '@react-native-firebase/firestore';
import { useAuth } from '@/src/context/AuthContext';
import { firebaseDb } from '@/src/lib/firebase';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * INSTITUTIONAL INFRASTRUCTURE: GEMINI 3.1 FLASH-LITE
 */
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

/**
 * SCANNER TOOL CONFIGURATIONS
 */
const SCAN_TOOLS = [
  {
    id: 'visual',
    title: 'Institutional Graph Scan',
    desc: 'Visual analysis of structural support & levels',
    icon: 'chart-areaspline',
    color: '#CE82FF',
    prompt: "Act as a Senior Quant. Evaluate this image for structural support levels, resistance zones, and key technical indicators. Mention specific price patterns found."
  },
  {
    id: 'patterns',
    title: 'Technical Pattern Pulse',
    desc: 'Scan for Candlestick & Channel setups',
    icon: 'chart-candle',
    color: '#58CC02',
    prompt: "Analyze this image for major Japanese candlestick setups (Engulfing, Hammers) and breakout channels. Provide a probability score for the next move."
  },
  {
    id: 'sentiment',
    title: 'Sentiment Momentum Matrix',
    desc: 'Score retail enthusiasm & fear index',
    icon: 'bullhorn-variant-outline',
    color: '#FF4B4B',
    prompt: "Parse the financial data or graphical media in this image to score retail trading enthusiasm vs market fear levels. Provide a momentum rating."
  }
];

interface AnalysisRecord {
  id: string;
  toolTitle: string;
  timestamp: any;
  response: string;
  imageUri?: string;
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
  scannerType?: string;
  analysisResult?: string;
}

export default function ScanScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'scan' | 'history'>('scan');
  const [selectedTool, setSelectedTool] = useState(SCAN_TOOLS[0]);
  const [isScanning, setIsScanning] = useState(false);
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisRecord | null>(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;

  /**
   * REPAIRING THE LIVE SNAPSHOT LISTENER DATA PATH
   * Targeted Collection: user_analyses
   */
  useEffect(() => {
    if (!user) return;

    const analysesRef = collection(firebaseDb, 'user_analyses');
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
          toolTitle: data.toolTitle || data.scannerType || 'AI Analysis',
          timestamp: data.timestamp,
          response: data.response || data.analysisResult || 'No report generated.',
          imageUri: data.imageUri,
          sentiment: data.sentiment || 'Neutral',
        } as AnalysisRecord;
      });
      
      setHistory(records);
    }, (error) => {
      console.error("[Firestore] Snapshot Error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const showAnalysis = (record: AnalysisRecord) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveAnalysis(record);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  };

  const closeAnalysis = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveAnalysis(null);
    fadeAnim.setValue(0);
  };

  /**
   * MULTI-MODAL VISION SCAN ENGINE
   */
  const executeScan = async () => {
    if (!API_KEY) {
      Alert.alert("Config Error", "Gemini API Key missing.");
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
    closeAnalysis();

    try {
      const prompt = selectedTool.prompt;
      const imagePart = {
        inlineData: {
          data: base64Data!,
          mimeType: "image/jpeg",
        },
      };

      // Execute Gemini-3.1-Flash-Lite
      const result = await model.generateContent([prompt, imagePart]);
      const responseText = result.response.text();

      const sentiment = responseText.toLowerCase().includes('bullish') ? 'Bullish' : 
                        responseText.toLowerCase().includes('bearish') ? 'Bearish' : 'Neutral';

      const docData = {
        userId: user.uid,
        userEmail: user.email,
        toolTitle: selectedTool.title,
        timestamp: Timestamp.now(),
        response: responseText,
        sentiment: sentiment,
        imageUri: localUri,
      };

      // Persistence
      const docRef = await addDoc(collection(firebaseDb, 'user_analyses'), docData);
      
      const newRecord: AnalysisRecord = {
        id: docRef.id,
        ...docData
      };

      showAnalysis(newRecord);

    } catch (error) {
      console.error("[Gemini] Scan Failure:", error);
      Alert.alert("Analysis Failed", "Vision engine could not parse the chart.");
    } finally {
      setIsScanning(false);
    }
  };

  const renderAnalysisCard = () => {
    if (!activeAnalysis) return null;

    const isBullish = activeAnalysis.sentiment === 'Bullish';
    const accentColor = isBullish ? '#58CC02' : activeAnalysis.sentiment === 'Bearish' ? '#FF4B4B' : '#CE82FF';
    const indicator = isBullish ? '📈' : activeAnalysis.sentiment === 'Bearish' ? '📉' : '⚖️';

    return (
      <Animated.View style={[styles.resultContainer, { opacity: fadeAnim }]}>
        <View style={[styles.resultCard, { borderColor: accentColor }]}>
          <View style={styles.resultHeader}>
            <View style={styles.headerLeft}>
              <Text style={styles.indicatorEmoji}>{indicator}</Text>
              <Text style={styles.resultTitle}>{activeAnalysis.toolTitle}</Text>
            </View>
            <Pressable onPress={closeAnalysis} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={20} color="#888" />
            </Pressable>
          </View>

          <View style={styles.visualizationRow}>
            {activeAnalysis.imageUri && (
              <View style={styles.thumbnailFrame}>
                <Image source={{ uri: activeAnalysis.imageUri }} style={styles.thumbnail} />
              </View>
            )}
            <View style={[styles.summaryBox, { borderColor: accentColor + '40' }]}>
              <View style={[styles.summaryHeader, { backgroundColor: accentColor }]}>
                <Text style={styles.summaryLabel}>INSTITUTIONAL INSIGHT</Text>
              </View>
              <ScrollView style={styles.summaryScroll} nestedScrollEnabled>
                <Text style={styles.summaryText}>{activeAnalysis.response}</Text>
              </ScrollView>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderScanner = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {/* AI ASSISTANT PANEL */}
      <View style={styles.assistantPanel}>
        <View style={styles.mascotBox}>
          <Image source={require('../../assets/images/mascots/bear.png')} style={styles.bear} />
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>AI VISION</Text>
          </View>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerMain}>Institutional Scan</Text>
          <Text style={styles.headerSub}>Active Model: gemini-3.1-flash-lite</Text>
        </View>
      </View>

      {/* ANALYSIS RESULT (Collapsible Slide-in) */}
      {renderAnalysisCard()}

      {/* TOOL SELECTOR */}
      <View style={styles.toolGrid}>
        {SCAN_TOOLS.map((tool) => (
          <Pressable
            key={tool.id}
            onPress={() => { setSelectedTool(tool); closeAnalysis(); }}
            style={[
              styles.toolItem,
              selectedTool.id === tool.id && { borderColor: tool.color, backgroundColor: 'transparent' }
            ]}
          >
            <View style={[styles.iconCircle, { backgroundColor: tool.color + '15' }]}>
              <MaterialCommunityIcons name={tool.icon as any} size={24} color={tool.color} />
            </View>
            <View style={styles.toolContent}>
              <Text style={styles.toolLabel}>{tool.title}</Text>
              <Text style={styles.toolSub} numberOfLines={1}>{tool.desc}</Text>
            </View>
            {selectedTool.id === tool.id && (
              <MaterialCommunityIcons name="check-decagram" size={20} color={tool.color} />
            )}
          </Pressable>
        ))}
      </View>

      <View style={styles.actionZone}>
        <Pressable 
          onPress={executeScan} 
          disabled={isScanning}
          style={[styles.primaryBtn, isScanning && styles.btnDisabled]}
        >
          {isScanning ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <MaterialCommunityIcons name="image-filter-center-focus" size={24} color="#FFF" />
              <Text style={styles.btnText}>Analyze Now</Text>
            </>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );

  const renderRecords = () => (
    <ScrollView contentContainerStyle={styles.historyScroll}>
      <Text style={styles.sectionHeader}>SYNCHRONIZED PERSISTENCE LOG</Text>
      
      {renderAnalysisCard()}

      {history.map((item) => (
        <Pressable 
          key={item.id} 
          style={styles.logCard}
          onPress={() => showAnalysis(item)}
        >
          <View style={styles.logIcon}>
            <MaterialCommunityIcons name="cloud-check-outline" size={22} color="#4B4B4B" />
          </View>
          <View style={styles.logInfo}>
            <Text style={styles.logTool}>{item.toolTitle}</Text>
            <Text style={styles.logDate}>
              {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleString() : 'Ready'}
            </Text>
          </View>
          <View style={[styles.sentimentPill, { backgroundColor: (item.sentiment || 'Neutral') === 'Bullish' ? '#58CC0220' : '#FF4B4B20' }]}>
            <Text style={[styles.sentimentText, { color: (item.sentiment || 'Neutral') === 'Bullish' ? '#58CC02' : '#FF4B4B' }]}>
              {(item.sentiment || 'Neutral').toUpperCase()}
            </Text>
          </View>
        </Pressable>
      ))}

      {history.length === 0 && (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="database-sync-outline" size={48} color="#F0F0F0" />
          <Text style={styles.emptyText}>No account records synchronized.</Text>
        </View>
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* BRANDED TAB NAV */}
      <View style={styles.tabNav}>
        <Pressable 
          onPress={() => setActiveTab('scan')} 
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

      {activeTab === 'scan' ? renderScanner() : renderRecords()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  tabNav: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 15,
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    padding: 5,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  tabActive: { backgroundColor: '#FFFFFF', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  tabLabel: { fontSize: 14, fontWeight: '800', color: '#BDBDBD' },
  tabLabelActive: { color: '#4B4B4B' },
  scrollContent: { paddingBottom: 100 },
  assistantPanel: { flexDirection: 'row', padding: 25, alignItems: 'center' },
  mascotBox: { alignItems: 'center' },
  bear: { width: 60, height: 60, resizeMode: 'contain' },
  aiBadge: { backgroundColor: '#4B4B4B', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, marginTop: -10 },
  aiBadgeText: { color: '#FFF', fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
  headerInfo: { flex: 1, marginLeft: 18 },
  headerMain: { fontSize: 20, fontWeight: '900', color: '#4B4B4B' },
  headerSub: { fontSize: 12, color: '#999', marginTop: 3 },
  // REMODELED ANALYSIS CARD
  resultContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 2,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  indicatorEmoji: { fontSize: 20 },
  resultTitle: { fontSize: 16, fontWeight: '900', color: '#4B4B4B' },
  closeBtn: { padding: 4 },
  visualizationRow: {
    padding: 15,
    flexDirection: 'row',
    gap: 12,
  },
  thumbnailFrame: {
    width: 100,
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  thumbnail: { width: '100%', height: '100%', resizeMode: 'cover' },
  summaryBox: {
    flex: 1,
    height: 140,
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    backgroundColor: '#FAFAFA',
  },
  summaryHeader: {
    paddingVertical: 4,
    alignItems: 'center',
  },
  summaryLabel: { color: '#FFF', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  summaryScroll: { padding: 12 },
  summaryText: { fontSize: 12, color: '#444', lineHeight: 18, fontWeight: '600' },
  // TOOL GRID
  toolGrid: { paddingHorizontal: 20 },
  toolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#F8F8F8',
    elevation: 1,
  },
  iconCircle: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  toolContent: { flex: 1, marginLeft: 15 },
  toolLabel: { fontSize: 15, fontWeight: '800', color: '#4B4B4B' },
  toolSub: { fontSize: 12, color: '#999', marginTop: 2 },
  actionZone: { paddingHorizontal: 20, marginTop: 10 },
  primaryBtn: {
    backgroundColor: '#4B4B4B',
    paddingVertical: 18,
    borderRadius: 22,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#FFF', fontSize: 17, fontWeight: '900' },
  // HISTORY
  historyScroll: { padding: 20, paddingBottom: 100 },
  sectionHeader: { fontSize: 10, fontWeight: '900', color: '#D0D0D0', letterSpacing: 2, marginBottom: 20, textAlign: 'center' },
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 22,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F5F5F5',
    elevation: 2,
  },
  logIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FBFBFB', justifyContent: 'center', alignItems: 'center' },
  logInfo: { flex: 1, marginLeft: 15 },
  logTool: { fontSize: 14, fontWeight: '800', color: '#4B4B4B' },
  logDate: { fontSize: 11, color: '#BDBDBD', marginTop: 2 },
  sentimentPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  sentimentText: { fontSize: 9, fontWeight: '900' },
  empty: { marginTop: 60, alignItems: 'center' },
  emptyText: { marginTop: 15, color: '#D0D0D0', fontSize: 14, fontWeight: '700' },
});
