// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { initializeFirestore, enableIndexedDbPersistence, CACHE_SIZE_UNLIMITED } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyALSEbtZpORWzNFjHLZe4YPTZr-2xa5w4U",
  authDomain: "vilko-puota.firebaseapp.com",
  projectId: "vilko-puota",
  storageBucket: "vilko-puota.firebasestorage.app",
  messagingSenderId: "136168411459",
  appId: "1:136168411459:web:098ca34dc18b6d7842dff6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with offline persistence
export const db = initializeFirestore(app, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
  ignoreUndefinedProperties: true
});

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled in one tab at a time
    console.warn('Offline persistence failed: Multiple tabs open');
  } else if (err.code === 'unimplemented') {
    // The current browser doesn't support offline persistence
    console.warn('Offline persistence not available in this browser');
  } else {
    console.warn('Offline persistence error:', err);
  }
});

// Initialize Auth
export const auth = getAuth(app);

export default app;