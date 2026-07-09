const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const modulePath = path.resolve(__dirname, '../extension/shared/page-context.js');

function loadContext() {
  assert.equal(fs.existsSync(modulePath), true, 'page context module should exist');
  delete require.cache[modulePath];
  return require(modulePath);
}

test('sanitizes password values and bounds captured text', () => {
  const context = loadContext();
  const result = context.sanitizeContext({
    pageUrl: 'https://internal.example/orders',
    target: {
      tagName: 'INPUT',
      type: 'password',
      value: 'secret-value',
      visibleText: 'Password',
    },
    surroundingContext: {
      nearestHeading: '사용자 정보',
      visibleText: 'B'.repeat(2500),
    },
    visibleText: 'A'.repeat(2500),
  });

  assert.equal(Object.hasOwn(result.target, 'value'), false);
  assert.equal(result.visibleText.length, 2000);
  assert.equal(result.surroundingContext.visibleText.length, 1000);
  assert.equal(result.pageUrl, 'https://internal.example/orders');
});

test('removes hidden and authentication-shaped context fields', () => {
  const context = loadContext();
  const result = context.sanitizeContext({
    cookie: 'session=secret',
    authorization: 'Bearer secret',
    hiddenInput: 'hidden-secret',
    target: { tagName: 'BUTTON', visibleText: '승인' },
  });

  assert.equal(Object.hasOwn(result, 'cookie'), false);
  assert.equal(Object.hasOwn(result, 'authorization'), false);
  assert.equal(Object.hasOwn(result, 'hiddenInput'), false);
  assert.equal(result.target.visibleText, '승인');
});

test('collects bounded visible context around the selected element', () => {
  const context = loadContext();
  const heading = { innerText: '주문 목록' };
  const container = { querySelector: () => heading };
  const row = { innerText: 'ORD-1002 승인 대기 승인' };
  const cell = { innerText: '승인' };
  const form = { getAttribute: (name) => name === 'aria-label' ? '주문 승인' : null };
  const target = {
    tagName: 'BUTTON',
    type: 'button',
    innerText: '승인',
    isConnected: true,
    getAttribute(name) {
      if (name === 'role') return 'button';
      if (name === 'aria-label') return 'ORD-1002 승인';
      return null;
    },
    closest(selector) {
      if (selector === 'tr') return row;
      if (selector === 'td,th') return cell;
      if (selector === 'form') return form;
      if (selector === 'section,article,main,dialog,body') return container;
      return null;
    },
  };
  const document = {
    title: '주문 관리',
    body: { innerText: '주문 목록 ORD-1002 승인 대기 승인' },
  };
  const window = {
    location: {
      href: 'https://internal.example/orders#list',
      pathname: '/orders',
      search: '',
      hash: '#list',
    },
    innerWidth: 1280,
    innerHeight: 720,
    scrollX: 0,
    scrollY: 120,
  };

  const result = context.collectPageContext(target, document, window);

  assert.equal(result.pageTitle, '주문 관리');
  assert.equal(result.route, '/orders#list');
  assert.equal(result.target.role, 'button');
  assert.equal(result.target.ariaLabel, 'ORD-1002 승인');
  assert.equal(result.surroundingContext.nearestHeading, '주문 목록');
  assert.equal(result.surroundingContext.rowText, 'ORD-1002 승인 대기 승인');
  assert.equal(result.surroundingContext.formName, '주문 승인');
  assert.deepEqual(result.viewportSize, { width: 1280, height: 720 });
  assert.deepEqual(result.scrollPosition, { x: 0, y: 120 });
});

test('collectTargetContext derives accessible name and stable locator with masking', () => {
  const context = loadContext();
  const labelledNode = { textContent: '라벨 텍스트' };
  const target = {
    tagName: 'INPUT',
    type: 'password',
    value: 'secret',
    id: 'password-field',
    name: '',
    innerText: '',
    getAttribute(name) {
      if (name === 'aria-label') return '';
      if (name === 'aria-labelledby') return 'field-label';
      if (name === 'data-testid') return 'login-password';
      if (name === 'role') return 'textbox';
      if (name === 'placeholder') return '비밀번호';
      return null;
    },
    getBoundingClientRect() {
      return { x: 10, y: 20, width: 300, height: 40 };
    },
  };
  const document = {
    body: {},
    getElementById(id) {
      return id === 'field-label' ? labelledNode : null;
    },
    querySelector() {
      return null;
    },
  };

  const result = context.collectTargetContext(target, document);

  assert.equal(result.accessibleName, '라벨 텍스트');
  assert.equal(result.stableLocator, '[data-testid="login-password"]');
  assert.equal(result.value, '');
  assert.notEqual(result.maskedValue, 'secret');
  assert.deepEqual(result.bbox, { x: 10, y: 20, width: 300, height: 40 });
});

test('collectTargetContext handles anonymous elements without selectors', () => {
  const context = loadContext();
  const target = {
    tagName: '',
    getAttribute() {
      return null;
    },
  };

  const result = context.collectTargetContext(target, { body: {} });

  assert.deepEqual(Object.keys(result).sort(), [
    'accessibleName',
    'ariaLabel',
    'bbox',
    'label',
    'maskedValue',
    'role',
    'selector',
    'stableLocator',
    'tagName',
    'type',
    'value',
    'visibleText',
    'xpath',
  ].sort());
  assert.equal(result.stableLocator, result.selector);
});

test('collectContainerContext prefers dialog over lower-priority ancestors', () => {
  const context = loadContext();
  const dialog = {
    tagName: 'DIALOG',
    innerText: '다이얼로그 본문',
    getAttribute: () => null,
    querySelector: () => ({ innerText: '다이얼로그 제목' }),
    getBoundingClientRect: () => ({ x: 0, y: 0, width: 400, height: 300 }),
  };
  const form = { tagName: 'FORM', innerText: '폼', getAttribute: () => null };
  const target = {
    closest(selector) {
      if (selector === 'dialog,[role="dialog"]') return dialog;
      if (selector === 'form') return form;
      return null;
    },
  };

  const result = context.collectContainerContext(target, { body: {} });

  assert.equal(result.type, 'dialog');
  assert.equal(result.heading, '다이얼로그 제목');
  assert.equal(result.visibleText, '다이얼로그 본문');
});
