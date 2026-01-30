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

// DEV MODE - set to true to bypass Firebase authentication
const DEV_MODE = true;

// Mock user for development
const DEV_USER: AppUser = {
  id: 'dev-user-123',
  uid: 'dev-user-123',
  email: 'dev@localhost',
  name: 'Dev Admin',
  role: 'admin',
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date()
};

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
  const [appUser, setAppUser] = useState<AppUser | null>(DEV_MODE ? DEV_USER : null);
  const [loading, setLoading] = useState(!DEV_MODE);

  const login = async (email: string, password: string) => {
    if (DEV_MODE) {
      // In dev mode, accept any credentials
      setAppUser(DEV_USER);
      return;
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    // Check if user exists in our users collection and is approved
    const userData = await userService.getByUid(userCredential.user.uid);
    if (!userData || userData.status !== 'active') {
      await signOut(auth);
      throw new Error('Account not approved or inactive. Please contact admin.');
    }
  };

  const signup = async (email: string, password: string) => {
    if (DEV_MODE) {
      // In dev mode, just pretend signup worked
      return;
    }
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    if (DEV_MODE) {
      // In dev mode, we don't actually log out (refresh to "log back in")
      setAppUser(null);
      setTimeout(() => setAppUser(DEV_USER), 100); // Auto re-login
      return;
    }
    await signOut(auth);
  };

  useEffect(() => {
    // Skip Firebase auth listener in dev mode
    if (DEV_MODE) {
      setLoading(false);
      return;
    }

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
