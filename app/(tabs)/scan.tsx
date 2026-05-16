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
  LogBox,
} from 'react-native';

// Task 1: Permanently kill 'topSvgLayout' crashes
LogBox.ignoreLogs(['Unsupported top level event type "topSvgLayout"']);

import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  History,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Zap
} from 'lucide-react-native';

import { useSubscription } from '@/services/revenuecat';
import { useAuth } from '@/src/context/AuthContext';
import {
  analyzeInvestmentGraph,
  InvestmentAnalysis,
} from '@/src/lib/gemini';

import { saveScannedAnalysis } from '@/src/services/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * ARCHITECT NOTE: Premium Card System
 * institutional-grade UI inspired by Bloomberg and TradingView.
 */
const ReportCard = ({ children, title, icon: Icon, color, style }: { children: React.ReactNode; title?: string; icon?: any; color?: string; style?: any }) => (
  <View style={[styles.reportCard, style]}>
    {title && (
      <View style={styles.cardHeaderRow}>
        <View style={styles.cardTitleGroup}>
          {Icon && <Icon size={16} color={color || '#6B7280'} style={{ marginRight: 8 }} />}
          <Text style={styles.cardHeaderTitle}>{title}</Text>
        </View>
      </View>
    )}
    {children}
  </View>
);

const MiniAreaChart = ({ color, levels = [0.2, 0.5, 0.4, 0.8, 0.7, 0.9] }: { color: string; levels?: number[] }) => (
  <View style={styles.areaChartContainer}>
    <View style={styles.barRow}>
      {levels.map((level, i) => (
        <View 
          key={i} 
          style={[
            styles.areaBar, 
            { 
              height: 30 * level + 10, 
              backgroundColor: color, 
              opacity: 0.1 + (i * 0.15) 
            }
          ]} 
        />
      ))}
    </View>
  </View>
);

const ScenarioItem = ({ 
  label, 
  emoji, 
  color, 
  isActive 
}: { 
  label: string; 
  emoji: string; 
  color: string; 
  isActive: boolean 
}) => (
  <View style={[
    styles.scenarioItem, 
    { borderColor: isActive ? color : '#E2E8F0', backgroundColor: isActive ? color + '08' : '#FFF' }
  ]}>
    <View style={styles.scenarioHeader}>
      <Text style={styles.scenarioEmoji}>{emoji}</Text>
      {isActive && <CheckCircle2 size={14} color={color} />}
    </View>
    <Text style={[styles.scenarioLabel, { color: isActive ? color : '#64748B' }]}>{label}</Text>
    <View style={styles.scenarioIndicatorRow}>
      {[1, 2, 3].map((v) => (
        <View key={v} style={[styles.scenarioIndicator, { backgroundColor: isActive ? color : '#CBD5E1', opacity: 0.3 * v }]} />
      ))}
    </View>
  </View>
);

