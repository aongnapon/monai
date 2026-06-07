import { useAuth } from '@/src/context/AuthContext';
import { firebaseDb } from '@/src/lib/firebase';
import {
  analyzeMarketChart,
  MarketAnalysisResult,
  PresentationSlide,
  ScanResultDoc
} from '@/src/lib/gemini';
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
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── PALETTE (Premium Light Theme) ────────────────────────────
const C = {
  bg: '#F8FAFC',                     // Soft cool gray canvas background
  surface: '#FFFFFF',                // Clean pure white container card base
  accent: '#1D4ED8',                 // Commanding vibrant royal blue accent
  accentLight: 'rgba(59, 130, 246, 0.06)', // Faint blue layout hue
  accentBorder: '#3B82F61C',         // Subtle blue border (10% opacity)
  purpleLight: 'rgba(139, 92, 246, 0.06)', // Faint purple background
  purpleBorder: '#8B5CF61C',         // Subtle purple border
  green: '#10B981',                  // Modern light-mode emerald green
  greenLight: 'rgba(34, 197, 94, 0.08)', // Light green surface for Trend Card
  red: '#EF4444',                    // Modern light-mode rose red
  amber: '#F59E0B',                  // Modern light-mode amber
  textPrimary: '#0A1128',            // Premium deep dark navy blue
  textSecondary: '#64748B',          // Slate grey subtitles/secondary labels
  textMuted: '#94A3B8',              // Slate grey muted
  border: '#E2E8F0',                 // Soft light slate border
};

// ─── INTERFACES ──────────────────────────────────────────────
interface LocalScanResult extends ScanResultDoc {
  id?: string;
  imageUri?: string;
  assetName?: string;
}

const SCAN_TOOLS = [
  { id: 'fed',    title: 'Federal Macro-Pulse AI',   icon: 'landmark' as const, focus: 'FOMC and Macro Policy' },
  { id: 'bank',   title: 'Bank Alpha-Whale Scanner', icon: 'radar'    as const, focus: 'Institutional Liquidity' },
  { id: 'crypto', title: 'Crypto Momentum Engine',   icon: 'zap'      as const, focus: 'Crypto Volatility and On-chain' },
];

// ─── FONT-BASED ICON WRAPPERS (Crash-proof, no SVG dependencies) ───
const ArrowLeft = ({ size = 24, color = '#000' }) => (
  <Feather name={"arrow-left" as any} size={size} color={color} />
);
const Activity = ({ size = 24, color = '#000' }) => (
  <Feather name={"activity" as any} size={size} color={color} />
);
const Zap = ({ size = 24, color = '#000' }) => (
  <Feather name={"zap" as any} size={size} color={color} />
);
const AlertCircle = ({ size = 24, color = '#000' }) => (
  <Feather name={"alert-circle" as any} size={size} color={color} />
);
const CheckCircle2 = ({ size = 24, color = '#000' }) => (
  <Feather name={"check-circle" as any} size={size} color={color} />
);
const ChevronRight = ({ size = 24, color = '#000' }) => (
  <Feather name={"chevron-right" as any} size={size} color={color} />
);
const TrendingUp = ({ size = 24, color = '#000' }) => (
  <Feather name={"trending-up" as any} size={size} color={color} />
);
const Sparkles = ({ size = 24, color = '#000' }) => (
  <MaterialCommunityIcons name={"sparkles" as any} size={size} color={color} />
);
const Landmark = ({ size = 24, color = '#000' }) => (
  <MaterialCommunityIcons name={"bank" as any} size={size} color={color} />
);
const Radar = ({ size = 24, color = '#000' }) => (
  <MaterialCommunityIcons name={"radar" as any} size={size} color={color} />
);
const Scan = ({ size = 24, color = '#000' }) => (
  <MaterialCommunityIcons name={"qrcode-scan" as any} size={size} color={color} />
);

/** Renders the correct vector icon for a scan tool */
const ToolIcon = ({ iconName, active }: { iconName: string; active: boolean }) => {
  const color = active ? '#1D4ED8' : '#64748B';
  const size = 22;
  switch (iconName) {
    case 'landmark': return <Landmark size={size} color={color} />;
    case 'radar':    return <Radar    size={size} color={color} />;
    case 'zap':      return <Zap      size={size} color={color} />;
    default:         return <Scan     size={size} color={color} />;
  }
};

/**
 * Transforms historical analyses (stored in old formats) to the new MarketAnalysisResult layout
 */
