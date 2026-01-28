/**
 * 아이템 사전 페이지
 */

import { $, createElement, clearElement } from '../utils/dom.js';
import { itemService } from '../services/ItemService.js';

export class ItemDictPage {
  constructor(router) {
    this.router = router;
    this.selectedItem = null;
    // 필터 상태 (디폴트 값 설정)
    this.currentType = '메인';
    this.currentTier = '전설급';
    this.currentRole = '전체';
  }

  /**
   * 페이지 렌더링
   * @param {Element} container
   */
  async render(container) {
    clearElement(container);

    // 데이터 로드
    await itemService.load();

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
   * 필터 영역 생성 (종류 + 등급 + 역할 + 검색)
   * @returns {Element}
   */
  createFilters() {
    const types = itemService.getTypes();
    const tiers = itemService.getTiers();
    const roles = itemService.getRoles();

    return createElement('div', { className: 'dictionary__filters' }, [
      createElement('input', {
        type: 'text',
        className: 'input dictionary__search-input',
        placeholder: '아이템 검색...',
        id: 'item-search'
      }),
      createElement('div', { className: 'dictionary__filter-group' }, [
        createElement('span', { className: 'dictionary__filter-label' }, '종류'),
        createElement('div', { className: 'dictionary__filter-buttons', id: 'item-types' },
          types.map(type => createElement('button', {
            className: `dictionary__category-btn ${type === this.currentType ? 'dictionary__category-btn--active' : ''}`,
            dataset: { type: type }
          }, type))
        )
      ]),
      createElement('div', { className: 'dictionary__filter-group' }, [
        createElement('span', { className: 'dictionary__filter-label' }, '등급'),
        createElement('div', { className: 'dictionary__filter-buttons', id: 'item-tiers' },
          tiers.map(tier => createElement('button', {
            className: `dictionary__category-btn ${tier === this.currentTier ? 'dictionary__category-btn--active' : ''}`,
            dataset: { tier: tier }
          }, tier))
        )
      ]),
      createElement('div', { className: 'dictionary__filter-group' }, [
        createElement('span', { className: 'dictionary__filter-label' }, '역할'),
        createElement('div', { className: 'dictionary__filter-buttons', id: 'item-roles' },
          roles.map(role => createElement('button', {
            className: `dictionary__category-btn ${role === this.currentRole ? 'dictionary__category-btn--active' : ''}`,
            dataset: { role: role }
          }, role))
        )
      ])
    ]);
  }

  /**
   * 그리드 컨테이너 생성
   * @returns {Element}
   */
  createGridContainer() {
    return createElement('div', { className: 'dictionary__grid-container' }, [
      createElement('div', { className: 'dictionary__grid', id: 'item-grid' })
    ]);
  }

  /**
   * 상세 정보 패널 생성
   * @returns {Element}
   */
  createDetailPanel() {
    return createElement('div', {
      className: 'dictionary__detail dictionary__detail--empty',
      id: 'item-detail'
    }, '아이템을 선택하면 상세 정보가 표시됩니다');
  }

  /**
   * 그리드 렌더링
   * @param {string} searchQuery
   */
  renderGrid(searchQuery = '') {
    const grid = $('#item-grid');
    if (!grid) return;

    clearElement(grid);

    let items = itemService.getFiltered({
      type: this.currentType,
      tier: this.currentTier,
      role: this.currentRole
    });

    if (searchQuery) {
      items = items.filter(item =>
        item.nameKr.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    items.forEach(item => {
      const isSelected = this.selectedItem && this.selectedItem.id === item.id;
      const iconUrl = itemService.getIconUrl(item.id);

      const imgEl = createElement('img', {
        className: 'dict-item__icon',
        src: iconUrl,
        alt: item.nameKr,
        loading: 'lazy'
      });
      imgEl.onerror = () => {
        imgEl.style.display = 'none';
        const placeholder = createElement('div', {
          className: 'dict-item__icon dict-item__icon--placeholder'
        }, item.nameKr.charAt(0));
        imgEl.parentNode.insertBefore(placeholder, imgEl);
      };

      const itemEl = createElement('div', {
        className: `dict-item ${isSelected ? 'dict-item--selected' : ''}`,
        dataset: { itemId: item.id }
      }, [
        imgEl,
        createElement('span', { className: 'dict-item__name' }, item.nameKr)
      ]);

      grid.appendChild(itemEl);
    });
  }

  /**
   * 상세 패널 업데이트
   * @param {Object} item
   */
  updateDetailPanel(item) {
    const detail = $('#item-detail');
    if (!detail) return;

    clearElement(detail);
    detail.classList.remove('dictionary__detail--empty');

    const iconUrl = itemService.getIconUrl(item.id);

    const detailImg = createElement('img', {
      className: 'detail-panel__icon',
      src: iconUrl,
      alt: item.nameKr
    });
    detailImg.onerror = () => {
      detailImg.style.display = 'none';
      const placeholder = createElement('div', {
        className: 'detail-panel__icon detail-panel__icon--placeholder'
      }, item.nameKr.charAt(0));
      detailImg.parentNode.insertBefore(placeholder, detailImg);
    };

    const panel = createElement('div', { className: 'detail-panel' }, [
      detailImg,
      createElement('div', { className: 'detail-panel__info' }, [
        createElement('div', { className: 'detail-panel__header' }, [
          createElement('span', { className: 'detail-panel__name' }, item.nameKr),
          createElement('span', { className: 'detail-panel__tier' }, item.tier),
          createElement('span', { className: 'detail-panel__role' }, item.role)
        ]),
        createElement('p', { className: 'detail-panel__gold' }, `${item.gold} 골드`),
        createElement('p', { className: 'detail-panel__effect' }, item.effect),
        createElement('p', { className: 'detail-panel__description' }, item.description)
      ])
    ]);

    detail.appendChild(panel);
  }

  /**
   * 이벤트 연결
   */
  attachEvents() {
    // 검색 이벤트
    const searchInput = $('#item-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.renderGrid(e.target.value);
      });
    }

    // 종류 필터 이벤트
    const types = $('#item-types');
    if (types) {
      types.addEventListener('click', (e) => {
        const btn = e.target.closest('.dictionary__category-btn');
        if (btn) {
          this.currentType = btn.dataset.type;
          types.querySelectorAll('.dictionary__category-btn').forEach(b => {
            b.classList.remove('dictionary__category-btn--active');
          });
          btn.classList.add('dictionary__category-btn--active');
          const searchInput = $('#item-search');
          this.renderGrid(searchInput ? searchInput.value : '');
        }
      });
    }

    // 등급 필터 이벤트
    const tiers = $('#item-tiers');
    if (tiers) {
      tiers.addEventListener('click', (e) => {
        const btn = e.target.closest('.dictionary__category-btn');
        if (btn) {
          this.currentTier = btn.dataset.tier;
          tiers.querySelectorAll('.dictionary__category-btn').forEach(b => {
            b.classList.remove('dictionary__category-btn--active');
          });
          btn.classList.add('dictionary__category-btn--active');
          const searchInput = $('#item-search');
          this.renderGrid(searchInput ? searchInput.value : '');
        }
      });
    }

    // 역할 필터 이벤트
    const roles = $('#item-roles');
    if (roles) {
      roles.addEventListener('click', (e) => {
        const btn = e.target.closest('.dictionary__category-btn');
        if (btn) {
          this.currentRole = btn.dataset.role;
          roles.querySelectorAll('.dictionary__category-btn').forEach(b => {
            b.classList.remove('dictionary__category-btn--active');
          });
          btn.classList.add('dictionary__category-btn--active');
          const searchInput = $('#item-search');
          this.renderGrid(searchInput ? searchInput.value : '');
        }
      });
    }

    // 그리드 아이템 클릭 이벤트
    const grid = $('#item-grid');
    if (grid) {
      grid.addEventListener('click', (e) => {
        const itemEl = e.target.closest('.dict-item');
        if (itemEl) {
          const itemId = parseInt(itemEl.dataset.itemId);
          const item = itemService.getById(itemId);
          if (item) {
            this.selectedItem = item;
            this.renderGrid($('#item-search')?.value || '');
            this.updateDetailPanel(item);
          }
        }
      });
    }
  }
}
