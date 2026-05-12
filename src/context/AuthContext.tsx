import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';

import { firebaseAuth } from '@/src/lib/firebase';

type AuthContextValue = {
  user: FirebaseAuthTypes.User | null;
  initializing: boolean;
  signInAnonymously: () => Promise<FirebaseAuthTypes.UserCredential>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(firebaseAuth.currentUser);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged((nextUser) => {
      setUser(nextUser);
      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      signInAnonymously: () => firebaseAuth.signInAnonymously(),
      signOut: () => firebaseAuth.signOut(),
    }),
    [initializing, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
