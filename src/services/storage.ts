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

function getAnalysesCollection(uid: string) {
  return firestore()
    .collection(USERS_COLLECTION)
    .doc(uid)
    .collection(ANALYSES_COLLECTION);
}

function toIsoString(value: unknown) {
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return (value as FirebaseFirestoreTypes.Timestamp).toDate().toISOString();
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
