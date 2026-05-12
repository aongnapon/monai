import { getApps } from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';

const defaultFirebaseApp = getApps()[0];

if (!defaultFirebaseApp) {
  throw new Error(
    'Firebase app has not been initialized. Make sure native Firebase config is set up before launching Monai.',
  );
}

export const firebaseApp = defaultFirebaseApp;
export const firebaseAuth = auth(firebaseApp);
