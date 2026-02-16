/**
 * Firestore 실시간 동기화 서비스
 */

import { db } from './firebaseConfig.js';
import {
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js';

class SyncService {
  constructor() {
    this.unsubscribe = null;
    this.userId = null;
    this.debounceTimer = null;
    this.onRemoteUpdate = null;
    this._isSaving = false;
  }

  /**
   * 실시간 동기화 시작
   * @param {string} userId
   * @param {Function} onRemoteUpdate - 원격 데이터 변경 시 콜백
   */
  startSync(userId, onRemoteUpdate) {
    this.stopSync();
    this.userId = userId;
    this.onRemoteUpdate = onRemoteUpdate;

    const docRef = doc(db, 'users', userId);

    this.unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (this._isSaving) return;

      if (snapshot.exists()) {
        const data = snapshot.data();
        if (this.onRemoteUpdate) {
          this.onRemoteUpdate(data);
        }
      }
    }, (error) => {
      console.warn('동기화 리스너 오류:', error);
    });
  }

  /**
   * 동기화 중지
   */
  stopSync() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.userId = null;
    this.onRemoteUpdate = null;
  }

  /**
   * 클라우드에 상태 저장 (300ms debounce)
   * @param {Object} stateData - 앱 상태 데이터
   * @param {Array} savedTeams - 저장된 팀 목록
   */
  saveToCloud(stateData, savedTeams) {
    if (!this.userId) return;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      try {
        this._isSaving = true;
        const docRef = doc(db, 'users', this.userId);
        await setDoc(docRef, {
          state: stateData,
          savedTeams: savedTeams || [],
          lastUpdated: serverTimestamp()
        });
      } catch (error) {
        console.warn('클라우드 저장 실패:', error);
      } finally {
        setTimeout(() => {
          this._isSaving = false;
        }, 500);
      }
    }, 300);
  }

  /**
   * 동기화 활성 여부
   * @returns {boolean}
   */
  isActive() {
    return this.userId !== null && this.unsubscribe !== null;
  }
}

export const syncService = new SyncService();
