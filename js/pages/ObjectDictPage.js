/**
 * 오브젝트 사전 페이지
 */

import { $, createElement, clearElement } from '../utils/dom.js';
import { objectService } from '../services/ObjectService.js';

export class ObjectDictPage {
  constructor(router) {
    this.router = router;
    this.selectedObject = null;
    this.currentCategory = '전체';
  }

  /**
   * 페이지 렌더링
   * @param {Element} container
   */
  async render(container) {
    clearElement(container);

    // 데이터 로드
    await objectService.load();

    const page = createElement('div', { className: 'page dictionary' }, [
      this.createFilters(),
      this.createGridContainer(),
      this.createDetailPanel()
    ]);

    container.appendChild(page);
    this.renderGrid();
    this.attachEvents();
  }

  /**
   * 필터 영역 생성 (검색 + 카테고리)
   * @returns {Element}
   */
  createFilters() {
    const categories = objectService.getCategories();

    return createElement('div', { className: 'dictionary__filters' }, [
      createElement('input', {
        type: 'text',
        className: 'input dictionary__search-input',
        placeholder: '오브젝트 검색...',
        id: 'object-search'
      }),
      createElement('div', { className: 'dictionary__categories', id: 'object-categories' },
        categories.map(cat => createElement('button', {
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
      createElement('div', { className: 'dictionary__grid', id: 'object-grid' })
    ]);
  }

  /**
   * 상세 정보 패널 생성
   * @returns {Element}
   */
  createDetailPanel() {
    return createElement('div', {
      className: 'dictionary__detail dictionary__detail--empty',
      id: 'object-detail'
    }, '오브젝트를 선택하면 상세 정보가 표시됩니다');
  }

  /**
   * 그리드 렌더링
   * @param {string} searchQuery
   */
  renderGrid(searchQuery = '') {
    const grid = $('#object-grid');
    if (!grid) return;

    clearElement(grid);

    let objects = objectService.getByCategory(this.currentCategory);
    if (searchQuery) {
      objects = objects.filter(obj =>
        obj.nameKr.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    objects.forEach(obj => {
      const isSelected = this.selectedObject && this.selectedObject.id === obj.id;
      const imgEl = createElement('img', {
        className: 'dict-item__icon',
        src: obj.icon,
        alt: obj.nameKr,
        loading: 'lazy'
      });
      // 이미지 로드 실패 시 이름 첫 글자로 대체
      imgEl.onerror = () => {
        imgEl.style.display = 'none';
        const placeholder = createElement('div', {
          className: 'dict-item__icon dict-item__icon--placeholder'
        }, obj.nameKr.charAt(0));
        imgEl.parentNode.insertBefore(placeholder, imgEl);
      };

      const item = createElement('div', {
        className: `dict-item ${isSelected ? 'dict-item--selected' : ''}`,
        dataset: { objectId: obj.id }
      }, [
        imgEl,
        createElement('span', { className: 'dict-item__name' }, obj.nameKr)
      ]);

      grid.appendChild(item);
    });
  }

  /**
   * 상세 패널 업데이트
   * @param {Object} obj
   */
  updateDetailPanel(obj) {
    const detail = $('#object-detail');
    if (!detail) return;

    clearElement(detail);
    detail.classList.remove('dictionary__detail--empty');

    const detailImg = createElement('img', {
      className: 'detail-panel__icon',
      src: obj.icon,
      alt: obj.nameKr
    });
    detailImg.onerror = () => {
      detailImg.style.display = 'none';
      const placeholder = createElement('div', {
        className: 'detail-panel__icon detail-panel__icon--placeholder'
      }, obj.nameKr.charAt(0));
      detailImg.parentNode.insertBefore(placeholder, detailImg);
    };

    const panel = createElement('div', { className: 'detail-panel' }, [
      detailImg,
      createElement('div', { className: 'detail-panel__info' }, [
        createElement('div', { className: 'detail-panel__header' }, [
          createElement('span', { className: 'detail-panel__name' }, obj.nameKr),
          createElement('span', { className: 'detail-panel__category' }, obj.category)
        ]),
        createElement('p', { className: 'detail-panel__effect' }, obj.effect),
        createElement('p', { className: 'detail-panel__description' }, obj.description),
        obj.spawnTime ? createElement('p', { className: 'detail-panel__meta' }, `등장 시간: ${obj.spawnTime}`) : null
      ].filter(Boolean))
    ]);

    detail.appendChild(panel);
  }

  /**
   * 이벤트 연결
   */
  attachEvents() {
    // 검색 이벤트
    const searchInput = $('#object-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.renderGrid(e.target.value);
      });
    }

    // 카테고리 버튼 이벤트
    const categories = $('#object-categories');
    if (categories) {
      categories.addEventListener('click', (e) => {
        const btn = e.target.closest('.dictionary__category-btn');
        if (btn) {
          this.currentCategory = btn.dataset.category;
          // 활성 상태 업데이트
          categories.querySelectorAll('.dictionary__category-btn').forEach(b => {
            b.classList.remove('dictionary__category-btn--active');
          });
          btn.classList.add('dictionary__category-btn--active');
          // 그리드 다시 렌더링
          const searchInput = $('#object-search');
          this.renderGrid(searchInput ? searchInput.value : '');
        }
      });
    }

    // 그리드 아이템 클릭 이벤트
    const grid = $('#object-grid');
    if (grid) {
      grid.addEventListener('click', (e) => {
        const item = e.target.closest('.dict-item');
        if (item) {
          const objectId = item.dataset.objectId;
          const obj = objectService.getById(objectId);
          if (obj) {
            this.selectedObject = obj;
            this.renderGrid($('#object-search')?.value || '');
            this.updateDetailPanel(obj);
          }
        }
      });
    }
  }
}
