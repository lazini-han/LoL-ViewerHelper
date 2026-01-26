/**
 * DOM 헬퍼 함수
 */

/**
 * 요소 선택
 * @param {string} selector
 * @param {Element} parent
 * @returns {Element|null}
 */
export function $(selector, parent = document) {
  return parent.querySelector(selector);
}

/**
 * 여러 요소 선택
 * @param {string} selector
 * @param {Element} parent
 * @returns {NodeList}
 */
export function $$(selector, parent = document) {
  return parent.querySelectorAll(selector);
}

/**
 * 요소 생성
 * @param {string} tag
 * @param {Object} attrs
 * @param {string|Element|Element[]} children
 * @returns {Element}
 */
export function createElement(tag, attrs = {}, children = null) {
  const el = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') {
      el.className = value;
    } else if (key === 'dataset') {
      for (const [dataKey, dataValue] of Object.entries(value)) {
        el.dataset[dataKey] = dataValue;
      }
    } else if (key.startsWith('on')) {
      const event = key.slice(2).toLowerCase();
      el.addEventListener(event, value);
    } else {
      el.setAttribute(key, value);
    }
  }

  if (children !== null) {
    if (typeof children === 'string') {
      el.textContent = children;
    } else if (Array.isArray(children)) {
      children.forEach(child => {
        if (child) el.appendChild(child);
      });
    } else {
      el.appendChild(children);
    }
  }

  return el;
}

/**
 * 요소 내용 비우기
 * @param {Element} el
 */
export function clearElement(el) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}
