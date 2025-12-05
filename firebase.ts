import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
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

// Exporta la instancia de Firestore para usarla en la aplicación
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
