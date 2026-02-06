import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  onSnapshot,
  query,
  where,
  Timestamp
} from "firebase/firestore";
import { db } from "./firebase";

// Firestore is used ONLY for user accounts and account requests.
// All restaurant data (orders, tables, menus, etc.) lives in PostgreSQL.

// Collections
const collections = {
  users: "users",
  accountRequests: "accountRequests"
} as const;

// User roles
export type UserRole = "admin" | "user" | "worker" | "kitchen" | "manager" | "floor";

// User types
export type AppUser = {
  id: string;
  uid?: string;
  email: string;
  name: string;
  role: UserRole;
  status: "active" | "inactive";
  createdAt?: Date;
  updatedAt?: Date;
  approvedBy?: string;
  approvedAt?: Date;
  isOnline?: boolean;
  assignedRestaurants?: number[];
  photoUrl?: string;
};

export type AccountRequest = {
  id: string;
  name: string;
  email: string;
  password: string;
  status: "pending" | "approved" | "rejected";
  role: UserRole | null;
  requestedAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  rejectedAt?: Date;
  rejectedBy?: string;
  rejectionReason?: string;
};

// Generic Firestore operations
async function addDocument<T>(collectionName: string, data: Omit<T, 'id'>) {
  const docRef = await addDoc(collection(db, collectionName), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  return docRef.id;
}

async function updateDocument<T>(collectionName: string, id: string, data: Partial<T>) {
  const docRef = doc(db, collectionName, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now()
  });
}

async function deleteDocument(collectionName: string, id: string) {
  const docRef = doc(db, collectionName, id);
  await deleteDoc(docRef);
}

async function getDocument<T>(collectionName: string, id: string): Promise<T | null> {
  const docRef = doc(db, collectionName, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as T;
  }
  return null;
}

async function getCollection<T>(collectionName: string): Promise<T[]> {
  const querySnapshot = await getDocs(collection(db, collectionName));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as T));
}

function listenToCollection<T>(
  collectionName: string,
  callback: (data: T[]) => void,
  queryConstraints?: any[]
) {
  const collectionRef = collection(db, collectionName);
  const q = queryConstraints ? query(collectionRef, ...queryConstraints) : collectionRef;

  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as T));
    callback(data);
  });
}

// ─── User Service ───────────────────────────────────────────────
export const userService = {
  getAll: () => getCollection<AppUser>(collections.users),
  getByUid: async (uid: string) => {
    const q = query(collection(db, collections.users), where("uid", "==", uid));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.length > 0 ?
      { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as AppUser : null;
  },
  getByEmail: async (email: string) => {
    const q = query(collection(db, collections.users), where("email", "==", email));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.length > 0 ?
      { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as AppUser : null;
  },
  get: (id: string) => getDocument<AppUser>(collections.users, id),
  add: (data: Omit<AppUser, 'id'>) => addDocument<AppUser>(collections.users, data),
  update: (id: string, data: Partial<AppUser>) => updateDocument<AppUser>(collections.users, id, data),
  delete: (id: string) => deleteDocument(collections.users, id),
  listen: (callback: (data: AppUser[]) => void) => listenToCollection<AppUser>(collections.users, callback)
};

// ─── Account Request Service ────────────────────────────────────
export const accountRequestService = {
  getAll: () => getCollection<AccountRequest>(collections.accountRequests),
  getPending: async () => {
    const q = query(collection(db, collections.accountRequests), where("status", "==", "pending"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AccountRequest));
  },
  get: (id: string) => getDocument<AccountRequest>(collections.accountRequests, id),
  add: (data: Omit<AccountRequest, 'id'>) => addDocument<AccountRequest>(collections.accountRequests, data),
  update: (id: string, data: Partial<AccountRequest>) => updateDocument<AccountRequest>(collections.accountRequests, id, data),
  delete: (id: string) => deleteDocument(collections.accountRequests, id),
  listen: (callback: (data: AccountRequest[]) => void) => listenToCollection<AccountRequest>(collections.accountRequests, callback),
  listenPending: (callback: (data: AccountRequest[]) => void) =>
    listenToCollection<AccountRequest>(collections.accountRequests, callback, [where("status", "==", "pending")])
};

// ─── Firestore Cleanup ─────────────────────────────────────────
// Deletes all documents from old/unused Firestore collections (restaurant data).
// Call this once to clean up leftover data that should only live in PostgreSQL.
export async function purgeFirestoreRestaurantData() {
  const staleCollections = [
    "restaurants", "menus", "menuCategories", "menuItems",
    "tables", "tableLayouts", "orders", "userProfiles", "dayTemplates"
  ];

  let totalDeleted = 0;
  for (const name of staleCollections) {
    const snapshot = await getDocs(collection(db, name));
    for (const docSnap of snapshot.docs) {
      await deleteDoc(doc(db, name, docSnap.id));
      totalDeleted++;
    }
  }
  return totalDeleted;
}
