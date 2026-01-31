/**
 * 챔피언 픽 페이지
 */

import { $, createElement, clearElement } from '../utils/dom.js';
import { BLUE_SLOT_ORDER, RED_SLOT_ORDER, POSITION_NAMES, POSITION_ICONS, POSITIONS } from '../utils/constants.js';
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
      this.createGlobalBansArea(currentState),
      this.createChampionGrid(),
      this.createTeamSlots(currentState)
    ]);

    container.appendChild(page);
    this.renderChampions();
    this.attachEvents();
  }

  /**
   * 글로벌 밴 영역 생성
   * @param {Object} currentState
   * @returns {Element}
   */
  createGlobalBansArea(currentState) {
    const { globalBans } = currentState;

    return createElement('div', { className: 'global-bans', id: 'global-bans' }, [
      // 블루팀 밴
      createElement('div', { className: 'global-bans__team global-bans__team--blue' }, [
        createElement('span', { className: 'global-bans__label' }, '밴'),
        createElement('div', { className: 'global-bans__slots', id: 'blue-bans' },
          globalBans.blue.map((champion, index) => this.createBanSlot('blue', index, champion))
        )
      ]),
      // 중앙 검색 + 초기화 버튼
      createElement('div', { className: 'global-bans__center' }, [
        createElement('input', {
          type: 'text',
          className: 'input global-bans__search',
          placeholder: '챔피언 검색',
          id: 'champion-search'
        }),
        createElement('button', {
          className: 'btn btn--sm btn--danger reset-game-btn',
          id: 'reset-game-btn',
          title: '이번 경기 모든 픽/밴 초기화'
        }, '초기화')
      ]),
      // 레드팀 밴
      createElement('div', { className: 'global-bans__team global-bans__team--red' }, [
        createElement('div', { className: 'global-bans__slots', id: 'red-bans' },
          globalBans.red.map((champion, index) => this.createBanSlot('red', index, champion))
        ),
        createElement('span', { className: 'global-bans__label' }, '밴')
      ])
    ]);
  }

  /**
   * 밴 슬롯 생성
   * @param {'blue'|'red'} team
   * @param {number} index
   * @param {Object|null} champion
   * @returns {Element}
   */
  createBanSlot(team, index, champion) {
    const filledClass = champion ? 'ban-slot--filled' : '';

    return createElement('div', {
      className: `ban-slot ban-slot--${team} ${filledClass}`,
      dataset: { banTeam: team, banIndex: index },
      draggable: champion ? 'true' : 'false'
    }, champion ? [
      createElement('img', {
        className: 'ban-slot__icon',
        src: champion.thumbnail,
        alt: champion.nameKr
      })
    ] : null);
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
    const pickedInOtherGames = state.getPickedChampionsInOtherGames();
    const globalBannedIds = state.getGlobalBannedChampionIds();

    champions.forEach(champion => {
      const assignment = state.findChampionAssignment(champion.id);
      const banAssignment = state.findGlobalBanAssignment(champion.id);
      const isPickedOther = pickedInOtherGames.has(champion.id);
      const isBanned = globalBannedIds.has(champion.id);
      
      let selectedClass = '';
      let isDisabled = false;

      if (assignment) {
        // 현재 게임에서 픽됨
        selectedClass = assignment.team === 'blueTeam'
          ? 'champion-item--selected-blue'
          : 'champion-item--selected-red';
        isDisabled = true;
      } else if (banAssignment) {
        // 글로벌 밴됨
        selectedClass = 'champion-item--banned';
        isDisabled = true;
      } else if (isPickedOther) {
        // 다른 게임에서 픽됨
        selectedClass = 'champion-item--picked-other';
        isDisabled = true;
      }

      const item = createElement('div', {
        className: `champion-item ${selectedClass}`,
        draggable: !isDisabled ? 'true' : 'false',
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
    const gameChampions = state.getCurrentGameChampions();

    return createElement('div', { className: 'team-slots-container' }, [
      // 블루팀 슬롯
      createElement('div', { className: 'team-slots team-slots--blue', id: 'blue-slots' },
        BLUE_SLOT_ORDER.map(position =>
          this.createSlot('blueTeam', position, currentState.blueTeam, gameChampions)
        )
      ),
      // VS 마크 및 진영 교환 버튼
      createElement('div', { className: 'vs-mark' }, [
        createElement('div', { className: 'vs-mark__teams' }, [
          createElement('span', { className: 'match-view__team-name--blue' }, currentState.blueTeam.name || '블루팀'),
        ]),
        createElement('button', { 
          className: 'btn btn--sm swap-teams-btn',
          id: 'swap-teams-btn',
          title: '진영 교환'
        }, '⇄'),
        createElement('div', { className: 'vs-mark__teams' }, [
          createElement('span', { className: 'match-view__team-name--red' }, currentState.redTeam.name || '레드팀'),
        ])
      ]),
      // 레드팀 슬롯
      createElement('div', { className: 'team-slots team-slots--red', id: 'red-slots' },
        RED_SLOT_ORDER.map(position =>
          this.createSlot('redTeam', position, currentState.redTeam, gameChampions)
        )
      )
    ]);
  }

  /**
   * 슬롯 생성
   * @param {string} teamKey
   * @param {string} position
   * @param {Object} teamData
   * @param {Object} gameChampions
   * @returns {Element}
   */
  createSlot(teamKey, position, teamData, gameChampions) {
    const player = teamData.players.find(p => p.position === position);
    const champion = gameChampions ? gameChampions[teamKey][position] : null;
    const team = teamKey === 'blueTeam' ? 'blue' : 'red';
    const filledClass = champion ? 'champion-slot--filled' : '';

    // 챔피언이 있으면 챔피언 이미지, 없으면 포지션 아이콘
    const iconArea = champion
      ? createElement('img', {
          src: champion.thumbnail,
          alt: champion.nameKr,
          className: 'champion-slot__champion-icon'
        })
      : createElement('img', {
          src: POSITION_ICONS[position],
          alt: POSITION_NAMES[position],
          className: 'champion-slot__position-icon'
        });

    return createElement('div', {
      className: `champion-slot champion-slot--${team} ${filledClass}`,
      dataset: { team: teamKey, position: position },
      draggable: champion ? 'true' : 'false'
    }, [
      createElement('div', { className: 'champion-slot__icon-area' }, [iconArea]),
      createElement('span', { className: 'champion-slot__position' }, POSITION_NAMES[position]),
      createElement('span', { className: 'champion-slot__player' }, player?.name || ''),
      createElement('span', { className: 'champion-slot__champion' }, champion?.nameKr || '')
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

    // 진영 교환 버튼
    const swapBtn = $('#swap-teams-btn');
    if (swapBtn) {
      swapBtn.addEventListener('click', () => {
        state.swapTeams();
        this.refreshAll();
      });
    }

    // 초기화 버튼
    const resetBtn = $('#reset-game-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('이번 경기의 모든 픽과 글로벌 밴을 초기화하시겠습니까?')) {
          state.resetCurrentGameAndBans();
          this.refreshAll();
        }
      });
    }

    // 드래그 앤 드롭 이벤트
    this.attachDragEvents();
  }

  /**
   * 드래그 앤 드롭 이벤트 연결
   */
  attachDragEvents() {
    const grid = $('#champion-grid');
    const container = document.querySelector('.champion-pick');
    const globalBans = $('#global-bans');

    // 그리드에서 드래그 시작 (챔피언 아이템)
    grid.addEventListener('dragstart', (e) => {
      const item = e.target.closest('.champion-item');
      if (item && !item.classList.contains('champion-item--selected-blue') &&
          !item.classList.contains('champion-item--selected-red') &&
          !item.classList.contains('champion-item--banned') &&
          !item.classList.contains('champion-item--picked-other')) {
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
        return;
      }

      // 밴 슬롯에서 드래그 시작
      const banSlot = e.target.closest('.ban-slot');
      if (banSlot && banSlot.classList.contains('ban-slot--filled')) {
        this.dragData = {
          type: 'ban',
          banTeam: banSlot.dataset.banTeam,
          banIndex: parseInt(banSlot.dataset.banIndex)
        };
        banSlot.classList.add('dragging');
      }
    });

    container.addEventListener('dragend', (e) => {
      const slot = e.target.closest('.champion-slot');
      if (slot) {
        slot.classList.remove('dragging');
      }
      const banSlot = e.target.closest('.ban-slot');
      if (banSlot) {
        banSlot.classList.remove('dragging');
      }
    });

    // 슬롯에 드롭
    container.addEventListener('dragover', (e) => {
      const slot = e.target.closest('.champion-slot');
      const banSlot = e.target.closest('.ban-slot');
      if (slot || banSlot) {
        e.preventDefault();
        if (slot) slot.classList.add('champion-slot--drag-over');
        if (banSlot) banSlot.classList.add('ban-slot--drag-over');
      }
    });

    container.addEventListener('dragleave', (e) => {
      const slot = e.target.closest('.champion-slot');
      const banSlot = e.target.closest('.ban-slot');
      if (slot) slot.classList.remove('champion-slot--drag-over');
      if (banSlot) banSlot.classList.remove('ban-slot--drag-over');
    });

    container.addEventListener('drop', (e) => {
      e.preventDefault();
      const slot = e.target.closest('.champion-slot');
      const banSlot = e.target.closest('.ban-slot');
      
      if (slot) {
        slot.classList.remove('champion-slot--drag-over');
        this.handleSlotDrop(slot);
      }
      if (banSlot) {
        banSlot.classList.remove('ban-slot--drag-over');
        this.handleBanDrop(banSlot);
      }
    });

    // 그리드에 드롭 (슬롯에서 제거)
    grid.addEventListener('dragover', (e) => {
      if (this.dragData && (this.dragData.type === 'slot' || this.dragData.type === 'ban')) {
        e.preventDefault();
      }
    });

    grid.addEventListener('drop', (e) => {
      e.preventDefault();
      if (this.dragData && this.dragData.type === 'slot') {
        // 슬롯에서 챔피언 제거
        state.assignChampion(this.dragData.team, this.dragData.position, null);
        this.refreshAll();
      } else if (this.dragData && this.dragData.type === 'ban') {
        // 밴 슬롯에서 챔피언 제거
        state.removeGlobalBan(this.dragData.banTeam, this.dragData.banIndex);
        this.refreshAll();
      }
    });
  }

  /**
   * 슬롯 드롭 처리
   * @param {Element} slot
   */
  handleSlotDrop(slot) {
    if (!this.dragData) return;

    const targetTeam = slot.dataset.team;
    const targetPosition = slot.dataset.position;

    if (this.dragData.type === 'champion') {
      // 챔피언 그리드에서 슬롯으로 드롭
      const champion = championService.getById(this.dragData.championId);
      if (champion) {
        state.assignChampion(targetTeam, targetPosition, champion);
        this.refreshAll();
      }
    } else if (this.dragData.type === 'slot') {
      // 슬롯에서 슬롯으로 드롭
      const sourceTeam = this.dragData.team;
      const sourcePosition = this.dragData.position;

      if (sourceTeam !== targetTeam || sourcePosition !== targetPosition) {
        state.swapChampions(sourceTeam, sourcePosition, targetTeam, targetPosition);
        this.refreshAll();
      }
    }

    this.dragData = null;
  }

  /**
   * 밴 슬롯 드롭 처리
   * @param {Element} banSlot
   */
  handleBanDrop(banSlot) {
    if (!this.dragData) return;

    const targetTeam = banSlot.dataset.banTeam;
    const targetIndex = parseInt(banSlot.dataset.banIndex);

    if (this.dragData.type === 'champion') {
      // 챔피언 그리드에서 밴 슬롯으로 드롭
      const champion = championService.getById(this.dragData.championId);
      if (champion) {
        state.addGlobalBan(targetTeam, targetIndex, champion);
        this.refreshAll();
      }
    } else if (this.dragData.type === 'ban') {
      // 밴 슬롯에서 밴 슬롯으로 드롭
      const sourceTeam = this.dragData.banTeam;
      const sourceIndex = this.dragData.banIndex;

      if (sourceTeam !== targetTeam || sourceIndex !== targetIndex) {
        state.swapGlobalBans(sourceTeam, sourceIndex, targetTeam, targetIndex);
        this.refreshAll();
      }
    }

    this.dragData = null;
  }

  /**
   * 전체 새로고침
   */
  refreshAll() {
    this.refreshSlots();
    this.refreshBans();
    this.renderChampions($('#champion-search')?.value || '');
  }

  /**
   * 슬롯 새로고침
   */
  refreshSlots() {
    const currentState = state.get();
    const gameChampions = state.getCurrentGameChampions();

    // 블루팀 슬롯 갱신
    const blueSlots = $('#blue-slots');
    if (blueSlots) {
      clearElement(blueSlots);
      BLUE_SLOT_ORDER.forEach(position => {
        blueSlots.appendChild(this.createSlot('blueTeam', position, currentState.blueTeam, gameChampions));
      });
    }

    // 레드팀 슬롯 갱신
    const redSlots = $('#red-slots');
    if (redSlots) {
      clearElement(redSlots);
      RED_SLOT_ORDER.forEach(position => {
        redSlots.appendChild(this.createSlot('redTeam', position, currentState.redTeam, gameChampions));
      });
    }

    // 팀 이름 갱신
    const vsMarkTeams = document.querySelectorAll('.vs-mark__teams span');
    if (vsMarkTeams.length >= 2) {
      vsMarkTeams[0].textContent = currentState.blueTeam.name || '블루팀';
      vsMarkTeams[1].textContent = currentState.redTeam.name || '레드팀';
    }
  }

  /**
   * 밴 슬롯 새로고침
   */
  refreshBans() {
    const currentState = state.get();
    const { globalBans } = currentState;

    const blueBans = $('#blue-bans');
    if (blueBans) {
      clearElement(blueBans);
      globalBans.blue.forEach((champion, index) => {
        blueBans.appendChild(this.createBanSlot('blue', index, champion));
      });
    }

    const redBans = $('#red-bans');
    if (redBans) {
      clearElement(redBans);
      globalBans.red.forEach((champion, index) => {
        redBans.appendChild(this.createBanSlot('red', index, champion));
      });
    }
  }
}
