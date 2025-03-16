import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence, CACHE_SIZE_UNLIMITED } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";

// Debug environment variables
console.log("Firebase Config Debug - Environment variables loaded:", {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY ? "Set" : "Not set",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN ? "Set" : "Not set",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID ? "Set" : "Not set",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET ? "Set" : "Not set",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID ? "Set" : "Not set",
  appId: process.env.REACT_APP_FIREBASE_APP_ID ? "Set" : "Not set"
});

// Your web app's Firebase configuration
// Using hardcoded values for debugging
// Change this in config.js
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

console.log("Firebase Config Debug - Configuration:", {
  apiKey: firebaseConfig.apiKey ? "Set" : "Not set",
  authDomain: firebaseConfig.authDomain ? "Set" : "Not set",
  projectId: firebaseConfig.projectId ? "Set" : "Not set",
  storageBucket: firebaseConfig.storageBucket ? "Set" : "Not set",
  messagingSenderId: firebaseConfig.messagingSenderId ? "Set" : "Not set",
  appId: firebaseConfig.appId ? "Set" : "Not set"
});

// Initialize Firebase and services
let db = null;
let auth = null;
let storage = null;
let messaging = null;

try {
  const app = initializeApp(firebaseConfig);
  console.log("Firebase Config Debug - Firebase initialized successfully");

  // Initialize services
  db = getFirestore(app);
  
  // Enable offline persistence with unlimited cache size
  enableIndexedDbPersistence(db, {
    cacheSizeBytes: CACHE_SIZE_UNLIMITED
  }).then(() => {
    console.log("Firebase persistence enabled successfully");
  }).catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time
      console.warn("Firebase persistence couldn't be enabled: Multiple tabs open");
    } else if (err.code === 'unimplemented') {
      // The current browser doesn't support persistence
      console.warn("Firebase persistence not supported in this browser");
    } else {
      console.error("Firebase persistence error:", err);
    }
  });
  
  auth = getAuth(app);
  storage = getStorage(app);

  // Initialize messaging if browser supports service workers
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      messaging = getMessaging(app);
      console.log("Firebase Config Debug - Messaging initialized successfully");
    } catch (error) {
      console.error('Firebase messaging initialization error:', error);
    }
  }
} catch (error) {
  console.error("Firebase Config Debug - Firebase initialization error:", error);
}

export { db, auth, storage, messaging }; 