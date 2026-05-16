import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
  LogBox,
  Alert,
} from 'react-native';

// Task 1: Permanently kill 'topSvgLayout' crashes
LogBox.ignoreLogs(['Unsupported top level event type "topSvgLayout"']);

import { FlashList } from '@shopify/flash-list';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Clock, 
  ArrowRight,
  Sparkles,
  ShieldCheck,
  ChevronLeft,
  CheckCircle2,
  Trash2,
} from 'lucide-react-native';

import { useAuth } from '@/src/context/AuthContext';
import { 
  ScannedAnalysisRecord, 
  subscribeToScannedAnalyses, 
  deleteScannedAnalysis 
} from '@/src/services/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * ARCHITECT NOTE: Safe-Style System
 * Synchronized with Scan page. No SVGs, pure Flexbox + Emojis.
 */
const MiniPriceBar = ({ color, levels = [0.4, 0.7, 0.5, 0.9] }: { color: string; levels?: number[] }) => (
  <View style={styles.miniBarRow}>
    {levels.map((lvl, i) => (
      <View 
        key={i} 
        style={[
          styles.miniBar, 
          { height: 16 * lvl + 4, backgroundColor: color, opacity: 0.2 + (i * 0.1) }
        ]} 
      />
    ))}
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

const HistoryCard = ({ 
  item, 
  onPress, 
  onDelete 
}: { 
  item: ScannedAnalysisRecord; 
  onPress: () => void;
  onDelete: () => void;
}) => {
  // Task 2: Align Firestore fields for Sentiment & Confidence
  const sentiment = item.sentiment || item.trend || 'neutral';
  const confidence = item.confidence !== undefined ? item.confidence : (item.probability || 0);

  const isBullish = sentiment === 'bullish';
  const isBearish = sentiment === 'bearish';
  
  const config = isBullish 
    ? { emoji: '🐂', color: '#34C759', label: 'BULLISH' }
    : isBearish 
    ? { emoji: '🐻', color: '#FF3B30', label: 'BEARISH' }
    : { emoji: '🛡️', color: '#8E8E93', label: 'NEUTRAL' };

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.cardWrapper, pressed && { opacity: 0.9 }]}>
      <View style={styles.glassBackground} />
      
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={[styles.emojiBadge, { backgroundColor: config.color + '10' }]}>
            <Text style={styles.cardEmoji}>{config.emoji}</Text>
          </View>
          
          <View style={styles.cardTitleBox}>
            <Text style={styles.cardAssetName} numberOfLines={1}>
              {item.assetName || 'Market Asset'}
            </Text>
            <View style={styles.cardMetaRow}>
              <Clock size={10} color="#9CA3AF" />
              <Text style={styles.cardDate}>
                {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </Text>
            </View>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            {/* Task 3: Add Firestore Delete Feature */}
            <Pressable 
              onPress={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
            >
              <Trash2 size={16} color="#9CA3AF" />
            </Pressable>
            
            <View style={[styles.confidenceBadge, { backgroundColor: config.color + '15', marginTop: 8 }]}>
              <Text style={[styles.confidenceText, { color: config.color }]}>
                {confidence}%
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <Text style={[styles.footerTrend, { color: config.color }]}>{config.label}</Text>
            <MiniPriceBar color={config.color} />
          </View>
          <View style={styles.viewBtn}>
            <ArrowRight size={14} color="#6B7280" />
          </View>
        </View>
      </View>
    </Pressable>
  );
};

