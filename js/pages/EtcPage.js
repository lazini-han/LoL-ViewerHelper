/**
 * 기타 페이지 - 탭으로 아이템 사전 / 스택 요소 사전을 전환
 */

import { createElement, clearElement } from '../utils/dom.js';
import { ItemDictPage } from './ItemDictPage.js';
import { StackDictPage } from './StackDictPage.js';

const TABS = [
  { key: 'items', label: '아이템' },
  { key: 'stacks', label: '스택 요소' }
];

export class EtcPage {
  constructor(router) {
    this.router = router;
    // 탭별 페이지 인스턴스를 유지해 필터/선택 상태를 보존
    this.pages = {
      items: new ItemDictPage(router),
      stacks: new StackDictPage(router)
    };
    this.currentTab = 'items';
  }

  /**
   * 페이지 렌더링
   * @param {Element} container
   */
  async render(container) {
    clearElement(container);

    const tabs = createElement('div', { className: 'etc-tabs', role: 'tablist' },
      TABS.map(tab => createElement('button', {
        className: `etc-tabs__btn ${tab.key === this.currentTab ? 'etc-tabs__btn--active' : ''}`,
        type: 'button',
        role: 'tab',
        dataset: { tab: tab.key }
      }, tab.label))
    );
    const content = createElement('div', { className: 'etc-page__content' });

    tabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.etc-tabs__btn');
      if (!btn || btn.dataset.tab === this.currentTab) return;
      this.currentTab = btn.dataset.tab;
      tabs.querySelectorAll('.etc-tabs__btn').forEach(b => {
        b.classList.toggle('etc-tabs__btn--active', b === btn);
      });
      this.renderTab(content);
    });

    container.appendChild(createElement('div', { className: 'page etc-page' }, [tabs, content]));
    await this.renderTab(content);
  }

  /**
   * 현재 탭 렌더링
   * @param {Element} content
   */
  async renderTab(content) {
    await this.pages[this.currentTab].render(content);
  }
}
