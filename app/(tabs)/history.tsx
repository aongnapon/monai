import { useEffect, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, TrendingDown, TrendingUp, Minus } from 'lucide-react-native';
import { LineChart } from 'react-native-wagmi-charts';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/src/context/AuthContext';
import { ScannedAnalysisRecord, subscribeToScannedAnalyses } from '@/src/services/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

  const getTrendColor = (trend: string) => {
    if (trend === 'bullish') return '#34C759';
    if (trend === 'bearish') return '#FF3B30';
    return '#8E8E93';
  };

  const renderTrendIcon = (trend: string) => {
    const color = getTrendColor(trend);
    if (trend === 'bullish') return <TrendingUp size={16} color={color} />;
    if (trend === 'bearish') return <TrendingDown size={16} color={color} />;
    return <Minus size={16} color={color} />;
  };

  const renderItem = ({ item }: { item: ScannedAnalysisRecord }) => (
    <Pressable 
      onPress={() => setSelectedScan(item)}
      style={({ pressed }) => [styles.cardContainer, pressed && styles.pressed]}
    >
      <BlurView intensity={20} tint="light" style={styles.cardBlur}>
        <View style={styles.cardHeader}>
          <View style={styles.assetInfo}>
            <Text style={styles.assetNameText}>{item.assetName || 'Unknown Asset'}</Text>
            <View style={[styles.miniTrendBadge, { backgroundColor: getTrendColor(item.trend) + '20' }]}>
              {renderTrendIcon(item.trend)}
              <Text style={[styles.miniTrendText, { color: getTrendColor(item.trend) }]}>
                {(item.trend || 'neutral').toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.dateText}>
            {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </Text>
        </View>
        
        <Text style={styles.previewText} numberOfLines={2}>
          {item.analysisText}
        </Text>
        
        <View style={styles.cardFooter}>
          <Text style={styles.viewDetailsText}>View Analysis</Text>
          <ChevronRight size={16} color="#8E8E93" />
        </View>
      </BlurView>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>History</Text>
        
        {history.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No scans yet.</Text>
            <Text style={styles.emptySubText}>Your financial analyses will appear here.</Text>
          </View>
        ) : (
          <FlashList
            data={history}
            renderItem={renderItem}
            estimatedItemSize={140}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <Modal visible={!!selectedScan} transparent animationType="slide" onRequestClose={() => setSelectedScan(null)}>
        <View style={styles.sheetBackdrop}>
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          {selectedScan && (
            <View style={styles.sheetContainer}>
              <View style={styles.sheetHandle} />
              
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.detailAssetName}>{selectedScan.assetName || 'Analysis Result'}</Text>
                  <View style={[styles.trendBadge, { backgroundColor: getTrendColor(selectedScan.trend) + '20' }]}>
                    <View style={[styles.trendDot, { backgroundColor: getTrendColor(selectedScan.trend) }]} />
                    <Text style={[styles.trendText, { color: getTrendColor(selectedScan.trend) }]}>
                      {(selectedScan.trend || 'neutral').toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Pressable style={styles.sheetCloseIcon} onPress={() => setSelectedScan(null)}>
                  <Text style={styles.closeIconText}>✕</Text>
                </Pressable>
              </View>

              {selectedScan.chartData && (
                <View style={styles.chartContainer}>
                  <LineChart.Provider data={JSON.parse(selectedScan.chartData)}>
                    <LineChart width={SCREEN_WIDTH - 36} height={120}>
                      <LineChart.Path color={getTrendColor(selectedScan.trend)} width={2}>
                        <LineChart.Gradient color={getTrendColor(selectedScan.trend)} opacity={0.2} />
                      </LineChart.Path>
                      <LineChart.CursorCrosshair 
                        onActivated={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                        onEnded={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                      />
                    </LineChart>
                  </LineChart.Provider>
                </View>
              )}

              <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.sheetBody}>{selectedScan.analysisText}</Text>
              </ScrollView>

              <Pressable style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]} onPress={() => setSelectedScan(null)}>
                <Text style={styles.closeButtonText}>Done</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 20,
  },
  listContent: {
    paddingBottom: 20,
  },
  cardContainer: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  cardBlur: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  assetInfo: {
    flex: 1,
  },
  assetNameText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  miniTrendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniTrendText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  dateText: {
    fontSize: 13,
    color: '#8E8E93',
  },
  previewText: {
    fontSize: 14,
    color: '#3A3A3C',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 12,
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingBottom: 24,
    paddingTop: 10,
    minHeight: '60%',
    maxHeight: '90%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#E5E5EA',
    marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  detailAssetName: {
    color: '#000000',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sheetCloseIcon: {
    padding: 8,
  },
  closeIconText: {
    fontSize: 20,
    color: '#8E8E93',
  },
  chartContainer: {
    height: 140,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    flex: 1,
    marginBottom: 16,
  },
  sheetBody: {
    color: '#1C1C1E',
    lineHeight: 24,
    fontSize: 16,
  },
  closeButton: {
    backgroundColor: '#000000',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
