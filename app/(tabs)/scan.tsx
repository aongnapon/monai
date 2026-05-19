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
  AreaChart,
  CandlestickChart,
  CheckCircle2,
  CloudOff,
  Database,
  Megaphone,
  Scan,
  TrendingDown,
  TrendingUp,
  XCircle
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
const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

/**
 * SCANNER TOOL DEFINITIONS - MIGRATED TO LUCIDE
 */
const SCAN_TOOLS = [
  {
    id: 'visual',
    title: 'Institutional Graph Scan',
    desc: 'Deep visual analysis of chart patterns & levels',
    Icon: AreaChart,
    color: '#CE82FF',
    prompt: "Act as a Senior Quant Analyst. Evaluate this chart image for structural support/resistance zones and pattern breakout potential. Return a professional markdown report."
  },
  {
    id: 'patterns',
    title: 'Technical Pattern Pulse',
    desc: 'Scan for Candlestick & Channel setups',
    Icon: CandlestickChart, // FIX: REPLACED FAILING MATERIAL-COMMUNITY ICON
    color: '#58CC02',
    prompt: "Analyze this image for major Japanese candlestick setups and breakout channels. Provide a probability score for the next major movement."
  },
  {
    id: 'sentiment',
    title: 'Sentiment Momentum Matrix',
    desc: 'Score retail enthusiasm & fear index',
    Icon: Megaphone,
    color: '#FF4B4B',
    prompt: "Parse the financial strings or graphical media in this image to score retail trading enthusiasm vs market fear levels. Provide a momentum rating."
  }
];

interface AnalysisRecord {
  id: string;
  toolTitle: string;
  timestamp: any;
  analysisResult: string;
  imageUri?: string;
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
}

/**
 * CLEAN PRIMITIVE FUNCTIONAL COMPONENT
 * Zero nested NavigationContainers or deep-linking props.
 */
