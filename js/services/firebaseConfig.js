/**
 * Firebase 초기화 설정
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyDI3bf5HEXmcFnX8yMX3P_gWxA3aBoky7c",
  authDomain: "lol-viewerhelper.firebaseapp.com",
  projectId: "lol-viewerhelper",
  storageBucket: "lol-viewerhelper.firebasestorage.app",
  messagingSenderId: "164971715352",
  appId: "1:164971715352:web:f90e036233f0e6949c5c6d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
