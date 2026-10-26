/**
 * 챔피언 픽 페이지
 */

import { $, createElement, clearElement } from '../utils/dom.js';
import { BLUE_SLOT_ORDER, RED_SLOT_ORDER, POSITION_NAMES, POSITION_ICONS, POSITIONS } from '../utils/constants.js';
import { state } from '../state.js';
import { UltTooltip } from '../components/UltTooltip.js';

// 한글 초성 (쌍자음은 기본 자음 인덱스로 묶음)
const INITIAL_CONSONANTS = ['ㄱ', 'ㄱ', 'ㄴ', 'ㄷ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅂ', 'ㅅ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

/**
 * 이름 첫 글자의 자음 인덱스
 * @param {string} name
 * @returns {string} 한글이 아니면 '#'
 */
function getConsonantIndex(name) {
  const code = (name || '').charCodeAt(0) - 0xAC00;
  if (code < 0 || code > 11171) return '#';
  return INITIAL_CONSONANTS[Math.floor(code / 588)];
}
import { championService } from '../services/ChampionService.js';

export class ChampionPickPage {
  constructor(router) {
    this.router = router;
    this.dragData = null;
    this.tapSelectedChampion = null;
    this._isDragging = false;
    this.positionFilter = new Set(); // 비어 있으면 전체 표시 (한 번에 하나의 포지션만 선택)
  }

  /**
   * 페이지 렌더링
   * @param {Element} container
   */
  async render(container) {
    clearElement(container);

    // 탭 선택은 안내 바와 함께 사라지므로 초기화 (보이지 않는 선택이 슬롯 탭에 적용되지 않도록)
    this.tapSelectedChampion = null;

    // 챔피언 데이터 로드
    await championService.load();

    const currentState = state.get();

    const page = createElement('div', { className: 'page champion-pick' }, [
      this.createGlobalBansArea(currentState),
      this.createTeamSlots(currentState),
      this.createTapGuide(),
      this.createChampionGrid(),
      createElement('div', { className: 'ult-tooltip', id: 'pick-tooltip' })
    ]);

    container.appendChild(page);
    this.tooltip = new UltTooltip($('#pick-tooltip'));
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
        }, '초기화'),
        createElement('button', {
          className: 'btn btn--sm btn--danger reset-game-btn',
          id: 'reset-all-btn',
          title: '1~5경기 모든 픽/밴 초기화'
        }, '전체 초기화')
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
   * 탭 선택 안내 바 생성
   * @returns {Element}
   */
  createTapGuide() {
    return createElement('div', { className: 'tap-guide', id: 'tap-guide' }, [
      createElement('span', { id: 'tap-guide-text' }, '슬롯을 탭하여 배치하세요'),
      createElement('button', {
        className: 'tap-guide__cancel',
        id: 'tap-guide-cancel'
      }, '취소')
    ]);
  }

  /**
   * 챔피언 그리드 영역 생성
   * @returns {Element}
   */
  createChampionGrid() {
    // 포지션 필터는 고정하고 챔피언 목록만 스크롤
    return createElement('div', { className: 'champion-grid-container' }, [
      this.createPositionFilter(),
      createElement('div', { className: 'champion-grid-scroll' }, [
        createElement('div', { className: 'champion-grid', id: 'champion-grid' })
      ])
    ]);
  }

  /**
   * 포지션 필터 바 생성
   * @returns {Element}
   */
  createPositionFilter() {
    return createElement('div', { className: 'position-filter', id: 'position-filter' },
      POSITIONS.map(position =>
        createElement('button', {
          // 다른 페이지에 다녀와도 유지된 필터를 버튼에 그대로 표시
          className: `position-filter__btn ${this.positionFilter.has(position) ? 'position-filter__btn--active' : ''}`,
          type: 'button',
          dataset: { position },
          title: POSITION_NAMES[position]
        }, [
          createElement('img', {
            className: 'position-filter__icon',
            src: POSITION_ICONS[position],
            alt: POSITION_NAMES[position]
          }),
          createElement('span', { className: 'position-filter__label' }, POSITION_NAMES[position])
        ])
      )
    );
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
    let lastIndex = null;

    champions.forEach(champion => {
      // 다른 경기에서 픽된 챔피언은 목록에서 완전히 제외 (빈자리 없이 정렬)
      if (pickedInOtherGames.has(champion.id)) return;

      // 포지션 필터 (선택된 포지션이 없으면 전체 표시)
      if (!this.matchesPositionFilter(champion)) return;

      // 자음이 바뀌는 자리에 챔피언 한 칸 크기의 자음 인덱스 삽입
      const consonant = getConsonantIndex(champion.nameKr);
      if (consonant !== lastIndex) {
        grid.appendChild(createElement('div', { className: 'champion-index', 'aria-hidden': 'true' }, [
          createElement('span', { className: 'champion-index__letter' }, consonant)
        ]));
        lastIndex = consonant;
      }

      const assignment = state.findChampionAssignment(champion.id);
      const banAssignment = state.findGlobalBanAssignment(champion.id);

      let selectedClass = '';
      let isDisabled = false;

      if (assignment) {
        selectedClass = assignment.team === 'blueTeam'
          ? 'champion-item--selected-blue'
          : 'champion-item--selected-red';
        isDisabled = true;
      } else if (banAssignment) {
        selectedClass = 'champion-item--banned';
        isDisabled = true;
      }

      // 현재 경기에 픽된 챔피언은 이미지 대신 회색 사각형 표시
      const iconEl = assignment
        ? createElement('div', { className: 'champion-item__icon champion-item__icon--masked' })
        : createElement('img', {
            className: 'champion-item__icon',
            src: champion.thumbnail,
            alt: champion.nameKr,
            loading: 'lazy'
          });

      const item = createElement('div', {
        className: `champion-item ${selectedClass}`,
        draggable: !isDisabled ? 'true' : 'false',
        dataset: {
          championId: champion.id,
          championName: champion.nameKr,
          championKey: champion.nameEn
        }
      }, [
        iconEl,
        createElement('span', { className: 'champion-item__name' }, champion.nameKr),
        this.createChampionPositions(champion)
      ]);

      grid.appendChild(item);
    });
  }

  /**
   * 챔피언 포지션 아이콘 목록 생성
   * @param {Object} champion
   * @returns {Element}
   */
  createChampionPositions(champion) {
    return createElement('div', { className: 'champion-item__positions' },
      (champion.positions || []).map(position =>
        createElement('img', {
          className: 'champion-item__position-icon',
          src: POSITION_ICONS[position],
          alt: POSITION_NAMES[position],
          title: POSITION_NAMES[position]
        })
      )
    );
  }

  /**
   * 챔피언이 현재 포지션 필터에 해당하는지 판정
   * @param {Object} champion
   * @returns {boolean}
   */
  matchesPositionFilter(champion) {
    if (this.positionFilter.size === 0) return true;
    if (!champion.positions || champion.positions.length === 0) return false;
    return champion.positions.some(position => this.positionFilter.has(position));
  }

  /**
   * 포지션 필터 선택 (단일 선택: 다른 포지션을 누르면 교체, 선택된 포지션을 다시 누르면 해제)
   * @param {string} position
   */
  togglePositionFilter(position) {
    const wasSelected = this.positionFilter.has(position);
    this.positionFilter.clear();
    if (!wasSelected) {
      this.positionFilter.add(position);
    }

    document.querySelectorAll('.position-filter__btn').forEach(btn => {
      btn.classList.toggle(
        'position-filter__btn--active',
        this.positionFilter.has(btn.dataset.position)
      );
    });

    this.renderChampions($('#champion-search')?.value || '');
    this.reapplyTapSelection();

    // 포지션이 바뀌면 목록을 처음부터 보여줌
    const scrollArea = $('.champion-grid-scroll');
    if (scrollArea) scrollArea.scrollTop = 0;
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
        this.getSlotOrder('blue').map(position =>
          this.createSlot('blueTeam', position, currentState.blueTeam, gameChampions)
        )
      ),
      // VS 마크 및 진영 교환 버튼
      createElement('div', { className: 'vs-mark' }, [
        createElement('div', { className: 'vs-mark__teams' }, [
          createElement('span', { className: 'match-view__team-name--blue' }, currentState.blueTeam.name || '블루팀'),
          this.createReverseOrderButton('blue')
        ]),
        createElement('button', {
          className: 'btn btn--sm swap-teams-btn',
          id: 'swap-teams-btn',
          title: '진영 교환'
        }, '⇄'),
        createElement('div', { className: 'vs-mark__teams' }, [
          createElement('span', { className: 'match-view__team-name--red' }, currentState.redTeam.name || '레드팀'),
          this.createReverseOrderButton('red')
        ])
      ]),
      // 레드팀 슬롯
      createElement('div', { className: 'team-slots team-slots--red', id: 'red-slots' },
        this.getSlotOrder('red').map(position =>
          this.createSlot('redTeam', position, currentState.redTeam, gameChampions)
        )
      )
    ]);
  }

  /**
   * 팀 슬롯의 포지션 순서 (뒤집기 설정 반영)
   * @param {'blue'|'red'} team
   * @returns {Array<string>}
   */
  getSlotOrder(team) {
    const order = team === 'blue' ? BLUE_SLOT_ORDER : RED_SLOT_ORDER;
    return state.get().slotOrderReversed?.[team] ? [...order].reverse() : order;
  }

  /**
   * 팀 포지션 순서 뒤집기 버튼 생성
   * @param {'blue'|'red'} team
   * @returns {Element}
   */
  createReverseOrderButton(team) {
    const teamName = team === 'blue' ? '블루팀' : '레드팀';
    return createElement('button', {
      className: `btn btn--sm reverse-order-btn ${state.get().slotOrderReversed?.[team] ? 'reverse-order-btn--active' : ''}`,
      dataset: { team },
      title: `${teamName} 포지션 순서 뒤집기`
    }, '↔ 순서');
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
      dataset: {
        team: teamKey,
        position: position,
        // 호버창용 챔피언 정보 (목록 아이템과 같은 키)
        ...(champion ? { championId: champion.id, championKey: champion.nameEn, championName: champion.nameKr } : {})
      },
      draggable: champion ? 'true' : 'false'
    }, [
      createElement('div', { className: 'champion-slot__icon-area' }, [iconArea]),
      createElement('span', { className: 'champion-slot__position' }, POSITION_NAMES[position]),
      createElement('span', { className: 'champion-slot__player' }, player?.name || ''),
      createElement('span', { className: 'champion-slot__champion' }, champion?.nameKr || '')
    ]);
  }

  /**
   * 챔피언 목록 호버창 이벤트 연결
   */
  attachTooltipEvents() {
    const grid = $('#champion-grid');
    if (!grid || !window.matchMedia('(hover: hover)').matches) return;

    grid.addEventListener('mouseover', (e) => {
      const icon = e.target.closest('.champion-item__icon');
      if (!icon || icon.contains(e.relatedTarget)) return;
      const item = icon.closest('.champion-item');
      const { championId, championKey, championName } = item.dataset;
      this.tooltip.showUltimate(icon, Number(championId), championKey, championName);
    });

    grid.addEventListener('mouseout', (e) => {
      const icon = e.target.closest('.champion-item__icon');
      if (!icon || icon.contains(e.relatedTarget)) return;
      this.tooltip.hide();
    });

    // 드래그를 시작하거나 목록을 스크롤하면 숨김
    grid.addEventListener('dragstart', () => this.tooltip.hide());
    $('.champion-grid-scroll')?.addEventListener('scroll', () => this.tooltip.hide(), { passive: true });

    // 픽된 챔피언 슬롯 (슬롯은 픽이 바뀔 때마다 다시 그려지므로 바깥 영역에 위임)
    const slotsArea = $('.team-slots-container');
    if (!slotsArea) return;

    slotsArea.addEventListener('mouseover', (e) => {
      const icon = e.target.closest('.champion-slot__champion-icon');
      if (!icon || icon.contains(e.relatedTarget)) return;
      const { championId, championKey, championName } = icon.closest('.champion-slot').dataset;
      this.tooltip.showUltimate(icon, Number(championId), championKey, championName);
    });

    slotsArea.addEventListener('mouseout', (e) => {
      const icon = e.target.closest('.champion-slot__champion-icon');
      if (!icon || icon.contains(e.relatedTarget)) return;
      this.tooltip.hide();
    });

    slotsArea.addEventListener('dragstart', () => this.tooltip.hide());
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
        this.reapplyTapSelection();
      });
    }

    // 진영 교환 버튼
    const swapBtn = $('#swap-teams-btn');
    if (swapBtn) {
      swapBtn.addEventListener('click', () => {
        state.swapTeams();
        this.clearTapSelection();
        this.refreshAll();
      });
    }

    // 팀별 포지션 순서 뒤집기 버튼
    document.querySelectorAll('.reverse-order-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.toggleSlotOrder(btn.dataset.team);
        btn.classList.toggle('reverse-order-btn--active', state.get().slotOrderReversed[btn.dataset.team]);
        this.clearTapSelection();
        this.refreshSlots();
      });
    });

    // 초기화 버튼
    const resetBtn = $('#reset-game-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('이번 경기의 모든 픽과 글로벌 밴을 초기화하시겠습니까?')) {
          state.resetCurrentGameAndBans();
          this.clearTapSelection();
          this.refreshAll();
        }
      });
    }

    // 전체 초기화 버튼 (1~5경기)
    const resetAllBtn = $('#reset-all-btn');
    if (resetAllBtn) {
      resetAllBtn.addEventListener('click', () => {
        if (confirm('1~5경기의 모든 픽과 글로벌 밴을 초기화하시겠습니까?')) {
          state.resetAllGamesAndBans();
          this.clearTapSelection();
          this.refreshAll();
        }
      });
    }

    // 포지션 필터
    const positionFilter = $('#position-filter');
    if (positionFilter) {
      positionFilter.addEventListener('click', (e) => {
        const btn = e.target.closest('.position-filter__btn');
        if (btn) this.togglePositionFilter(btn.dataset.position);
      });
    }

    // 챔피언 초상화 호버 시 궁극기 요약 (마우스 사용 환경만, 터치에서는 탭 배치와 겹치므로 제외)
    this.attachTooltipEvents();

    // 드래그 앤 드롭 이벤트
    this.attachDragEvents();

    // 탭 배치 이벤트
    this.attachTapEvents();
  }

  /**
   * 탭 배치 이벤트 연결
   */
  attachTapEvents() {
    const grid = $('#champion-grid');
    const container = document.querySelector('.champion-pick');
    const tapGuideCancel = $('#tap-guide-cancel');

    // 챔피언 그리드: 클릭으로 선택/해제
    grid.addEventListener('click', (e) => {
      if (this._isDragging) return;

      const item = e.target.closest('.champion-item');
      if (!item) return;

      if (item.classList.contains('champion-item--selected-blue') ||
          item.classList.contains('champion-item--selected-red') ||
          item.classList.contains('champion-item--banned')) {
        return;
      }

      const championId = parseInt(item.dataset.championId);

      if (this.tapSelectedChampion && this.tapSelectedChampion.id === championId) {
        this.clearTapSelection();
        return;
      }

      this.setTapSelection(championId, item.dataset.championName);
    });

    // 슬롯/밴 슬롯: 클릭으로 배치 또는 제거
    container.addEventListener('click', (e) => {
      if (e.target.closest('#champion-grid')) return;
      if (e.target.closest('.swap-teams-btn') ||
          e.target.closest('.reset-game-btn') ||
          e.target.closest('#tap-guide-cancel') ||
          e.target.closest('#position-filter') ||
          e.target.closest('#champion-search')) return;

      const slot = e.target.closest('.champion-slot');
      const banSlot = e.target.closest('.ban-slot');

      if (slot) {
        this.handleSlotTap(slot);
      } else if (banSlot) {
        this.handleBanSlotTap(banSlot);
      }
    });

    // 취소 버튼
    if (tapGuideCancel) {
      tapGuideCancel.addEventListener('click', (e) => {
        e.stopPropagation();
        this.clearTapSelection();
      });
    }
  }

  /**
   * 팀 슬롯 탭 처리
   * @param {Element} slot
   */
  handleSlotTap(slot) {
    const targetTeam = slot.dataset.team;
    const targetPosition = slot.dataset.position;

    if (this.tapSelectedChampion) {
      const champion = championService.getById(this.tapSelectedChampion.id);
      if (champion) {
        state.assignChampion(targetTeam, targetPosition, champion);
        this.clearTapSelection();
        this.refreshAll();
      }
    } else if (slot.classList.contains('champion-slot--filled')) {
      state.assignChampion(targetTeam, targetPosition, null);
      this.refreshAll();
    }
  }

  /**
   * 밴 슬롯 탭 처리
   * @param {Element} banSlot
   */
  handleBanSlotTap(banSlot) {
    const targetTeam = banSlot.dataset.banTeam;
    const targetIndex = parseInt(banSlot.dataset.banIndex);

    if (this.tapSelectedChampion) {
      const champion = championService.getById(this.tapSelectedChampion.id);
      if (champion) {
        state.addGlobalBan(targetTeam, targetIndex, champion);
        this.clearTapSelection();
        this.refreshAll();
      }
    } else if (banSlot.classList.contains('ban-slot--filled')) {
      state.removeGlobalBan(targetTeam, targetIndex);
      this.refreshAll();
    }
  }

  /**
   * 탭 선택 상태 설정
   * @param {number} championId
   * @param {string} championName
   */
  setTapSelection(championId, championName) {
    this.clearTapSelection();

    this.tapSelectedChampion = { id: championId, name: championName };

    const item = document.querySelector(`.champion-item[data-champion-id="${championId}"]`);
    if (item) {
      item.classList.add('champion-item--tap-selected');
    }

    const guide = $('#tap-guide');
    if (guide) {
      guide.classList.add('tap-guide--visible');
      const text = $('#tap-guide-text');
      if (text) {
        text.textContent = `${championName} - 슬롯을 탭하여 배치하세요`;
      }
    }
  }

  /**
   * 탭 선택 상태 해제
   */
  clearTapSelection() {
    this.tapSelectedChampion = null;

    const selected = document.querySelector('.champion-item--tap-selected');
    if (selected) {
      selected.classList.remove('champion-item--tap-selected');
    }

    const guide = $('#tap-guide');
    if (guide) {
      guide.classList.remove('tap-guide--visible');
    }
  }

  /**
   * 탭 선택 하이라이트 재적용 (그리드 재렌더 후)
   */
  reapplyTapSelection() {
    if (!this.tapSelectedChampion) return;

    const item = document.querySelector(
      `.champion-item[data-champion-id="${this.tapSelectedChampion.id}"]`
    );
    if (item) {
      item.classList.add('champion-item--tap-selected');
    } else {
      this.clearTapSelection();
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
          !item.classList.contains('champion-item--selected-red') &&
          !item.classList.contains('champion-item--banned')) {
        this.dragData = {
          type: 'champion',
          championId: parseInt(item.dataset.championId),
          championName: item.dataset.championName
        };
        this._isDragging = true;
        item.classList.add('dragging');
      }
    });

    grid.addEventListener('dragend', (e) => {
      const item = e.target.closest('.champion-item');
      if (item) {
        item.classList.remove('dragging');
      }
      this.dragData = null;
      setTimeout(() => { this._isDragging = false; }, 100);
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
        this._isDragging = true;
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
        this._isDragging = true;
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
      setTimeout(() => { this._isDragging = false; }, 100);
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
        state.assignChampion(this.dragData.team, this.dragData.position, null);
        this.refreshAll();
      } else if (this.dragData && this.dragData.type === 'ban') {
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
      const champion = championService.getById(this.dragData.championId);
      if (champion) {
        state.assignChampion(targetTeam, targetPosition, champion);
        this.refreshAll();
      }
    } else if (this.dragData.type === 'slot') {
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
      const champion = championService.getById(this.dragData.championId);
      if (champion) {
        state.addGlobalBan(targetTeam, targetIndex, champion);
        this.refreshAll();
      }
    } else if (this.dragData.type === 'ban') {
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
    // 슬롯이 다시 그려지면 mouseout 이 오지 않으므로, 떠 있던 호버창을 닫음 (슬롯 클릭으로 픽 해제 등)
    this.tooltip?.hide();
    this.renderChampions($('#champion-search')?.value || '');
    this.reapplyTapSelection();
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
      this.getSlotOrder('blue').forEach(position => {
        blueSlots.appendChild(this.createSlot('blueTeam', position, currentState.blueTeam, gameChampions));
      });
    }

    // 레드팀 슬롯 갱신
    const redSlots = $('#red-slots');
    if (redSlots) {
      clearElement(redSlots);
      this.getSlotOrder('red').forEach(position => {
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
