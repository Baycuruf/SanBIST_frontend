// src/firebase/config.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase konfigürasyonunuzu buraya ekleyin
// Bu bilgileri Firebase Console'dan alacaksınız
const firebaseConfig = {
  apiKey: "AIzaSyDrmI5J_CHZjvlHBaoF1FWWaYZiFSUtjjM",
  authDomain: "sanal-borsa-e4921.firebaseapp.com",
  projectId: "sanal-borsa-e4921",
  storageBucket: "sanal-borsa-e4921.firebasestorage.app",
  messagingSenderId: "659360077025",
  appId: "1:659360077025:web:b1c3af979c6a2ba24b13a0",
  measurementId: "G-CHCR9P7MVS"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);

// Servisleri export et
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;