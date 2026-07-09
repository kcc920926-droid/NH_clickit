(function attachPageContext(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.CaptureITPageContext = api;
})(globalThis, function createPageContextApi() {
  const DENIED_KEYS = new Set([
    'authorization',
    'cookie',
    'cookies',
    'hiddeninput',
    'html',
    'innerhtml',
    'outerhtml',
    'password',
    'pagehtml',
    'sessiontoken',
    'token',
  ]);

  function bounded(value, limit) {
    if (typeof value !== 'string') return value;
    return value.replace(/\s+/g, ' ').trim().slice(0, limit);
  }

  function sanitizeValue(value, path = []) {
    if (Array.isArray(value)) {
      return value.slice(0, 50).map((entry, index) => sanitizeValue(entry, path.concat(String(index))));
    }
    if (!value || typeof value !== 'object') {
      const key = path.at(-1);
      if (key === 'visibleText') {
        return bounded(value, path.includes('surroundingContext') ? 1000 : 2000);
      }
      return bounded(value, 500);
    }

    const output = {};
    for (const [key, entry] of Object.entries(value)) {
      const normalized = key.toLowerCase().replace(/[^a-z]/g, '');
      if (DENIED_KEYS.has(normalized)) continue;
      if (key === 'value' && String(value.type || '').toLowerCase() === 'password') continue;
      output[key] = sanitizeValue(entry, path.concat(key));
    }
    return output;
  }

  function sanitizeContext(input) {
    return sanitizeValue(input);
  }

  function textOf(node, limit = 500) {
    return bounded(node && typeof node.innerText === 'string' ? node.innerText : '', limit);
  }

  function attr(node, name) {
    return node && typeof node.getAttribute === 'function' ? node.getAttribute(name) || '' : '';
  }

  function nodeText(node, limit = 500) {
    if (!node) return '';
    if (typeof node.innerText === 'string') return bounded(node.innerText, limit);
    if (typeof node.textContent === 'string') return bounded(node.textContent, limit);
    return '';
  }

  function cssString(value) {
    return String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  function selectorFor(node, fallback = 'unknown') {
    if (!node) return fallback;
    const testId = attr(node, 'data-testid');
    if (testId) return `[data-testid="${cssString(testId)}"]`;
    const id = node.id || attr(node, 'id');
    if (id) return `#${cssString(id)}`;
    const name = node.name || attr(node, 'name');
    if (name) return `[name="${cssString(name)}"]`;
    const tagName = node.tagName ? String(node.tagName).toLowerCase() : '';
    return tagName || fallback;
  }

  function xpathFor(node) {
    if (!node) return '';
    const id = node.id || attr(node, 'id');
    if (id) return `//*[@id="${cssString(id)}"]`;
    const tagName = node.tagName ? String(node.tagName).toLowerCase() : '';
    return tagName ? `//${tagName}` : '';
  }

  function bboxOf(node) {
    if (!node || typeof node.getBoundingClientRect !== 'function') {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    const rect = node.getBoundingClientRect();
    return {
      x: Number(rect.x ?? rect.left ?? 0),
      y: Number(rect.y ?? rect.top ?? 0),
      width: Number(rect.width ?? 0),
      height: Number(rect.height ?? 0),
    };
  }

  function ariaLabelledByText(target, documentRef) {
    const ids = attr(target, 'aria-labelledby').split(/\s+/).filter(Boolean);
    if (!ids.length || !documentRef || typeof documentRef.getElementById !== 'function') return '';
    return bounded(ids.map((id) => nodeText(documentRef.getElementById(id), 200)).filter(Boolean).join(' '), 500);
  }

  function labelForText(target, documentRef) {
    const id = target && (target.id || attr(target, 'id'));
    if (!id || !documentRef || typeof documentRef.querySelector !== 'function') return '';
    return nodeText(documentRef.querySelector(`label[for="${cssString(id)}"]`), 300);
  }

  function shouldMaskField(fieldMeta = {}) {
    const keys = [
      fieldMeta.type,
      fieldMeta.name,
      fieldMeta.id,
      fieldMeta.autocomplete,
      fieldMeta.ariaLabel,
      fieldMeta.label,
      fieldMeta.stableLocator,
    ];
    return keys.some((key) => {
      const normalized = String(key ?? '').toLowerCase().replace(/[^a-z]/g, '');
      return normalized === 'password'
        || normalized === 'hidden'
        || normalized.includes('authorization')
        || normalized.includes('cookie')
        || normalized.includes('token')
        || normalized.includes('session');
    });
  }

  function maskDigits(value) {
    return String(value).replace(/\d/g, '•');
  }

  function maskSensitiveValue(rawValue, fieldMeta = {}) {
    const value = String(rawValue ?? '');
    if (shouldMaskField(fieldMeta)) return '••••';
    const numericPatterns = [
      /\b\d{6}-?\d{7}\b/,
      /\b01[016789]-?\d{3,4}-?\d{4}\b/,
      /\b\d{2,6}-\d{2,8}-\d{2,8}(?:-\d{1,4})?\b/,
      /^\d{6}$/,
    ];
    return numericPatterns.some((pattern) => pattern.test(value)) ? maskDigits(value) : value;
  }

  function collectTargetContext(target, documentRef = document) {
    const tagName = target && target.tagName ? String(target.tagName) : '';
    const type = target && target.type ? String(target.type) : attr(target, 'type');
    const role = attr(target, 'role');
    const ariaLabel = attr(target, 'aria-label');
    const label = labelForText(target, documentRef);
    const accessibleName = ariaLabel
      || ariaLabelledByText(target, documentRef)
      || label
      || attr(target, 'placeholder');
    const selector = selectorFor(target);
    const stableLocator = selector;
    const rawValue = target && target.value !== undefined ? String(target.value) : attr(target, 'value');
    const fieldMeta = {
      type,
      name: target && target.name || attr(target, 'name'),
      id: target && target.id || attr(target, 'id'),
      autocomplete: attr(target, 'autocomplete'),
      ariaLabel,
      label,
      stableLocator,
    };
    const maskedValue = maskSensitiveValue(rawValue, fieldMeta);
    const masked = shouldMaskField(fieldMeta) || maskedValue !== rawValue;

    return {
      tagName,
      type,
      role,
      ariaLabel,
      accessibleName,
      label,
      visibleText: nodeText(target, 500),
      value: masked ? '' : rawValue,
      maskedValue: masked ? maskedValue : '',
      selector,
      xpath: xpathFor(target),
      stableLocator,
      bbox: bboxOf(target),
    };
  }

  function collectContainerContext(target, documentRef = document) {
    const body = documentRef && documentRef.body ? documentRef.body : null;
    const lookups = [
      ['dialog', 'dialog,[role="dialog"]'],
      ['form', 'form'],
      ['section', 'section,article,main'],
      ['card', '.card,[class*="card"],[data-card]'],
      ['row', 'tr'],
      ['body', 'body'],
    ];
    let selectedType = 'body';
    let selected = body;
    if (target && typeof target.closest === 'function') {
      for (const [type, selector] of lookups) {
        const candidate = selector === 'body' ? body : target.closest(selector);
        if (candidate) {
          selectedType = type;
          selected = candidate;
          break;
        }
      }
    }
    const heading = selected && typeof selected.querySelector === 'function'
      ? selected.querySelector('h1,h2,h3,h4,h5,h6,[role="heading"]')
      : null;
    return {
      type: selectedType,
      selector: selectorFor(selected, selectedType),
      heading: nodeText(heading, 300),
      visibleText: nodeText(selected, 1000),
      bbox: bboxOf(selected),
    };
  }

  function collectPageContext(target, documentRef = document, windowRef = window) {
    const container = target && target.closest
      ? target.closest('section,article,main,dialog,body')
      : null;
    const heading = container && container.querySelector
      ? container.querySelector('h1,h2,h3,h4,h5,h6,[role="heading"]')
      : null;
    const row = target && target.closest ? target.closest('tr') : null;
    const cell = target && target.closest ? target.closest('td,th') : null;
    const form = target && target.closest ? target.closest('form') : null;
    const getAttribute = target && target.getAttribute
      ? target.getAttribute.bind(target)
      : () => null;

    return sanitizeContext({
      pageUrl: windowRef.location.href,
      pageTitle: documentRef.title,
      route: `${windowRef.location.pathname}${windowRef.location.search}${windowRef.location.hash}`,
      viewportSize: {
        width: windowRef.innerWidth,
        height: windowRef.innerHeight,
      },
      scrollPosition: {
        x: windowRef.scrollX,
        y: windowRef.scrollY,
      },
      target: {
        tagName: target && target.tagName ? target.tagName : '',
        type: target && target.type ? target.type : '',
        role: getAttribute('role') || '',
        ariaLabel: getAttribute('aria-label') || '',
        visibleText: textOf(target, 500),
      },
      surroundingContext: {
        nearestHeading: textOf(heading, 300),
        formName: form && form.getAttribute
          ? form.getAttribute('aria-label') || form.getAttribute('name') || form.getAttribute('id') || ''
          : '',
        rowText: textOf(row, 1000),
        columnText: textOf(cell, 500),
        visibleText: textOf(documentRef.body, 1000),
      },
      visibleText: textOf(documentRef.body, 2000),
    });
  }

  return {
    collectContainerContext,
    collectPageContext,
    collectTargetContext,
    maskSensitiveValue,
    sanitizeContext,
    shouldMaskField,
  };
});
