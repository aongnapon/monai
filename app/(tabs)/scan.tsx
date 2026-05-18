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
    icon: 'chart-candle', // EXACT IDENTIFIER FIX
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
  scannerType?: string;
  analysisResult?: string;
  markdownText?: string;
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
   * LIVE ACCOUNT SYNCING & SNAPSHOT MAPPING FIX
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
      
      setHistory(records.map(r => {
        // Robust Drilldown with Fallbacks
        const title = r.toolTitle || r.scannerType || 'AI Analysis';
        const body = r.response || r.analysisResult || r.markdownText || 'No analytical data found.';
        
        return {
          id: r.id,
          toolTitle: title,
          timestamp: r.timestamp,
          response: body,
          imageUri: r.imageUri,
          sentiment: r.sentiment || 'Neutral'
        };
      }));
    }, (error) => {
      console.error("[Firestore] Mapping Error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  /**
   * MULTI-MODAL VISION SCAN ENGINE
   */
  const executeScan = async () => {
    if (!API_KEY) {
      Alert.alert("Error", "Missing Gemini API Key.");
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
    setAnalysisResult(null);

    try {
      const prompt = selectedTool.prompt;
      const imagePart = {
        inlineData: {
          data: base64Data!,
          mimeType: "image/jpeg",
        },
      };

      const result = await model.generateContent([prompt, imagePart]);
      const responseText = result.response.text();

      // Fix: Instant state injection into rendering box
      setAnalysisResult(responseText);

      const detectedSentiment = responseText.toLowerCase().includes('bullish') ? 'Bullish' : 'Bearish';
      
      // Save with aligned key names
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
      console.error("[Gemini] Scan Failure:", error);
      Alert.alert("Scanner Error", "Failed to analyze the trading graph.");
    } finally {
      setIsScanning(false);
    }
  };

  const renderScanner = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <View style={styles.assistantHeader}>
        <View style={styles.mascotAnchor}>
          <Image source={require('../../assets/images/mascots/bear.png')} style={styles.bear} />
          <View style={styles.badgeLabel}>
            <Text style={styles.badgeText}>AI ASSISTANT</Text>
          </View>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.mainTitle}>Multi-Modal Vision</Text>
          <Text style={styles.subTitle}>Target: gemini-3.1-flash-lite</Text>
        </View>
      </View>

      {/* COLORFUL PRESENTATION BOX */}
      {analysisResult && (
        <View style={[styles.resultCard, { borderColor: selectedTool.color }]}>
          <View style={[styles.resultBar, { backgroundColor: selectedTool.color }]}>
            <Text style={styles.barTitle}>ANALYTICAL OUTPUT</Text>
          </View>
          <ScrollView style={styles.resultView} nestedScrollEnabled>
            <Text style={styles.resultText}>{analysisResult}</Text>
          </ScrollView>
        </View>
      )}

      {/* TOOL SELECTOR: Fixed Background Transparency */}
      <View style={styles.toolGrid}>
        {SCAN_TOOLS.map((tool) => (
          <Pressable
            key={tool.id}
            onPress={() => { setSelectedTool(tool); setAnalysisResult(null); }}
            style={[
              styles.toolItem,
              selectedTool.id === tool.id && { borderColor: tool.color, backgroundColor: 'transparent' } // FIX: No gray backdrop
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
              <MaterialCommunityIcons name="check-circle" size={20} color={tool.color} />
            )}
          </Pressable>
        ))}
      </View>

      <View style={styles.actionZone}>
        <Pressable 
          onPress={executeScan} 
          disabled={isScanning}
          style={[styles.mainBtn, isScanning && styles.btnLoading]}
        >
          {isScanning ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <MaterialCommunityIcons name="chart-bell-curve" size={24} color="#FFF" />
              <Text style={styles.btnText}>Analyze Now</Text>
            </>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );

  const renderRecords = () => (
    <ScrollView contentContainerStyle={styles.recordsScroll}>
      <Text style={styles.recordsHeader}>PERSISTENT ACCOUNT REPOSITORY</Text>
      
      {selectedHistoryItem && (
        <View style={styles.drillDown}>
          <View style={styles.drillHeader}>
            <Text style={styles.drillTitle}>{selectedHistoryItem.toolTitle}</Text>
            <Pressable onPress={() => setSelectedHistoryItem(null)}>
              <MaterialCommunityIcons name="close-circle" size={26} color="#BDBDBD" />
            </Pressable>
          </View>
          <ScrollView style={styles.drillScroll}>
            <Text style={styles.drillText}>{selectedHistoryItem.response}</Text>
          </ScrollView>
        </View>
      )}

      {history.map((item) => (
        <Pressable 
          key={item.id} 
          style={styles.historyCard}
          onPress={() => setSelectedHistoryItem(item)}
        >
          <View style={styles.historyIconBox}>
            <MaterialCommunityIcons name="text-box-search-outline" size={22} color="#4B4B4B" />
          </View>
          <View style={styles.historyBody}>
            <Text style={styles.historyTitle}>{item.toolTitle}</Text>
            <Text style={styles.historyDate}>
              {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleString() : 'Processing'}
            </Text>
          </View>
          <View style={[styles.sentimentBadge, { backgroundColor: (item.sentiment || 'Neutral') === 'Bullish' ? '#58CC0220' : '#FF4B4B20' }]}>
            <Text style={[styles.sentimentValue, { color: (item.sentiment || 'Neutral') === 'Bullish' ? '#58CC02' : '#FF4B4B' }]}>
              {(item.sentiment || 'Neutral').toUpperCase()}
            </Text>
          </View>
        </Pressable>
      ))}

      {history.length === 0 && (
        <View style={styles.emptyView}>
          <MaterialCommunityIcons name="cloud-download-outline" size={48} color="#F5F5F5" />
          <Text style={styles.emptyTxt}>No historical analysis found.</Text>
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
    borderRadius: 18,
    padding: 6,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 14 },
  tabActive: { backgroundColor: '#FFFFFF', elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  tabLabel: { fontSize: 14, fontWeight: '800', color: '#C0C0C0' },
  tabLabelActive: { color: '#4B4B4B' },
  scrollContent: { paddingBottom: 100 },
  assistantHeader: { flexDirection: 'row', padding: 25, alignItems: 'center' },
  mascotAnchor: { alignItems: 'center' },
  bear: { width: 62, height: 62, resizeMode: 'contain' },
  badgeLabel: { backgroundColor: '#4B4B4B', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, marginTop: -10 },
  badgeText: { color: '#FFF', fontSize: 7, fontWeight: '900' },
  headerText: { flex: 1, marginLeft: 20 },
  mainTitle: { fontSize: 20, fontWeight: '900', color: '#4B4B4B' },
  subTitle: { fontSize: 12, color: '#A0A0A0', marginTop: 4 },
  // RESULT CARD
  resultCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 2,
    overflow: 'hidden',
    elevation: 4,
  },
  resultBar: { paddingVertical: 8, alignItems: 'center' },
  barTitle: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  resultView: { padding: 20, maxHeight: 250 },
  resultText: { fontSize: 14, color: '#444', lineHeight: 22, fontWeight: '700' },
  // TOOL SELECTOR
  toolGrid: { paddingHorizontal: 20 },
  toolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#F8F8F8',
  },
  iconCircle: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  toolContent: { flex: 1, marginLeft: 16 },
  toolLabel: { fontSize: 15, fontWeight: '800', color: '#4B4B4B' },
  toolSub: { fontSize: 12, color: '#A0A0A0', marginTop: 2 },
  actionZone: { paddingHorizontal: 20, marginTop: 10 },
  mainBtn: {
    backgroundColor: '#4B4B4B',
    paddingVertical: 18,
    borderRadius: 22,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  btnLoading: { opacity: 0.6 },
  btnText: { color: '#FFF', fontSize: 17, fontWeight: '900' },
  // RECORDS
  recordsScroll: { padding: 20, paddingBottom: 100 },
  recordsHeader: { fontSize: 10, fontWeight: '900', color: '#D0D0D0', letterSpacing: 2, marginBottom: 20, textAlign: 'center' },
  drillDown: { backgroundColor: '#FAFAFA', padding: 20, borderRadius: 25, borderWidth: 1, borderColor: '#F0F0F0', marginBottom: 20, maxHeight: 350 },
  drillHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  drillTitle: { fontSize: 16, fontWeight: '900', color: '#4B4B4B' },
  drillScroll: { flex: 1 },
  drillText: { fontSize: 13, color: '#666', lineHeight: 20 },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 22,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    elevation: 2,
  },
  historyIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F9F9F9', justifyContent: 'center', alignItems: 'center' },
  historyBody: { flex: 1, marginLeft: 15 },
  historyTitle: { fontSize: 14, fontWeight: '800', color: '#4B4B4B' },
  historyDate: { fontSize: 11, color: '#BDBDBD', marginTop: 2 },
  sentimentBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  sentimentValue: { fontSize: 9, fontWeight: '900' },
  emptyView: { marginTop: 80, alignItems: 'center' },
  emptyTxt: { marginTop: 15, color: '#D0D0D0', fontSize: 14, fontWeight: '700' },
});
