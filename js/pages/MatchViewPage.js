/**
 * 경기 상황 페이지
 */

import { $, createElement, clearElement } from '../utils/dom.js';
import { POSITIONS, POSITION_NAMES, POSITION_ICONS, ROLE_NAMES } from '../utils/constants.js';
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
      this.createChampionDetailArea(),
      createElement('div', { className: 'ult-tooltip', id: 'ult-tooltip' })
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

    // 픽 당시 저장된 객체에는 roles 가 없을 수 있으므로 최신 챔피언 데이터에서 조회
    const roles = champion ? (championService.getById(champion.id)?.roles || []) : [];
    const rolesEl = roles.length
      ? createElement('ul', { className: 'player-card__roles' },
          roles.map(role => createElement('li', { className: 'player-card__role' }, ROLE_NAMES[role] || role))
        )
      : null;

    return createElement('div', {
      className: `player-card player-card--${team} ${clickableClass}`,
      dataset: champion ? { championId: champion.id, championName: champion.nameEn } : {}
    }, [
      iconEl,
      infoEl,
      rolesEl
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
        createElement('p', {}, '챔피언을 클릭하면 상세 정보가 표시됩니다')
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

    // 챔피언 초상화 호버 시 궁극기 요약 표시
    positionRows.addEventListener('mouseover', (e) => {
      const icon = e.target.closest('.player-card--clickable .player-card__icon');
      if (!icon || icon.contains(e.relatedTarget)) return;
      const card = icon.closest('.player-card');
      this.showUltTooltip(icon, Number(card.dataset.championId), card.dataset.championName);
    });

    positionRows.addEventListener('mouseout', (e) => {
      const icon = e.target.closest('.player-card__icon');
      if (!icon || icon.contains(e.relatedTarget)) return;
      this.hideUltTooltip();
    });

    // 스킬 아이콘 클릭 이벤트 (이벤트 위임)
    const detailArea = $('#champion-detail');
    if (detailArea) {
      detailArea.addEventListener('click', (e) => {
        const icon = e.target.closest('.skill-row__icon--clickable');
        if (!icon) return;

        const videoPath = icon.dataset.videoPath;
        const posterPath = icon.dataset.videoPoster;
        if (videoPath) {
          this.playSkillVideo(videoPath, posterPath);
        }
      });
    }
  }

  /**
   * 궁극기 요약 호버창 표시
   * 요약 문서(data/ultimates.json)를 우선 사용하고, 없으면 Data Dragon 공식 설명으로 대체
   * @param {Element} icon - 기준 초상화
   * @param {number} championId
   * @param {string} championNameEn
   */
  async showUltTooltip(icon, championId, championNameEn) {
    const tooltip = $('#ult-tooltip');
    if (!tooltip || !championId) return;

    // 로드 중 다른 챔피언으로 옮겨간 경우를 구분하기 위한 토큰
    const token = Symbol();
    this.ultTooltipToken = token;

    clearElement(tooltip);
    tooltip.appendChild(createElement('div', { className: 'ult-tooltip__loading' }, '궁극기 정보 로딩 중...'));
    tooltip.classList.add('ult-tooltip--visible');
    this.positionUltTooltip(tooltip, icon);

    const summary = await championService.getUltimateSummary(championId);
    // 요약이 없는 챔피언은 상세 정보와 같은 응답(캐시)의 공식 설명으로 대체
    const fallback = summary ? null
      : (await championService.getChampionDetail(championNameEn))?.spells.find(spell => spell.key === 'R');
    if (this.ultTooltipToken !== token) return;

    clearElement(tooltip);

    if (summary) {
      tooltip.appendChild(this.createUltTooltipHeader(summary.image, summary.ultName, summary.cooldown));
      if (summary.cooldownNote) {
        tooltip.appendChild(createElement('p', { className: 'ult-tooltip__note' }, summary.cooldownNote));
      }
      [['효과', summary.effect], ['사용 상황', summary.when], ['활용 팁', summary.how]]
        .filter(([, text]) => text)
        .forEach(([label, text]) => {
          tooltip.appendChild(createElement('div', { className: 'ult-tooltip__section' }, [
            createElement('span', { className: 'ult-tooltip__label' }, label),
            createElement('p', { className: 'ult-tooltip__desc' }, text)
          ]));
        });
    } else if (fallback) {
      tooltip.appendChild(this.createUltTooltipHeader(fallback.image, fallback.name, fallback.cooldown));
      tooltip.appendChild(createElement('p', { className: 'ult-tooltip__desc' }, fallback.description));
    } else {
      tooltip.appendChild(createElement('div', { className: 'ult-tooltip__loading' }, '정보를 불러올 수 없습니다'));
    }

    this.positionUltTooltip(tooltip, icon);
  }

  /**
   * 호버창 헤더 (아이콘, 궁극기 이름, 쿨타임)
   * @param {string} image
   * @param {string} name
   * @param {string} cooldown
   * @returns {Element}
   */
  createUltTooltipHeader(image, name, cooldown) {
    // "120/100/80" 처럼 숫자일 때만 초 단위 표기
    const cooldownText = /^[\d./]+$/.test(cooldown || '') ? `쿨타임 ${cooldown}초` : cooldown;

    return createElement('div', { className: 'ult-tooltip__header' }, [
      createElement('img', { className: 'ult-tooltip__icon', src: image, alt: name }),
      createElement('div', { className: 'ult-tooltip__title' }, [
        createElement('span', { className: 'ult-tooltip__key' }, '궁극기 (R)'),
        createElement('span', { className: 'ult-tooltip__name' }, name)
      ]),
      cooldownText ? createElement('span', { className: 'ult-tooltip__cooldown' }, cooldownText) : null
    ]);
  }

  /**
   * 호버창 위치 지정 (초상화 아래, 화면 밖으로 나가지 않게 보정)
   * @param {Element} tooltip
   * @param {Element} icon
   */
  positionUltTooltip(tooltip, icon) {
    const rect = icon.getBoundingClientRect();
    const margin = 8;
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;

    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));

    let top = rect.bottom + margin;
    if (top + height > window.innerHeight - margin) {
      top = rect.top - height - margin; // 아래 공간이 부족하면 위로
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${Math.max(margin, top)}px`;
  }

  /**
   * 궁극기 요약 호버창 숨김
   */
  hideUltTooltip() {
    this.ultTooltipToken = null;
    const tooltip = $('#ult-tooltip');
    if (tooltip) tooltip.classList.remove('ult-tooltip--visible');
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

    // 챔피언 ID 찾기
    const champion = championService.search(championNameEn).find(c => c.nameEn === championNameEn);
    const championId = champion?.id;

    // 병렬로 데이터 로드 (요약은 스킬 비디오와 같은 응답을 재사용)
    const [detail, skillVideos, summary, coreBuilds] = await Promise.all([
      championService.getChampionDetail(championNameEn),
      championId ? championService.getChampionSkillVideos(championId) : null,
      championId ? championService.getChampionSummary(championId) : null,
      championId ? championService.getCoreItems(championId) : null
    ]);
    
    if (!detail) {
      clearElement(detailArea);
      detailArea.appendChild(createElement('div', { className: 'champion-detail__error' }, '정보를 불러올 수 없습니다'));
      return;
    }

    clearElement(detailArea);
    detailArea.appendChild(this.createChampionDetailContent(detail, skillVideos, summary, coreBuilds));
  }

  /**
   * 챔피언 상세 정보 콘텐츠 생성
   * @param {Object} detail
   * @param {Object|null} skillVideos
   * @param {Object|null} summary
   * @param {Array|null} coreBuilds
   * @returns {Element}
   */
  createChampionDetailContent(detail, skillVideos, summary, coreBuilds) {
    const roles = detail.tags.map(tag => ROLE_NAMES[tag] || tag).join(', ');

    // 패시브 비디오 정보
    const passiveVideo = skillVideos?.passive || null;
    
    return createElement('div', { className: 'champion-detail__content' }, [
      // 헤더: 이름, 역할
      createElement('div', { className: 'champion-detail__header' }, [
        createElement('h3', { className: 'champion-detail__name' }, detail.name),
        createElement('span', { className: 'champion-detail__title' }, detail.title),
        createElement('span', { className: 'champion-detail__roles' }, roles)
      ]),
      // 초보자용 요약
      this.createSummary(summary),
      // 비디오 플레이어 영역 (처음에는 숨김)
      createElement('div', { className: 'skill-video-player', id: 'skill-video-player' }),
      // 패시브
      this.createSkillRow('P', detail.passive, passiveVideo),
      // 스킬 Q, W, E, R
      ...detail.spells.map((spell, index) => {
        const spellVideo = skillVideos?.spells?.[index] || null;
        return this.createSkillRow(spell.key, spell, spellVideo);
      }),
      // 코어 아이템
      this.createCoreItems(coreBuilds)
    ].filter(Boolean));
  }

  /**
   * 코어 아이템 블록 생성 (포지션별 한 줄)
   * @param {Array|null} builds
   * @returns {Element|null}
   */
  createCoreItems(builds) {
    if (!builds || builds.length === 0) return null;

    const createItem = item => createElement('div', { className: 'core-items__item', title: item.name }, [
      createElement('img', { className: 'core-items__icon', src: item.icon, alt: item.name, loading: 'lazy' }),
      createElement('span', { className: 'core-items__name' }, item.name)
    ]);

    return createElement('div', { className: 'core-items' }, [
      createElement('h4', { className: 'core-items__title' }, '코어 아이템'),
      ...builds.map(build => createElement('div', { className: 'core-items__build' }, [
        createElement('div', { className: 'core-items__position' }, [
          createElement('img', {
            className: 'core-items__position-icon',
            src: POSITION_ICONS[build.position],
            alt: POSITION_NAMES[build.position]
          }),
          createElement('span', {}, POSITION_NAMES[build.position])
        ]),
        createElement('div', { className: 'core-items__list' }, [
          ...build.items.map(createItem),
          build.boots ? createElement('span', { className: 'core-items__plus' }, '+') : null,
          build.boots ? createItem(build.boots) : null
        ]),
        build.note ? createElement('p', { className: 'core-items__note' }, build.note) : null
      ]))
    ]);
  }

  /**
   * 초보자용 요약 블록 생성
   * @param {Object|null} summary
   * @returns {Element|null}
   */
  createSummary(summary) {
    if (!summary) return null;

    const basics = [summary.difficulty ? `난이도 ${summary.difficulty}` : null, summary.attackType, summary.damageType]
      .filter(Boolean);

    const hasContent = basics.length > 0 || summary.tags.length > 0 || summary.stats.length > 0;
    if (!hasContent) return null;

    return createElement('div', { className: 'champion-summary' }, [
      createElement('h4', { className: 'champion-summary__title' }, '한눈에 보기'),
      basics.length ? createElement('div', { className: 'champion-summary__basics' },
        basics.map(text => createElement('span', { className: 'champion-summary__badge' }, text))
      ) : null,
      summary.tags.length ? createElement('ul', { className: 'champion-summary__tags' },
        summary.tags.map(tag => createElement('li', { className: 'champion-summary__tag' }, [
          createElement('span', { className: 'champion-summary__tag-label' }, tag.label),
          tag.desc ? createElement('span', { className: 'champion-summary__tag-desc' }, tag.desc) : null
        ].filter(Boolean)))
      ) : null,
      summary.stats.length ? createElement('div', { className: 'champion-summary__stats' },
        summary.stats.map(stat => createElement('div', { className: 'champion-summary__stat' }, [
          createElement('span', { className: 'champion-summary__stat-label' }, stat.label),
          createElement('div', { className: 'champion-summary__bar' },
            Array.from({ length: stat.max }, (_, i) =>
              createElement('span', {
                className: `champion-summary__bar-cell ${i < stat.value ? 'champion-summary__bar-cell--on' : ''}`
              })
            )
          )
        ]))
      ) : null
    ].filter(Boolean));
  }

  /**
   * 스킬 행 생성
   * @param {string} key - P, Q, W, E, R
   * @param {Object} skill
   * @param {Object|null} videoInfo - 비디오 정보
   * @returns {Element}
   */
  createSkillRow(key, skill, videoInfo = null) {
    const cooldownText = skill.cooldown ? `쿨타임: ${skill.cooldown}초` : '';
    const hasVideo = !!videoInfo?.videoPath;
    
    // 아이콘 (비디오가 있으면 클릭 가능)
    const iconElement = createElement('img', { 
      className: `skill-row__icon ${hasVideo ? 'skill-row__icon--clickable' : ''}`,
      src: skill.image,
      alt: skill.name,
      dataset: hasVideo ? { 
        videoPath: videoInfo.videoPath,
        videoPoster: videoInfo.videoImagePath || ''
      } : {}
    });
    
    return createElement('div', { className: 'skill-row' }, [
      iconElement,
      createElement('div', { className: 'skill-row__info' }, [
        createElement('div', { className: 'skill-row__header' }, [
          createElement('span', { className: 'skill-row__key' }, key),
          createElement('span', { className: 'skill-row__name' }, skill.name),
          hasVideo ? createElement('span', { className: 'skill-row__video-badge' }, '▶') : null,
          cooldownText ? createElement('span', { className: 'skill-row__cooldown' }, cooldownText) : null
        ].filter(Boolean)),
        createElement('p', { className: 'skill-row__desc' }, skill.description)
      ])
    ]);
  }

  /**
   * 스킬 비디오 재생
   * @param {string} videoPath
   * @param {string} posterPath
   */
  playSkillVideo(videoPath, posterPath) {
    const playerArea = $('#skill-video-player');
    if (!playerArea) return;

    clearElement(playerArea);
    
    const video = createElement('video', {
      className: 'skill-video-player__video',
      src: videoPath,
      poster: posterPath,
      muted: 'true',
      loop: 'true',
      playsinline: 'true',
      autoplay: 'true',
      controls: 'true'
    });

    const closeBtn = createElement('button', {
      className: 'skill-video-player__close',
      type: 'button'
    }, '✕');

    closeBtn.addEventListener('click', () => {
      this.closeSkillVideo();
    });

    playerArea.appendChild(video);
    playerArea.appendChild(closeBtn);
    playerArea.classList.add('skill-video-player--active');

    // 비디오 요소에 muted 속성 설정 (보안상 필요)
    video.muted = true;
    video.play().catch(() => {});
  }

  /**
   * 스킬 비디오 닫기
   */
  closeSkillVideo() {
    const playerArea = $('#skill-video-player');
    if (!playerArea) return;

    playerArea.classList.remove('skill-video-player--active');
    clearElement(playerArea);
  }
}
