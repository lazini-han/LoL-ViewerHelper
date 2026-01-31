/**
 * 팀 설정 페이지
 */

import { $, createElement, clearElement } from '../utils/dom.js';
import { POSITIONS, POSITION_NAMES } from '../utils/constants.js';
import { state } from '../state.js';

export class TeamSetupPage {
  constructor(router) {
    this.router = router;
  }

  /**
   * 페이지 렌더링
   * @param {Element} container
   */
  render(container) {
    clearElement(container);

    const currentState = state.get();

    const page = createElement('div', { className: 'page team-setup' }, [
      createElement('h2', { className: 'page__title' }, '팀 설정'),
      this.createForm(currentState),
      this.createSavedTeamsSection()
    ]);

    container.appendChild(page);
    this.attachEvents();
  }

  /**
   * 폼 생성
   * @param {Object} currentState
   * @returns {Element}
   */
  createForm(currentState) {
    return createElement('div', { className: 'team-setup__form' }, [
      this.createTeamCard('left', 'blueTeam', currentState.blueTeam),
      this.createTeamCard('right', 'redTeam', currentState.redTeam)
    ]);
  }

  /**
   * 팀 카드 생성
   * @param {'left'|'right'} side
   * @param {string} teamKey
   * @param {Object} teamData
   * @returns {Element}
   */
  createTeamCard(side, teamKey, teamData) {
    const sideLabel = side === 'left' ? '팀 A' : '팀 B';

    return createElement('div', {
      className: `team-card`,
      dataset: { dropTarget: teamKey }
    }, [
      // 팀 헤더 (비우기 버튼 포함)
      createElement('div', { className: 'team-card__header' }, [
        createElement('label', { className: 'team-card__label' }, sideLabel),
        createElement('button', {
          className: 'btn btn--sm btn--danger team-card__clear-btn',
          dataset: { clearTeam: teamKey },
          title: '입력 내용 비우기'
        }, '비우기')
      ]),
      // 팀 이름 입력
      createElement('div', { className: 'team-card__name-row' }, [
        createElement('input', {
          type: 'text',
          className: 'input team-card__input',
          placeholder: '팀 이름 입력',
          value: teamData.name,
          dataset: { team: teamKey, field: 'name' }
        }),
        createElement('button', {
          className: 'btn btn--save',
          dataset: { saveTeam: teamKey },
          title: '팀 저장'
        }, '💾')
      ]),
      // 선수 목록
      createElement('div', { className: 'player-list' },
        POSITIONS.map(position => this.createPlayerRow(teamKey, position, teamData.players))
      )
    ]);
  }

  /**
   * 선수 행 생성
   * @param {string} teamKey
   * @param {string} position
   * @param {Array} players
   * @returns {Element}
   */
  createPlayerRow(teamKey, position, players) {
    const player = players.find(p => p.position === position) || { name: '' };

    return createElement('div', { className: 'player-row' }, [
      createElement('span', { className: 'position-badge player-row__position' }, POSITION_NAMES[position]),
      createElement('input', {
        type: 'text',
        className: 'input player-row__input',
        placeholder: '선수 이름',
        value: player.name,
        dataset: { team: teamKey, position: position }
      })
    ]);
  }

  /**
   * 저장된 팀 목록 섹션 생성
   * @returns {Element}
   */
  createSavedTeamsSection() {
    const savedTeams = state.getSavedTeams();

    if (savedTeams.length === 0) {
      return createElement('div', { className: 'saved-teams saved-teams--empty' }, [
        createElement('p', { className: 'saved-teams__hint' }, '팀 정보를 입력하고 💾 버튼을 눌러 저장하세요')
      ]);
    }

    return createElement('div', { className: 'saved-teams' }, [
      createElement('h3', { className: 'saved-teams__title' }, '저장된 팀'),
      createElement('div', { className: 'saved-teams__list', id: 'saved-teams-list' },
        savedTeams.map(team => this.createSavedTeamItem(team))
      )
    ]);
  }

