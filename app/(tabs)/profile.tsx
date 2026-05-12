import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '@/src/context/AuthContext';
import { useSubscription } from '@/src/hooks/useSubscription';
import { ScannedAnalysisRecord, subscribeToScannedAnalyses } from '@/src/services/storage';

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function ProfileScreen() {
  const { user, initializing, signInAnonymously } = useAuth();
  const { isPro, isLoading: subscriptionLoading, purchasePackage } = useSubscription(user?.uid);
  const [savedAnalyses, setSavedAnalyses] = useState<ScannedAnalysisRecord[]>([]);
  const [analysesLoading, setAnalysesLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setSavedAnalyses([]);
      setAnalysesLoading(false);
      return;
    }

    setAnalysesLoading(true);
    const unsubscribe = subscribeToScannedAnalyses(user.uid, (results) => {
      setSavedAnalyses(results);
      setAnalysesLoading(false);
    });

    return unsubscribe;
  }, [user?.uid]);

  const membershipLabel = useMemo(() => {
    if (subscriptionLoading) {
      return 'Checking...';
    }

    return isPro ? 'PRO' : 'Free';
  }, [isPro, subscriptionLoading]);

  const handleCreateAccount = async () => {
    try {
      setIsCreatingAccount(true);
      await signInAnonymously();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create your account right now.';
      Alert.alert('Login error', message);
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const handleTurnPro = async () => {
    try {
      setIsPurchasing(true);
      const unlocked = await purchasePackage();
      if (unlocked) {
        Alert.alert('Welcome to Pro', 'Your Pro features are now active.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Purchase did not complete.';
      Alert.alert('Turn Pro', message);
    } finally {
      setIsPurchasing(false);
    }
  };

  if (initializing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6670F5" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.profileCard}>
        <View>
          <Text style={styles.profileTitle}>Monai Profile</Text>
          <Text style={styles.profileSubtitle}>{user?.uid ?? 'No account connected'}</Text>
        </View>
        <View style={[styles.badge, isPro ? styles.proBadge : styles.freeBadge]}>
          <Text style={styles.badgeText}>{membershipLabel}</Text>
        </View>
      </View>

      {!user?.uid && (
        <Pressable
          onPress={handleCreateAccount}
          style={({ pressed }) => [
            styles.accountButton,
            pressed && styles.buttonPressed,
            isCreatingAccount && styles.disabledButton,
          ]}
          disabled={isCreatingAccount}>
          <Text style={styles.accountButtonText}>
            {isCreatingAccount ? 'Creating account...' : 'Create Free Account'}
          </Text>
        </Pressable>
      )}

      <View style={styles.listCard}>
        <Text style={styles.sectionTitle}>Saved Analyses</Text>
        {analysesLoading ? (
          <View style={styles.centeredRow}>
            <ActivityIndicator color="#6670F5" />
          </View>
        ) : savedAnalyses.length === 0 ? (
          <Text style={styles.emptyState}>No scans yet. Your AI chart insights will appear here.</Text>
        ) : (
          savedAnalyses.map((item) => (
            <View key={item.id} style={styles.analysisItem}>
              <View style={styles.analysisHeader}>
                <Text style={styles.analysisTitle}>{item.title}</Text>
                <Text style={styles.analysisKind}>{item.assetKind.toUpperCase()}</Text>
              </View>
              <Text style={styles.analysisMeta}>
                {item.symbol ? `${item.symbol} - ` : ''}
                {formatDate(item.createdAt)}
              </Text>
              <Text style={styles.analysisBody} numberOfLines={4}>
                {item.analysisText}
              </Text>
            </View>
          ))
        )}
      </View>

      {!isPro && (
        <Pressable
          onPress={handleTurnPro}
          style={({ pressed }) => [
            styles.turnProButton,
            pressed && styles.buttonPressed,
            (isPurchasing || !user?.uid) && styles.disabledButton,
          ]}
          disabled={isPurchasing || !user?.uid}>
          <Text style={styles.turnProText}>{isPurchasing ? 'Opening paywall...' : 'Turn Pro'}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 18,
    gap: 16,
    backgroundColor: '#F3F5FF',
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F5FF',
  },
  centeredRow: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E7E9FB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#3D3F62',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  profileTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#24294D',
  },
  profileSubtitle: {
    marginTop: 6,
    color: '#8890B3',
    maxWidth: 200,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  freeBadge: {
    backgroundColor: '#EDF0FF',
  },
  proBadge: {
    backgroundColor: '#DFF7E8',
  },
  badgeText: {
    fontWeight: '800',
    color: '#2B2E4F',
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E7E9FB',
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#24294D',
  },
  emptyState: {
    color: '#8C92B3',
    paddingVertical: 8,
  },
  analysisItem: {
    backgroundColor: '#F8F9FF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EBEDFF',
    gap: 4,
  },
  analysisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  analysisTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2E335B',
    flex: 1,
  },
  analysisKind: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6670F5',
  },
  analysisMeta: {
    color: '#7D84A9',
    fontSize: 12,
  },
  analysisBody: {
    color: '#3B4068',
    lineHeight: 20,
  },
  turnProButton: {
    backgroundColor: '#6670F5',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  turnProText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  accountButton: {
    backgroundColor: '#ECF9F0',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  accountButtonText: {
    color: '#1D7C4C',
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  disabledButton: {
    opacity: 0.55,
  },
});
