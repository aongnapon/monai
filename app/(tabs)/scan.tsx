import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock } from 'lucide-react-native';
import { LineChart } from 'react-native-wagmi-charts';
import * as Haptics from 'expo-haptics';

import { useSubscription } from '@/services/revenuecat';
import { useAuth } from '@/src/context/AuthContext';
import { analyzeInvestmentGraph } from '@/src/lib/gemini';
import { getDailyScanCount, incrementDailyScanCount, saveScannedAnalysis, Trend } from '../../src/services/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function inferAssetKind(text: string): 'stock' | 'crypto' | 'commodity' | 'other' {
  const lowerCase = text.toLowerCase();
  if (lowerCase.includes('crypto') || lowerCase.includes('bitcoin') || lowerCase.includes('eth')) {
    return 'crypto';
  }
  if (lowerCase.includes('gold') || lowerCase.includes('oil') || lowerCase.includes('commodity')) {
    return 'commodity';
  }
  if (lowerCase.includes('stock') || lowerCase.includes('equity') || lowerCase.includes('share')) {
    return 'stock';
  }
  return 'other';
}

export default function ScanScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isPro, isLoading: subscriptionLoading, purchase, refresh } = useSubscription(user?.uid);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [resultText, setResultText] = useState('');
  const [trend, setTrend] = useState<Trend>('neutral');
  const [chartData, setChartData] = useState<any[]>([]);
  const [assetName, setAssetName] = useState('');
  const [todayCount, setTodayCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showResultSheet, setShowResultSheet] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setTodayCount(0);
      return;
    }

    getDailyScanCount(user.uid)
      .then(setTodayCount)
      .catch(() => setTodayCount(0));
  }, [user?.uid]);

  const handleUpgrade = async () => {
    try {
      const unlocked = await purchase();
      if (unlocked) {
        setShowPaywall(false);
        await refresh();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not complete purchase.';
      Alert.alert('Upgrade to Pro', message);
    }
  };

  const handlePickAndAnalyze = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (!isPro) {
      setShowPaywall(true);
      return;
    }

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission required', 'Enable photo library access to scan financial charts.');
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
        base64: true,
      });

      if (pickerResult.canceled) {
        return;
      }

      const selectedAsset = pickerResult.assets[0];
      if (!selectedAsset?.base64) {
        Alert.alert('Invalid image', 'Please select another image.');
        return;
      }

      setImageUri(selectedAsset.uri);
      setIsProcessing(true);

      const analysisResult = await analyzeInvestmentGraph(selectedAsset.base64, selectedAsset.mimeType ?? 'image/jpeg');

      await saveScannedAnalysis(user.uid, {
        title: 'Financial Graph Analysis',
        assetKind: inferAssetKind(analysisResult.analysisText),
        analysisText: analysisResult.analysisText,
        imageBase64: selectedAsset.base64,
        trend: analysisResult.trend,
        chartData: JSON.stringify(analysisResult.chartData),
        assetName: analysisResult.assetName,
      });

      await incrementDailyScanCount(user.uid);
      setTodayCount((count) => count + 1);

      setResultText(analysisResult.analysisText);
      setTrend(analysisResult.trend);
      setChartData(analysisResult.chartData);
      setAssetName(analysisResult.assetName);
      setShowResultSheet(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Image analysis failed.';
      Alert.alert('Scan error', message);
    } finally {
      setIsProcessing(false);
    }
  };

  const getTrendColor = () => {
    if (trend === 'bullish') return '#34C759';
    if (trend === 'bearish') return '#FF3B30';
    return '#8E8E93';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Scan</Text>
          <View style={styles.headerActions}>
            <Pressable 
              onPress={() => router.push('/(tabs)/history')} 
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            >
              <Clock size={24} color="#000000" strokeWidth={1.5} />
            </Pressable>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{subscriptionLoading ? 'Checking' : isPro ? 'PRO' : 'FREE'}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.metaText}>Today&apos;s scans: {todayCount}</Text>

        <Pressable style={({ pressed }) => [styles.previewCard, pressed && styles.pressed]} onPress={handlePickAndAnalyze}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderTitle}>Select graph image</Text>
              <Text style={styles.placeholderSub}>Import a chart from your photo library</Text>
            </View>
          )}
        </Pressable>

        <Pressable
          onPress={handlePickAndAnalyze}
          style={({ pressed }) => [styles.analyzeButton, pressed && styles.pressed]}
          disabled={isProcessing}>
          {isProcessing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.analyzeButtonText}>Analyze with Gemini</Text>
          )}
        </Pressable>
      </View>

      <Modal visible={showPaywall} transparent animationType="fade" onRequestClose={() => setShowPaywall(false)}>
        <View style={styles.modalOverlay}>
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.paywallCard}>
            <Text style={styles.paywallTitle}>Monai Pro</Text>
            <Text style={styles.paywallCopy}>
              Upgrade to Pro to unlock AI chart scans, deeper analysis, and premium fintech insights.
            </Text>
            <Pressable style={({ pressed }) => [styles.upgradeButton, pressed && styles.pressed]} onPress={handleUpgrade}>
              <Text style={styles.upgradeButtonText}>Upgrade</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.dismissButton, pressed && styles.pressed]} onPress={() => setShowPaywall(false)}>
              <Text style={styles.dismissButtonText}>Not now</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showResultSheet} transparent animationType="slide" onRequestClose={() => setShowResultSheet(false)}>
        <View style={styles.sheetBackdrop}>
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />
            
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.assetName}>{assetName || 'Analysis Result'}</Text>
                <View style={[styles.trendBadge, { backgroundColor: getTrendColor() + '20' }]}>
                  <View style={[styles.trendDot, { backgroundColor: getTrendColor() }]} />
                  <Text style={[styles.trendText, { color: getTrendColor() }]}>{trend.toUpperCase()}</Text>
                </View>
              </View>
              <Pressable style={styles.sheetCloseIcon} onPress={() => setShowResultSheet(false)}>
                <Text style={styles.closeIconText}>✕</Text>
              </Pressable>
            </View>

            {chartData.length > 0 && (
              <View style={styles.chartContainer}>
                <LineChart.Provider data={chartData}>
                  <LineChart width={SCREEN_WIDTH - 36} height={120}>
                    <LineChart.Path color={getTrendColor()} width={2}>
                      <LineChart.Gradient color={getTrendColor()} opacity={0.2} />
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
              <Text style={styles.sheetBody}>{resultText}</Text>
            </ScrollView>

            <Pressable style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]} onPress={() => setShowResultSheet(false)}>
              <Text style={styles.closeButtonText}>Done</Text>
            </Pressable>
          </View>
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
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000000',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginRight: 16,
    padding: 4,
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D1D6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  badgeText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '700',
  },
  metaText: {
    color: '#6E6E73',
    marginBottom: 16,
    fontSize: 13,
  },
  previewCard: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#D1D1D6',
    backgroundColor: '#FAFAFA',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholder: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  placeholderTitle: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholderSub: {
    color: '#6E6E73',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  analyzeButton: {
    marginTop: 16,
    backgroundColor: '#000000',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  analyzeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  paywallCard: {
    width: '100%',
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D1D6',
    padding: 20,
  },
  paywallTitle: {
    color: '#000000',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
  },
  paywallCopy: {
    color: '#3A3A3C',
    lineHeight: 22,
    marginBottom: 18,
  },
  upgradeButton: {
    backgroundColor: '#000000',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 10,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  dismissButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D1D1D6',
    paddingVertical: 12,
    alignItems: 'center',
  },
  dismissButtonText: {
    color: '#000000',
    fontWeight: '600',
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
  assetName: {
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
