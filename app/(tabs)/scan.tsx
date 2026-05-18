import React, { useState, useEffect } from 'react';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * SECURE INFRASTRUCTURE: GEMINI 3.1 FLASH-LITE
 * High-performance multi-modal vision engine
 */
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

/**
 * INSTITUTIONAL SCANNER TOOLS
 */
const SCAN_TOOLS = [
  {
    id: 'visual',
    title: 'Institutional Graph Scan',
    desc: 'Visual analysis of structural support & levels',
    icon: 'chart-areaspline',
    color: '#CE82FF',
    prompt: "Act as a Senior Quant. Evaluate the uploaded image for structural support levels, resistance zones, and key technical indicators."
  },
  {
    id: 'patterns',
    title: 'Technical Pattern Pulse',
    desc: 'Scan for Candlestick & Channel setups',
    lucideIcon: 'CandlestickChart',
    color: '#58CC02',
    prompt: "Analyze this image for major Japanese candlestick setups (Engulfing, Hammers) and breakout channels."
  },
  {
    id: 'sentiment',
    title: 'Sentiment Momentum Matrix',
    desc: 'Score retail enthusiasm & fear index',
    icon: 'bullhorn-variant-outline',
    color: '#FF4B4B',
    prompt: "Parse the financial data or graphical media in this image to score retail trading enthusiasm vs market fear levels."
  }
];

interface SavedAnalysis {
  id: string;
  toolTitle: string;
  timestamp: any;
  response: string;
  imageUri?: string;
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
}

