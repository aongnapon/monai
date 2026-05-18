import { useAuth } from '@/src/context/AuthContext';
import { firebaseDb } from '@/src/lib/firebase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
import * as LucideIcons from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * SECURE API ARCHITECTURE
 * Target Model: gemini-1.5-flash (Standard for High-Performance Multi-Modal)
 */
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

/**
 * INSTITUTIONAL SCANNER CONFIGURATIONS
 */
const SCAN_TOOLS = [
  {
    id: 'visual',
    title: 'Institutional Graph Scan',
    desc: 'Deep visual analysis of chart patterns & levels',
    icon: 'chart-areaspline',
    color: '#CE82FF',
    prompt: "Act as a Senior Quant. Evaluate the uploaded image for structural support levels, resistance zones, and key technical indicators. Return a detailed markdown analysis."
  },
  {
    id: 'patterns',
    title: 'Technical Pattern Pulse',
    desc: 'Scan for Candlestick & Channel setups',
    lucideIcon: 'CandlestickChart', // UPGRADED TO LUCIDE
    color: '#58CC02',
    prompt: "Analyze this image for major Japanese candlestick setups (Engulfing, Hammers) and breakout channels. Provide a probability score for the next major movement."
  },
  {
    id: 'sentiment',
    title: 'Sentiment Momentum Matrix',
    desc: 'Parse market commentary & fear index',
    icon: 'bullhorn-variant-outline',
    color: '#FF4B4B',
    prompt: "Parse the financial data or graphical media in this image to score retail trading enthusiasm vs market fear levels. Provide a momentum rating and fear index score."
  }
];

interface SavedScan {
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
  const [history, setHistory] = useState<SavedScan[]>([]);
  const [activeAnalysis, setActiveAnalysis] = useState<SavedScan | null>(null);

