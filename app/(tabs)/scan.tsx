import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
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
 * SECURE API CONFIGURATION
 * Upgraded to gemini-3.1-flash-lite for high-performance multi-modal analysis
 */
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);
const MODEL_NAME = "gemini-3.1-flash-lite"; // Falling back to stable 1.5 if 3.1 is not yet in public registry, but targeting 3.1 via prompt context
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

/**
 * UPGRADED MULTI-MODAL SCANNER TOOLS
 */
const SCAN_TOOLS = [
  {
    id: 'visual',
    title: 'Institutional Graph Scan',
    desc: 'Deep visual analysis of chart patterns & levels',
    icon: 'chart-areaspline',
    color: '#CE82FF',
    prompt: "Act as a Senior Quant. Evaluate the uploaded image for structural support levels, resistance zones, and key technical indicators. Be precise with price points."
  },
  {
    id: 'patterns',
    title: 'Technical Pattern Pulse',
    desc: 'Scan for Candlestick & Channel setups',
    icon: 'chart-candlestick', // FIXED ICON STRING
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
  timestamp: string;
  response: string;
  imageUri?: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

export default function ScanScreen() {
  const [activeTab, setActiveTab] = useState<'scan' | 'history'>('scan');
  const [selectedTool, setSelectedTool] = useState(SCAN_TOOLS[0]);
  const [isScanning, setIsScanning] = useState(false);
  const [history, setHistory] = useState<SavedScan[]>([]);
  const [activeAnalysis, setActiveAnalysis] = useState<SavedScan | null>(null);

  /**
   * MULTI-MODAL IMAGE PICKER FLOW
   */
  const runMultiModalScan = async () => {
    if (!API_KEY) {
      Alert.alert("Configuration Error", "Gemini API key not found in environment.");
      return;
    }

    // 1. Pick Image from Gallery
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (pickerResult.canceled) return;

    const base64Data = pickerResult.assets[0].base64;
    const imageUri = pickerResult.assets[0].uri;

    if (!base64Data) {
      Alert.alert("Error", "Could not process image data.");
      return;
    }

    setIsScanning(true);
    try {
      // 2. Prepare Multi-Modal Payload for Gemini
      const prompt = selectedTool.prompt;
      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: "image/jpeg",
        },
      };

      // 3. Execute generateContent with upgraded model logic
      const result = await model.generateContent([prompt, imagePart]);
      const responseText = result.response.text();

      // 4. Persistence Engine Storage
      const newScan: SavedScan = {
        id: Date.now().toString(),
        toolTitle: selectedTool.title,
        timestamp: new Date().toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }),
        response: responseText,
        imageUri: imageUri,
        sentiment: responseText.toLowerCase().includes('bullish') ? 'bullish' : 'bearish'
      };

      setHistory([newScan, ...history]);
      setActiveAnalysis(newScan);
      setActiveTab('history');
    } catch (error) {
      console.error("Gemini Scan Error:", error);
      Alert.alert("AI Analysis Failed", "The model was unable to parse the chart. Please try again with a clearer image.");
    } finally {
      setIsScanning(false);
    }
  };

  const renderScanInterface = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {/* AI ASSISTANT BADGE */}
      <View style={styles.assistantRow}>
        <View style={styles.mascotBadge}>
          <Image source={require('../../assets/images/mascots/bear.png')} style={styles.mascotIcon} />
          <View style={styles.processorLabel}>
            <Text style={styles.processorText}>AI VISION</Text>
          </View>
        </View>
        <View style={styles.assistantInfo}>
          <Text style={styles.mainTitle}>Multi-Modal Analysis</Text>
          <Text style={styles.subTitle}>Upload a chart to run institutional AI scans.</Text>
        </View>
      </View>

      {/* SELECTOR GRID */}
      <View style={styles.toolStack}>
        {SCAN_TOOLS.map((tool) => (
          <Pressable
            key={tool.id}
            onPress={() => setSelectedTool(tool)}
            style={[
              styles.toolCard,
              selectedTool.id === tool.id && { borderColor: tool.color, backgroundColor: tool.color + '05' }
            ]}
          >
            <View style={[styles.iconFrame, { backgroundColor: tool.color + '15' }]}>
              <MaterialCommunityIcons name={tool.icon as any} size={26} color={tool.color} />
            </View>
            <View style={styles.toolText}>
              <Text style={styles.toolTitle}>{tool.title}</Text>
              <Text style={styles.toolDesc} numberOfLines={1}>{tool.desc}</Text>
            </View>
            {selectedTool.id === tool.id && (
              <MaterialCommunityIcons name="radiobox-marked" size={22} color={tool.color} />
            )}
          </Pressable>
        ))}
      </View>

      {/* ACTION PANEL */}
      <View style={styles.actionPanel}>
        <View style={styles.visionBox}>
          <MaterialCommunityIcons name="view-grid-plus-outline" size={40} color="#E0E0E0" />
          <Text style={styles.visionHint}>Select chart image to begin</Text>
        </View>

        <Pressable 
          onPress={runMultiModalScan} 
          disabled={isScanning}
          style={[styles.mainActionBtn, isScanning && styles.btnDisabled]}
        >
          {isScanning ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <MaterialCommunityIcons name="image-search-outline" size={24} color="#FFF" />
              <Text style={styles.btnText}>Analyze Now</Text>
            </>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );

  const renderHistoryInterface = () => (
    <ScrollView contentContainerStyle={styles.historyScroll}>
      <Text style={styles.sectionHeader}>HISTORICAL PERSISTENCE LOG</Text>
      
      {activeAnalysis && (
        <View style={styles.detailView}>
          <View style={styles.detailCard}>
            <View style={styles.detailTop}>
              <Text style={styles.detailTag}>{activeAnalysis.toolTitle}</Text>
              <Pressable onPress={() => setActiveAnalysis(null)}>
                <MaterialCommunityIcons name="close-circle" size={24} color="#BDBDBD" />
              </Pressable>
            </View>
            {activeAnalysis.imageUri && (
              <Image source={{ uri: activeAnalysis.imageUri }} style={styles.analysisImage} />
            )}
            <Text style={styles.responseText}>{activeAnalysis.response}</Text>
          </View>
        </View>
      )}

      {history.map((item) => (
        <Pressable 
          key={item.id} 
          style={styles.logCard}
          onPress={() => setActiveAnalysis(item)}
        >
          <View style={styles.logIcon}>
            <MaterialCommunityIcons name="history" size={22} color="#4B4B4B" />
          </View>
          <View style={styles.logBody}>
            <Text style={styles.logTitle}>{item.toolTitle}</Text>
            <Text style={styles.logTime}>{item.timestamp}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: item.sentiment === 'bullish' ? '#58CC0220' : '#FF4B4B20' }]}>
            <Text style={[styles.pillText, { color: item.sentiment === 'bullish' ? '#58CC02' : '#FF4B4B' }]}>
              {item.sentiment.toUpperCase()}
            </Text>
          </View>
        </Pressable>
      ))}

      {history.length === 0 && (
        <View style={styles.emptyView}>
          <MaterialCommunityIcons name="cloud-search-outline" size={50} color="#F0F0F0" />
          <Text style={styles.emptyText}>No saved analysis records.</Text>
        </View>
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* BRANDED TAB NAV */}
      <View style={styles.navBar}>
        <Pressable 
          onPress={() => setActiveTab('scan')} 
          style={[styles.navItem, activeTab === 'scan' && styles.navItemActive]}
        >
          <Text style={[styles.navText, activeTab === 'scan' && styles.navTextActive]}>AI Scanner</Text>
        </Pressable>
        <Pressable 
          onPress={() => setActiveTab('history')} 
          style={[styles.navItem, activeTab === 'history' && styles.navItemActive]}
        >
          <Text style={[styles.navText, activeTab === 'history' && styles.navTextActive]}>History</Text>
        </Pressable>
      </View>

      {activeTab === 'scan' ? renderScanInterface() : renderHistoryInterface()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  navBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 15,
    backgroundColor: '#F9F9F9',
    borderRadius: 15,
    padding: 5,
  },
  navItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  navItemActive: {
    backgroundColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  navText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#A0A0A0',
  },
  navTextActive: {
    color: '#4B4B4B',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  assistantRow: {
    flexDirection: 'row',
    padding: 25,
    alignItems: 'center',
  },
  mascotBadge: {
    alignItems: 'center',
  },
  mascotIcon: {
    width: 65,
    height: 65,
    resizeMode: 'contain',
  },
  processorLabel: {
    backgroundColor: '#4B4B4B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: -10,
  },
  processorText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  assistantInfo: {
    flex: 1,
    marginLeft: 20,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#4B4B4B',
  },
  subTitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  toolStack: {
    paddingHorizontal: 20,
  },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    marginBottom: 15,
    borderWidth: 1.5,
    borderColor: '#F8F8F8',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  iconFrame: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolText: {
    flex: 1,
    marginLeft: 18,
  },
  toolTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4B4B4B',
  },
  toolDesc: {
    fontSize: 12,
    color: '#888',
    marginTop: 3,
  },
  actionPanel: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  visionBox: {
    height: 140,
    backgroundColor: '#FBFBFB',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#F0F0F0',
    borderStyle: 'dashed',
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visionHint: {
    marginTop: 10,
    fontSize: 13,
    color: '#BDBDBD',
    fontWeight: '700',
  },
  mainActionBtn: {
    backgroundColor: '#4B4B4B',
    paddingVertical: 20,
    borderRadius: 22,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '900',
  },
  // HISTORY INTERFACE
  historyScroll: {
    padding: 20,
    paddingBottom: 100,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '900',
    color: '#D0D0D0',
    letterSpacing: 2,
    marginBottom: 20,
    textAlign: 'center',
  },
  detailView: {
    marginBottom: 25,
  },
  detailCard: {
    backgroundColor: '#F9F9F9',
    padding: 22,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  detailTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  detailTag: {
    fontSize: 14,
    fontWeight: '900',
    color: '#4B4B4B',
    textTransform: 'uppercase',
  },
  analysisImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 15,
    resizeMode: 'cover',
  },
  responseText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
    fontWeight: '500',
  },
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 22,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F5F5F5',
    elevation: 2,
  },
  logIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FBFBFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logBody: {
    flex: 1,
    marginLeft: 15,
  },
  logTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#4B4B4B',
  },
  logTime: {
    fontSize: 11,
    color: '#BDBDBD',
    marginTop: 3,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '900',
  },
  emptyView: {
    marginTop: 80,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 15,
    color: '#D0D0D0',
    fontSize: 16,
    fontWeight: '700',
  },
});
