import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases';

const REVENUECAT_ANDROID_PUBLIC_KEY = 'test_tdUCliPAxKSAkSBjlIqwPKjyqYw';
const PRO_ENTITLEMENT_ID = 'pro';

let isPurchasesConfigured = false;

function getProStatus(customerInfo: CustomerInfo) {
  return Boolean(customerInfo.entitlements.active[PRO_ENTITLEMENT_ID]);
}

async function configurePurchases(appUserId?: string) {
  if (!isPurchasesConfigured) {
    Purchases.configure({
      apiKey: REVENUECAT_ANDROID_PUBLIC_KEY,
      appUserID: appUserId,
    });
    isPurchasesConfigured = true;
    return;
  }

  if (appUserId) {
    await Purchases.logIn(appUserId);
  }
}

function selectPackage(packages: PurchasesPackage[]) {
  return packages[0] ?? null;
}

export function useSubscription(appUserId?: string) {
  const [isLoading, setIsLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const isNativePlatform = Platform.OS === 'android' || Platform.OS === 'ios';

  const refreshSubscription = useCallback(async () => {
    if (!isNativePlatform) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    await configurePurchases(appUserId);
    const customerInfo = await Purchases.getCustomerInfo();
    setIsPro(getProStatus(customerInfo));
    setIsLoading(false);
  }, [appUserId, isNativePlatform]);

  useEffect(() => {
    if (!isNativePlatform) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const syncSubscription = async () => {
      try {
        await configurePurchases(appUserId);
        const customerInfo = await Purchases.getCustomerInfo();
        if (isMounted) {
          setIsPro(getProStatus(customerInfo));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    syncSubscription();

    const customerInfoListener = (customerInfo: CustomerInfo) => {
      if (isMounted) {
        setIsPro(getProStatus(customerInfo));
      }
    };

    Purchases.addCustomerInfoUpdateListener(customerInfoListener);

    return () => {
      isMounted = false;
      Purchases.removeCustomerInfoUpdateListener(customerInfoListener);
    };
  }, [appUserId, isNativePlatform]);

  const purchasePackage = useCallback(async () => {
    if (!isNativePlatform) {
      throw new Error('RevenueCat purchases are available only on iOS and Android.');
    }

    await configurePurchases(appUserId);
    const offerings = await Purchases.getOfferings();
    const availablePackages = offerings.current?.availablePackages ?? [];
    const selectedPackage = selectPackage(availablePackages);

    if (!selectedPackage) {
      throw new Error('No subscription package found in the current offering.');
    }

    const result = await Purchases.purchasePackage(selectedPackage);
    const unlocked = getProStatus(result.customerInfo);
    setIsPro(unlocked);
    return unlocked;
  }, [appUserId, isNativePlatform]);

  return useMemo(
    () => ({
      isPro,
      isLoading,
      purchasePackage,
      refreshSubscription,
    }),
    [isLoading, isPro, purchasePackage, refreshSubscription],
  );
}
