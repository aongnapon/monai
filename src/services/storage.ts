import {
  addDoc,
  collection,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from '@react-native-firebase/firestore';

export type AssetKind = 'stock' | 'crypto' | 'commodity' | 'other';

export type Trend = 'bullish' | 'bearish' | 'neutral';

export type ChartPoint = {
  timestamp: number;
  value: number;
};

export type ScannedAnalysisInput = {
  title: string;
  symbol?: string;
  assetKind: AssetKind;
  analysisText: string;
  imageBase64?: string;
  trend: Trend;
  chartData: string; // Stringified array of ChartPoint
  assetName: string;
};

export type ScannedAnalysisRecord = ScannedAnalysisInput & {
  id: string;
  createdAt: string;
};

const USERS_COLLECTION = 'users';
const ANALYSES_COLLECTION = 'scannedAnalyses';
const USAGE_COLLECTION = 'usage';
const DAILY_SCAN_PREFIX = 'dailyScan_';

const database = getFirestore();

function getUserDoc(uid: string) {
  return doc(database, USERS_COLLECTION, uid);
}

function getAnalysesCollection(uid: string) {
  return collection(getUserDoc(uid), ANALYSES_COLLECTION);
}

function getUsageCollection(uid: string) {
  return collection(getUserDoc(uid), USAGE_COLLECTION);
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

function toIsoString(value: unknown) {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (value && typeof value === 'object' && 'toDate' in value) {
    const withToDate = value as { toDate?: () => Date };
    if (typeof withToDate.toDate === 'function') {
      return withToDate.toDate().toISOString();
    }
  }

  return new Date().toISOString();
}

export async function setUserProStatus(uid: string, isPro: boolean) {
  const userDocRef = getUserDoc(uid);
  await runTransaction(database, async (transaction) => {
    transaction.set(userDocRef, { isPro, updatedAt: serverTimestamp() }, { merge: true });
  });
}

export async function saveScannedAnalysis(uid: string, analysis: ScannedAnalysisInput) {
  const documentRef = await addDoc(getAnalysesCollection(uid), {
    ...analysis,
    createdAt: serverTimestamp(),
  });

  return documentRef.id;
}

export function subscribeToScannedAnalyses(
  uid: string,
  onResults: (results: ScannedAnalysisRecord[]) => void,
) {
  const analysesQuery = query(getAnalysesCollection(uid), orderBy('createdAt', 'desc'));

  return onSnapshot(analysesQuery, (snapshot) => {
    const parsedResults: ScannedAnalysisRecord[] = snapshot.docs.map((analysisDoc) => {
      const data = analysisDoc.data() as ScannedAnalysisInput & {
        createdAt?: Timestamp;
      };

      return {
        id: analysisDoc.id,
        title: data.title,
        symbol: data.symbol,
        assetKind: data.assetKind,
        analysisText: data.analysisText,
        imageBase64: data.imageBase64,
        trend: data.trend,
        chartData: data.chartData,
        assetName: data.assetName,
        createdAt: toIsoString(data.createdAt),
      };
    });

    onResults(parsedResults);
  });
}

export async function getDailyScanCount(uid: string, date = new Date()) {
  const usageDocRef = doc(getUsageCollection(uid), getDailyUsageDocId(date));
  const usageSnapshot = await getDoc(usageDocRef);

  if (!usageSnapshot.exists()) {
    return 0;
  }

  const data = usageSnapshot.data() as { count?: number } | undefined;
  return data?.count ?? 0;
}

export async function incrementDailyScanCount(uid: string, date = new Date()) {
  const usageDocRef = doc(getUsageCollection(uid), getDailyUsageDocId(date));

  await runTransaction(database, async (transaction) => {
    const currentDoc = await transaction.get(usageDocRef);
    const currentCount = currentDoc.exists()
      ? ((currentDoc.data() as { count?: number }).count ?? 0)
      : 0;

    transaction.set(
      usageDocRef,
      {
        dateKey: toDateKey(date),
        count: currentCount + 1,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });
}
