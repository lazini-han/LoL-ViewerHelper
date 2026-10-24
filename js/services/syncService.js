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
    // 첫 스냅샷 처리(로컬/클라우드 데이터 선택)가 끝나기 전에는 로컬 변경을 업로드하지 않음
    this.ready = false;
  }

  /**
   * 실시간 동기화 시작
   * @param {string} userId
   * @param {Function} onRemoteUpdate - 원격 데이터 변경 시 콜백
   * @param {Function} onFirstSnapshot - 첫 스냅샷 콜백 (클라우드 데이터, 문서가 없으면 null).
   *   처리가 끝나면 markReady() 를 호출해야 업로드가 시작됨
   */
  startSync(userId, onRemoteUpdate, onFirstSnapshot) {
    this.stopSync();
    this.userId = userId;
    this.onRemoteUpdate = onRemoteUpdate;

    const docRef = doc(db, 'users', userId);
    let isFirst = true;

    this.unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (isFirst) {
        isFirst = false;
        onFirstSnapshot(snapshot.exists() ? snapshot.data() : null);
        return;
      }

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
    this.ready = false;
  }

  /**
   * 첫 스냅샷 처리 완료 - 이후 로컬 변경을 클라우드에 업로드
   */
  markReady() {
    this.ready = true;
  }

  /**
   * 클라우드에 상태 저장 (300ms debounce)
   * @param {Object} stateData - 앱 상태 데이터
   * @param {Array} savedTeams - 저장된 팀 목록
   */
  saveToCloud(stateData, savedTeams) {
    if (!this.userId || !this.ready) return;

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
    return this.userId !== null && this.unsubscribe !== null && this.ready;
  }
}

export const syncService = new SyncService();
