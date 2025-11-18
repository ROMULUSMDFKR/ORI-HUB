
import { collection, doc, getDoc as getFirestoreDoc, getDocs, addDoc, updateDoc, setDoc, deleteDoc as deleteFirestoreDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, getAuth, signOut } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { db, storage, auth, firebaseConfig } from '../firebase'; // Importa la instancia de la base de datos y storage
import { Invitation, User, Role } from '../types';

const getCollection = async (collectionName: string): Promise<any[]> => {
  console.log(`%c[FIREBASE] Obteniendo colección: ${collectionName}`, 'color: #FFCA28; font-weight: bold;');
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const data: any[] = [];
    querySnapshot.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() });
    });
    return data;
  } catch (error) {
    console.error(`Error fetching collection ${collectionName}:`, error);
    return [];
  }
};

const getDoc = async (collectionName: string, docId: string): Promise<any | null> => {
  console.log(`%c[FIREBASE] Obteniendo documento: ${collectionName}/${docId}`, 'color: #FF9800; font-weight: bold;');
  try {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getFirestoreDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      console.log(`No such document! (${collectionName}/${docId})`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching document ${collectionName}/${docId}:`, error);
    return null;
  }
};

const addFirebaseDoc = async (collectionName: string, newDoc: any): Promise<any> => {
    try {
        const docRef = await addDoc(collection(db, collectionName), newDoc);
        // Devolvemos el documento nuevo con el ID que Firestore le asignó.
        return { id: docRef.id, ...newDoc };
    } catch(error) {
        console.error(`Error adding document to ${collectionName}:`, error);
        throw error;
    }
};

const updateFirebaseDoc = async (collectionName: string, docId: string, updates: any): Promise<void> => {
    try {
        const docRef = doc(db, collectionName, docId);
        await updateDoc(docRef, updates);
    } catch(error) {
        console.error(`Error updating document ${collectionName}/${docId}:`, error);
        throw error;
    }
};

const deleteFirebaseDoc = async (collectionName: string, docId: string): Promise<void> => {
    try {
        const docRef = doc(db, collectionName, docId);
        await deleteFirestoreDoc(docRef);
        console.log(`%c[FIREBASE] Documento eliminado: ${collectionName}/${docId}`, 'color: #F44336;');
    } catch (error) {
        console.error(`Error deleting document ${collectionName}/${docId}:`, error);
        throw error;
    }
};

// En una aplicación real, no necesitarías esta función, pero la mantenemos para compatibilidad con el código existente.
const getLotsForProduct = async (productId: string): Promise<any[]> => {
    console.warn("getLotsForProduct no está implementado de forma optimizada para Firestore y devolverá un array vacío.");
    return [];
}

const uploadFile = async (file: File, path: string): Promise<string> => {
  console.log(`%c[FIREBASE] Subiendo archivo: ${file.name} a ${path}`, 'color: #4CAF50; font-weight: bold;');
  try {
    const storageRef = ref(storage, `${path}/${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log(`%c[FIREBASE] Archivo subido exitosamente. URL: ${downloadURL}`, 'color: #4CAF50;');
    return downloadURL;
  } catch (error) {
    console.error(`Error uploading file ${file.name}:`, error);
    throw error;
  }
};

const deleteFile = async (file: any): Promise<void> => {
  console.log(`%c[FIREBASE] Eliminando archivo: ${file.name}`, 'color: #F44336; font-weight: bold;');
  try {
    // 1. Delete from Storage
    const storageRef = ref(storage, `archives/${file.name}`);
    await deleteObject(storageRef);

    // 2. Delete from Firestore
    const docRef = doc(db, 'archives', file.id);
    await deleteFirestoreDoc(docRef);
    
    console.log(`%c[FIREBASE] Archivo ${file.name} eliminado con éxito.`, 'color: #F44336;');
  } catch (error) {
    console.error(`Error deleting file ${file.name}:`, error);
    throw error;
  }
};

const createUser = async (email: string, password: string): Promise<any> => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error("Error creating user in Firebase Auth:", error);
        throw error;
    }
};