const transformHistoryItem = (item: any): MarketAnalysisResult => {
  if (item.assetName) {
    return item as MarketAnalysisResult;
  }
  
  // Defensive Parsing from the presentationSlides field in the old schema
  let resistance = "N/A";
  let support = "N/A";
  let shortTermTarget = "N/A";
  let midTermTarget = "N/A";
  let longTermTarget = "N/A";
  let probability = "75%";
  let summary = "";
  let triggers: string[] = [];
  let risks: string[] = [];

  const slides = item.presentationSlides || [];
  slides.forEach((slide: any) => {
    const heading = slide.slideHeading || "";
    const list = slide.bulletPointsList || [];
    if (heading.includes("Market Structure")) {
      resistance = list[0]?.split(": ")[1] || "N/A";
      support = list[1]?.split(": ")[1] || "N/A";
      summary += (list[2] || "") + " ";
    } else if (heading.includes("Strategic Outlook")) {
      const targetStr = list[0]?.split(": ")[1] || "";
      const targets = targetStr.split(" | ");
      shortTermTarget = targets[0]?.replace("Short: ", "") || "N/A";
      midTermTarget = targets[1]?.replace("Mid: ", "") || "N/A";
      longTermTarget = targets[2]?.replace("Long: ", "") || "N/A";
      probability = list[1]?.match(/\d+%/)?.[0] || "75%";
      summary += (list[2] || "") + " ";
    } else if (heading.includes("Catalysts & Risks")) {
      if (list[0]) triggers.push(list[0].split(": ").slice(1).join(": ") || list[0]);
      if (list[1]) risks.push(list[1].split(": ").slice(1).join(": ") || list[1]);
      if (list[2]) triggers.push(list[2].split(": ").slice(1).join(": ") || list[2]);
    }
  });

  return {
    assetName: item.scanCategory === 'fed' ? "Federal Macro Scan" : item.scanCategory === 'bank' ? "Bank Alpha-Whale Scan" : "Crypto Momentum Scan",
    currentPrice: "฿0.00",
    action: item.dashboardData?.trend === 'Bearish' ? 'SELL' : 'BUY',
    actionScore: item.dashboardData?.sentimentLevel || 3,
    trend: item.dashboardData?.trend || "Sideways",
    volatility: "Medium",
    resistance,
    support,
    probability,
    summary: summary.trim() || "Historical analysis result parsed from presentation slides.",
    shortTermTarget,
    midTermTarget,
    longTermTarget,
    triggers: triggers.length ? triggers : ["FOMC policy trajectory shifts", "Global market liquidity adjustments", "Support breakout signals"],
    risks: risks.length ? risks : ["Regulatory headwind expansion", "Unexpected volatility spikes", "Key support level invalidation"]
  };
};

