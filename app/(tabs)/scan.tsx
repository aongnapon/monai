import * as ImagePicker from 'expo-image-picker'; // Swapped from expo-camera
import { useEffect, useMemo, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { getCustomerInfo, isProCustomer, useSubscription } from '@/services/revenuecat';
import { useAuth } from '@/src/context/AuthContext';
import { analyzeInvestmentGraph } from '@/src/lib/gemini';
import { getDailyScanCount, incrementDailyScanCount, saveScannedAnalysis } from '@/src/services/storage';

const FREE_DAILY_SCAN_LIMIT = 3;

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
  const { user, signInAnonymously } = useAuth();
  const { isPro, isLoading: subscriptionLoading, purchase, refresh } = useSubscription(user?.uid);
  
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [resultText, setResultText] = useState('');
  const [showResultSheet, setShowResultSheet] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) {
      setDailyCount(0);
      return;
    }
    getDailyScanCount(user.uid)
      .then(setDailyCount)
      .catch(() => setDailyCount(0));
  }, [user?.uid]);

  const scansLeft = useMemo(() => Math.max(FREE_DAILY_SCAN_LIMIT - dailyCount, 0), [dailyCount]);

  const handleUpgrade = async () => {
    try {
      const unlocked = await purchase();
      if (unlocked) {
        setShowPaywall(false);
        await refresh();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not open paywall.';
      Alert.alert('Upgrade to Pro', message);
    }
  };

  const handlePickAndScan = async () => {
    try {
      // 1. Auth Check
      if (!user?.uid) {
        await signInAnonymously();
        return;
      }

      // 2. Subscription/Limit Check
      const customerInfo = await getCustomerInfo(user.uid);
      const hasPro = isProCustomer(customerInfo);
      const latestCount = await getDailyScanCount(user.uid);
      setDailyCount(latestCount);

      if (!hasPro && latestCount >= FREE_DAILY_SCAN_LIMIT) {
        setShowPaywall(true);
        return;
      }

      // 3. Request Gallery Permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need access to your gallery to analyze charts.');
        return;
      }

      // 4. Launch Image Picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });

      if (result.canceled || !result.assets[0].base64) return;

      const photo = result.assets[0];
      setImageUri(photo.uri);
      setIsScanning(true);

      // 5. Gemini Analysis
      const analysis = await analyzeInvestmentGraph(photo.base64, 'image/jpeg');

      // 6. Save and Increment
      await saveScannedAnalysis(user.uid, {
        title: 'Chart Scan',
        assetKind: inferAssetKind(analysis),
        analysisText: analysis,
        imageBase64: photo.base64,
      });

      if (!hasPro) {
        await incrementDailyScanCount(user.uid);
        setDailyCount((current) => current + 1);
      }

      setResultText(analysis);
      setShowResultSheet(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Analysis failed. Please try again.';
      Alert.alert('Scan error', message);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Analyze</Text>
        <View style={[styles.statusPill, isPro ? styles.statusPillPro : styles.statusPillFree]}>
          <Text style={styles.statusPillText}>
            {subscriptionLoading ? 'Loading…' : isPro ? 'Pro' : `${scansLeft} left`}
          </Text>
        </View>
      </View>

      <Pressable style={styles.cameraCard} onPress={handlePickAndScan}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
        ) : (
          <View style={styles.uploadPlaceholder}>
            <Text style={styles.uploadIcon}>📈</Text>
            <Text style={styles.uploadText}>Tap to select a chart screenshot</Text>
          </View>
        )}
      </Pressable>

      <Pressable 
        style={({ pressed }) => [styles.scanButton, pressed && styles.buttonPressed]} 
        onPress={handlePickAndScan} 
        disabled={isScanning}
      >
        {isScanning ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.scanButtonText}>Upload & Analyze Graph</Text>
        )}
      </Pressable>

      {/* Paywall Modal */}
      <Modal visible={showPaywall} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.paywallCard}>
            <Text style={styles.paywallTitle}>Free limit reached</Text>
            <Text style={styles.paywallText}>
              You used {FREE_DAILY_SCAN_LIMIT} free scans today. Upgrade to Pro for unlimited chart scans.
            </Text>
            <Pressable style={styles.upgradeButton} onPress={handleUpgrade}>
              <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
            </Pressable>
            <Pressable style={styles.dismissButton} onPress={() => setShowPaywall(false)}>
              <Text style={styles.dismissButtonText}>Maybe later</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Result Bottom Sheet */}
      <Modal visible={showResultSheet} animationType="slide" transparent>
        <View style={styles.bottomSheetBackdrop}>
          <View style={styles.bottomSheet}>
            <View style={styles.bottomSheetHandle} />
            <Text style={styles.bottomSheetTitle}>Monai AI Analysis</Text>
            <ScrollView style={styles.resultScroll}>
              <Text style={styles.resultBodyText}>{resultText}</Text>
            </ScrollView>
            <Pressable style={styles.closeSheetButton} onPress={() => setShowResultSheet(false)}>
              <Text style={styles.closeSheetText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F7FC', paddingHorizontal: 16, paddingBottom: 16 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 30, fontWeight: '700', color: '#0E1528' },
  statusPill: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12 },
  statusPillFree: { backgroundColor: '#E8EDFF' },
  statusPillPro: { backgroundColor: '#DDF6E9' },
  statusPillText: { fontSize: 12, fontWeight: '700', color: '#24304A' },
  cameraCard: { 
    flex: 1, 
    borderRadius: 28, 
    borderWidth: 1, 
    borderColor: '#E5E8F3', 
    backgroundColor: '#FFFFFF', 
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center'
  },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  uploadPlaceholder: { alignItems: 'center' },
  uploadIcon: { fontSize: 40, marginBottom: 10 },
  uploadText: { color: '#8E94A7', fontWeight: '500' },
  scanButton: { marginTop: 14, backgroundColor: '#161E33', borderRadius: 18, paddingVertical: 15, alignItems: 'center' },
  scanButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  buttonPressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  overlay: { flex: 1, backgroundColor: 'rgba(10, 14, 28, 0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  paywallCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, gap: 12 },
  paywallTitle: { fontSize: 22, fontWeight: '700', color: '#0E1528' },
  paywallText: { color: '#58617A', lineHeight: 20 },
  upgradeButton: { marginTop: 4, backgroundColor: '#6A72FF', borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  upgradeButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  dismissButton: { borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#DCE1EF' },
  dismissButtonText: { color: '#3B445D', fontWeight: '600' },
  bottomSheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10, 14, 28, 0.45)' },
  bottomSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 24, maxHeight: '80%' },
  bottomSheetHandle: { alignSelf: 'center', width: 42, height: 5, borderRadius: 999, backgroundColor: '#D2D7E5', marginBottom: 12 },
  bottomSheetTitle: { fontSize: 18, fontWeight: '700', color: '#0E1528', marginBottom: 10 },
  resultScroll: { maxHeight: 400 },
  resultBodyText: { color: '#3B445D', lineHeight: 22, fontSize: 15 },
  closeSheetButton: { marginTop: 14, backgroundColor: '#161E33', borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  closeSheetText: { color: '#FFFFFF', fontWeight: '700' },
});