/**
 * 챔피언 픽 페이지
 */

import { $, createElement, clearElement } from '../utils/dom.js';
import { BLUE_SLOT_ORDER, RED_SLOT_ORDER, POSITION_NAMES, ROUTES } from '../utils/constants.js';
import { state } from '../state.js';
import { championService } from '../services/ChampionService.js';

export class ChampionPickPage {
  constructor(router) {
    this.router = router;
    this.dragData = null;
  }

  /**
   * 페이지 렌더링
   * @param {Element} container
   */
  async render(container) {
    clearElement(container);

    // 챔피언 데이터 로드
    await championService.load();

    const currentState = state.get();

    const page = createElement('div', { className: 'page champion-pick' }, [
      this.createSearchArea(),
      this.createChampionGrid(),
      this.createTeamSlots(currentState),
      this.createNavButtons()
    ]);

    container.appendChild(page);
    this.renderChampions();
    this.attachEvents();
  }

  /**
   * 검색 영역 생성
   * @returns {Element}
   */
  createSearchArea() {
    return createElement('div', { className: 'champion-pick__search' }, [
      createElement('input', {
        type: 'text',
        className: 'input champion-pick__search-input',
        placeholder: '챔피언 검색 (한글/영문)',
        id: 'champion-search'
      })
    ]);
  }

  /**
   * 챔피언 그리드 영역 생성
   * @returns {Element}
   */
  createChampionGrid() {
    return createElement('div', { className: 'champion-grid-container' }, [
      createElement('div', { className: 'champion-grid', id: 'champion-grid' })
    ]);
  }

  /**
   * 챔피언 그리드 렌더링
   * @param {string} query
   */
  renderChampions(query = '') {
    const grid = $('#champion-grid');
    if (!grid) return;

    clearElement(grid);

    const champions = championService.search(query);
    const currentState = state.get();

    champions.forEach(champion => {
      const assignment = state.findChampionAssignment(champion.id);
      let selectedClass = '';
      if (assignment) {
        selectedClass = assignment.team === 'blueTeam'
          ? 'champion-item--selected-blue'
          : 'champion-item--selected-red';
      }

      const item = createElement('div', {
        className: `champion-item ${selectedClass}`,
        draggable: !assignment ? 'true' : 'false',
        dataset: {
          championId: champion.id,
          championName: champion.nameKr
        }
      }, [
        createElement('img', {
          className: 'champion-item__icon',
          src: champion.thumbnail,
          alt: champion.nameKr,
          loading: 'lazy'
        }),
        createElement('span', { className: 'champion-item__name' }, champion.nameKr)
      ]);

      grid.appendChild(item);
    });
  }

  /**
   * 팀 슬롯 영역 생성
   * @param {Object} currentState
   * @returns {Element}
   */
  createTeamSlots(currentState) {
    return createElement('div', { className: 'team-slots-container' }, [
      // 블루팀 슬롯
      createElement('div', { className: 'team-slots team-slots--blue', id: 'blue-slots' },
        BLUE_SLOT_ORDER.map(position =>
          this.createSlot('blueTeam', position, currentState.blueTeam)
        )
      ),
      // VS 마크
      createElement('div', { className: 'vs-mark' }, [
        createElement('div', { className: 'vs-mark__teams' }, [
          createElement('span', { className: 'match-view__team-name--blue' }, currentState.blueTeam.name || '블루팀'),
        ]),
        createElement('span', { className: 'vs-mark__text' }, 'VS'),
        createElement('div', { className: 'vs-mark__teams' }, [
          createElement('span', { className: 'match-view__team-name--red' }, currentState.redTeam.name || '레드팀'),
        ])
      ]),
      // 레드팀 슬롯
      createElement('div', { className: 'team-slots team-slots--red', id: 'red-slots' },
        RED_SLOT_ORDER.map(position =>
          this.createSlot('redTeam', position, currentState.redTeam)
        )
      )
    ]);
  }

  /**
   * 슬롯 생성
   * @param {string} teamKey
   * @param {string} position
   * @param {Object} teamData
   * @returns {Element}
   */
  createSlot(teamKey, position, teamData) {
    const player = teamData.players.find(p => p.position === position);
    const champion = player?.champion;
    const team = teamKey === 'blueTeam' ? 'blue' : 'red';
    const filledClass = champion ? 'champion-slot--filled' : '';

    const iconArea = champion
      ? createElement('img', {
          src: champion.thumbnail,
          alt: champion.nameKr
        })
      : null;

    return createElement('div', {
      className: `champion-slot champion-slot--${team} ${filledClass}`,
      dataset: { team: teamKey, position: position },
      draggable: champion ? 'true' : 'false'
    }, [
      createElement('div', { className: 'champion-slot__icon-area' }, iconArea ? [iconArea] : null),
      createElement('span', { className: 'champion-slot__position' }, POSITION_NAMES[position]),
      createElement('span', { className: 'champion-slot__player' }, player?.name || ''),
      createElement('span', { className: 'champion-slot__champion' }, champion?.nameKr || '')
    ]);
  }