export default function HistoryScreen() {
  const { user } = useAuth();
  const [history, setHistory] = useState<ScannedAnalysisRecord[]>([]);
  const [selectedScan, setSelectedScan] = useState<ScannedAnalysisRecord | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = subscribeToScannedAnalyses(user.uid, (results) => {
      setHistory(results);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const handleDelete = (item: ScannedAnalysisRecord) => {
    Alert.alert(
      'Delete Analysis',
      'Are you sure you want to remove this intelligence report? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            if (user?.uid) {
              try {
                // Task 3: Implement Delete feature
                await deleteScannedAnalysis(user.uid, item.id);
                // State updates automatically via subscription
              } catch (error) {
                Alert.alert('Error', 'Failed to delete report.');
              }
            }
          }
        }
      ]
    );
  };

  const getTrendColor = (trend: string) => {
    if (trend === 'bullish') return '#34C759';
    if (trend === 'bearish') return '#FF3B30';
    return '#F59E0B';
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerLabel}>INTELLIGENCE LOG</Text>
          <Text style={styles.headerTitle}>History</Text>
        </View>
        
        {history.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <Clock size={40} color="#E5E7EB" />
            </View>
            <Text style={styles.emptyText}>No Intelligence Logged</Text>
            <Text style={styles.emptySubText}>Your market analyses will appear here once you scan a chart.</Text>
          </View>
        ) : (
          <FlashList
            data={history}
            renderItem={({ item }) => (
              <HistoryCard 
                item={item} 
                onPress={() => setSelectedScan(item)} 
                onDelete={() => handleDelete(item)}
              />
            )}
            estimatedItemSize={140}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <Modal visible={!!selectedScan} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          {selectedScan && (
            <SafeAreaView style={styles.modalContainer} edges={['bottom']}>
              <View style={styles.sheetHeader}>
                <Pressable onPress={() => setSelectedScan(null)} style={styles.closeBtn}>
                  <ChevronLeft color="#111827" size={24} />
                </Pressable>
                <Text style={styles.sheetTitle}>Analysis Details</Text>
                <View style={{ width: 40 }} />
              </View>

              <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
                
                {/* IMAGE PREVIEW REFERENCE */}
                {selectedScan.imageBase64 && (
                  <View style={styles.imageRefContainer}>
                    <Image source={{ uri: `data:image/jpeg;base64,${selectedScan.imageBase64}` }} style={styles.imageRef} resizeMode="cover" />
                    <View style={styles.imageRefOverlay}>
                      <View style={styles.imageRefBadge}>
                        <Text style={styles.imageRefBadgeText}>SAVED SCAN</Text>
                      </View>
                    </View>
                  </View>
                )}

                <View style={styles.detailHero}>
                  <Text style={styles.detailAsset}>{selectedScan.assetName}</Text>
                  <View style={[styles.detailBadge, { backgroundColor: getTrendColor(selectedScan.trend) + '15' }]}>
                    <Text style={[styles.detailBadgeText, { color: getTrendColor(selectedScan.trend) }]}>
                      {selectedScan.trend?.toUpperCase()} • {selectedScan.probability}% CONFIDENCE
                    </Text>
                  </View>
                </View>

                {/* SCENARIO GRID */}
                <View style={styles.scenarioGrid}>
                  <ScenarioItem label="Bullish" emoji="🐂" color="#34C759" isActive={selectedScan.trend === 'bullish'} />
                  <ScenarioItem label="Sideways" emoji="↔️" color="#F59E0B" isActive={selectedScan.trend === 'neutral'} />
                  <ScenarioItem label="Bearish" emoji="🐻" color="#FF3B30" isActive={selectedScan.trend === 'bearish'} />
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>TECHNICAL LEVELS</Text>
                  <View style={styles.textCard}>
                    <View style={styles.srRow}>
                      <View style={styles.srCol}>
                        <Text style={styles.srLabel}>RESISTANCE</Text>
                        {selectedScan.resistance_levels?.map((lvl, i) => (
                          <Text key={i} style={styles.srValue}>₩{lvl}</Text>
                        ))}
                      </View>
                      <View style={styles.srCol}>
                        <Text style={styles.srLabel}>SUPPORT</Text>
                        {selectedScan.support_levels?.map((lvl, i) => (
                          <Text key={i} style={styles.srValue}>₩{lvl}</Text>
                        ))}
                      </View>
                    </View>
                    {selectedScan.key_price_target && (
                      <View style={styles.targetBox}>
                        <Text style={styles.targetLabel}>PRICE TARGET: </Text>
                        <Text style={styles.targetValue}>₩{selectedScan.key_price_target}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>AI INTELLIGENCE</Text>
                  <View style={styles.textCard}>
                    <Text style={styles.detailText}>{selectedScan.analysisText}</Text>
                  </View>
                </View>
              </ScrollView>

              <Pressable style={styles.doneButton} onPress={() => setSelectedScan(null)}>
                <Text style={styles.doneButtonText}>Dismiss</Text>
              </Pressable>
            </SafeAreaView>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAFB',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    paddingVertical: 20,
    marginBottom: 10,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 2,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#111827',
  },
  listContent: {
    paddingBottom: 40,
  },
  cardWrapper: {
    marginBottom: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.7)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFF',
    opacity: 0.8,
  },
  cardContent: {
    padding: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emojiBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardEmoji: {
    fontSize: 24,
  },
  cardTitleBox: {
    flex: 1,
  },
  cardAssetName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardDate: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
    marginLeft: 4,
  },
  deleteBtn: {
    padding: 4,
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  confidenceText: {
    fontSize: 13,
    fontWeight: '800',
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.04)',
    marginVertical: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerTrend: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginRight: 12,
  },
  miniBarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  miniBar: {
    width: 6,
    borderRadius: 3,
    marginRight: 3,
  },
  viewBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 30,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 1,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FAFAFB',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    height: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  sheetScroll: {
    flex: 1,
    paddingHorizontal: 24,
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
  detailHero: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  detailAsset: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  detailBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  detailBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
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
  detailSection: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#9CA3AF',
    letterSpacing: 2,
    marginBottom: 12,
  },
  textCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    marginBottom: 30,
  },
  detailText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 26,
    fontWeight: '500',
  },
  srRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  srCol: {
    flex: 1,
  },
  srLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#9CA3AF',
    marginBottom: 6,
    letterSpacing: 1,
  },
  srValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  targetBox: {
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  targetLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  targetValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#6366F1',
  },
  doneButton: {
    backgroundColor: '#111827',
    marginHorizontal: 24,
    marginBottom: 20,
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