export default function ScanScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'scan' | 'history'>('scan');
  const [selectedTool, setSelectedTool] = useState(SCAN_TOOLS[0]);
  const [isScanning, setIsScanning] = useState(false);
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisRecord | null>(null);

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
          toolTitle: data.toolTitle || 'AI Analysis',
          timestamp: data.timestamp,
          analysisResult: data.analysisResult || data.response || data.markdownText || 'No analytical data found.',
          imageUri: data.imageUri || undefined,
          sentiment: data.sentiment || 'Neutral',
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
  };

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
      const prompt = selectedTool.prompt;
      const imagePart = {
        inlineData: {
          data: base64Data!,
          mimeType: "image/jpeg",
        },
      };

      const result = await model.generateContent([prompt, imagePart]);
      const responseText = result.response.text();

      const sentiment = responseText.toLowerCase().includes('bullish') ? 'Bullish' : 
                        responseText.toLowerCase().includes('bearish') ? 'Bearish' : 'Neutral';

      const docData = {
        userId: user.uid,
        userEmail: user.email,
        toolTitle: selectedTool.title,
        timestamp: Timestamp.now(),
        analysisResult: responseText,
        sentiment: sentiment,
        imageUri: localUri,
      };

      const docRef = await addDoc(collection(firebaseDb, 'user_analyses'), docData);
      
      const newRecord: AnalysisRecord = {
        id: docRef.id,
        ...docData
      };

      toggleResult(newRecord);

    } catch (error) {
      console.error("[Gemini] API Failure:", error);
      Alert.alert("Scanner Error", "Failed to parse chart patterns.");
    } finally {
      setIsScanning(false);
    }
  };

  const renderResultCard = (record: AnalysisRecord) => {
    const isBullish = record.sentiment === 'Bullish';
    const accentColor = isBullish ? '#58CC02' : record.sentiment === 'Bearish' ? '#FF4B4B' : '#CE82FF';
    const indicator = isBullish ? '📈' : record.sentiment === 'Bearish' ? '📉' : '⚖️';
    
    const StatusIcon = isBullish ? TrendingUp : record.sentiment === 'Bearish' ? TrendingDown : Activity;

    return (
      <View style={[styles.inlineResult, { borderColor: accentColor }]}>
        <View style={[styles.resultRibbon, { backgroundColor: accentColor }]}>
          <View style={styles.ribbonLeft}>
            <StatusIcon color="#FFF" size={18} />
            <Text style={styles.indicatorEmoji}>{indicator}</Text>
            <Text style={styles.ribbonTitle}>INSTITUTIONAL ANALYSIS</Text>
          </View>
          <Pressable onPress={() => toggleResult(null)} style={styles.closeBtn}>
            <XCircle color="#FFF" size={22} />
          </Pressable>
        </View>

        <View style={styles.resultLayout}>
          {record.imageUri && (
            <View style={styles.thumbFrame}>
              <Image source={{ uri: record.imageUri }} style={styles.analysisThumb} />
            </View>
          )}
          
          <View style={styles.analysisData}>
            <Text style={styles.analysisToolName}>{record.toolTitle}</Text>
            <ScrollView style={styles.analysisScroll} nestedScrollEnabled>
              <Text style={styles.analysisBody}>{record.analysisResult}</Text>
            </ScrollView>
          </View>
        </View>
      </View>
    );
  };

  const renderScanner = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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

      {activeAnalysis && renderResultCard(activeAnalysis)}

      <View style={styles.toolList}>
        {SCAN_TOOLS.map((tool) => (
          <Pressable
            key={tool.id}
            onPress={() => { setSelectedTool(tool); toggleResult(null); }}
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
          {isScanning ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Scan color="#FFF" size={26} />
              <Text style={styles.scanBtnText}>Analyze Now</Text>
            </>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );

  const renderHistory = () => (
    <ScrollView contentContainerStyle={styles.historyScroll}>
      <Text style={styles.sectionHeader}>SYNCHRONIZED ACCOUNT REPOSITORY</Text>
      
      {activeAnalysis && renderResultCard(activeAnalysis)}

      {history.map((item) => (
        <Pressable 
          key={item.id} 
          style={styles.logCard}
          onPress={() => toggleResult(item)}
        >
          <View style={styles.logIconFrame}>
            <Database color="#4B4B4B" size={22} />
          </View>
          <View style={styles.logContent}>
            <Text style={styles.logTitle}>{item.toolTitle}</Text>
            <Text style={styles.logTime}>
              {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleString() : 'Processing'}
            </Text>
          </View>
          <View style={[styles.pillBadge, { backgroundColor: (item.sentiment || 'Neutral') === 'Bullish' ? '#58CC0220' : '#FF4B4B20' }]}>
            <Text style={[styles.pillText, { color: (item.sentiment || 'Neutral') === 'Bullish' ? '#58CC02' : '#FF4B4B' }]}>
              {(item.sentiment || 'Neutral').toUpperCase()}
            </Text>
          </View>
        </Pressable>
      ))}

      {history.length === 0 && (
        <View style={styles.emptyContainer}>
          <CloudOff color="#F0F0F0" size={48} />
          <Text style={styles.emptyMsg}>No account records synchronized.</Text>
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
    borderRadius: 18,
    padding: 6,
  },
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
  inlineResult: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 2,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 15,
  },
  resultRibbon: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 15, alignItems: 'center', justifyContent: 'space-between' },
  ribbonLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  indicatorEmoji: { fontSize: 18, marginLeft: 4 },
  ribbonTitle: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  closeBtn: { padding: 4 },
  resultLayout: { padding: 15, flexDirection: 'row', gap: 15 },
  thumbFrame: {
    width: 90,
    height: 130,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  analysisThumb: { width: '100%', height: '100%', resizeMode: 'cover' },
  analysisData: { flex: 1, height: 130 },
  analysisToolName: { fontSize: 15, fontWeight: '900', color: '#4B4B4B', marginBottom: 6 },
  analysisScroll: { flex: 1 },
  analysisBody: { fontSize: 13, color: '#555', lineHeight: 19, fontWeight: '600' },
  toolList: { paddingHorizontal: 20 },
  toolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#F8F8F8',
  },
  iconBox: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  toolMeta: { flex: 1, marginLeft: 16 },
  toolTitle: { fontSize: 15, fontWeight: '800', color: '#4B4B4B' },
  toolDesc: { fontSize: 12, color: '#A0A0A0', marginTop: 2 },
  actionZone: { paddingHorizontal: 20, marginTop: 10 },
  scanActionBtn: {
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
    borderColor: '#F0F0F0',
    elevation: 2,
  },
  logIconFrame: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F9F9F9', justifyContent: 'center', alignItems: 'center' },
  logContent: { flex: 1, marginLeft: 15 },
  logTitle: { fontSize: 14, fontWeight: '800', color: '#4B4B4B' },
  logTime: { fontSize: 11, color: '#BDBDBD', marginTop: 2 },
  pillBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  pillText: { fontSize: 9, fontWeight: '900' },
  emptyContainer: { marginTop: 60, alignItems: 'center' },
  emptyMsg: { marginTop: 15, color: '#D0D0D0', fontSize: 14, fontWeight: '700' },
});
