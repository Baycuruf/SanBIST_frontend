// src/hooks/useAuth.js
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

export const useAuth = () => {
  const [user, setUser] = useState(null); // Sadece auth kullanıcısı
  const [userData, setUserData] = useState(null); // Firestore'dan gelen kullanıcı verisi (username, balance)
  const [portfolioData, setPortfolioData] = useState({ assets: [], transactions: [], totalValue: 0 });
  const [loading, setLoading] = useState(true);

  const auth = getAuth();

  const userUnsubscribe = useRef(null);
  const portfolioUnsubscribe = useRef(null);

  const setupListeners = useCallback((firebaseUser) => {
    if (!firebaseUser) {
      if (userUnsubscribe.current) userUnsubscribe.current();
      if (portfolioUnsubscribe.current) portfolioUnsubscribe.current();
      setUserData(null);
      setPortfolioData({ assets: [], transactions: [], totalValue: 0 });
      return;
    }

    try {
      // 1. Kullanıcı verisi dinleyicisi (username, virtualBalance)
      const userRef = doc(db, 'users', firebaseUser.uid);
      userUnsubscribe.current = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          // console.log("Firestore user data updated:", docSnap.data()); // LOG KALDIRILDI
          setUserData(docSnap.data());
        } else {
          console.warn("User document not found in Firestore:", firebaseUser.uid);
          setUserData({
              username: firebaseUser.displayName || firebaseUser.email,
              virtualBalance: 100000,
          });
        }
      }, (error) => {
          console.error("Error listening to user data:", error);
          setUserData(null);
      });

      // 2. Portföy verisi dinleyicisi (assets, transactions)
      const portfolioRef = doc(db, 'portfolios', firebaseUser.uid);
      portfolioUnsubscribe.current = onSnapshot(portfolioRef, (docSnap) => {
        if (docSnap.exists()) {
          // console.log("Firestore portfolio data updated:", docSnap.data().assets?.length || 0, "assets"); // LOG KALDIRILDI
          setPortfolioData(docSnap.data());
        } else {
          console.log("Portfolio document not found, creating initial...");
           const initialPortfolio = { assets: [], transactions: [], totalValue: 0, createdAt: new Date(), lastUpdated: new Date() };
           setDoc(portfolioRef, initialPortfolio).catch(err => console.error("Error creating initial portfolio:", err));
           setPortfolioData(initialPortfolio);
        }
      }, (error) => {
          console.error("Error listening to portfolio data:", error);
           setPortfolioData({ assets: [], transactions: [], totalValue: 0 });
      });

    } catch (error) {
      console.error("Error setting up listeners:", error);
       setUserData(null);
       setPortfolioData({ assets: [], transactions: [], totalValue: 0 });
    }

  }, []); // Bağımlılık yok

  // Auth state dinleyicisi
  useEffect(() => {
    setLoading(true);
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName
        });
        // console.log("Auth state changed: Logged in", firebaseUser.uid); // LOG KALDIRILDI
        setupListeners(firebaseUser);
      } else {
        setUser(null);
        setupListeners(null);
        // console.log("Auth state changed: Logged out"); // LOG KALDIRILDI
      }
       setLoading(false);
    });

    return () => {
        // console.log("Cleaning up auth/firestore listeners..."); // LOG KALDIRILDI
        unsubscribeAuth();
        if (userUnsubscribe.current) userUnsubscribe.current();
        if (portfolioUnsubscribe.current) portfolioUnsubscribe.current();
    };
  }, [auth, setupListeners]);

  // Login fonksiyonu
  const login = useCallback(async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      // console.error("Login failed:", error); // LOG KALDIRILDI (Login.js zaten logluyor)
      throw error;
    }
  }, [auth]);

  // Register fonksiyonu
   const register = useCallback(async (email, password, username) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      await updateProfile(firebaseUser, { displayName: username });

      const userRef = doc(db, 'users', firebaseUser.uid);
      await setDoc(userRef, { username, email, virtualBalance: 100000, createdAt: new Date() });
      const portfolioRef = doc(db, 'portfolios', firebaseUser.uid);
      await setDoc(portfolioRef, { assets: [], transactions: [], totalValue: 0, createdAt: new Date(), lastUpdated: new Date() });

    } catch (error) {
      // console.error("Registration failed:", error); // LOG KALDIRILDI (Register.js zaten logluyor)
      throw error;
    }
  }, [auth]);

  // Logout fonksiyonu
  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error); // Bu kalsın, önemli bir hata
      throw error;
    }
  }, [auth]);

  // Dışarıya verilecek değerler
  return {
    user: user ? { ...user, username: userData?.username || user.displayName } : null,
    loading,
    portfolio: portfolioData?.assets || [],
    virtualBalance: userData?.virtualBalance ?? 100000,
    login,
    register,
    logout,
  };
};