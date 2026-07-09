const test = require('node:test');
const assert = require('node:assert/strict');
const fc = require('fast-check');

const context = require('../extension/shared/page-context.js');

const targetKeys = [
  'tagName',
  'type',
  'role',
  'ariaLabel',
  'accessibleName',
  'label',
  'visibleText',
  'value',
  'maskedValue',
  'selector',
  'xpath',
  'stableLocator',
  'bbox',
];

function element(type, overrides = {}) {
  return {
    tagName: type.toUpperCase(),
    innerText: overrides.innerText ?? '',
    textContent: overrides.textContent ?? overrides.innerText ?? '',
    value: overrides.value ?? '',
    type: overrides.inputType ?? '',
    id: overrides.id ?? '',
    name: overrides.name ?? '',
    className: overrides.className ?? '',
    parentElement: overrides.parentElement ?? null,
    getAttribute(name) {
      return overrides.attrs && Object.hasOwn(overrides.attrs, name) ? overrides.attrs[name] : null;
    },
    querySelector() {
      return null;
    },
    closest(selector) {
      return overrides.closest ? overrides.closest(selector) : null;
    },
    getBoundingClientRect() {
      return overrides.bbox || { x: 1, y: 2, width: 3, height: 4 };
    },
  };
}

function documentStub(labels = {}) {
  return {
    body: element('body', { innerText: 'body' }),
    getElementById(id) {
      return labels[id] || null;
    },
    querySelector(selector) {
      const labelFor = selector.match(/^label\[for="(.+)"\]$/);
      if (labelFor) return labels[`for:${labelFor[1]}`] || null;
      return null;
    },
  };
}

test('Property 10: Target_Context captures the pre-default-action target snapshot', () => {
  fc.assert(
    fc.property(
      fc.string({ maxLength: 20 }),
      fc.string({ maxLength: 20 }),
      (beforeValue, afterValue) => {
        const target = element('input', { inputType: 'text', value: beforeValue });
        const snapshot = context.collectTargetContext(target, documentStub());
        target.value = afterValue;

        assert.equal(snapshot.value, beforeValue);
      },
    ),
    { numRuns: 100 },
  );
});

test('Property 11: Target_Context always includes the fixed key set', () => {
  fc.assert(
    fc.property(fc.dictionary(fc.string({ maxLength: 8 }), fc.string({ maxLength: 12 })), (attrs) => {
      const target = element('input', { attrs });
      const snapshot = context.collectTargetContext(target, documentStub());

      assert.deepEqual(Object.keys(snapshot).sort(), targetKeys.sort());
    }),
    { numRuns: 100 },
  );
});

test('Property 12: Container_Context selects the highest-priority available ancestor type', () => {
  const priority = ['dialog', 'form', 'section', 'card', 'row', 'body'];
  fc.assert(
    fc.property(
      fc.record({
        dialog: fc.boolean(),
        form: fc.boolean(),
        section: fc.boolean(),
        card: fc.boolean(),
        row: fc.boolean(),
      }),
      (flags) => {
        const body = element('body', { innerText: 'body' });
        const nodes = {
          dialog: flags.dialog ? element('dialog', { innerText: 'dialog' }) : null,
          form: flags.form ? element('form', { innerText: 'form' }) : null,
          section: flags.section ? element('section', { innerText: 'section' }) : null,
          card: flags.card ? element('div', { className: 'card', innerText: 'card' }) : null,
          row: flags.row ? element('tr', { innerText: 'row' }) : null,
          body,
        };
        const target = element('button', {
          closest(selector) {
            if (selector === 'dialog,[role="dialog"]') return nodes.dialog;
            if (selector === 'form') return nodes.form;
            if (selector === 'section,article,main') return nodes.section;
            if (selector === '.card,[class*="card"],[data-card]') return nodes.card;
            if (selector === 'tr') return nodes.row;
            if (selector === 'body') return body;
            return null;
          },
        });

        const selected = context.collectContainerContext(target, { body });
        const expected = priority.find((type) => type === 'body' || flags[type]);

        assert.equal(selected.type, expected);
      },
    ),
    { numRuns: 100 },
  );
});

test('Property 45: sensitive field categories are masked and non-sensitive fields pass through', () => {
  fc.assert(
    fc.property(
      fc.constantFrom('password', 'hidden', 'authorization', 'cookie', 'token', 'sessionToken', 'text'),
      fc.string({ minLength: 1, maxLength: 20 }),
      (fieldName, value) => {
        const meta = { type: fieldName, name: fieldName, id: fieldName };
        const masked = context.maskSensitiveValue(value, meta);

        if (fieldName === 'text') {
          assert.equal(context.shouldMaskField(meta), false);
          assert.equal(masked, value);
        } else {
          assert.equal(context.shouldMaskField(meta), true);
          assert.notEqual(masked, value);
        }
      },
    ),
    { numRuns: 100 },
  );
});

test('Property 46: sensitive numeric patterns are masked only when the pattern matches', () => {
  const sensitiveValues = ['900101-1234567', '010-1234-5678', '123-456789-01-001', '123456'];
  fc.assert(
    fc.property(fc.constantFrom(...sensitiveValues, '12345', 'abc123def'), (value) => {
      const masked = context.maskSensitiveValue(value, { type: 'text', name: 'memo' });
      if (sensitiveValues.includes(value)) {
        assert.notEqual(masked, value);
      } else {
        assert.equal(masked, value);
      }
    }),
    { numRuns: 100 },
  );
});

test('Property 47: sanitized context does not retain raw HTML source fields', () => {
  fc.assert(
    fc.property(fc.string({ minLength: 1, maxLength: 80 }), (html) => {
      const sanitized = context.sanitizeContext({
        html,
        outerHTML: html,
        innerHTML: html,
        target: {
          visibleText: 'safe',
        },
      });

      assert.equal(Object.hasOwn(sanitized, 'html'), false);
      assert.equal(Object.hasOwn(sanitized, 'outerHTML'), false);
      assert.equal(Object.hasOwn(sanitized, 'innerHTML'), false);
      assert.equal(sanitized.target.visibleText, 'safe');
    }),
    { numRuns: 100 },
  );
});
