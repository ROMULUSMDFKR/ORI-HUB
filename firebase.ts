
import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyBIWoF-yVO7hinxHnsIcO3HPv2DytaBm6g",
  authDomain: "ori-405da.firebaseapp.com",
  projectId: "ori-405da",
  storageBucket: "ori-405da.firebasestorage.app",
  messagingSenderId: "792838614738",
  appId: "1:792838614738:web:396a173558c4ef147a470b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Enable offline persistence to avoid "Could not reach backend" errors
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a a time.
        console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
        // The current browser does not support all of the features required to enable persistence
        console.warn('Firestore persistence not supported by this browser');
    }
});

export const storage = getStorage(app);
export const auth = getAuth(app);
