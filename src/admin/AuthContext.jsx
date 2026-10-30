import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { ADMIN_EMAIL, auth } from '../firebase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const value = useMemo(() => {
    const email = (user?.email || '').toLowerCase();
    // The real protection is in firestore.rules / storage.rules; this just keeps other accounts out of the UI.
    const isAdmin = Boolean(user) && (!ADMIN_EMAIL || email === ADMIN_EMAIL);
    return {
      user,
      loading,
      isAdmin,
      signIn: (e, p) => signInWithEmailAndPassword(auth, e, p),
      signOut: () => signOut(auth),
    };
  }, [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
