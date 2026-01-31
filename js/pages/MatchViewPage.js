/**
 * 경기 상황 페이지
 */

import { createElement, clearElement } from '../utils/dom.js';
import { POSITIONS, POSITION_NAMES, POSITION_ICONS } from '../utils/constants.js';
import { state } from '../state.js';

export class MatchViewPage {
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
    const gameChampions = state.getCurrentGameChampions();

    const page = createElement('div', { className: 'page page--narrow match-view' }, [
      this.createHeader(currentState),
      this.createPositionRows(currentState, gameChampions)
    ]);

    container.appendChild(page);
  }

  /**
   * 헤더 (팀 이름) 생성
   * @param {Object} currentState
   * @returns {Element}
   */
  createHeader(currentState) {
    return createElement('div', { className: 'match-view__header' }, [
      createElement('span', { className: 'match-view__team-name match-view__team-name--blue' },
        currentState.blueTeam.name || '블루팀'
      ),
      createElement('span', { className: 'match-view__vs' }, 'vs'),
      createElement('span', { className: 'match-view__team-name match-view__team-name--red' },
        currentState.redTeam.name || '레드팀'
      )
    ]);
  }

  /**
   * 포지션별 행 생성
   * @param {Object} currentState
   * @param {Object} gameChampions
   * @returns {Element}
   */
  createPositionRows(currentState, gameChampions) {
    return createElement('div', { className: 'position-rows' },
      POSITIONS.map(position => this.createPositionRow(position, currentState, gameChampions))
    );
  }

  /**
   * 포지션 행 생성
   * @param {string} position
   * @param {Object} currentState
   * @param {Object} gameChampions
   * @returns {Element}
   */
  createPositionRow(position, currentState, gameChampions) {
    const bluePlayer = currentState.blueTeam.players.find(p => p.position === position);
    const redPlayer = currentState.redTeam.players.find(p => p.position === position);
    
    const blueChampion = gameChampions?.blueTeam?.[position] || null;
    const redChampion = gameChampions?.redTeam?.[position] || null;

    return createElement('div', { className: 'position-row' }, [
      this.createPlayerCard(bluePlayer, blueChampion, 'blue'),
      createElement('div', { className: 'position-row__icon' }, [
        createElement('img', {
          className: 'position-row__icon-img',
          src: POSITION_ICONS[position],
          alt: POSITION_NAMES[position]
        })
      ]),
      this.createPlayerCard(redPlayer, redChampion, 'red')
    ]);
  }

  /**
   * 선수 카드 생성
   * @param {Object} player
   * @param {Object} champion
   * @param {'blue'|'red'} team
   * @returns {Element}
   */
  createPlayerCard(player, champion, team) {
    const iconEl = champion
      ? createElement('img', {
          className: 'player-card__icon',
          src: champion.thumbnail,
          alt: champion.nameKr
        })
      : createElement('div', {
          className: 'player-card__icon',
          style: 'background-color: var(--color-bg-card);'
        });

    const infoEl = createElement('div', { className: 'player-card__info' }, [
      createElement('span', { className: 'player-card__champion' }, champion?.nameKr || '-'),
      createElement('span', { className: 'player-card__player' }, player?.name || '-')
    ]);

    return createElement('div', { className: `player-card player-card--${team}` }, [
      iconEl,
      infoEl
    ]);
  }
}