export default function ScanScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'scan' | 'history'>('scan');
  const [selectedTool, setSelectedTool] = useState(SCAN_TOOLS[0]);
  const [history, setHistory] = useState<LocalScanResult[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);

  // Live image upload and dashboard flow state variables
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<MarketAnalysisResult | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const loadingPulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for the selector scan button
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Shiba icon pulsing animation loop when loading
  useEffect(() => {
    if (isLoading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(loadingPulseAnim, { toValue: 1.1, duration: 900, useNativeDriver: true }),
          Animated.timing(loadingPulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    } else {
      loadingPulseAnim.setValue(1);
    }
  }, [isLoading]);

  // Load Scan history records
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

  // Operational Asynchronous Native Media Picker and Live Gemini API integration
  const executeScan = async () => {
    // 1. Defensive Media Library permission checks
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert("Permission to access camera roll is required!");
      return;
    }

    // 2. Launch selection without custom cropping to prevent Android lifecycle activity crashes
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false, // Disabling custom editing/cropping prevents Contract lifecycle crashes
      quality: 0.8,
    });
    
    if (pickerResult.canceled || !pickerResult.assets[0].uri) return;

    // 3. Clear previous states and start loader
    setScanError(null);
    setAnalysisData(null);
    setShowResult(false);
    setIsLoading(true);

    const selectedUri = pickerResult.assets[0].uri;
    setUploadedImage(selectedUri);

    try {
      // 4. Live Processing Call into the Gemini API pipeline
      const liveResult = await analyzeMarketChart(selectedUri, selectedTool.id);

      // 5. Log the genuine analysis results dynamically to Firestore database
      if (user) {
        try {
          await addDoc(collection(firebaseDb, 'user_analyses_v2'), {
            ...liveResult,
            scanCategory: selectedTool.id,
            userId: user.uid,
            timestamp: Timestamp.now(),
            imageUri: selectedUri,
          });
        } catch (dbErr) {
          console.error('[Scan DB Error] Could not save live results:', dbErr);
        }
      }

      setAnalysisData(liveResult);
      setShowResult(true);
    } catch (error: any) {
      console.error('[Scan Live Engine Error] Failed processing chart:', error);
      setScanError(error.message || 'Analysis failed: Could not locate key ticker metrics or process chart patterns.');
    } finally {
      setIsLoading(false);
    }
  };

  // Selection from records tab
  const handleSelectHistoryItem = (item: any) => {
    const transformed = transformHistoryItem(item);
    setAnalysisData(transformed);
    setShowResult(true);
    setActiveTab('scan');
  };

  // Render Premium Finelo PowerPoint-style Report
  const renderFineloReport = () => {
    if (!analysisData) return null;

    const actionColor = 
      analysisData.action === 'BUY' ? C.green : 
      analysisData.action === 'SELL' ? C.red : 
      C.amber;
    
    const score = analysisData.actionScore || 3;

    return (
      <ScrollView 
        style={styles.reportContainer} 
        contentContainerStyle={styles.reportContent}
        showsVerticalScrollIndicator={false}
      >
        {/* BACK NAVIGATION */}
        <View style={styles.reportHeader}>
          <TouchableOpacity 
            onPress={() => {
              setShowResult(false);
              setAnalysisData(null);
              setUploadedImage(null);
            }} 
            style={styles.backBtn}
          >
            <ArrowLeft size={24} color={C.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.reportHeaderTitle}>Finelo AI Report Insights</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* POWERPOINT TITLE HEADER */}
        <View style={styles.reportCard}>
          <Text style={styles.reportAssetLabel}>ASSET IDENTIFICATION</Text>
          <View style={styles.reportTitleRow}>
            <Text style={styles.reportAssetName}>{analysisData.assetName}</Text>
            <Text style={styles.reportAssetPrice}>{analysisData.currentPrice}</Text>
          </View>
        </View>

        {/* ANALYST APPRAISAL BADGE */}
        <View style={styles.reportCard}>
          <Text style={styles.cardSectionLabel}>ANALYST REVIEW</Text>
          <View style={styles.appraisalRow}>
            <View style={[styles.appraisalCircle, { backgroundColor: actionColor }]}>
              <Text style={styles.appraisalCircleText}>{analysisData.action}</Text>
            </View>
            <View style={styles.gaugeContainer}>
              <Text style={styles.gaugeLabel}>Confidence Evaluation Gauge</Text>
              <View style={styles.gaugeBars}>
                {[1, 2, 3, 4].map((barIndex) => (
                  <View 
                    key={barIndex} 
                    style={[
                      styles.gaugeBar, 
                      { backgroundColor: barIndex <= score ? actionColor : '#E2E8F0' }
                    ]} 
                  />
                ))}
              </View>
              <Text style={styles.gaugeSubtext}>Strength Matrix Score: {score}/4</Text>
            </View>
          </View>
        </View>

        {/* KEY STATS SLIDES (2-Column Flex Grid) */}
        <View style={styles.keyStatsGrid}>
          {/* Trend Card */}
          <View style={[styles.reportCard, styles.halfCard, { backgroundColor: C.greenLight, overflow: 'hidden' }]}>
            <Text style={styles.cardSectionLabel}>TREND</Text>
            <Text style={styles.trendText}>{analysisData.trend}</Text>
            <View style={styles.activityIconWrapper}>
              <TrendingUp size={28} color={C.green} />
            </View>
          </View>

          {/* Volatility Card */}
          <View style={[styles.reportCard, styles.halfCard]}>
            <Text style={styles.cardSectionLabel}>VOLATILITY</Text>
            <Text style={styles.volatilityText}>{analysisData.volatility}</Text>
            <View style={styles.activityIconWrapper}>
              <Activity size={28} color={C.accent} />
            </View>
          </View>
        </View>

        {/* BOUNDARY CHANNELS CONTAINER */}
        <View style={styles.reportCard}>
          <Text style={styles.cardSectionLabel}>BOUNDARY CHANNELS</Text>
          <View style={styles.boundaryWrapper}>
            <View style={styles.resistanceLabelWrapper}>
              <Text style={styles.boundaryLabelMuted}>Resistance Ceiling</Text>
              <Text style={[styles.boundaryValue, { color: C.red }]}>{analysisData.resistance}</Text>
            </View>
            
            {/* Custom bridging line layout */}
            <View style={styles.boundaryBridgeLine}>
              <View style={styles.boundaryBridgeDotLeft} />
              <View style={styles.boundaryBridgeDotRight} />
            </View>

            <View style={styles.supportLabelWrapper}>
              <Text style={styles.boundaryLabelMuted}>Support Floor</Text>
              <Text style={[styles.boundaryValue, { color: C.green }]}>{analysisData.support}</Text>
            </View>
          </View>
        </View>

        {/* PROBABILITY HIGHLIGHT PILL */}
        <View style={styles.probabilityPill}>
          <Text style={styles.probabilityLabel}>Scenario Probability</Text>
          <Text style={styles.probabilityValueText}>{analysisData.probability}</Text>
        </View>

        {/* THE AI INSIGHTS SUMMATION */}
        <View style={styles.insightsCard}>
          <View style={styles.insightsHeader}>
            <Sparkles size={20} color="#8B5CF6" />
            <Text style={styles.insightsTitle}>AI Insights Summation</Text>
          </View>
          <Text style={styles.insightsText}>{analysisData.summary}</Text>
        </View>

        {/* TARGET SCENARIO MATRICES */}
        <View style={styles.reportCard}>
          <Text style={styles.cardSectionLabel}>TARGET HORIZONS</Text>
          <View style={styles.targetsDeck}>
            <View style={styles.targetColumn}>
              <Text style={styles.targetColHeader}>Short-Term</Text>
              <View style={[styles.targetChip, { backgroundColor: '#EFF6FF' }]}>
                <Text style={[styles.targetChipText, { color: '#1D4ED8' }]}>{analysisData.shortTermTarget}</Text>
              </View>
            </View>
            <View style={styles.targetColumn}>
              <Text style={styles.targetColHeader}>Mid-Term</Text>
              <View style={[styles.targetChip, { backgroundColor: '#FEF3C7' }]}>
                <Text style={[styles.targetChipText, { color: '#D97706' }]}>{analysisData.midTermTarget}</Text>
              </View>
            </View>
            <View style={styles.targetColumn}>
              <Text style={styles.targetColHeader}>Long-Term</Text>
              <View style={[styles.targetChip, { backgroundColor: '#ECFDF5' }]}>
                <Text style={[styles.targetChipText, { color: '#059669' }]}>{analysisData.longTermTarget}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* TRIGGER EVENTS ROWS */}
        <View style={styles.reportCard}>
          <Text style={styles.cardSectionLabel}>KEY CATALYST TRIGGERS</Text>
          <View style={styles.rowsContainer}>
            {analysisData.triggers.map((trigger, idx) => (
              <View key={idx} style={styles.rowItem}>
                <Text style={styles.rowText}>{trigger}</Text>
                <Zap size={16} color={C.green} />
              </View>
            ))}
          </View>
        </View>

        {/* SYSTEMIC RISKS ROWS */}
        <View style={styles.reportCard}>
          <Text style={styles.cardSectionLabel}>SYSTEMIC RISK FACTORS</Text>
          <View style={styles.rowsContainer}>
            {analysisData.risks.map((risk, idx) => (
              <View key={idx} style={styles.rowItem}>
                <Text style={styles.rowText}>{risk}</Text>
                <AlertCircle size={16} color={C.red} />
              </View>
            ))}
          </View>
        </View>

        {/* DISCLAIMER FOOTER */}
        <Text style={styles.reportDisclaimer}>
          Disclaimer: This is an AI-generated analysis response. Trading financial products involves high risk. Results are not guaranteed.
        </Text>
      </ScrollView>
    );
  };

  // PREMIUM LOADING STATE VIEW
  if (isLoading) {
    const loadingMessage = 
      selectedTool.id === 'fed' ? "Federal Macro-Pulse Engine reading macroeconomic matrices..." :
      selectedTool.id === 'bank' ? "Bank Alpha-Whale Scanner tracking institutional liquidity..." :
      "Crypto Momentum Engine calculating high-frequency volatility...";

    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]} edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingWrapper}>
          <Animated.Image
            source={require('../../assets/images/mascots/shiba.png')}
            style={[styles.loadingMascot, { transform: [{ scale: loadingPulseAnim }] }]}
          />
          <ActivityIndicator size="large" color={C.accent} style={{ marginVertical: 24 }} />
          <Text style={styles.loadingText}>{loadingMessage}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Tab Navigation header bar (hide when showing results) */}
      {!showResult && (
        <View style={styles.tabNav}>
          <TouchableOpacity 
            onPress={() => setActiveTab('scan')} 
            style={[styles.tab, activeTab === 'scan' && styles.tabActive]}
          >
            <Text style={[styles.tabLabel, activeTab === 'scan' && styles.tabLabelActive]}>Analyzer</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setActiveTab('history')} 
            style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          >
            <Text style={[styles.tabLabel, activeTab === 'history' && styles.tabLabelActive]}>Records</Text>
          </TouchableOpacity>
        </View>
      )}

      {showResult && analysisData && activeTab === 'scan' ? (
        renderFineloReport()
      ) : (
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
                  <TouchableOpacity onPress={() => setScanError(null)} style={styles.dismissBtn}>
                    <Text style={styles.dismissText}>Reset Selector</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              // Original Selector View wrapped inside if(!showResult && !isLoading)
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
                      <TouchableOpacity 
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
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Animated.View style={{ transform: [{ scale: pulseAnim }], marginTop: 24 }}>
                    <TouchableOpacity onPress={executeScan} style={styles.scanBtn}>
                      <Scan color="#FFF" size={20} />
                      <Text style={styles.scanBtnText}>Analyze Chart</Text>
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              </View>
            )
          ) : (
            // Records List View
            <View style={styles.history}>
              {history.map(item => (
                <TouchableOpacity 
                  key={item.id} 
                  style={styles.historyCard} 
                  onPress={() => handleSelectHistoryItem(item)}
                >
                  <View style={styles.historyIcon}>
                    <ToolIcon 
                      iconName={SCAN_TOOLS.find(t => t.id === item.scanCategory)?.icon || 'scan'} 
                      active={false} 
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 15 }}>
                    <Text style={styles.historyTitle}>
                      {item.assetName || item.presentationSlides?.[0]?.slideHeading || 'Analysis'}
                    </Text>
                    <Text style={styles.historyMeta}>
                      {(item.scanCategory || 'crypto').toUpperCase()} • COMPLETED
                    </Text>
                  </View>
                  <ChevronRight color={C.textSecondary} size={20} />
                </TouchableOpacity>
              ))}
              {history.length === 0 && (
                <View style={styles.emptyHistory}>
                  <Text style={styles.emptyHistoryText}>No records found yet.</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  tabNav: { flexDirection: 'row', padding: 12, gap: 10 },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.border },
  tabActive: { backgroundColor: C.accent, borderColor: C.accent },
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
    shadowOpacity: 0.03, 
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
  sectionLabelMuted: { color: C.textSecondary, fontSize: 9, fontWeight: '900', letterSpacing: 0.8, marginBottom: 12 },
  
  toolStack: { gap: 6 },
  toolRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 14, backgroundColor: C.bg, borderWidth: 1, borderColor: 'transparent' },
  toolRowActive: { borderColor: C.accent, backgroundColor: '#FFFFFF' },
  toolIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  toolIconActive: { backgroundColor: 'rgba(29, 78, 216, 0.06)' },
  toolName: { color: C.textPrimary, fontSize: 13, fontWeight: '800' },
  toolFocus: { color: C.textSecondary, fontSize: 10, marginTop: 1 },
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
    shadowOpacity: 0.03, 
    shadowRadius: 12, 
    elevation: 3 
  },
  errorHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  errorEmoji: { fontSize: 28 },
  errorTitle: { color: C.textPrimary, fontSize: 16, fontWeight: '800' },

  dismissBtn: { marginHorizontal: 0, marginTop: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: C.bg, borderRadius: 14, borderWidth: 1, borderColor: C.border },
  dismissText: { color: C.textPrimary, fontWeight: '800', fontSize: 13 },

  history: { paddingHorizontal: 20, marginTop: 10 },
  historyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  historyIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  historyTitle: { color: C.textPrimary, fontSize: 14, fontWeight: '800' },
  historyMeta: { color: C.textSecondary, fontSize: 10, marginTop: 4, fontWeight: '700' },
  emptyHistory: { alignItems: 'center', padding: 40 },
  emptyHistoryText: { color: C.textSecondary, fontSize: 14, fontWeight: '600' },

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

  // LOADING STATE STYLING
  loadingContainer: { justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  loadingWrapper: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingMascot: { width: 110, height: 110, resizeMode: 'contain' },
  loadingText: { fontSize: 14, fontWeight: '700', color: C.textSecondary, textAlign: 'center', paddingHorizontal: 24, marginTop: 12, lineHeight: 20 },

  // FINELO POWERPOINT DASHBOARD STYLING
  reportContainer: { flex: 1, backgroundColor: C.bg },
  reportContent: { padding: 16, paddingBottom: 40, gap: 14 },
  reportHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  backBtn: { padding: 8, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.border },
  reportHeaderTitle: { fontSize: 17, fontWeight: '800', color: C.textPrimary },
  
  reportCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: C.border, 
    shadowColor: '#0A1128', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.02, 
    shadowRadius: 8, 
    elevation: 2 
  },
  reportAssetLabel: { color: C.textSecondary, fontSize: 9, fontWeight: '900', letterSpacing: 0.5, marginBottom: 4 },
  reportTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reportAssetName: { fontSize: 20, fontWeight: '800', color: C.textPrimary, flex: 1, marginRight: 8 },
  reportAssetPrice: { fontSize: 24, fontWeight: '900', color: C.accent },
  
  cardSectionLabel: { color: C.textSecondary, fontSize: 9, fontWeight: '900', letterSpacing: 0.5, marginBottom: 12 },
  appraisalRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  appraisalCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  appraisalCircleText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  gaugeContainer: { flex: 1, gap: 2 },
  gaugeLabel: { fontSize: 12, fontWeight: '700', color: C.textPrimary },
  gaugeBars: { flexDirection: 'row', gap: 6, marginVertical: 6 },
  gaugeBar: { height: 8, flex: 1, borderRadius: 4 },
  gaugeSubtext: { fontSize: 10, fontWeight: '700', color: C.textSecondary },

  keyStatsGrid: { flexDirection: 'row', gap: 12 },
  halfCard: { flex: 1, height: 124 },
  trendText: { fontSize: 14, fontWeight: '800', color: C.textPrimary, zIndex: 2 },
  volatilityText: { fontSize: 14, fontWeight: '800', color: C.textPrimary },
  activityIconWrapper: { marginTop: 12, alignItems: 'flex-start' },

  boundaryWrapper: { height: 96, justifyContent: 'space-between', paddingVertical: 2 },
  resistanceLabelWrapper: { alignItems: 'flex-end' },
  supportLabelWrapper: { alignItems: 'flex-start' },
  boundaryLabelMuted: { color: C.textSecondary, fontSize: 9, fontWeight: '700', marginBottom: 2 },
  boundaryValue: { fontSize: 15, fontWeight: '900' },
  boundaryBridgeLine: { height: 1, backgroundColor: '#CBD5E1', marginVertical: 6, position: 'relative' },
  boundaryBridgeDotLeft: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green, position: 'absolute', left: 0, top: -2.5 },
  boundaryBridgeDotRight: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.red, position: 'absolute', right: 0, top: -2.5 },

  probabilityPill: { 
    backgroundColor: C.accentLight, 
    borderWidth: 1.5, 
    borderColor: C.accentBorder, 
    borderRadius: 16, 
    padding: 16, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  probabilityLabel: { fontSize: 13, fontWeight: '800', color: C.accent },
  probabilityValueText: { fontSize: 24, fontWeight: '900', color: '#1E40AF' },

  insightsCard: { 
    backgroundColor: C.purpleLight, 
    borderRadius: 16, 
    padding: 16, 
    borderWidth: 1.5, 
    borderColor: C.purpleBorder, 
    shadowColor: '#0A1128', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.02, 
    shadowRadius: 8, 
    elevation: 2 
  },
  insightsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  insightsTitle: { fontSize: 14, fontWeight: '800', color: '#6D28D9' },
  insightsText: { fontSize: 12, lineHeight: 18, color: C.textPrimary, fontWeight: '600' },

  targetsDeck: { flexDirection: 'row', gap: 10 },
  targetColumn: { flex: 1, alignItems: 'center', gap: 6 },
  targetColHeader: { fontSize: 10, fontWeight: '800', color: C.textSecondary },
  targetChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, width: '100%', alignItems: 'center' },
  targetChipText: { fontSize: 12, fontWeight: '900' },

  rowsContainer: { gap: 4 },
  rowItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 10, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F1F5F9' 
  },
  rowText: { fontSize: 12, fontWeight: '700', color: C.textPrimary, flex: 1, marginRight: 12 },
  reportDisclaimer: { fontSize: 10, color: C.textSecondary, textAlign: 'center', marginTop: 12, lineHeight: 14, paddingHorizontal: 16 }
});