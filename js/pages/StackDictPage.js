/**
 * 스택 요소 사전 페이지 (기타 > 스택 요소 탭)
 */

import { $, createElement, clearElement } from '../utils/dom.js';
import { stackService } from '../services/StackService.js';

export class StackDictPage {
  constructor(router) {
    this.router = router;
    this.selectedStack = null;
    this.currentCategory = '전체';
  }

  /**
   * 페이지 렌더링
   * @param {Element} container
   */
  async render(container) {
    clearElement(container);

    // 데이터 로드
    await stackService.load();

    const page = createElement('div', { className: 'page dictionary' }, [
      this.createFilters(),
      this.createGridContainer(),
      this.createDetailPanel()
    ]);

    container.appendChild(page);
    this.renderGrid();
    this.attachEvents();

    if (this.selectedStack) {
      this.updateDetailPanel(this.selectedStack);
    }
  }

  /**
   * 필터 영역 생성 (검색 + 분류)
   * @returns {Element}
   */
  createFilters() {
    return createElement('div', { className: 'dictionary__filters' }, [
      createElement('input', {
        type: 'text',
        className: 'input dictionary__search-input',
        placeholder: '스택 요소 검색...',
        id: 'stack-search'
      }),
      createElement('div', { className: 'dictionary__categories', id: 'stack-categories' },
        stackService.getCategories().map(cat => createElement('button', {
          className: `dictionary__category-btn ${cat === this.currentCategory ? 'dictionary__category-btn--active' : ''}`,
          dataset: { category: cat }
        }, cat))
      )
    ]);
  }

  /**
   * 그리드 컨테이너 생성
   * @returns {Element}
   */
  createGridContainer() {
    return createElement('div', { className: 'dictionary__grid-container' }, [
      createElement('div', { className: 'dictionary__grid', id: 'stack-grid' })
    ]);
  }

  /**
   * 상세 정보 패널 생성
   * @returns {Element}
   */
  createDetailPanel() {
    return createElement('div', {
      className: 'dictionary__detail dictionary__detail--empty',
      id: 'stack-detail'
    }, '스택 요소를 선택하면 상세 정보가 표시됩니다');
  }

  /**
   * 아이콘 생성 (로드 실패 시 이름 첫 글자로 대체)
   * @param {Object} stack
   * @param {string} className
   * @returns {Element}
   */
  createIcon(stack, className) {
    const img = createElement('img', {
      className,
      src: stack.icon,
      alt: stack.name,
      loading: 'lazy'
    });
    img.onerror = () => {
      img.style.display = 'none';
      const placeholder = createElement('div', {
        className: `${className} ${className}--placeholder`
      }, stack.name.charAt(0));
      img.parentNode.insertBefore(placeholder, img);
    };
    return img;
  }

  /**
   * 그리드 렌더링
   * @param {string} searchQuery
   */
  renderGrid(searchQuery = '') {
    const grid = $('#stack-grid');
    if (!grid) return;

    clearElement(grid);

    stackService.getFiltered(this.currentCategory, searchQuery).forEach(stack => {
      const isSelected = this.selectedStack && this.selectedStack.id === stack.id;

      grid.appendChild(createElement('div', {
        className: `dict-item ${isSelected ? 'dict-item--selected' : ''}`,
        dataset: { stackId: stack.id }
      }, [
        this.createIcon(stack, 'dict-item__icon'),
        // 챔피언 스킬은 챔피언 이름을 함께 표시
        stack.owner ? createElement('span', { className: 'dict-item__owner' }, stack.owner) : null,
        createElement('span', { className: 'dict-item__name' }, stack.name)
      ]));
    });
  }

  /**
   * 상세 패널 업데이트
   * @param {Object} stack
   */
  updateDetailPanel(stack) {
    const detail = $('#stack-detail');
    if (!detail) return;

    clearElement(detail);
    detail.classList.remove('dictionary__detail--empty');

    const rows = [
      ['쌓는 방법', stack.gain],
      ['스택 효과', stack.effect],
      ['달성 효과', stack.milestone],
      ['관전 포인트', stack.watch]
    ].filter(([, text]) => text);

    detail.appendChild(createElement('div', { className: 'detail-panel' }, [
      this.createIcon(stack, 'detail-panel__icon'),
      createElement('div', { className: 'detail-panel__info' }, [
        createElement('div', { className: 'detail-panel__header' }, [
          createElement('span', { className: 'detail-panel__name' },
            stack.owner ? `${stack.owner} - ${stack.name}` : stack.name),
          createElement('span', { className: 'detail-panel__category' }, stack.category)
        ]),
        ...rows.map(([label, text]) => createElement('p', { className: 'detail-panel__row' }, [
          createElement('span', { className: 'detail-panel__row-label' }, label),
          createElement('span', {}, text)
        ]))
      ])
    ]));
  }

  /**
   * 이벤트 연결
   */
  attachEvents() {
    const searchInput = $('#stack-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.renderGrid(e.target.value);
      });
    }

    const categories = $('#stack-categories');
    if (categories) {
      categories.addEventListener('click', (e) => {
        const btn = e.target.closest('.dictionary__category-btn');
        if (!btn) return;
        this.currentCategory = btn.dataset.category;
        categories.querySelectorAll('.dictionary__category-btn').forEach(b => {
          b.classList.toggle('dictionary__category-btn--active', b === btn);
        });
        this.renderGrid($('#stack-search')?.value || '');
      });
    }

    const grid = $('#stack-grid');
    if (grid) {
      grid.addEventListener('click', (e) => {
        const item = e.target.closest('.dict-item');
        if (!item) return;
        const stack = stackService.getById(item.dataset.stackId);
        if (stack) {
          this.selectedStack = stack;
          this.renderGrid($('#stack-search')?.value || '');
          this.updateDetailPanel(stack);
        }
      });
    }
  }
}
