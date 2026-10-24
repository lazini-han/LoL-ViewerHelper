/**
 * 호버창 컴포넌트 - 챔피언 궁극기 요약 / 코어 아이템 설명 요약
 * 경기 화면과 챔피언 선택 화면에서 함께 사용 (스타일: css/match-view.css 의 .ult-tooltip)
 */

import { createElement, clearElement } from '../utils/dom.js';
import { championService } from '../services/ChampionService.js';
import { TOOLTIP_SETTING_KEY } from '../utils/constants.js';

// 호버창 사용 여부 (상단바 토글, 모든 페이지 공통). 저장값이 없으면 켜짐
let tooltipsEnabled = loadTooltipSetting();

function loadTooltipSetting() {
  try {
    return localStorage.getItem(TOOLTIP_SETTING_KEY) !== 'off';
  } catch {
    return true;
  }
}

/**
 * @returns {boolean} 호버창 사용 여부
 */
export function isTooltipEnabled() {
  return tooltipsEnabled;
}

/**
 * 호버창 사용 여부 변경 (끄면 떠 있는 호버창도 바로 숨김)
 * @param {boolean} enabled
 */
export function setTooltipEnabled(enabled) {
  tooltipsEnabled = enabled;
  try {
    localStorage.setItem(TOOLTIP_SETTING_KEY, enabled ? 'on' : 'off');
  } catch {
    // 저장 실패 시 이번 세션에만 적용
  }
  if (!enabled) {
    document.querySelectorAll('.ult-tooltip--visible')
      .forEach(tooltip => tooltip.classList.remove('ult-tooltip--visible'));
  }
  applyTitleTooltips();
}

// 브라우저 기본 호버창(title 속성)도 함께 끄기: 꺼져 있는 동안 title 을 data-hidden-title 로 옮겨 둠
const HIDDEN_TITLE_ATTR = 'data-hidden-title';
let titleObserver = null;

function hideTitles(root) {
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const targets = root.hasAttribute('title') ? [root] : [];
  targets.push(...root.querySelectorAll('[title]'));
  targets.forEach(el => {
    el.setAttribute(HIDDEN_TITLE_ATTR, el.getAttribute('title'));
    el.removeAttribute('title');
  });
}

function applyTitleTooltips() {
  if (tooltipsEnabled) {
    titleObserver?.disconnect();
    titleObserver = null;
    document.querySelectorAll(`[${HIDDEN_TITLE_ATTR}]`).forEach(el => {
      el.setAttribute('title', el.getAttribute(HIDDEN_TITLE_ATTR));
      el.removeAttribute(HIDDEN_TITLE_ATTR);
    });
    return;
  }

  hideTitles(document.body);
  // 페이지 이동 등으로 새로 그려지는 요소도 처리
  if (!titleObserver) {
    titleObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes') hideTitles(mutation.target);
        else mutation.addedNodes.forEach(hideTitles);
      });
    });
    titleObserver.observe(document.body, {
      childList: true, subtree: true, attributes: true, attributeFilter: ['title']
    });
  }
}

applyTitleTooltips();

export class UltTooltip {
  /**
   * @param {Element} element - 호버창 요소 (.ult-tooltip)
   */
  constructor(element) {
    this.element = element;
    this.token = null;
  }

