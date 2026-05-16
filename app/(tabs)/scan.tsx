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

import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  Sparkles,
  History,
  Zap,
  TrendingUp,
  BarChart3,
  Star,
  Target,
  ArrowRight,
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
const ReportCard = ({ children, title, icon: Icon, color }: { children: React.ReactNode; title?: string; icon?: any; color?: string }) => (
  <View style={styles.reportCard}>
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

const AnalysisReport = ({
  analysis,
  onClose,
}: {
  analysis: InvestmentAnalysis;
  onClose: () => void;
}) => {
  const isBullish = analysis.sentiment === 'bullish';
  const isBearish = analysis.sentiment === 'bearish';
  const themeColor = isBullish ? '#34C759' : isBearish ? '#FF3B30' : '#8E8E93';
  
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
          <Text style={styles.reportAssetName}>{analysis.assetName}</Text>
          
          <View style={styles.cardGrid}>
            {/* SENTIMENT CARD */}
            <ReportCard title="Sentiment" icon={TrendingUp} color={themeColor}>
              <View style={styles.sentimentContent}>
                <View>
                  <Text style={[styles.sentimentValue, { color: themeColor }]}>
                    {analysis.sentiment.toUpperCase()}
                  </Text>
                  <Text style={styles.sentimentEmoji}>{isBullish ? '📈' : isBearish ? '📉' : '🛡️'}</Text>
                </View>
                <MiniAreaChart color={themeColor} />
              </View>
            </ReportCard>

            {/* PROBABILITY CARD */}
            <ReportCard title="Confidence" icon={Star} color="#F59E0B">
              <View style={styles.probContent}>
                <Text style={styles.probPercent}>{analysis.probability_score}%</Text>
                <View style={[styles.probBadge, { backgroundColor: '#F59E0B15' }]}>
                  <Text style={styles.probBadgeText}>{probLevel} Confidence</Text>
                </View>
              </View>
            </ReportCard>
          </View>

          {/* S&R CARD */}
          <ReportCard title="Levels & Structure" icon={BarChart3} color="#6366F1">
            <View style={styles.srContent}>
              <View style={styles.srColumn}>
                <Text style={styles.srLabel}>RESISTANCE</Text>
                {analysis.resistance_levels.map((lvl, i) => (
                  <Text key={i} style={styles.srValue}>₩{lvl}</Text>
                ))}
              </View>
              <View style={styles.srDivider} />
              <View style={styles.srColumn}>
                <Text style={styles.srLabel}>SUPPORT</Text>
                {analysis.support_levels.map((lvl, i) => (
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
        await safeHaptic('impact');

        const aiResult = await analyzeInvestmentGraph(result.assets[0].base64);

        if (user?.uid) {
          await saveScannedAnalysis(user.uid, {
            title: `${aiResult.sentiment === 'bullish' ? '📈' : '📉'} ${aiResult.assetName}`,
            assetName: aiResult.assetName,
            trend: aiResult.sentiment,
            probability: aiResult.probability_score,
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
    return <AnalysisReport analysis={analysis} onClose={() => setAnalysis(null)} />;
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
  reportAssetName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 24,
    textAlign: 'center',
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
    width: '100%',
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
    fontSize: 20,
    fontWeight: '900',
  },
  sentimentEmoji: {
    fontSize: 32,
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
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
  },
  probBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  probBadgeText: {
    fontSize: 11,
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
