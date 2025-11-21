
import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { api } from '../api/firebaseApi';
import { User, Role } from '../types';

export const useAuth = () => {
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUserProfile = useCallback(async (fbUser: FirebaseUser | null) => {
        if (fbUser) {
            try {
                let userProfile = await api.getDoc('users', fbUser.uid);
                
                if (!userProfile) {
                    console.warn("User profile not found in Firestore for UID, creating one:", fbUser.uid);
                    
                    const userRole = fbUser.email === 'contacto@robertoortega.me' ? 'Admin' : 'Ventas';
                    const roles = await api.getCollection('roles');
                    const defaultRole = roles.find(r => r.name === userRole);

                    const newUser: Omit<User, 'id'> = {
                        name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Nuevo Usuario',
                        email: fbUser.email || '',
                        avatarUrl: fbUser.photoURL || `https://i.pravatar.cc/150?u=${fbUser.uid}`,
                        roleId: defaultRole?.id || '',
                        role: defaultRole?.name || 'Usuario',
                        isActive: true,
                        // Default for legacy/auto-created users who skipped the new flow
                        hasCompletedOnboarding: true, 
                    };
                    
                    // If we found a role, apply its permissions as a template immediately
                    if (defaultRole) {
                        newUser.permissions = defaultRole.permissions;
                        newUser.roleName = defaultRole.name;
                    }

                    userProfile = await api.setDoc('users', fbUser.uid, newUser);
                }

                // Logic: User permissions take precedence. 
                // Role is just for the label (roleName) or fallback if user permissions are missing.
                if (userProfile && userProfile.roleId) {
                    const roleProfile = await api.getDoc('roles', userProfile.roleId);
                    if (roleProfile) {
                        userProfile.roleName = roleProfile.name;
                        
                        // ONLY if user has no permissions saved, use the role's permissions
                        if (!userProfile.permissions) {
                             userProfile.permissions = roleProfile.permissions;
                        }
                    }
                }
                
                // COMPATIBILITY: If hasCompletedOnboarding is undefined (legacy user), assume true.
                // IMPORTANT: Do NOT set to true if it is explicitly false.
                if (userProfile && userProfile.hasCompletedOnboarding === undefined) {
                    userProfile.hasCompletedOnboarding = true;
                }
                
                setUser(userProfile);

            } catch (error) {
                console.error("Error fetching user profile:", error);
                setUser(null);
            }
        } else {
            setUser(null);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
            setLoading(true);
            setFirebaseUser(fbUser);
            fetchUserProfile(fbUser);
        });
        return () => unsubscribe();
    }, [fetchUserProfile]);


    const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
    
    const logout = () => signOut(auth);

    const signup = async (email, password, fullName) => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const { user: authUser } = userCredential;

        const userRoleName = authUser.email === 'contacto@robertoortega.me' ? 'Admin' : 'Ventas';
        const roles = await api.getCollection('roles');
        const defaultRole = roles.find(r => r.name === userRoleName);

        const newUserProfile: Omit<User, 'id'> = {
            name: fullName,
            email: authUser.email || '',
            avatarUrl: authUser.photoURL || `https://i.pravatar.cc/150?u=${authUser.uid}`,
            roleId: defaultRole?.id || '',
            role: defaultRole?.name || 'Usuario',
            isActive: true,
            permissions: defaultRole?.permissions, // Stamp permissions on creation
            hasCompletedOnboarding: true // Direct signup skips the forced flow for now
        };

        const createdProfile = await api.setDoc('users', authUser.uid, newUserProfile);
        
        // Refetch to get merged permissions
        await fetchUserProfile(authUser);

        return userCredential;
    };
    
    const refreshUser = useCallback(() => {
        if (firebaseUser) {
            setLoading(true);
            fetchUserProfile(firebaseUser);
        }
    }, [firebaseUser, fetchUserProfile]);
    
    return { user, loading, login, logout, signup, refreshUser };
};
