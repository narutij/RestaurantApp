import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { userService, type AppUser, type UserRole } from '@/lib/firestore';

interface AuthContextType {
  currentUser: User | null;
  appUser: AppUser | null;
  userRole: UserRole | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const login = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    // Check if user exists in our users collection and is approved
    const userData = await userService.getByUid(userCredential.user.uid);
    if (!userData || userData.status !== 'active') {
      await signOut(auth);
      throw new Error('Account not approved or inactive. Please contact admin.');
    }
  };

  const signup = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        // Fetch user data from Firestore
        try {
          const userData = await userService.getByUid(user.uid);
          if (userData && userData.status === 'active') {
            setAppUser(userData);
          } else {
            setAppUser(null);
            // If user not approved, sign them out
            if (userData?.status !== 'active') {
              await signOut(auth);
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setAppUser(null);
        }
      } else {
        setAppUser(null);
      }

      setLoading(false);
    });

    // Set a timeout to ensure loading doesn't get stuck forever
    const timeout = setTimeout(() => {
      console.warn('Auth loading timeout - forcing loading to false');
      setLoading(false);
    }, 5000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const value: AuthContextType = {
    currentUser,
    appUser,
    userRole: appUser?.role || null,
    loading,
    login,
    signup,
    logout,
    isAdmin: appUser?.role === 'admin'
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}