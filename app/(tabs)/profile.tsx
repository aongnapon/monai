import { useEffect } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { useSubscription } from '@/services/revenuecat';
import { useAuth } from '@/src/context/AuthContext';
import { setUserProStatus } from '@/src/services/storage';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOutUser } = useAuth();
  const { isPro, isLoading } = useSubscription(user?.uid);

  useEffect(() => {
    if (user && isPro) {
      setUserProStatus(user.uid, true);
    }
  }, [user, isPro]);

  const handleUpgrade = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    try {
      const result = await RevenueCatUI.presentPaywall();

      if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
        await setUserProStatus(user.uid, true);
        Alert.alert('Monai Pro', 'Your Pro subscription is now active.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not start purchase flow.';
      Alert.alert('Upgrade to Pro', message);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      router.push('/auth/login');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not sign out.';
      Alert.alert('Sign out', message);
    }
  };

  const subscriptionStatus = isLoading ? 'Checking' : isPro ? 'PRO' : 'FREE';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>{user?.email ?? 'No account signed in'}</Text>

          <View style={[styles.badge, isPro ? styles.badgePro : styles.badgeFree]}>
            <Text style={styles.badgeText}>Subscription Status: {subscriptionStatus}</Text>
          </View>

          {!user ? (
            <>
              <Link href="/auth/login" asChild>
                <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                  <Text style={styles.primaryButtonText}>Sign In</Text>
                </Pressable>
              </Link>
              <Link href="/auth/register" asChild>
                <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                  <Text style={styles.secondaryButtonText}>Create Account</Text>
                </Pressable>
              </Link>
            </>
          ) : (
            <>
              {!isPro && (
                <Pressable
                  style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
                  onPress={handleUpgrade}
                  disabled={isLoading}>
                  <Text style={styles.primaryButtonText}>Upgrade to Pro</Text>
                </Pressable>
              )}

              <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]} onPress={handleSignOut}>
                <Text style={styles.secondaryButtonText}>Sign Out</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
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
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#D1D1D6',
    backgroundColor: '#FFFFFF',
    padding: 22,
    gap: 14,
  },
  title: {
    color: '#000000',
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    color: '#6E6E73',
    fontSize: 14,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D1D6',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeFree: {
    backgroundColor: '#F2F2F7',
  },
  badgePro: {
    backgroundColor: '#FFFFFF',
  },
  badgeText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: '#000000',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D1D1D6',
    paddingVertical: 13,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.86,
  },
});
