const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const modulePath = path.resolve(__dirname, '../extension/shared/storage.js');

test('storage module exports the required repository surface', () => {
  assert.equal(fs.existsSync(modulePath), true, 'storage module should exist');
  delete require.cache[modulePath];
  const storage = require(modulePath);

  assert.deepEqual(Object.keys(storage).sort(), [
    'deleteEvidence',
    'deleteReport',
    'getEvidence',
    'getEvidenceStep',
    'getReport',
    'getSession',
    'listEvidence',
    'listEvidenceSteps',
    'listReports',
    'normalizeEvidenceRecord',
    'openDatabase',
    'putEvidence',
    'putEvidenceStep',
    'putReport',
    'putSession',
  ].sort());
});

// normalizeReportRecord is an internal (non-exported) helper in storage.js, and storage.js
// depends on indexedDB.open which is unavailable in a plain Node.js test environment. Rather
// than building a full IndexedDB mock, these tests statically verify that the isDraft
// normalization logic exists in the source and is applied at the expected call sites
// (getReport / listReports), while putReport intentionally remains unnormalized (raw write).
test('isDraft normalization: normalizeReportRecord defaults missing isDraft to false via Boolean()', () => {
  const source = fs.readFileSync(modulePath, 'utf8');

  const normalizeFnMatch = source.match(
    /function normalizeReportRecord\(record\)\s*\{[^}]*\}/,
  );
  assert.ok(normalizeFnMatch, 'normalizeReportRecord helper should be defined in storage.js');
  assert.match(
    normalizeFnMatch[0],
    /Boolean\(record\.isDraft\)/,
    'normalizeReportRecord should coerce isDraft with Boolean(record.isDraft), so records without the field are safely treated as false',
  );
});

test('isDraft normalization: getReport applies normalizeReportRecord to the raw record', () => {
  const source = fs.readFileSync(modulePath, 'utf8');

  const getReportMatch = source.match(/async function getReport\([^)]*\)\s*\{[\s\S]*?\n  \}/);
  assert.ok(getReportMatch, 'getReport implementation should be found in storage.js');
  assert.match(
    getReportMatch[0],
    /normalizeReportRecord\(/,
    'getReport should pass the raw record through normalizeReportRecord before returning it',
  );
});

test('isDraft normalization: listReports maps every record through normalizeReportRecord', () => {
  const source = fs.readFileSync(modulePath, 'utf8');

  const listReportsMatch = source.match(/async function listReports\([^)]*\)\s*\{[\s\S]*?\n  \}/);
  assert.ok(listReportsMatch, 'listReports implementation should be found in storage.js');
  assert.match(
    listReportsMatch[0],
    /\.map\(normalizeReportRecord\)/,
    'listReports should map raw records through normalizeReportRecord so every entry has a boolean isDraft',
  );
});

test('isDraft normalization: putReport writes the record as-is (no normalization on write)', () => {
  const source = fs.readFileSync(modulePath, 'utf8');

  const putReportMatch = source.match(/function putReport\([^)]*\)\s*\{[\s\S]*?\n  \}/);
  assert.ok(putReportMatch, 'putReport implementation should be found in storage.js');
  assert.doesNotMatch(
    putReportMatch[0],
    /normalizeReportRecord/,
    'putReport should not normalize on write; normalization happens on read (getReport/listReports)',
  );
});

test('evidence schema extension uses IndexedDB v2 with evidenceSteps indexes', () => {
  const source = fs.readFileSync(modulePath, 'utf8');

  assert.match(source, /const DATABASE_VERSION = 2;/);
  assert.match(source, /createObjectStore\('evidenceSteps',\s*\{\s*keyPath:\s*'stepId'\s*\}\)/);
  for (const indexName of ['sessionId', 'stepNo', 'primaryEvidenceId', 'createdAt']) {
    assert.match(source, new RegExp(`\\['${indexName}',\\s*'${indexName}'\\]`));
  }
});

test('evidence schema upgrade preserves existing stores and records', () => {
  const source = fs.readFileSync(modulePath, 'utf8');
  const upgradeMatch = source.match(/request\.onupgradeneeded = \(\) => \{[\s\S]*?\n      \};/);
  assert.ok(upgradeMatch, 'onupgradeneeded body should be present');

  const upgradeBody = upgradeMatch[0];
  for (const storeName of ['evidence', 'reports', 'sessions']) {
    assert.match(upgradeBody, new RegExp(`objectStoreNames\\.contains\\('${storeName}'\\)`));
  }
  assert.doesNotMatch(upgradeBody, /\.clear\(/);
  assert.doesNotMatch(upgradeBody, /\.delete\(/);
});

test('evidence reads normalize v1 records without normalizing writes', () => {
  const source = fs.readFileSync(modulePath, 'utf8');

  const getEvidenceMatch = source.match(/async function getEvidence\([^)]*\)\s*\{[\s\S]*?\n  \}/);
  assert.ok(getEvidenceMatch, 'getEvidence implementation should be found in storage.js');
  assert.match(getEvidenceMatch[0], /normalizeEvidenceRecord\(/);

  const listEvidenceMatch = source.match(/async function listEvidence\([^)]*\)\s*\{[\s\S]*?\n  \}/);
  assert.ok(listEvidenceMatch, 'listEvidence implementation should be found in storage.js');
  assert.match(listEvidenceMatch[0], /\.map\(normalizeEvidenceRecord\)/);

  const putEvidenceMatch = source.match(/function putEvidence\([^)]*\)\s*\{[\s\S]*?\n  \}/);
  assert.ok(putEvidenceMatch, 'putEvidence implementation should be found in storage.js');
  assert.doesNotMatch(putEvidenceMatch[0], /normalizeEvidenceRecord/);
});