  /**
   * 네비게이션 버튼 생성
   * @returns {Element}
   */
  createNavButtons() {
    return createElement('div', { className: 'nav-buttons' }, [
      createElement('button', {
        className: 'btn btn--secondary',
        id: 'btn-prev'
      }, '← 팀 설정'),
      createElement('button', {
        className: 'btn btn--primary',
        id: 'btn-next'
      }, '경기 시작 →')
    ]);
  }

  /**
   * 이벤트 연결
   */
  attachEvents() {
    // 검색
    const searchInput = $('#champion-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.renderChampions(e.target.value);
      });
    }

    // 드래그 앤 드롭 이벤트
    this.attachDragEvents();

    // 네비게이션 버튼
    const btnPrev = $('#btn-prev');
    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        this.router.navigate(ROUTES.TEAM_SETUP);
      });
    }

    const btnNext = $('#btn-next');
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        this.router.navigate(ROUTES.MATCH_VIEW);
      });
    }
  }

  /**
   * 드래그 앤 드롭 이벤트 연결
   */
  attachDragEvents() {
    const grid = $('#champion-grid');
    const container = document.querySelector('.champion-pick');

    // 그리드에서 드래그 시작 (챔피언 아이템)
    grid.addEventListener('dragstart', (e) => {
      const item = e.target.closest('.champion-item');
      if (item && !item.classList.contains('champion-item--selected-blue') &&
          !item.classList.contains('champion-item--selected-red')) {
        this.dragData = {
          type: 'champion',
          championId: parseInt(item.dataset.championId),
          championName: item.dataset.championName
        };
        item.classList.add('dragging');
      }
    });

    grid.addEventListener('dragend', (e) => {
      const item = e.target.closest('.champion-item');
      if (item) {
        item.classList.remove('dragging');
      }
      this.dragData = null;
    });

    // 슬롯에서 드래그 시작
    container.addEventListener('dragstart', (e) => {
      const slot = e.target.closest('.champion-slot');
      if (slot && slot.classList.contains('champion-slot--filled')) {
        this.dragData = {
          type: 'slot',
          team: slot.dataset.team,
          position: slot.dataset.position
        };
        slot.classList.add('dragging');
      }
    });

    container.addEventListener('dragend', (e) => {
      const slot = e.target.closest('.champion-slot');
      if (slot) {
        slot.classList.remove('dragging');
      }
    });

    // 슬롯에 드롭
    container.addEventListener('dragover', (e) => {
      const slot = e.target.closest('.champion-slot');
      if (slot) {
        e.preventDefault();
        slot.classList.add('champion-slot--drag-over');
      }
    });

    container.addEventListener('dragleave', (e) => {
      const slot = e.target.closest('.champion-slot');
      if (slot) {
        slot.classList.remove('champion-slot--drag-over');
      }
    });

    container.addEventListener('drop', (e) => {
      e.preventDefault();
      const slot = e.target.closest('.champion-slot');
      if (slot) {
        slot.classList.remove('champion-slot--drag-over');
        this.handleDrop(slot);
      }
    });

    // 그리드에 드롭 (슬롯에서 제거)
    grid.addEventListener('dragover', (e) => {
      if (this.dragData && this.dragData.type === 'slot') {
        e.preventDefault();
      }
    });

    grid.addEventListener('drop', (e) => {
      e.preventDefault();
      if (this.dragData && this.dragData.type === 'slot') {
        // 슬롯에서 챔피언 제거
        state.assignChampion(this.dragData.team, this.dragData.position, null);
        this.refreshSlots();
        this.renderChampions($('#champion-search')?.value || '');
      }
    });
  }

  /**
   * 드롭 처리
   * @param {Element} slot
   */
  handleDrop(slot) {
    if (!this.dragData) return;

    const targetTeam = slot.dataset.team;
    const targetPosition = slot.dataset.position;

    if (this.dragData.type === 'champion') {
      // 챔피언 그리드에서 슬롯으로 드롭
      const champion = championService.getById(this.dragData.championId);
      if (champion) {
        // 기존에 해당 슬롯에 챔피언이 있으면 제거
        state.assignChampion(targetTeam, targetPosition, champion);
        this.refreshSlots();
        this.renderChampions($('#champion-search')?.value || '');
      }
    } else if (this.dragData.type === 'slot') {
      // 슬롯에서 슬롯으로 드롭
      const sourceTeam = this.dragData.team;
      const sourcePosition = this.dragData.position;

      if (sourceTeam !== targetTeam || sourcePosition !== targetPosition) {
        state.swapChampions(sourceTeam, sourcePosition, targetTeam, targetPosition);
        this.refreshSlots();
        this.renderChampions($('#champion-search')?.value || '');
      }
    }

    this.dragData = null;
  }

  /**
   * 슬롯 새로고침
   */
  refreshSlots() {
    const currentState = state.get();

    // 블루팀 슬롯 갱신
    const blueSlots = $('#blue-slots');
    if (blueSlots) {
      clearElement(blueSlots);
      BLUE_SLOT_ORDER.forEach(position => {
        blueSlots.appendChild(this.createSlot('blueTeam', position, currentState.blueTeam));
      });
    }

    // 레드팀 슬롯 갱신
    const redSlots = $('#red-slots');
    if (redSlots) {
      clearElement(redSlots);
      RED_SLOT_ORDER.forEach(position => {
        redSlots.appendChild(this.createSlot('redTeam', position, currentState.redTeam));
      });
    }
  }
}
