/**
 * Firebase 인증 서비스
 */

import { auth } from './firebaseConfig.js';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js';

class AuthService {
  constructor() {
    this.googleProvider = new GoogleAuthProvider();
  }

  /**
   * Google 팝업 로그인
   * @returns {Promise<import('firebase/auth').UserCredential>}
   */
  async signInWithGoogle() {
    return signInWithPopup(auth, this.googleProvider);
  }

  /**
   * 이메일/비밀번호 로그인
   * @param {string} email
   * @param {string} password
   * @returns {Promise<import('firebase/auth').UserCredential>}
   */
  async signInWithEmail(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  /**
   * 이메일/비밀번호 회원가입
   * @param {string} email
   * @param {string} password
   * @returns {Promise<import('firebase/auth').UserCredential>}
   */
  async signUpWithEmail(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  /**
   * 로그아웃
   * @returns {Promise<void>}
   */
  async signOut() {
    return firebaseSignOut(auth);
  }

  /**
   * 현재 로그인 사용자
   * @returns {import('firebase/auth').User|null}
   */
  getCurrentUser() {
    return auth.currentUser;
  }

  /**
   * 인증 상태 변경 감지
   * @param {Function} callback
   * @returns {Function} 구독 해제 함수
   */
  onAuthStateChanged(callback) {
    return firebaseOnAuthStateChanged(auth, callback);
  }
}

export const authService = new AuthService();
