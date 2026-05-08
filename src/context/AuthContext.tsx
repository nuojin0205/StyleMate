import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext<{ user: any; loading: boolean; signIn: () => void; logout: () => void }>({
  user: null,
  loading: true,
  signIn: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      try {
        if (u) {
          setUser(u);
          const userRef = doc(db, 'users', u.uid);
          const userSnap = await getDoc(userRef).catch(err => {
            console.error("Firestore sync error:", err);
            return null;
          });

          if (userSnap && !userSnap.exists()) {
            await setDoc(userRef, {
              userId: u.uid,
              name: u.displayName,
              email: u.email,
              preferences: { styles: [], location: '' },
            }).catch(err => console.error("User creation error:", err));
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Auth change error:", err);
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-blocked') {
        alert('Popup was blocked by your browser. Please allow popups or open the app in a new tab.');
      } else {
        alert('Login failed: ' + err.message);
      }
    }
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
