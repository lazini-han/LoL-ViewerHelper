/**
 * 경기 일정 페이지 - 다음 시즌 국제 대회·리그 일정 (공개된 범위)
 */

import { createElement, clearElement } from '../utils/dom.js';
import { FLAG_ICON_BASE, LEAGUE_FULL_NAMES } from '../utils/constants.js';
import { scheduleService } from '../services/ScheduleService.js';

// 진행 상태 표시
const STATUS_LABELS = {
  scheduled: '일정 확정',
  venue: '개최지 확정 · 날짜 미정',
  tbd: '일정 미공개',
  done: '종료'
};

export class SchedulePage {
  constructor(router) {
    this.router = router;
  }

  /**
   * 페이지 렌더링
   * @param {Element} container
   */
  async render(container) {
    clearElement(container);
    const page = createElement('div', { className: 'page schedule' }, [
      createElement('h2', { className: 'page__title' }, '경기 일정'),
      createElement('p', { className: 'schedule__loading' }, '일정을 불러오는 중...')
    ]);
    container.appendChild(page);

    const data = await scheduleService.load();
    if (!page.isConnected) return; // 불러오는 사이 다른 페이지로 이동

    clearElement(page);
    page.appendChild(createElement('h2', { className: 'page__title' }, data ? `${data.season} 시즌 경기 일정` : '경기 일정'));
    if (!data) {
      page.appendChild(createElement('p', { className: 'schedule__loading' }, '일정 데이터를 불러올 수 없습니다.'));
      return;
    }

    page.appendChild(createElement('div', { className: 'schedule__summary' }, [
      createElement('p', {}, data.summary),
      createElement('p', { className: 'schedule__updated' }, `${data.updated} 기준 · 공개된 정보만 정리했으며, 발표가 나오면 바뀔 수 있습니다.`)
    ]));

    page.appendChild(this.createSection('국제 대회', 'schedule__list',
      data.international.map(event => this.createEventCard(event))));
    page.appendChild(this.createSection('리그', 'schedule__grid',
      data.leagues.map(league => this.createLeagueCard(league))));
  }

  /**
   * 제목이 있는 묶음
   * @param {string} title
   * @param {string} listClass
   * @param {Array<Element>} cards
   * @returns {Element}
   */
  createSection(title, listClass, cards) {
    return createElement('section', { className: 'schedule__section' }, [
      createElement('h3', { className: 'schedule__section-title' }, title),
      createElement('div', { className: listClass }, cards)
    ]);
  }

  /**
   * 국기 아이콘 (불러오지 못하면 숨김)
   * @param {string} code - ISO 국가 코드 (flag-icons)
   * @returns {Element}
   */
  createFlag(code) {
    const img = createElement('img', {
      className: 'schedule-flag',
      src: `${FLAG_ICON_BASE}/${code}.svg`,
      alt: '',
      loading: 'lazy'
    });
    img.onerror = () => img.remove();
    return img;
  }

  /**
   * 진행 상태 배지
   * @param {string} status
   * @returns {Element}
   */
  createStatusBadge(status) {
    return createElement('span', { className: `schedule-status schedule-status--${status}` }, STATUS_LABELS[status] || status);
  }

  /**
   * 메모 목록
   * @param {Array<string>} notes
   * @returns {Element|null}
   */
  createNotes(notes) {
    if (!notes?.length) return null;
    return createElement('ul', { className: 'schedule-card__notes' },
      notes.map(note => createElement('li', {}, note)));
  }

  /**
   * 출처 링크
   * @param {Array<{label: string, url: string}>} sources
   * @returns {Element|null}
   */
  createSources(sources) {
    if (!sources?.length) return null;
    return createElement('p', { className: 'schedule-card__sources' }, [
      createElement('span', {}, '출처 '),
      ...sources.map(source => createElement('a', {
        href: source.url,
        target: '_blank',
        rel: 'noopener noreferrer'
      }, source.label))
    ]);
  }

  /**
   * 국제 대회 카드
   * @param {Object} event
   * @returns {Element}
   */
  createEventCard(event) {
    return createElement('article', { className: 'schedule-card' }, [
      createElement('div', { className: 'schedule-card__header' }, [
        createElement('div', { className: 'schedule-card__title' }, [
          createElement('span', { className: 'schedule-card__name' }, event.name),
          createElement('span', { className: 'schedule-card__subname' }, event.nameKr)
        ]),
        this.createStatusBadge(event.status)
      ]),
      createElement('dl', { className: 'schedule-card__facts' }, [
        createElement('dt', {}, '기간'),
        createElement('dd', {}, [
          createElement('span', { className: 'schedule-card__period' }, event.period),
          event.periodNote ? createElement('span', { className: 'schedule-card__period-note' }, event.periodNote) : null
        ]),
        createElement('dt', {}, '장소'),
        createElement('dd', { className: 'schedule-card__place' }, [
          ...(event.flags || []).map(code => this.createFlag(code)),
          createElement('span', {}, event.location)
        ])
      ]),
      event.stages?.length
        ? createElement('ol', { className: 'schedule-stages' }, event.stages.map(stage =>
            createElement('li', { className: 'schedule-stages__item' }, [
              createElement('span', { className: 'schedule-stages__name' }, stage.name),
              createElement('span', { className: 'schedule-stages__place' }, [
                stage.flag ? this.createFlag(stage.flag) : null,
                createElement('span', {}, stage.place)
              ])
            ])))
        : null,
      this.createNotes(event.notes),
      this.createSources(event.sources)
    ]);
  }

  /**
   * 리그 카드
   * @param {Object} league
   * @returns {Element}
   */
  createLeagueCard(league) {
    return createElement('article', { className: 'schedule-card schedule-card--league' }, [
      createElement('div', { className: 'schedule-card__header' }, [
        createElement('div', { className: 'schedule-card__title' }, [
          createElement('span', { className: 'schedule-card__flags' }, (league.flags || []).map(code => this.createFlag(code))),
          createElement('span', { className: 'schedule-card__name' }, league.league),
          LEAGUE_FULL_NAMES[league.league]
            ? createElement('span', { className: 'schedule-card__subname' }, LEAGUE_FULL_NAMES[league.league])
            : null
        ]),
        this.createStatusBadge(league.status)
      ]),
      // 이미 정해졌거나 끝난 일정 (승강전 등)
      league.events?.length
        ? createElement('ul', { className: 'schedule-events' }, league.events.map(event =>
            createElement('li', { className: 'schedule-events__item' }, [
              createElement('span', { className: 'schedule-events__name' }, event.name),
              createElement('span', { className: 'schedule-events__period' }, `${event.period}${event.place ? ` · ${event.place}` : ''}`),
              event.status ? this.createStatusBadge(event.status) : null
            ])))
        : null,
      this.createNotes(league.notes),
      !league.events?.length && !league.notes?.length && !league.reference
        ? createElement('p', { className: 'schedule-card__empty' }, '아직 발표된 2027 일정·형식이 없습니다.')
        : null,
      // 지난 시즌 일정 (다음 시즌 흐름을 가늠하는 참고용)
      league.reference
        ? createElement('div', { className: 'schedule-reference' }, [
            createElement('span', { className: 'schedule-reference__label' }, league.reference.label),
            createElement('ul', { className: 'schedule-events' }, league.reference.events.map(event =>
              createElement('li', { className: 'schedule-events__item' }, [
                createElement('span', { className: 'schedule-events__name' }, event.name),
                createElement('span', { className: 'schedule-events__period' }, event.period)
              ])))
          ])
        : null,
      this.createSources(league.sources)
    ]);
  }
}
