
import { collection, doc, getDoc as getFirestoreDoc, getDocs, addDoc, updateDoc, setDoc, deleteDoc as deleteFirestoreDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, getAuth, signOut } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { db, storage, auth, firebaseConfig } from '../firebase'; // Importa la instancia de la base de datos y storage
import { Invitation, User, Role } from '../types';

const logAudit = async (entity: string, entityId: string, action: string) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
        await addDoc(collection(db, 'auditLogs'), {
            entity,
            entityId,
            action,
            by: user.uid,
            at: Timestamp.now()
        });
    } catch (error) {
        console.error("Failed to log audit:", error);
        // Don't throw here, we don't want to block the main action if audit fails
    }
};

const getCollection = async (collectionName: string): Promise<any[]> => {
  console.log(`%c[FIREBASE] Obteniendo colección: ${collectionName}`, 'color: #FFCA28; font-weight: bold;');
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const data: any[] = [];
    querySnapshot.forEach((doc) => {
      data.push({ ...doc.data(), id: doc.id });
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
      return { ...docSnap.data(), id: docSnap.id };
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
        
        if (collectionName !== 'auditLogs') {
            await logAudit(collectionName, docRef.id, 'Crear');
        }

        return { ...newDoc, id: docRef.id };
    } catch(error) {
        console.error(`Error adding document to ${collectionName}:`, error);
        throw error;
    }
};

const updateFirebaseDoc = async (collectionName: string, docId: string, updates: any): Promise<void> => {
    try {
        const docRef = doc(db, collectionName, docId);
        await updateDoc(docRef, updates);
        
        if (collectionName !== 'auditLogs') {
            await logAudit(collectionName, docId, 'Actualizar');
        }
    } catch(error) {
        console.error(`Error updating document ${collectionName}/${docId}:`, error);
        throw error;
    }
};

const deleteFirebaseDoc = async (collectionName: string, docId: string): Promise<void> => {
    try {
        const docRef = doc(db, collectionName, docId);
        await deleteFirestoreDoc(docRef);
        
        if (collectionName !== 'auditLogs') {
            await logAudit(collectionName, docId, 'Eliminar');
        }
        
        console.log(`%c[FIREBASE] Documento eliminado: ${collectionName}/${docId}`, 'color: #F44336;');
    } catch (error) {
        console.error(`Error deleting document ${collectionName}/${docId}:`, error);
        throw error;
    }
};

const getLotsForProduct = async (productId: string): Promise<any[]> => {
    try {
        const allLots = await getCollection('lots');
        return allLots.filter(l => l.productId === productId);
    } catch {
        return [];
    }
}

const uploadFile = async (file: File, path: string): Promise<string> => {
  console.log(`%c[FIREBASE] Subiendo archivo: ${file.name} a ${path}`, 'color: #4CAF50; font-weight: bold;');
  try {
    const storageRef = ref(storage, `${path}/${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    await logAudit('storage', file.name, 'Subir Archivo');

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
    const storageRef = ref(storage, `archives/${file.name}`);
    await deleteObject(storageRef);

    if (file.id) {
        const docRef = doc(db, 'archives', file.id);
        await deleteFirestoreDoc(docRef);
    }

    await logAudit('storage', file.name, 'Eliminar Archivo');
    
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
        
        if (collectionName !== 'auditLogs') {
            await logAudit(collectionName, docId, 'Crear/Sobrescribir');
        }

        return { ...data, id: docId };
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

const adminCreateUser = async (email: string, password: string, userData: Omit<User, 'id'>): Promise<string> => {
    const secondaryApp = initializeApp(firebaseConfig, "Secondary");
    const secondaryAuth = getAuth(secondaryApp);

    try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        const uid = userCredential.user.uid;
        
        const newUserProfile: Omit<User, 'id'> = {
            ...userData,
            hasCompletedOnboarding: false,
            avatarUrl: `https://i.pravatar.cc/150?u=${uid}`,
        };
        
        await setDoc(doc(db, 'users', uid), newUserProfile);
        
        await logAudit('users', uid, 'Crear Usuario (Admin)');

        await signOut(secondaryAuth);
        
        return uid;
    } catch (error) {
        console.error("Error in adminCreateUser:", error);
        throw error;
    } finally {
        deleteApp(secondaryApp).catch(err => console.warn("Error deleting secondary app:", err));
    }
};

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
            return { ...docSnap.data(), id: docSnap.id } as Invitation;
        }
        return null;
    } catch (error) {
        console.error("Error fetching invitation:", error);
        throw error;
    }
};

const registerUserWithInvitation = async (invitation: Invitation, password: string): Promise<any> => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, invitation.email, password);
        const authUser = userCredential.user;

        const newUserProfile: Omit<User, 'id'> = {
            name: invitation.name,
            email: invitation.email,
            avatarUrl: `https://i.pravatar.cc/150?u=${authUser.uid}`,
            roleId: invitation.roleId,
            role: 'Miembro',
            teamId: invitation.teamId,
            companyId: invitation.companyId,
            permissions: invitation.permissions,
            isActive: true,
            hasCompletedOnboarding: false,
        };
        
        await setDoc(doc(db, 'users', authUser.uid), newUserProfile);
        
        await logAudit('users', authUser.uid, 'Registro por Invitación');

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
  deleteDoc: deleteFirebaseDoc,
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
