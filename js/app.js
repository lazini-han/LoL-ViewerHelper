/**
 * 앱 진입점 및 라우터
 */

import { $ } from './utils/dom.js';
import { ROUTES } from './utils/constants.js';
import { TeamSetupPage } from './pages/TeamSetupPage.js';
import { ChampionPickPage } from './pages/ChampionPickPage.js';
import { MatchViewPage } from './pages/MatchViewPage.js';

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
    } else {
      // 기본 페이지로 이동
      this.navigate(ROUTES.TEAM_SETUP);
    }
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

  // 라우터 시작
  router.start();
}

// DOM 로드 완료 후 앱 초기화
document.addEventListener('DOMContentLoaded', initApp);
