/**
 * 경기 상황 페이지
 */

import { $, createElement, clearElement } from '../utils/dom.js';
import { POSITIONS, POSITION_NAMES, POSITION_ICONS } from '../utils/constants.js';
import { state } from '../state.js';
import { championService } from '../services/ChampionService.js';

export class MatchViewPage {
  constructor(router) {
    this.router = router;
    this.selectedChampion = null;
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
    const gameChampions = state.getCurrentGameChampions();

    const page = createElement('div', { className: 'page match-view' }, [
      this.createHeader(currentState),
      this.createPositionRows(currentState, gameChampions),
      this.createChampionDetailArea()
    ]);

    container.appendChild(page);
    this.attachEvents();
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
    const hasChampion = !!champion;
    const clickableClass = hasChampion ? 'player-card--clickable' : '';
    
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

    return createElement('div', { 
      className: `player-card player-card--${team} ${clickableClass}`,
      dataset: champion ? { championId: champion.id, championName: champion.nameEn } : {}
    }, [
      iconEl,
      infoEl
    ]);
  }

  /**
   * 챔피언 상세 정보 영역 생성
   * @returns {Element}
   */
  createChampionDetailArea() {
    return createElement('div', { 
      className: 'champion-detail', 
      id: 'champion-detail' 
    }, [
      createElement('div', { className: 'champion-detail__placeholder' }, [
        createElement('p', null, '챔피언을 클릭하면 상세 정보가 표시됩니다')
      ])
    ]);
  }

  /**
   * 이벤트 연결
   */
  attachEvents() {
    const positionRows = document.querySelector('.position-rows');
    if (!positionRows) return;

    positionRows.addEventListener('click', async (e) => {
      const card = e.target.closest('.player-card--clickable');
      if (!card) return;

      const championName = card.dataset.championName;
      if (!championName) return;

      // 선택 표시 토글
      document.querySelectorAll('.player-card--selected').forEach(el => {
        el.classList.remove('player-card--selected');
      });
      card.classList.add('player-card--selected');

      // 상세 정보 로드 및 표시
      await this.showChampionDetail(championName);
    });
  }

  /**
   * 챔피언 상세 정보 표시
   * @param {string} championNameEn
   */
  async showChampionDetail(championNameEn) {
    const detailArea = $('#champion-detail');
    if (!detailArea) return;

    // 로딩 표시
    clearElement(detailArea);
    detailArea.appendChild(createElement('div', { className: 'champion-detail__loading' }, '로딩 중...'));

    const detail = await championService.getChampionDetail(championNameEn);
    
    if (!detail) {
      clearElement(detailArea);
      detailArea.appendChild(createElement('div', { className: 'champion-detail__error' }, '정보를 불러올 수 없습니다'));
      return;
    }

    clearElement(detailArea);
    detailArea.appendChild(this.createChampionDetailContent(detail));
  }

  /**
   * 챔피언 상세 정보 콘텐츠 생성
   * @param {Object} detail
   * @returns {Element}
   */
  createChampionDetailContent(detail) {
    const roleMap = {
      'Fighter': '전사',
      'Tank': '탱커',
      'Mage': '마법사',
      'Assassin': '암살자',
      'Marksman': '원거리 딜러',
      'Support': '서포터'
    };
    
    const roles = detail.tags.map(tag => roleMap[tag] || tag).join(', ');

    return createElement('div', { className: 'champion-detail__content' }, [
      // 헤더: 이름, 역할
      createElement('div', { className: 'champion-detail__header' }, [
        createElement('h3', { className: 'champion-detail__name' }, detail.name),
        createElement('span', { className: 'champion-detail__title' }, detail.title),
        createElement('span', { className: 'champion-detail__roles' }, roles)
      ]),
      // 패시브
      this.createSkillRow('P', detail.passive),
      // 스킬 Q, W, E, R
      ...detail.spells.map(spell => this.createSkillRow(spell.key, spell))
    ]);
  }

  /**
   * 스킬 행 생성
   * @param {string} key - P, Q, W, E, R
   * @param {Object} skill
   * @returns {Element}
   */
  createSkillRow(key, skill) {
    const cooldownText = skill.cooldown ? `쿨타임: ${skill.cooldown}초` : '';
    
    return createElement('div', { className: 'skill-row' }, [
      createElement('img', { 
        className: 'skill-row__icon',
        src: skill.image,
        alt: skill.name
      }),
      createElement('div', { className: 'skill-row__info' }, [
        createElement('div', { className: 'skill-row__header' }, [
          createElement('span', { className: 'skill-row__key' }, key),
          createElement('span', { className: 'skill-row__name' }, skill.name),
          cooldownText ? createElement('span', { className: 'skill-row__cooldown' }, cooldownText) : null
        ].filter(Boolean)),
        createElement('p', { className: 'skill-row__desc' }, skill.description)
      ])
    ]);
  }
}
