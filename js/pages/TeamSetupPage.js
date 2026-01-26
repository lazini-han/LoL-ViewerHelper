/**
 * 팀 설정 페이지
 */

import { $, createElement, clearElement } from '../utils/dom.js';
import { POSITIONS, POSITION_NAMES, ROUTES } from '../utils/constants.js';
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
      this.createNavButtons()
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
      this.createTeamCard('blue', currentState.blueTeam),
      this.createTeamCard('red', currentState.redTeam)
    ]);
  }

  /**
   * 팀 카드 생성
   * @param {'blue'|'red'} team
   * @param {Object} teamData
   * @returns {Element}
   */
  createTeamCard(team, teamData) {
    const teamLabel = team === 'blue' ? '블루팀' : '레드팀';
    const teamKey = team === 'blue' ? 'blueTeam' : 'redTeam';

    return createElement('div', { className: `team-card team-card--${team}` }, [
      // 팀 이름 입력
      createElement('div', { className: 'team-card__header' }, [
        createElement('label', { className: 'team-card__label' }, teamLabel),
        createElement('input', {
          type: 'text',
          className: 'input team-card__input',
          placeholder: '팀 이름 입력',
          value: teamData.name,
          dataset: { team: teamKey, field: 'name' }
        })
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
   * 네비게이션 버튼 생성
   * @returns {Element}
   */
  createNavButtons() {
    return createElement('div', { className: 'nav-buttons nav-buttons--end' }, [
      createElement('button', {
        className: 'btn btn--primary',
        id: 'btn-next'
      }, '다음 단계 →')
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

    // 다음 단계 버튼
    const btnNext = $('#btn-next');
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        this.router.navigate(ROUTES.CHAMPION_PICK);
      });
    }
  }
}
