/**
 * 챔피언 "한눈에 보기" 요약 블록 (난이도·공격 유형·피해 유형, 역할 태그, 플레이 스타일 막대)
 * 경기 화면 챔피언 상세와 챔피언 호버창에서 함께 사용 (스타일: css/match-view.css 의 .champion-summary)
 */

import { createElement } from '../utils/dom.js';

/**
 * @param {Object|null} summary - championService.getChampionSummary() 결과
 * @param {string} [title] - 블록 제목
 * @returns {Element|null} 표시할 내용이 없으면 null
 */
export function createChampionSummary(summary, title = '한눈에 보기') {
  if (!summary) return null;

  const basics = [summary.difficulty ? `난이도 ${summary.difficulty}` : null, summary.attackType, summary.damageType]
    .filter(Boolean);

  const hasContent = basics.length > 0 || summary.tags.length > 0 || summary.stats.length > 0;
  if (!hasContent) return null;

  return createElement('div', { className: 'champion-summary' }, [
    createElement('h4', { className: 'champion-summary__title' }, title),
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
