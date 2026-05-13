import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/src/context/AuthContext';
import { useSubscription } from '@/services/revenuecat';

export default function ProfileScreen() {
  const { user, initializing, signInAnonymously, signOut } = useAuth();
  const { isPro, isLoading: isSubscriptionLoading, purchase } = useSubscription(user?.uid);

  const handleAuthAction = async () => {
    try {
      if (user) {
        await signOut();
      } else {
        await signInAnonymously();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update login state.';
      Alert.alert('Auth state', message);
    }
  };

  const handleUpgrade = async () => {
    try {
      const unlocked = await purchase();
      if (unlocked) {
        Alert.alert('You are now Pro', 'Monai Pro has been activated.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not open paywall.';
      Alert.alert('Upgrade to Pro', message);
    }
  };

  const subscriptionLabel = isSubscriptionLoading ? 'Checking…' : isPro ? 'Pro' : 'Free';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>{initializing ? 'Loading user…' : user?.uid ?? 'Not logged in'}</Text>

          <View style={[styles.badge, isPro ? styles.badgePro : styles.badgeFree]}>
            <Text style={styles.badgeText}>Subscription: {subscriptionLabel}</Text>
          </View>

          <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]} onPress={handleAuthAction}>
            <Text style={styles.primaryButtonText}>{user ? 'Log Out' : 'Log In'}</Text>
          </Pressable>

          {!isPro && (
            <Pressable
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
              onPress={handleUpgrade}
              disabled={!user || isSubscriptionLoading}>
              <Text style={styles.secondaryButtonText}>Upgrade to Pro</Text>
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F8FC',
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E8EAF3',
    padding: 22,
    shadowColor: '#161A2D',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 3,
    gap: 14,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#0E1528',
  },
  subtitle: {
    fontSize: 13,
    color: '#7A859F',
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  badgeFree: {
    backgroundColor: '#E8EDFF',
  },
  badgePro: {
    backgroundColor: '#DDF6E9',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#24304A',
  },
  primaryButton: {
    backgroundColor: '#141C2F',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#6A72FF',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
});
