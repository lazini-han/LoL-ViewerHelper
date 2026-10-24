/**
 * 소환사의 협곡 맵 위치 표시 컴포넌트 (오브젝트 사전 상세 패널 하단)
 * 맵 이미지 위에 오브젝트 위치를 마커로 표시 (스타일: css/dictionary.css 의 .jungle-map)
 */

import { createElement } from '../utils/dom.js';
import { ddragonBase, getCachedDDragonVersion } from '../utils/ddragon.js';

// 진영별 마커 라벨 (범례 순서)
const SIDE_LABELS = {
  blue: '블루 진영',
  red: '레드 진영',
  river: '강',
  neutral: '에픽 몬스터 둥지'
};

/**
 * 맵 위치 영역 생성
 * @param {Array<{side: string, x: number, y: number}>} positions - 맵 이미지 기준 % 좌표
 * @param {string} name - 오브젝트 이름 (대체 텍스트)
 * @returns {Element}
 */
export function createJungleMap(positions, name) {
  const markers = positions.map(pos => createElement('span', {
    className: `jungle-map__marker jungle-map__marker--${pos.side}`,
    style: `left: ${pos.x}%; top: ${pos.y}%;`,
    title: SIDE_LABELS[pos.side] || ''
  }));

  const sides = Object.keys(SIDE_LABELS).filter(side => positions.some(pos => pos.side === side));

  return createElement('div', { className: 'jungle-map' }, [
    createElement('span', { className: 'jungle-map__title' }, '맵 위치'),
    createElement('div', { className: 'jungle-map__board' }, [
      createElement('img', {
        className: 'jungle-map__image',
        src: `${ddragonBase(getCachedDDragonVersion())}/img/map/map11.png`,
        alt: `소환사의 협곡 - ${name} 위치`
      }),
      ...markers
    ]),
    createElement('div', { className: 'jungle-map__legend' }, sides.map(side =>
      createElement('span', { className: 'jungle-map__legend-item' }, [
        createElement('span', { className: `jungle-map__dot jungle-map__dot--${side}` }),
        createElement('span', {}, SIDE_LABELS[side])
      ])
    ))
  ]);
}
