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
import { ItemDictPage } from './pages/ItemDictPage.js';

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

/**
 * 앱 초기화
 */
async function initApp() {
  const router = new Router();
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
  router.register(ROUTES.ITEM_DICT, new ItemDictPage(router));

  // 게임 탭 이벤트 설정
  setupGameTabs(router);

  // 라우터 시작
  router.start();

  // 초기 게임 탭 상태 업데이트
  updateGameTabsUI();
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