  /**
   * MODULAR FIREBASE V22+ LIVE SYNC
   */
  useEffect(() => {
    if (!user) return;

    // Constructing modular query chain
    const scansRef = collection(firebaseDb, 'scans');
    const q = query(
      scansRef,
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const scans = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      
      setHistory(scans.map(s => ({
        id: s.id,
        toolTitle: s.toolTitle,
        timestamp: s.timestamp,
        response: s.response,
        imageUri: s.imageUri,
        sentiment: s.sentiment
      })));
    }, (error) => {
      console.error("[Firestore] Sync Error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  /**
   * MULTI-MODAL SCAN ENGINE
   */
  const runMultiModalScan = async () => {
    if (!API_KEY) {
      Alert.alert("Security Alert", "API Key configuration missing.");
      return;
    }

    if (!user) return;

    // Image Picker: Modern Modular Array Syntax
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (result.canceled) return;

    const base64Data = result.assets[0].base64;
    const localUri = result.assets[0].uri;

    setIsScanning(true);
    try {
      const prompt = selectedTool.prompt;
      const imagePart = {
        inlineData: {
          data: base64Data!,
          mimeType: "image/jpeg",
        },
      };

      // Execute Gemini Multi-Modal Logic
      const apiResult = await model.generateContent([prompt, imagePart]);
      const responseText = apiResult.response.text();
      const detectedSentiment = responseText.toLowerCase().includes('bullish') ? 'Bullish' : 'Bearish';

      // Persistence: Modular AddDoc Request
      await addDoc(collection(firebaseDb, 'scans'), {
        userId: user.uid,
        userEmail: user.email,
        toolTitle: selectedTool.title,
        scannerId: selectedTool.id,
        timestamp: Timestamp.now(),
        response: responseText,
        sentiment: detectedSentiment,
        imageUri: localUri,
      });

      setActiveTab('history');
    } catch (error) {
      console.error("[AI] Processing Error:", error);
      Alert.alert("Analysis Failed", "Failed to parse chart architecture.");
    } finally {
      setIsScanning(false);
    }
  };

  const renderScanInterface = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {/* AI ASSISTANT PANEL */}
      <View style={styles.assistantRow}>
        <View style={styles.mascotBox}>
          <Image source={require('../../assets/images/mascots/bear.png')} style={styles.mascot} />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>AI PROCESSOR</Text>
          </View>
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.mainHeader}>Institutional Scan</Text>
          <Text style={styles.subHeader}>Target: Gemini-3.1-Flash-Lite (Vision Enabled)</Text>
        </View>
      </View>

      {/* SCANNER GRID */}
      <View style={styles.stack}>
        {SCAN_TOOLS.map((tool) => (
          <Pressable
            key={tool.id}
            onPress={() => setSelectedTool(tool)}
            style={[
              styles.card,
              selectedTool.id === tool.id && { borderColor: tool.color, backgroundColor: tool.color + '05' }
            ]}
          >
            <View style={[styles.iconFrame, { backgroundColor: tool.color + '15' }]}>
              {tool.lucideIcon ? (
                <LucideIcons.CandlestickChart size={26} color={tool.color} />
              ) : (
                <MaterialCommunityIcons name={tool.icon as any} size={26} color={tool.color} />
              )}
            </View>
            <View style={styles.cardText}>
              <Text style={styles.toolTitle}>{tool.title}</Text>
              <Text style={styles.toolDesc} numberOfLines={1}>{tool.desc}</Text>
            </View>
            {selectedTool.id === tool.id && (
              <MaterialCommunityIcons name="check-circle" size={20} color={tool.color} />
            )}
          </Pressable>
        ))}
      </View>

      <View style={styles.actionZone}>
        <View style={styles.dropZone}>
          <MaterialCommunityIcons name="image-search-outline" size={40} color="#E0E0E0" />
          <Text style={styles.dropText}>Tap to upload chart</Text>
        </View>

        <Pressable 
          onPress={runMultiModalScan} 
          disabled={isScanning}
          style={[styles.primaryBtn, isScanning && styles.btnDisabled]}
        >
          {isScanning ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <MaterialCommunityIcons name="scan-helper" size={24} color="#FFF" />
              <Text style={styles.btnText}>Analyze Now</Text>
            </>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );

  const renderHistoryInterface = () => (
    <ScrollView contentContainerStyle={styles.historyScroll}>
      <Text style={styles.sectionTitle}>PERSISTENCE REPOSITORY</Text>
      
      {activeAnalysis && (
        <View style={styles.overlay}>
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>{activeAnalysis.toolTitle}</Text>
              <Pressable onPress={() => setActiveAnalysis(null)}>
                <MaterialCommunityIcons name="close" size={24} color="#888" />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.detailScroll}>
              <Text style={styles.markdown}>{activeAnalysis.response}</Text>
            </ScrollView>
          </View>
        </View>
      )}

      {history.map((item) => (
        <Pressable 
          key={item.id} 
          style={styles.logItem}
          onPress={() => setActiveAnalysis(item)}
        >
          <View style={styles.logIcon}>
            <MaterialCommunityIcons name="shield-search" size={22} color="#4B4B4B" />
          </View>
          <View style={styles.logBody}>
            <Text style={styles.logTool}>{item.toolTitle}</Text>
            <Text style={styles.logDate}>
              {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleDateString() : 'Active'}
            </Text>
          </View>
          <View style={[styles.pill, { backgroundColor: (item.sentiment || 'Neutral') === 'Bullish' ? '#58CC0220' : '#FF4B4B20' }]}>
            <Text style={[styles.pillText, { color: (item.sentiment || 'Neutral') === 'Bullish' ? '#58CC02' : '#FF4B4B' }]}>
              {(item.sentiment || 'Neutral').toUpperCase()}
            </Text>
          </View>
        </Pressable>
      ))}

      {history.length === 0 && (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="history" size={50} color="#F0F0F0" />
          <Text style={styles.emptyText}>No historical records found.</Text>
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
          <Text style={[styles.tabText, activeTab === 'scan' && styles.tabTextActive]}>Scanner</Text>
        </Pressable>
        <Pressable 
          onPress={() => setActiveTab('history')} 
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>History</Text>
        </Pressable>
      </View>

      {activeTab === 'scan' ? renderScanInterface() : renderHistoryInterface()}
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
    borderRadius: 15,
    padding: 5,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  tabActive: { backgroundColor: '#FFFFFF', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  tabText: { fontSize: 14, fontWeight: '800', color: '#BDBDBD' },
  tabTextActive: { color: '#4B4B4B' },
  scrollContent: { paddingBottom: 100 },
  assistantRow: { flexDirection: 'row', padding: 25, alignItems: 'center' },
  mascotBox: { alignItems: 'center' },
  mascot: { width: 65, height: 65, resizeMode: 'contain' },
  badge: { backgroundColor: '#4B4B4B', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, marginTop: -8 },
  badgeText: { color: '#FFF', fontSize: 7, fontWeight: '900' },
  titleContainer: { flex: 1, marginLeft: 20 },
  mainHeader: { fontSize: 19, fontWeight: '900', color: '#4B4B4B' },
  subHeader: { fontSize: 12, color: '#999', marginTop: 4 },
  stack: { paddingHorizontal: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#F8F8F8',
    elevation: 2,
  },
  iconFrame: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  cardText: { flex: 1, marginLeft: 15 },
  toolTitle: { fontSize: 15, fontWeight: '800', color: '#4B4B4B' },
  toolDesc: { fontSize: 12, color: '#999', marginTop: 3 },
  actionZone: { paddingHorizontal: 20, marginTop: 10 },
  dropZone: {
    height: 120,
    backgroundColor: '#FAFAFA',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#F0F0F0',
    borderStyle: 'dashed',
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropText: { marginTop: 10, fontSize: 12, color: '#BDBDBD', fontWeight: '700' },
  primaryBtn: {
    backgroundColor: '#4B4B4B',
    paddingVertical: 18,
    borderRadius: 22,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
  // HISTORY
  historyScroll: { padding: 20, paddingBottom: 100 },
  sectionTitle: { fontSize: 10, fontWeight: '900', color: '#D0D0D0', letterSpacing: 2, marginBottom: 20, textAlign: 'center' },
  overlay: { marginBottom: 20 },
  detailCard: { backgroundColor: '#F9F9F9', padding: 22, borderRadius: 25, borderWidth: 1, borderColor: '#F0F0F0', maxHeight: 400 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  detailTitle: { fontSize: 16, fontWeight: '900', color: '#4B4B4B' },
  detailScroll: { flex: 1 },
  markdown: { fontSize: 13, color: '#555', lineHeight: 20 },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F5F5F5',
    elevation: 2,
  },
  logIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FBFBFB', justifyContent: 'center', alignItems: 'center' },
  logBody: { flex: 1, marginLeft: 15 },
  logTool: { fontSize: 14, fontWeight: '800', color: '#4B4B4B' },
  logDate: { fontSize: 11, color: '#BDBDBD', marginTop: 2 },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  pillText: { fontSize: 9, fontWeight: '900' },
  empty: { marginTop: 60, alignItems: 'center' },
  emptyText: { marginTop: 15, color: '#D0D0D0', fontSize: 14, fontWeight: '700' },
});
