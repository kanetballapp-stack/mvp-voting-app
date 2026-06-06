// src/firebase.js
// -------------------------------------------------------
// STEP 1: Replace the firebaseConfig below with YOUR config
// from Firebase Console → Project Settings → Your Apps
// -------------------------------------------------------

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAnLe2SQ2bm1vTZefbveYPv6bWOqMiwsvI",
  authDomain: "mvp-voting-c0d17.firebaseapp.com",
  projectId: "mvp-voting-c0d17",
  storageBucket: "mvp-voting-c0d17.firebasestorage.app",
  messagingSenderId: "871908518277",
  appId: "1:871908518277:web:6daf147fe54e416c8d7cec"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
