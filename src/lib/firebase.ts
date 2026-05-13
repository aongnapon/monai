import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';

export const firebaseAuth = getAuth();
export const firebaseDb = getFirestore();