  /**
   * 저장된 팀 아이템 생성
   * @param {Object} team
   * @returns {Element}
   */
  createSavedTeamItem(team) {
    const playerNames = team.players
      .filter(p => p.name)
      .map(p => p.name)
      .join(', ');

    return createElement('div', {
      className: 'saved-team-item',
      draggable: 'true',
      dataset: { teamId: team.id }
    }, [
      createElement('div', { className: 'saved-team-item__info' }, [
        createElement('span', { className: 'saved-team-item__name' }, team.name),
        createElement('span', { className: 'saved-team-item__players' }, playerNames || '선수 미등록')
      ]),
      createElement('button', {
        className: 'saved-team-item__delete',
        dataset: { deleteTeam: team.id },
        title: '삭제'
      }, '×')
    ]);
  }

  /**
   * 이벤트 연결
   */
  attachEvents() {
    // 팀 이름 입력
    const teamInputs = document.querySelectorAll('.team-card__input');
    teamInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        const teamKey = e.target.dataset.team;
        state.updateTeam(teamKey, { name: e.target.value });
      });
    });

    // 선수 이름 입력
    const playerInputs = document.querySelectorAll('.player-row__input');
    playerInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        const teamKey = e.target.dataset.team;
        const position = e.target.dataset.position;
        const currentState = state.get();
        const players = [...currentState[teamKey].players];
        const playerIndex = players.findIndex(p => p.position === position);
        if (playerIndex !== -1) {
          players[playerIndex] = { ...players[playerIndex], name: e.target.value };
          state.updateTeam(teamKey, { players });
        }
      });
    });

    // 팀 비우기 버튼
    const clearButtons = document.querySelectorAll('[data-clear-team]');
    clearButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const teamKey = e.target.dataset.clearTeam;
        state.clearTeam(teamKey);
        this.render(document.querySelector('.main'));
      });
    });

    // 팀 저장 버튼
    const saveButtons = document.querySelectorAll('[data-save-team]');
    saveButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const teamKey = e.target.dataset.saveTeam;
        const success = state.saveTeamToList(teamKey);
        if (success) {
          this.render(document.querySelector('.main'));
        } else {
          alert('팀 이름을 입력하세요');
        }
      });
    });

    // 저장된 팀 삭제 버튼
    const deleteButtons = document.querySelectorAll('[data-delete-team]');
    deleteButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const teamId = parseInt(e.target.dataset.deleteTeam);
        state.deleteSavedTeam(teamId);
        this.render(document.querySelector('.main'));
      });
    });

    // 드래그앤드롭 이벤트
    this.attachDragEvents();
  }

  /**
   * 드래그앤드롭 이벤트 연결
   */
  attachDragEvents() {
    const savedTeamsList = $('#saved-teams-list');
    const teamCards = document.querySelectorAll('.team-card');

    if (!savedTeamsList) return;

    // 드래그 시작
    savedTeamsList.addEventListener('dragstart', (e) => {
      const item = e.target.closest('.saved-team-item');
      if (item) {
        e.dataTransfer.setData('text/plain', item.dataset.teamId);
        item.classList.add('dragging');
      }
    });

    // 드래그 종료
    savedTeamsList.addEventListener('dragend', (e) => {
      const item = e.target.closest('.saved-team-item');
      if (item) {
        item.classList.remove('dragging');
      }
    });

    // 팀 카드에 드롭
    teamCards.forEach(card => {
      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        card.classList.add('team-card--drag-over');
      });

      card.addEventListener('dragleave', (e) => {
        card.classList.remove('team-card--drag-over');
      });

      card.addEventListener('drop', (e) => {
        e.preventDefault();
        card.classList.remove('team-card--drag-over');

        const teamId = parseInt(e.dataTransfer.getData('text/plain'));
        const targetTeamKey = card.dataset.dropTarget;

        if (teamId && targetTeamKey) {
          state.applySavedTeam(teamId, targetTeamKey);
          this.render(document.querySelector('.main'));
        }
      });
    });
  }
}
