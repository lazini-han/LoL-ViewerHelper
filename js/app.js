/**
 * 앱 진입점 및 라우터
 */

import { $ } from './utils/dom.js';
import { ROUTES } from './utils/constants.js';
import { state } from './state.js';
import { TeamSetupPage } from './pages/TeamSetupPage.js';
import { ChampionPickPage } from './pages/ChampionPickPage.js';
import { MatchViewPage } from './pages/MatchViewPage.js';
import { ObjectDictPage } from './pages/ObjectDictPage.js';
import { EtcPage } from './pages/EtcPage.js';
import { authService } from './services/authService.js';
import { syncService } from './services/syncService.js';
import { authModal } from './components/AuthModal.js';

/**
 * 라우터 클래스
 */
class Router {
  constructor() {
    this.routes = {};
    this.container = null;
  }

  /**
   * 라우트 등록
   * @param {string} path
   * @param {Object} page
   */
  register(path, page) {
    this.routes[path] = page;
  }

  /**
   * 컨테이너 설정
   * @param {Element} container
   */
  setContainer(container) {
    this.container = container;
  }

  /**
   * 페이지 이동
   * @param {string} path
   */
  navigate(path) {
    window.location.hash = path;
  }

  /**
   * 현재 라우트 처리
   */
  handleRoute() {
    const hash = window.location.hash.slice(1) || ROUTES.TEAM_SETUP;
    const page = this.routes[hash];

    if (page && this.container) {
      page.render(this.container);
      this.updateNavigation(hash);
    } else {
      // 기본 페이지로 이동
      this.navigate(ROUTES.TEAM_SETUP);
    }
  }

  /**
   * 네비게이션 활성 상태 업데이트
   * @param {string} currentRoute
   */
  updateNavigation(currentRoute) {
    const navItems = document.querySelectorAll('.nav__item');
    navItems.forEach(item => {
      const route = item.dataset.route;
      if (route === currentRoute) {
        item.classList.add('nav__item--active');
      } else {
        item.classList.remove('nav__item--active');
      }
    });
  }

  /**
   * 라우터 시작
   */
  start() {
    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
  }
}

/** @type {Router|null} */
let appRouter = null;

/**
 * 앱 초기화
 */
async function initApp() {
  const router = new Router();
  appRouter = router;
  const container = $('.main');

  if (!container) {
    console.error('메인 컨테이너를 찾을 수 없습니다.');
    return;
  }

  router.setContainer(container);

  // 페이지 등록
  router.register(ROUTES.TEAM_SETUP, new TeamSetupPage(router));
  router.register(ROUTES.CHAMPION_PICK, new ChampionPickPage(router));
  router.register(ROUTES.MATCH_VIEW, new MatchViewPage(router));
  router.register(ROUTES.OBJECT_DICT, new ObjectDictPage(router));
  router.register(ROUTES.ETC, new EtcPage(router)); // 아이템 + 스택 요소 탭

  // 게임 탭 이벤트 설정
  setupGameTabs(router);

  // 인증 UI 설정
  setupAuth(router);

  // 라우터 시작
  router.start();

  // 초기 게임 탭 상태 업데이트
  updateGameTabsUI();
}

/**
 * 인증 UI 및 상태 감시 설정
 * @param {Router} router
 */
function setupAuth(router) {
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      authModal.open();
    });
  }

  // 이번 접속에서 로그아웃 상태를 거쳤는지 (새로 로그인한 경우와 저장된 세션 복원을 구분)
  let wasLoggedOut = false;

  // 인증 상태 변경 감시
  authService.onAuthStateChanged((user) => {
    if (user) {
      // 로그인 상태
      const isFreshLogin = wasLoggedOut;
      syncService.startSync(
        user.uid,
        (cloudData) => {
          state.loadFromCloud(cloudData);
          if (appRouter) appRouter.handleRoute();
        },
        (cloudData) => handleFirstSync(cloudData, isFreshLogin)
      );
      updateAuthUI(user);
    } else {
      // 로그아웃 상태
      wasLoggedOut = true;
      syncService.stopSync();
      updateAuthUI(null);
    }
  });
}

/**
 * 로그인 후 첫 동기화: 로그인 전 데이터와 클라우드 데이터 중 무엇을 쓸지 결정
 * @param {Object|null} cloudData - 클라우드 문서 (없으면 null)
 * @param {boolean} isFreshLogin - 이번 접속에서 새로 로그인했는지
 */
function handleFirstSync(cloudData, isFreshLogin) {
  let keepLocal = false;

  if (!cloudData) {
    // 클라우드에 데이터가 없으면 로컬 데이터를 그대로 올림
    keepLocal = true;
  } else if (isFreshLogin && state.hasUserData() && !state.isSameAsCloud(cloudData)) {
    keepLocal = confirm(
      '로그인 전에 입력한 데이터가 클라우드에 저장된 데이터와 다릅니다.\n\n' +
      '[확인] 로그인 전 데이터 유지 (클라우드 데이터를 덮어씀)\n' +
      '[취소] 클라우드 데이터 불러오기 (로그인 전 데이터는 사라짐)'
    );
  }

  syncService.markReady();

  if (keepLocal) {
    state.uploadToCloud();
  } else {
    state.loadFromCloud(cloudData);
    if (appRouter) appRouter.handleRoute();
  }
}

/**
 * 헤더 인증 UI 업데이트
 * @param {Object|null} user
 */
function updateAuthUI(user) {
  const authArea = document.getElementById('auth-area');
  if (!authArea) return;

  if (user) {
    const displayName = user.displayName || user.email || '사용자';
    authArea.innerHTML = `
      <span class="header__sync-status header__sync-status--active">동기화</span>
      <span class="header__user-name">${escapeHtml(displayName)}</span>
      <button class="header__logout-btn" id="logout-btn">로그아웃</button>
    `;

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await authService.signOut();
      });
    }
  } else {
    authArea.innerHTML = `
      <button class="header__login-btn" id="login-btn">로그인</button>
    `;

    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        authModal.open();
      });
    }
  }
}

/**
 * HTML 이스케이프
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * 게임 탭 이벤트 설정
 * @param {Router} router
 */
function setupGameTabs(router) {
  const gameTabs = document.getElementById('game-tabs');
  if (!gameTabs) return;

  gameTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.game-tab');
    if (!tab) return;

    const gameNumber = parseInt(tab.dataset.game);
    state.setCurrentGame(gameNumber);
    updateGameTabsUI();

    // 현재 페이지 다시 렌더링
    router.handleRoute();
  });
}

/**
 * 게임 탭 UI 업데이트
 */
function updateGameTabsUI() {
  const currentGame = state.getCurrentGame();
  const tabs = document.querySelectorAll('.game-tab');

  tabs.forEach(tab => {
    const gameNumber = parseInt(tab.dataset.game);
    if (gameNumber === currentGame) {
      tab.classList.add('game-tab--active');
    } else {
      tab.classList.remove('game-tab--active');
    }
  });
}

// DOM 로드 완료 후 앱 초기화
document.addEventListener('DOMContentLoaded', initApp);
