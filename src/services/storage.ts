import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export type AssetKind = 'stock' | 'crypto' | 'commodity' | 'other';

export type ScannedAnalysisInput = {
  title: string;
  symbol?: string;
  assetKind: AssetKind;
  analysisText: string;
  imageBase64?: string;
};

export type ScannedAnalysisRecord = ScannedAnalysisInput & {
  id: string;
  createdAt: string;
};

const USERS_COLLECTION = 'users';
const ANALYSES_COLLECTION = 'scannedAnalyses';
const USAGE_COLLECTION = 'usage';
const DAILY_SCAN_PREFIX = 'dailyScan_';

function getAnalysesCollection(uid: string) {
  return firestore()
    .collection(USERS_COLLECTION)
    .doc(uid)
    .collection(ANALYSES_COLLECTION);
}

function getUsageCollection(uid: string) {
  return firestore().collection(USERS_COLLECTION).doc(uid).collection(USAGE_COLLECTION);
}

function toDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDailyUsageDocId(date = new Date()) {
  return `${DAILY_SCAN_PREFIX}${toDateKey(date)}`;
}

function isFirestoreTimestamp(value: unknown): value is FirebaseFirestoreTypes.Timestamp {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const maybeTimestamp = value as { toDate?: unknown };
  return typeof maybeTimestamp.toDate === 'function';
}

function toIsoString(value: unknown) {
  if (isFirestoreTimestamp(value)) {
    return value.toDate().toISOString();
  }

  return new Date().toISOString();
}

export async function saveScannedAnalysis(uid: string, analysis: ScannedAnalysisInput) {
  const documentRef = await getAnalysesCollection(uid).add({
    ...analysis,
    createdAt: firestore.FieldValue.serverTimestamp(),
  });

  return documentRef.id;
}

export function subscribeToScannedAnalyses(
  uid: string,
  onResults: (results: ScannedAnalysisRecord[]) => void,
) {
  return getAnalysesCollection(uid)
    .orderBy('createdAt', 'desc')
    .onSnapshot((snapshot) => {
      const parsedResults: ScannedAnalysisRecord[] = snapshot.docs.map((doc) => {
        const data = doc.data() as ScannedAnalysisInput & {
          createdAt?: FirebaseFirestoreTypes.Timestamp;
        };

        return {
          id: doc.id,
          title: data.title,
          symbol: data.symbol,
          assetKind: data.assetKind,
          analysisText: data.analysisText,
          imageBase64: data.imageBase64,
          createdAt: toIsoString(data.createdAt),
        };
      });

      onResults(parsedResults);
    });
}

export async function getDailyScanCount(uid: string, date = new Date()) {
  const usageSnapshot = await getUsageCollection(uid).doc(getDailyUsageDocId(date)).get();
  if (!usageSnapshot.exists()) {
    return 0;
  }

  const data = usageSnapshot.data() as { count?: number } | undefined;
  return data?.count ?? 0;
}

export async function incrementDailyScanCount(uid: string, date = new Date()) {
  const usageDocRef = getUsageCollection(uid).doc(getDailyUsageDocId(date));

  await firestore().runTransaction(async (transaction) => {
    const currentDoc = await transaction.get(usageDocRef);
    const currentCount = currentDoc.exists() ? ((currentDoc.data() as { count?: number }).count ?? 0) : 0;

    transaction.set(
      usageDocRef,
      {
        dateKey: toDateKey(date),
        count: currentCount + 1,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
}