export default function ScanScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'scan' | 'history'>('scan');
  const [selectedTool, setSelectedTool] = useState(SCAN_TOOLS[0]);
  const [isScanning, setIsScanning] = useState(false);
  const [history, setHistory] = useState<SavedAnalysis[]>([]);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<SavedAnalysis | null>(null);

  /**
   * LIVE ACCOUNT SYNCING: FIRESTORE V22 MODULAR
   * Targeting the new 'user_analyses' collection for strict isolation
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
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      
      setHistory(records.map(r => ({
        id: r.id,
        toolTitle: r.toolTitle,
        timestamp: r.timestamp,
        response: r.response,
        imageUri: r.imageUri,
        sentiment: r.sentiment || 'Neutral'
      })));
    }, (error) => {
      console.error("[Firestore] Sync Error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  /**
   * MULTI-MODAL VISION SCAN ENGINE
   */
  const executeScan = async () => {
    if (!API_KEY) {
      Alert.alert("Security Alert", "Gemini API Key missing.");
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
    setAnalysisResult(null); // Clear previous result to reset rendering box

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

      // INSTANT STATE INJECTION: Fixes the empty rendering box bug
      setAnalysisResult(responseText);

      // PERSISTENCE: Save to new account-synced Firestore collection
      const detectedSentiment = responseText.toLowerCase().includes('bullish') ? 'Bullish' : 'Bearish';
      await addDoc(collection(firebaseDb, 'user_analyses'), {
        userId: user.uid,
        userEmail: user.email,
        toolTitle: selectedTool.title,
        timestamp: Timestamp.now(),
        response: responseText,
        sentiment: detectedSentiment,
        imageUri: localUri,
      });

    } catch (error) {
      console.error("[AI Engine] Error:", error);
      Alert.alert("Analysis Failed", "Gemini vision engine could not parse the chart.");
    } finally {
      setIsScanning(false);
    }
  };

  const renderScanner = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {/* AI ASSISTANT BRANDING */}
      <View style={styles.assistantPanel}>
        <View style={styles.mascotBadge}>
          <Image source={require('../../assets/images/mascots/bear.png')} style={styles.bearImage} />
          <View style={styles.dataBadge}>
            <Text style={styles.dataText}>AI VISION</Text>
          </View>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Institutional Scan</Text>
          <Text style={styles.headerSub}>Powered by Gemini 3.1 Flash-Lite</Text>
        </View>
      </View>

      {/* COLORFUL PRESENTATION BOX (Visual Fix) */}
      {analysisResult && (
        <View style={[styles.resultBox, { borderColor: selectedTool.color }]}>
          <View style={[styles.resultRibbon, { backgroundColor: selectedTool.color }]}>
            <Text style={styles.ribbonText}>LIVE ANALYSIS COMPLETE</Text>
          </View>
          <ScrollView style={styles.resultScroll} nestedScrollEnabled>
            <Text style={styles.resultText}>{analysisResult}</Text>
          </ScrollView>
        </View>
      )}

      {/* TOOL SELECTOR */}
      <View style={styles.toolList}>
        {SCAN_TOOLS.map((tool) => (
          <Pressable
            key={tool.id}
            onPress={() => { setSelectedTool(tool); setAnalysisResult(null); }}
            style={[
              styles.toolCard,
              selectedTool.id === tool.id && { borderColor: tool.color, backgroundColor: tool.color + '05' }
            ]}
          >
            <View style={[styles.iconFrame, { backgroundColor: tool.color + '15' }]}>
              {tool.lucideIcon ? (
                <LucideIcons.CandlestickChart size={24} color={tool.color} />
              ) : (
                <MaterialCommunityIcons name={tool.icon as any} size={24} color={tool.color} />
              )}
            </View>
            <View style={styles.toolMeta}>
              <Text style={styles.toolTitle}>{tool.title}</Text>
              <Text style={styles.toolDesc} numberOfLines={1}>{tool.desc}</Text>
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
          style={[styles.scanBtn, isScanning && styles.btnDisabled]}
        >
          {isScanning ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <MaterialCommunityIcons name="image-filter-center-focus" size={24} color="#FFF" />
              <Text style={styles.scanBtnText}>Analyze Now</Text>
            </>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );

  const renderHistory = () => (
    <ScrollView contentContainerStyle={styles.historyScroll}>
      <Text style={styles.persistenceHeader}>ACCOUNT SYNCED REPOSITORY</Text>
      
      {selectedHistoryItem && (
        <View style={styles.historyDetail}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle}>{selectedHistoryItem.toolTitle}</Text>
            <Pressable onPress={() => setSelectedHistoryItem(null)}>
              <MaterialCommunityIcons name="close-circle-outline" size={26} color="#888" />
            </Pressable>
          </View>
          <ScrollView style={styles.detailScroll}>
            <Text style={styles.detailText}>{selectedHistoryItem.response}</Text>
          </ScrollView>
        </View>
      )}

      {history.map((item) => (
        <Pressable 
          key={item.id} 
          style={styles.logCard}
          onPress={() => setSelectedHistoryItem(item)}
        >
          <View style={styles.logIcon}>
            <MaterialCommunityIcons name="cloud-check-outline" size={22} color="#4B4B4B" />
          </View>
          <View style={styles.logInfo}>
            <Text style={styles.logTool}>{item.toolTitle}</Text>
            <Text style={styles.logDate}>
              {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleString() : 'Recent'}
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
      <View style={styles.tabNav}>
        <Pressable 
          onPress={() => setActiveTab('scan')} 
          style={[styles.tab, activeTab === 'scan' && styles.tabActive]}
        >
          <Text style={[styles.tabText, activeTab === 'scan' && styles.tabTextActive]}>AI Scanner</Text>
        </Pressable>
        <Pressable 
          onPress={() => setActiveTab('history')} 
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>Records</Text>
        </Pressable>
      </View>

      {activeTab === 'scan' ? renderScanner() : renderHistory()}
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
  tabText: { fontSize: 14, fontWeight: '800', color: '#BDBDBD' },
  tabTextActive: { color: '#4B4B4B' },
  scrollContent: { paddingBottom: 100 },
  assistantPanel: { flexDirection: 'row', padding: 25, alignItems: 'center' },
  mascotBadge: { alignItems: 'center' },
  bearImage: { width: 60, height: 60, resizeMode: 'contain' },
  dataBadge: { backgroundColor: '#4B4B4B', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, marginTop: -10 },
  dataText: { color: '#FFF', fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
  headerInfo: { flex: 1, marginLeft: 18 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#4B4B4B' },
  headerSub: { fontSize: 12, color: '#999', marginTop: 3 },
  // RENDERING BOX FIX
  resultBox: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 2,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    maxHeight: 300,
  },
  resultRibbon: { paddingVertical: 6, alignItems: 'center' },
  ribbonText: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  resultScroll: { padding: 20 },
  resultText: { fontSize: 14, color: '#444', lineHeight: 22, fontWeight: '600' },
  // TOOLS
  toolList: { paddingHorizontal: 20 },
  toolCard: {
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
  iconFrame: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  toolMeta: { flex: 1, marginLeft: 15 },
  toolTitle: { fontSize: 15, fontWeight: '800', color: '#4B4B4B' },
  toolDesc: { fontSize: 12, color: '#999', marginTop: 2 },
  actionZone: { paddingHorizontal: 20, marginTop: 10 },
  scanBtn: {
    backgroundColor: '#4B4B4B',
    paddingVertical: 18,
    borderRadius: 22,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  btnDisabled: { opacity: 0.6 },
  scanBtnText: { color: '#FFF', fontSize: 17, fontWeight: '900' },
  // HISTORY
  historyScroll: { padding: 20, paddingBottom: 100 },
  persistenceHeader: { fontSize: 10, fontWeight: '900', color: '#D0D0D0', letterSpacing: 2, marginBottom: 20, textAlign: 'center' },
  historyDetail: { backgroundColor: '#F9F9F9', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#F0F0F0', marginBottom: 20, maxHeight: 350 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  detailTitle: { fontSize: 16, fontWeight: '900', color: '#4B4B4B' },
  detailScroll: { flex: 1 },
  detailText: { fontSize: 13, color: '#555', lineHeight: 20 },
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
