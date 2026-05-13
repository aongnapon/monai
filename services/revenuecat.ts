import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases';

const ANDROID_PUBLIC_API_KEY = 'test_tdUCliPAxKSAkSBjlIqwPKjyqYw';
const PRO_ENTITLEMENT_ID = 'pro';

let hasConfigured = false;

function isNativePurchasePlatform() {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

function getFirstPackage(packages: PurchasesPackage[]) {
  return packages[0] ?? null;
}

export function isProCustomer(customerInfo: CustomerInfo) {
  return Boolean(customerInfo.entitlements.active[PRO_ENTITLEMENT_ID]);
}

export async function initializeRevenueCat(appUserId?: string) {
  if (!isNativePurchasePlatform()) {
    return;
  }

  if (!hasConfigured) {
    Purchases.configure({
      apiKey: ANDROID_PUBLIC_API_KEY,
      appUserID: appUserId,
    });
    hasConfigured = true;
    return;
  }

  if (appUserId) {
    const currentAppUserId = await Purchases.getAppUserID();
    if (currentAppUserId !== appUserId) {
      await Purchases.logIn(appUserId);
    }
  }
}

export async function getCustomerInfo(appUserId?: string) {
  await initializeRevenueCat(appUserId);
  return Purchases.getCustomerInfo();
}

export function useSubscription(appUserId?: string) {
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isNativePurchasePlatform() || !appUserId) {
      setIsPro(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const customerInfo = await getCustomerInfo(appUserId);
    setIsPro(isProCustomer(customerInfo));
    setIsLoading(false);
  }, [appUserId]);

  useEffect(() => {
    if (!isNativePurchasePlatform() || !appUserId) {
      setIsPro(false);
      setIsLoading(false);
      return;
    }

    let mounted = true;
    setIsLoading(true);

    const loadCustomerInfo = async () => {
      try {
        const customerInfo = await getCustomerInfo(appUserId);
        if (mounted) {
          setIsPro(isProCustomer(customerInfo));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadCustomerInfo();

    const subscriptionListener = (customerInfo: CustomerInfo) => {
      if (mounted) {
        setIsPro(isProCustomer(customerInfo));
      }
    };

    Purchases.addCustomerInfoUpdateListener(subscriptionListener);
    return () => {
      mounted = false;
      Purchases.removeCustomerInfoUpdateListener(subscriptionListener);
    };
  }, [appUserId]);

  const purchase = useCallback(async () => {
    if (!isNativePurchasePlatform()) {
      throw new Error('Purchases are only available on native platforms.');
    }
    if (!appUserId) {
      throw new Error('Please log in before purchasing Pro.');
    }

    await initializeRevenueCat(appUserId);
    const offerings = await Purchases.getOfferings();
    const targetPackage = getFirstPackage(offerings.current?.availablePackages ?? []);

    if (!targetPackage) {
      throw new Error('No active package found in RevenueCat offerings.');
    }

    const { customerInfo } = await Purchases.purchasePackage(targetPackage);
    const unlocked = isProCustomer(customerInfo);
    setIsPro(unlocked);
    return unlocked;
  }, [appUserId]);

  return useMemo(
    () => ({
      isPro,
      isLoading,
      purchase,
      refresh,
    }),
    [isLoading, isPro, purchase, refresh],
  );
}
