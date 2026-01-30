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
  orderBy,
  Timestamp
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  Restaurant,
  Menu,
  MenuItem,
  Table,
  Order,
  UserProfile,
  MenuCategory,
  TableLayout,
  DayTemplate
} from "@shared/schema";

// Collections
export const collections = {
  restaurants: "restaurants",
  menus: "menus",
  menuCategories: "menuCategories",
  menuItems: "menuItems",
  tables: "tables",
  tableLayouts: "tableLayouts",
  orders: "orders",
  userProfiles: "userProfiles",
  dayTemplates: "dayTemplates",
  users: "users",
  accountRequests: "accountRequests"
} as const;

// User roles
export type UserRole = "admin" | "user" | "worker" | "kitchen" | "manager";

// User types
export type AppUser = {
  id: string;
  uid?: string; // Firebase Auth UID (optional for mock users)
  email: string;
  name: string;
  role: UserRole;
  status: "active" | "inactive";
  createdAt?: Date;
  updatedAt?: Date;
  approvedBy?: string;
  approvedAt?: Date;
  isOnline?: boolean; // For displaying online status
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
export async function addDocument<T>(collectionName: string, data: Omit<T, 'id'>) {
  const docRef = await addDoc(collection(db, collectionName), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  return docRef.id;
}

export async function updateDocument<T>(collectionName: string, id: string, data: Partial<T>) {
  const docRef = doc(db, collectionName, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now()
  });
}

export async function deleteDocument(collectionName: string, id: string) {
  const docRef = doc(db, collectionName, id);
  await deleteDoc(docRef);
}

export async function getDocument<T>(collectionName: string, id: string): Promise<T | null> {
  const docRef = doc(db, collectionName, id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as T;
  } else {
    return null;
  }
}

export async function getCollection<T>(collectionName: string): Promise<T[]> {
  const querySnapshot = await getDocs(collection(db, collectionName));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as T));
}

// Real-time listeners
export function listenToCollection<T>(
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

// Specific collection operations
export const restaurantService = {
  getAll: () => getCollection<Restaurant>(collections.restaurants),
  get: (id: string) => getDocument<Restaurant>(collections.restaurants, id),
  add: (data: Omit<Restaurant, 'id'>) => addDocument<Restaurant>(collections.restaurants, data),
  update: (id: string, data: Partial<Restaurant>) => updateDocument<Restaurant>(collections.restaurants, id, data),
  delete: (id: string) => deleteDocument(collections.restaurants, id),
  listen: (callback: (data: Restaurant[]) => void) => listenToCollection<Restaurant>(collections.restaurants, callback)
};

export const menuService = {
  getAll: () => getCollection<Menu>(collections.menus),
  getByRestaurant: async (restaurantId: string) => {
    const q = query(collection(db, collections.menus), where("restaurantId", "==", restaurantId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Menu));
  },
  get: (id: string) => getDocument<Menu>(collections.menus, id),
  add: (data: Omit<Menu, 'id'>) => addDocument<Menu>(collections.menus, data),
  update: (id: string, data: Partial<Menu>) => updateDocument<Menu>(collections.menus, id, data),
  delete: (id: string) => deleteDocument(collections.menus, id)
};

export const menuItemService = {
  getAll: () => getCollection<MenuItem>(collections.menuItems),
  getByCategory: async (categoryId: string) => {
    const q = query(collection(db, collections.menuItems), where("categoryId", "==", categoryId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
  },
  get: (id: string) => getDocument<MenuItem>(collections.menuItems, id),
  add: (data: Omit<MenuItem, 'id'>) => addDocument<MenuItem>(collections.menuItems, data),
  update: (id: string, data: Partial<MenuItem>) => updateDocument<MenuItem>(collections.menuItems, id, data),
  delete: (id: string) => deleteDocument(collections.menuItems, id)
};

export const tableService = {
  getAll: () => getCollection<Table>(collections.tables),
  getByLayout: async (layoutId: string) => {
    const q = query(collection(db, collections.tables), where("layoutId", "==", layoutId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Table));
  },
  getActive: async () => {
    const q = query(collection(db, collections.tables), where("isActive", "==", true));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Table));
  },
  get: (id: string) => getDocument<Table>(collections.tables, id),
  add: (data: Omit<Table, 'id'>) => addDocument<Table>(collections.tables, data),
  update: (id: string, data: Partial<Table>) => updateDocument<Table>(collections.tables, id, data),
  delete: (id: string) => deleteDocument(collections.tables, id),
  listen: (callback: (data: Table[]) => void) => listenToCollection<Table>(collections.tables, callback)
};

export const orderService = {
  getAll: () => getCollection<Order>(collections.orders),
  getByTable: async (tableId: string) => {
    const q = query(collection(db, collections.orders), where("tableId", "==", tableId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
  },
  get: (id: string) => getDocument<Order>(collections.orders, id),
  add: (data: Omit<Order, 'id'>) => addDocument<Order>(collections.orders, data),
  update: (id: string, data: Partial<Order>) => updateDocument<Order>(collections.orders, id, data),
  delete: (id: string) => deleteDocument(collections.orders, id),
  listen: (callback: (data: Order[]) => void) => listenToCollection<Order>(collections.orders, callback),
  listenActive: (callback: (data: Order[]) => void) =>
    listenToCollection<Order>(collections.orders, callback, [where("completed", "==", false)])
};

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