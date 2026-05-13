import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import { useSubscription } from '@/services/revenuecat';
import { useAuth } from '@/src/context/AuthContext';
import { analyzeInvestmentGraph } from '@/src/lib/gemini';
import { getDailyScanCount, incrementDailyScanCount, saveScannedAnalysis } from '../../src/services/storage';

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

      const analysis = await analyzeInvestmentGraph(selectedAsset.base64, selectedAsset.mimeType ?? 'image/jpeg');

      await saveScannedAnalysis(user.uid, {
        title: 'Financial Graph Analysis',
        assetKind: inferAssetKind(analysis),
        analysisText: analysis,
        imageBase64: selectedAsset.base64,
      });

      await incrementDailyScanCount(user.uid);
      setTodayCount((count) => count + 1);

      setResultText(analysis);
      setShowResultSheet(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Image analysis failed.';
      Alert.alert('Scan error', message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Scan</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{subscriptionLoading ? 'Checking' : isPro ? 'PRO' : 'FREE'}</Text>
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
            <Text style={styles.sheetTitle}>Gemini Analysis</Text>
            <ScrollView style={styles.sheetScroll}>
              <Text style={styles.sheetBody}>{resultText}</Text>
            </ScrollView>
            <Pressable style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]} onPress={() => setShowResultSheet(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingBottom: 24,
    paddingTop: 10,
    minHeight: '52%',
    maxHeight: '82%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D1D1D6',
    marginBottom: 12,
  },
  sheetTitle: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  sheetScroll: {
    maxHeight: 420,
  },
  sheetBody: {
    color: '#1C1C1E',
    lineHeight: 22,
    fontSize: 15,
  },
  closeButton: {
    marginTop: 14,
    backgroundColor: '#000000',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.86,
  },
});
