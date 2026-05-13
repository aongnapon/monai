import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  FirebaseAuthTypes,
  linkWithCredential,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from '@react-native-firebase/auth';

import { firebaseAuth } from '@/src/lib/firebase';

type AuthContextValue = {
  user: FirebaseAuthTypes.User | null;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<FirebaseAuthTypes.UserCredential>;
  register: (email: string, password: string) => Promise<FirebaseAuthTypes.UserCredential>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(firebaseAuth.currentUser);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser);
      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  const signIn = (email: string, password: string) =>
    signInWithEmailAndPassword(firebaseAuth, email.trim(), password);

  const register = async (email: string, password: string) => {
    const normalizedEmail = email.trim();
    const currentUser = firebaseAuth.currentUser;

    if (currentUser?.isAnonymous) {
      const credential = EmailAuthProvider.credential(normalizedEmail, password);
      return linkWithCredential(currentUser, credential);
    }

    return createUserWithEmailAndPassword(firebaseAuth, normalizedEmail, password);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      signIn,
      register,
      signOutUser: () => signOut(firebaseAuth),
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