const AnalysisReport = ({
  analysis,
  scanImage,
  onClose,
}: {
  analysis: InvestmentAnalysis;
  scanImage: string | null;
  onClose: () => void;
}) => {
  const isBullish = analysis.sentiment === 'bullish';
  const isBearish = analysis.sentiment === 'bearish';
  const isNeutral = analysis.sentiment === 'neutral';
  const themeColor = isBullish ? '#34C759' : isBearish ? '#FF3B30' : '#F59E0B';
  
  const probLevel = analysis.probability_score > 70 ? 'High' : analysis.probability_score > 40 ? 'Medium' : 'Low';

  return (
    <View style={styles.reportOverlay}>
      <SafeAreaView style={styles.reportContainer} edges={['top']}>
        <View style={styles.reportHeader}>
          <Pressable onPress={onClose} style={styles.backButton}>
            <ChevronLeft color="#111827" size={24} />
          </Pressable>
          <Text style={styles.reportHeaderTitle}>Report Insights</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.reportScrollContent}>
          
          {/* IMAGE PREVIEW REFERENCE */}
          {scanImage && (
            <View style={styles.imageRefContainer}>
              <Image source={{ uri: `data:image/jpeg;base64,${scanImage}` }} style={styles.imageRef} resizeMode="cover" />
              <View style={styles.imageRefOverlay}>
                <View style={styles.imageRefBadge}>
                  <Text style={styles.imageRefBadgeText}>ORIGINAL SCAN</Text>
                </View>
              </View>
            </View>
          )}

          <Text style={styles.reportAssetName}>{analysis.assetName}</Text>
          
          {/* SCENARIO GRID */}
          <View style={styles.scenarioGrid}>
            <ScenarioItem label="Bullish" emoji="🐂" color="#34C759" isActive={isBullish} />
            <ScenarioItem label="Sideways" emoji="↔️" color="#F59E0B" isActive={isNeutral} />
            <ScenarioItem label="Bearish" emoji="🐻" color="#FF3B30" isActive={isBearish} />
          </View>

          <View style={styles.cardGrid}>
            {/* SENTIMENT CARD */}
            <ReportCard title="Sentiment" icon={TrendingUp} color={themeColor} style={{ width: '48%' }}>
              <View style={styles.sentimentContent}>
                <View>
                  <Text style={[styles.sentimentValue, { color: themeColor }]}>
                    {analysis.sentiment.toUpperCase()}
                  </Text>
                  <Text style={styles.sentimentEmoji}>{isBullish ? '📈' : isBearish ? '📉' : '📊'}</Text>
                </View>
                <MiniAreaChart color={themeColor} />
              </View>
            </ReportCard>

            {/* PROBABILITY CARD */}
            <ReportCard title="Confidence" icon={Star} color="#F59E0B" style={{ width: '48%' }}>
              <View style={styles.probContent}>
                <Text style={styles.probPercent}>{analysis.probability_score}%</Text>
                <View style={[styles.probBadge, { backgroundColor: '#F59E0B15' }]}>
                  <Text style={styles.probBadgeText}>{probLevel}</Text>
                </View>
              </View>
            </ReportCard>
          </View>

          {/* S&R CARD */}
          <ReportCard title="Levels & Structure" icon={BarChart3} color="#6366F1">
            <View style={styles.srContent}>
              <View style={styles.srColumn}>
                <Text style={styles.srLabel}>RESISTANCE</Text>
                {(analysis.resistance_levels || []).map((lvl, i) => (
                  <Text key={i} style={styles.srValue}>₩{lvl}</Text>
                ))}
              </View>
              <View style={styles.srDivider} />
              <View style={styles.srColumn}>
                <Text style={styles.srLabel}>SUPPORT</Text>
                {(analysis.support_levels || []).map((lvl, i) => (
                  <Text key={i} style={styles.srValue}>₩{lvl}</Text>
                ))}
              </View>
            </View>
            <View style={styles.targetRow}>
              <Target size={16} color="#6366F1" />
              <Text style={styles.targetLabel}>KEY TARGET: </Text>
              <Text style={styles.targetValue}>₩{analysis.key_price_target}</Text>
            </View>
          </ReportCard>

          {/* SUMMARY CARD */}
          <ReportCard title="Market Summary" icon={Sparkles} color="#7C3AED">
            <View style={styles.summaryContent}>
              <Text style={styles.summaryText}>{analysis.detailed_analysis}</Text>
            </View>
          </ReportCard>

          <Pressable onPress={onClose} style={styles.doneButton}>
            <Text style={styles.doneButtonText}>Finish Analysis</Text>
            <ArrowRight size={20} color="#FFF" style={{ marginLeft: 8 }} />
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default function ScanScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isPro, purchase } = useSubscription(user?.uid);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<InvestmentAnalysis | null>(null);
  const [lastScanImage, setLastScanImage] = useState<string | null>(null);

  const safeHaptic = async (type: 'impact' | 'notification' = 'impact') => {
    try {
      const Haptics = require('expo-haptics');
      if (type === 'impact') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {}
  };

  const handleScan = async () => {
    if (!isPro) {
      Alert.alert('Pro Insight Required', 'Visual chart intelligence is a premium feature.', [
        { text: 'Later', style: 'cancel' },
        { text: 'Upgrade', onPress: purchase },
      ]);
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]?.base64) {
        setLoading(true);
        setLastScanImage(result.assets[0].base64);
        await safeHaptic('impact');

        const aiResult = await analyzeInvestmentGraph(result.assets[0].base64);

        if (user?.uid) {
          // Task 2: Align Firestore fields for Sentiment & Confidence
          await saveScannedAnalysis(user.uid, {
            title: `${aiResult.sentiment === 'bullish' ? '📈' : '📉'} ${aiResult.assetName}`,
            assetName: aiResult.assetName,
            trend: aiResult.sentiment as any,
            probability: aiResult.probability_score,
            sentiment: aiResult.sentiment, // New aligned field
            confidence: aiResult.probability_score, // New aligned field
            analysisText: aiResult.detailed_analysis,
            chartData: JSON.stringify(aiResult.chartData || []),
            assetKind: 'other',
            imageBase64: result.assets[0].base64,
            resistance_levels: aiResult.resistance_levels,
            support_levels: aiResult.support_levels,
            key_price_target: aiResult.key_price_target,
          });
        }

        setAnalysis(aiResult);
        await safeHaptic('notification');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      Alert.alert('Engine Error', 'The analysis engine failed to process the image.');
    } finally {
      setLoading(false);
    }
  };

  if (analysis) {
    return <AnalysisReport analysis={analysis} scanImage={lastScanImage} onClose={() => {
      setAnalysis(null);
      setLastScanImage(null);
    }} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerLabel}>MONAI ARCHITECT</Text>
            <Text style={styles.headerTitle}>Chart Insight</Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable onPress={() => router.push('/history')} style={styles.historyBtn}>
              <History size={22} color="#111827" />
            </Pressable>

            <View style={[styles.statusBadge, { backgroundColor: isPro ? '#F0F9FF' : '#F9FAFB' }]}>
              <View style={[styles.statusDot, { backgroundColor: isPro ? '#0EA5E9' : '#9CA3AF' }]} />
              <Text style={[styles.statusText, { color: isPro ? '#0369A1' : '#4B5563' }]}>
                {isPro ? 'Pro' : 'Free'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.heroBox}>
          <View style={styles.heroIconAura}>
            <View style={styles.heroGlow} />
            <View style={styles.heroMainIcon}>
              <BarChart3 size={48} color="#0EA5E9" strokeWidth={1.5} />
            </View>
          </View>

          <Text style={styles.heroHeadline}>Institutional Analysis</Text>
          <Text style={styles.heroSubline}>Our AI engine identifies institutional technical patterns and price levels.</Text>

          <Pressable onPress={handleScan} disabled={loading} style={styles.mainActionBtn}>
            <View style={styles.btnContent}>
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.btnText}>Start Intelligence Scan</Text>
                  <Zap size={18} color="#FFF" fill="#FFF" style={{ marginLeft: 8 }} />
                </>
              )}
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  heroBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  heroIconAura: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  heroGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#0EA5E9',
    opacity: 0.1,
  },
  heroMainIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  heroHeadline: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  heroSubline: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  mainActionBtn: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 16,
  },
  btnContent: {
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  reportOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F8FAFC',
    zIndex: 1000,
  },
  reportContainer: {
    flex: 1,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reportHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  reportScrollContent: {
    padding: 20,
  },
  imageRefContainer: {
    width: '100%',
    height: 180,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFF',
  },
  imageRef: {
    width: '100%',
    height: '100%',
  },
  imageRefOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 12,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  imageRefBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  imageRefBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1,
  },
  reportAssetName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 20,
    textAlign: 'center',
  },
  scenarioGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  scenarioItem: {
    width: (SCREEN_WIDTH - 60) / 3,
    padding: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  scenarioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  scenarioEmoji: {
    fontSize: 20,
  },
  scenarioLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
  },
  scenarioIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scenarioIndicator: {
    width: 12,
    height: 3,
    borderRadius: 2,
    marginHorizontal: 1,
  },
  cardGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  reportCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sentimentContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sentimentValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  sentimentEmoji: {
    fontSize: 24,
    marginTop: 4,
  },
  areaChartContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 40,
  },
  areaBar: {
    width: 6,
    borderRadius: 3,
    marginHorizontal: 2,
  },
  probContent: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  probPercent: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  probBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  probBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F59E0B',
  },
  srContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  srColumn: {
    flex: 1,
  },
  srDivider: {
    width: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 20,
  },
  srLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
    marginBottom: 8,
    letterSpacing: 1,
  },
  srValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
  },
  targetLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginLeft: 8,
  },
  targetValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#6366F1',
  },
  summaryContent: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 16,
  },
  summaryText: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 24,
    fontWeight: '500',
  },
  doneButton: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 40,
  },
  doneButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
