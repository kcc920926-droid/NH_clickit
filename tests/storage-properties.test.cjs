const test = require('node:test');
const assert = require('node:assert/strict');
const fc = require('fast-check');

const storage = require('../extension/shared/storage.js');

const defaultEvidenceFields = {
  stepId: null,
  event: null,
  page: null,
  target: null,
  container: null,
  domBefore: null,
  domAfter: null,
  apiEvents: [],
  serverEvents: [],
  assertions: [],
  thumbnailDataUrl: null,
  llmImageDataUrl: null,
  docImageDataUrl: null,
  imageMeta: {},
};

function cloneDefault(value) {
  if (Array.isArray(value)) return [];
  if (value && typeof value === 'object') return {};
  return value;
}

test('Property 44: normalizeEvidenceRecord fills only missing fields and preserves existing values', () => {
  fc.assert(
    fc.property(
      fc.dictionary(
        fc.constantFrom(...Object.keys(defaultEvidenceFields), 'id', 'sessionId', 'sequenceNo', 'customField'),
        fc.oneof(
          fc.string(),
          fc.integer(),
          fc.boolean(),
          fc.constant(null),
          fc.array(fc.string(), { maxLength: 3 }),
          fc.dictionary(fc.string({ maxLength: 5 }), fc.string({ maxLength: 5 }), { maxKeys: 3 }),
        ),
      ),
      (record) => {
        const normalized = storage.normalizeEvidenceRecord(record);

        for (const [key, value] of Object.entries(record)) {
          assert.deepEqual(normalized[key], value);
        }

        for (const [key, defaultValue] of Object.entries(defaultEvidenceFields)) {
          if (record[key] === undefined) {
            assert.deepEqual(normalized[key], cloneDefault(defaultValue));
          } else {
            assert.deepEqual(normalized[key], record[key]);
          }
        }
      },
    ),
    { numRuns: 100 },
  );
});