const setFirebaseDoc = async (collectionName: string, docId: string, data: any): Promise<any> => {
    try {
        await setDoc(doc(db, collectionName, docId), data);
        // Return the full document with its ID for local state updates
        return { id: docId, ...data };
    } catch (error) {
        console.error(`Error setting document ${collectionName}/${docId}:`, error);
        throw error;
    }
};

const sendActivationEmail = async (email: string): Promise<void> => {
    try {
        await sendPasswordResetEmail(auth, email);
    } catch (error) {
        console.error("Error sending activation/password reset email:", error);
        throw error;
    }
};

// --- Admin Create User (Without Logout) ---

const adminCreateUser = async (email: string, password: string, userData: Omit<User, 'id'>): Promise<string> => {
    // Initialize a secondary app to avoid logging out the current user
    const secondaryApp = initializeApp(firebaseConfig, "Secondary");
    const secondaryAuth = getAuth(secondaryApp);

    try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        const uid = userCredential.user.uid;
        
        // Create the user profile in Firestore with the specific flag
        const newUserProfile: Omit<User, 'id'> = {
            ...userData,
            hasCompletedOnboarding: false, // Force them to complete onboarding
            avatarUrl: `https://i.pravatar.cc/150?u=${uid}`,
        };
        
        await setDoc(doc(db, 'users', uid), newUserProfile);
        
        // Clean up the secondary app session
        await signOut(secondaryAuth);
        
        return uid;
    } catch (error) {
        console.error("Error in adminCreateUser:", error);
        throw error;
    } finally {
        // Ensure the secondary app is deleted to free resources
        deleteApp(secondaryApp).catch(err => console.warn("Error deleting secondary app:", err));
    }
};


// --- New Invitation Functions (Legacy/Optional) ---

const createInvitation = async (invitationData: Omit<Invitation, 'id' | 'createdAt' | 'status'>): Promise<string> => {
    try {
        const newInvitation = {
            ...invitationData,
            createdAt: new Date().toISOString(),
            status: 'pending'
        };
        const docRef = await addDoc(collection(db, 'invitations'), newInvitation);
        return docRef.id;
    } catch (error) {
        console.error("Error creating invitation:", error);
        throw error;
    }
};

const getInvitation = async (invitationId: string): Promise<Invitation | null> => {
    try {
        const docRef = doc(db, 'invitations', invitationId);
        const docSnap = await getFirestoreDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as Invitation;
        }
        return null;
    } catch (error) {
        console.error("Error fetching invitation:", error);
        throw error;
    }
};

const registerUserWithInvitation = async (invitation: Invitation, password: string): Promise<any> => {
    try {
        // 1. Create Auth User
        const userCredential = await createUserWithEmailAndPassword(auth, invitation.email, password);
        const authUser = userCredential.user;

        // 2. Create User Profile in Firestore
        const newUserProfile: Omit<User, 'id'> = {
            name: invitation.name,
            email: invitation.email,
            avatarUrl: `https://i.pravatar.cc/150?u=${authUser.uid}`, // Placeholder
            roleId: invitation.roleId,
            teamId: invitation.teamId,
            companyId: invitation.companyId,
            permissions: invitation.permissions,
            isActive: true,
        };
        
        await setDoc(doc(db, 'users', authUser.uid), newUserProfile);

        // 3. Mark invitation as used (or delete it)
        await updateDoc(doc(db, 'invitations', invitation.id), { status: 'used' });

        return authUser;

    } catch (error) {
        console.error("Error registering with invitation:", error);
        throw error;
    }
};


export const api = {
  getCollection,
  getDoc,
  addDoc: addFirebaseDoc,
  updateDoc: updateFirebaseDoc,
  deleteDoc: deleteFirebaseDoc, // Exported generic delete
  getLotsForProduct,
  uploadFile,
  deleteFile,
  createUser,
  setDoc: setFirebaseDoc,
  sendActivationEmail,
  createInvitation,
  getInvitation,
  registerUserWithInvitation,
  adminCreateUser,
};
