import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { userService, type AppUser, type UserRole } from '@/lib/firestore';

// DEV MODE - set to false for production with real Firebase auth
const DEV_MODE = false;

// First admin email - this user gets admin role automatically
const FIRST_ADMIN_EMAIL = 'narutisjustinas@gmail.com';

// Mock user for development (only used when DEV_MODE is true)
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
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: { name?: string }) => Promise<void>;
  isAdmin: boolean;
  isFloorOrKitchen: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper to check if email is the first admin
const isFirstAdminEmail = (email: string): boolean => {
  return email.toLowerCase() === FIRST_ADMIN_EMAIL.toLowerCase();
};

// Helper to create or get user record
const getOrCreateUserRecord = async (user: User): Promise<AppUser | null> => {
  // Check if user already exists in Firestore
  let userData = await userService.getByUid(user.uid);

  if (userData) {
    return userData;
  }

  // User doesn't exist, check if it's the first admin
  const email = user.email || '';
  const isAdmin = isFirstAdminEmail(email);

  // For first admin, create and auto-approve
  if (isAdmin) {
    const newUser: Omit<AppUser, 'id'> = {
      uid: user.uid,
      email: email,
      name: user.displayName || email.split('@')[0],
      role: 'admin',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const userId = await userService.add(newUser);
    return { id: userId, ...newUser };
  }

  // For non-admin users signing in with Google, create pending record
  // They need admin approval
  return null;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(DEV_MODE ? DEV_USER : null);
  const [loading, setLoading] = useState(!DEV_MODE);

  const login = async (email: string, password: string) => {
    if (DEV_MODE) {
      setAppUser(DEV_USER);
      return;
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    // Check if user exists in our users collection and is approved
    const userData = await getOrCreateUserRecord(userCredential.user);
    if (!userData || userData.status !== 'active') {
      await signOut(auth);
      throw new Error('Account not approved or inactive. Please contact admin.');
    }
  };

  const signup = async (email: string, password: string) => {
    if (DEV_MODE) {
      return;
    }
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const signInWithGoogle = async () => {
    if (DEV_MODE) {
      setAppUser(DEV_USER);
      return;
    }

    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Check/create user record
    const userData = await getOrCreateUserRecord(user);

    if (!userData) {
      // User is not approved (not the first admin and not in system)
      await signOut(auth);
      throw new Error('Account not approved. Please request access and wait for admin approval.');
    }

    if (userData.status !== 'active') {
      await signOut(auth);
      throw new Error('Account is inactive. Please contact admin.');
    }

    setAppUser(userData);
  };

  const logout = async () => {
    if (DEV_MODE) {
      setAppUser(null);
      setTimeout(() => setAppUser(DEV_USER), 100);
      return;
    }
    await signOut(auth);
  };

  const updateProfile = async (updates: { name?: string }) => {
    if (!appUser) return;

    if (DEV_MODE) {
      setAppUser(prev => prev ? { ...prev, ...updates } : null);
      return;
    }

    await userService.update(appUser.id, {
      ...updates,
      updatedAt: new Date()
    });

    setAppUser(prev => prev ? { ...prev, ...updates } : null);
  };

  useEffect(() => {
    if (DEV_MODE) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        try {
          const userData = await getOrCreateUserRecord(user);
          if (userData && userData.status === 'active') {
            setAppUser(userData);
          } else {
            setAppUser(null);
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
    signInWithGoogle,
    logout,
    updateProfile,
    isAdmin: appUser?.role === 'admin',
    isFloorOrKitchen: appUser?.role === 'worker' || appUser?.role === 'kitchen'
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