  /**
   * 궁극기 요약 호버창 표시
   * 요약 문서(data/ultimates.json)를 우선 사용하고, 없으면 Data Dragon 공식 설명으로 대체
   * @param {Element} anchor - 기준 요소 (초상화)
   * @param {number} championId
   * @param {string} championNameEn
   * @param {string} [championNameKr] - 지정하면 헤더에 챔피언 이름도 표시
   */
  async showUltimate(anchor, championId, championNameEn, championNameKr = '') {
    const tooltip = this.element;
    if (!tooltip || !championId || !tooltipsEnabled) return;

    // 로드 중 다른 챔피언으로 옮겨간 경우를 구분하기 위한 토큰
    const token = Symbol();
    this.token = token;

    clearElement(tooltip);
    tooltip.appendChild(createElement('div', { className: 'ult-tooltip__loading' }, '궁극기 정보 로딩 중...'));
    tooltip.classList.add('ult-tooltip--visible');
    this.position(anchor);

    const summary = await championService.getUltimateSummary(championId);
    // 요약이 없는 챔피언은 상세 정보와 같은 응답(캐시)의 공식 설명으로 대체
    const fallback = summary ? null
      : (await championService.getChampionDetail(championNameEn))?.spells.find(spell => spell.key === 'R');
    if (this.token !== token || !tooltipsEnabled) return;

    clearElement(tooltip);
    const keyLabel = championNameKr ? `${championNameKr} · 궁극기 (R)` : '궁극기 (R)';

    if (summary) {
      tooltip.appendChild(this.createHeader(summary.image, keyLabel, summary.ultName, summary.cooldown));
      if (summary.cooldownNote) {
        tooltip.appendChild(createElement('p', { className: 'ult-tooltip__note' }, summary.cooldownNote));
      }
      [['효과', summary.effect], ['사용 상황', summary.when], ['활용 팁', summary.how]]
        .filter(([, text]) => text)
        .forEach(([label, text]) => tooltip.appendChild(this.createSection(label, text)));
    } else if (fallback) {
      tooltip.appendChild(this.createHeader(fallback.image, keyLabel, fallback.name, fallback.cooldown));
      tooltip.appendChild(createElement('p', { className: 'ult-tooltip__desc' }, fallback.description));
    } else {
      tooltip.appendChild(createElement('div', { className: 'ult-tooltip__loading' }, '정보를 불러올 수 없습니다'));
    }

    this.position(anchor);
  }

  /**
   * 코어 아이템 설명 요약 호버창 표시
   * @param {Element} anchor - 기준 아이템 요소
   * @param {Object|undefined} item - { name, icon, gold, summary, stats, effects }
   */
  showItem(anchor, item) {
    const tooltip = this.element;
    if (!tooltip || !item || !tooltipsEnabled) return;

    this.token = null; // 로드 중인 궁극기 호버창이 덮어쓰지 않도록
    clearElement(tooltip);

    const goldText = item.gold ? `${item.gold.toLocaleString()} 골드` : '';
    tooltip.appendChild(this.createHeader(item.icon, '코어 아이템', item.name, goldText));

    if (item.summary) {
      tooltip.appendChild(createElement('p', { className: 'ult-tooltip__note' }, item.summary));
    }
    if (item.stats?.length) {
      tooltip.appendChild(this.createSection('능력치', item.stats.join(' · ')));
    }
    (item.effects || []).forEach(effect => {
      const kind = effect.type === 'active' ? '사용 효과' : '고유 효과';
      tooltip.appendChild(this.createSection(`${kind} - ${effect.name}`, effect.text));
    });

    tooltip.classList.add('ult-tooltip--visible');
    this.position(anchor);
  }

  /**
   * 호버창 헤더 (아이콘, 분류, 이름, 우측 보조 정보)
   * @param {string} image
   * @param {string} keyLabel - 이름 위 작은 분류 문구
   * @param {string} name
   * @param {string} extra - 쿨타임 또는 가격
   * @returns {Element}
   */
  createHeader(image, keyLabel, name, extra) {
    // "120/100/80" 처럼 숫자일 때만 초 단위 표기
    const extraText = /^[\d./]+$/.test(extra || '') ? `쿨타임 ${extra}초` : extra;

    return createElement('div', { className: 'ult-tooltip__header' }, [
      createElement('img', { className: 'ult-tooltip__icon', src: image, alt: name }),
      createElement('div', { className: 'ult-tooltip__title' }, [
        createElement('span', { className: 'ult-tooltip__key' }, keyLabel),
        createElement('span', { className: 'ult-tooltip__name' }, name)
      ]),
      extraText ? createElement('span', { className: 'ult-tooltip__cooldown' }, extraText) : null
    ]);
  }

  /**
   * 라벨 + 본문 구역
   * @param {string} label
   * @param {string} text
   * @returns {Element}
   */
  createSection(label, text) {
    return createElement('div', { className: 'ult-tooltip__section' }, [
      createElement('span', { className: 'ult-tooltip__label' }, label),
      createElement('p', { className: 'ult-tooltip__desc' }, text)
    ]);
  }

  /**
   * 위치 지정 (기준 요소 아래, 화면 밖으로 나가지 않게 보정)
   * @param {Element} anchor
   */
  position(anchor) {
    const tooltip = this.element;
    const rect = anchor.getBoundingClientRect();
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
   * 호버창 숨김
   */
  hide() {
    this.token = null;
    if (this.element) this.element.classList.remove('ult-tooltip--visible');
  }
}
