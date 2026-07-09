(function attachStorage(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.CaptureITStorage = api;
})(globalThis, function createStorageApi() {
  const DATABASE_NAME = 'captureit';
  const DATABASE_VERSION = 2;
  const DEFAULT_EVIDENCE_FIELDS = Object.freeze({
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
  });

  function requestResult(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function transactionDone(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted'));
    });
  }

  function createIndexes(store, definitions) {
    for (const [name, keyPath] of definitions) {
      if (!store.indexNames.contains(name)) store.createIndex(name, keyPath, { unique: false });
    }
  }

  function openDatabase(indexedDb = globalThis.indexedDB) {
    if (!indexedDb) return Promise.reject(new Error('IndexedDB is unavailable'));
    return new Promise((resolve, reject) => {
      const request = indexedDb.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        const evidence = database.objectStoreNames.contains('evidence')
          ? request.transaction.objectStore('evidence')
          : database.createObjectStore('evidence', { keyPath: 'id' });
        createIndexes(evidence, [
          ['sessionId', 'sessionId'],
          ['sequenceNo', 'sequenceNo'],
          ['featureSpecId', 'featureSpecId'],
          ['capturedAt', 'capturedAt'],
        ]);

        const reports = database.objectStoreNames.contains('reports')
          ? request.transaction.objectStore('reports')
          : database.createObjectStore('reports', { keyPath: 'id' });
        createIndexes(reports, [['updatedAt', 'updatedAt']]);

        const sessions = database.objectStoreNames.contains('sessions')
          ? request.transaction.objectStore('sessions')
          : database.createObjectStore('sessions', { keyPath: 'id' });
        createIndexes(sessions, [['startedAt', 'startedAt']]);

        const evidenceSteps = database.objectStoreNames.contains('evidenceSteps')
          ? request.transaction.objectStore('evidenceSteps')
          : database.createObjectStore('evidenceSteps', { keyPath: 'stepId' });
        createIndexes(evidenceSteps, [
          ['sessionId', 'sessionId'],
          ['stepNo', 'stepNo'],
          ['primaryEvidenceId', 'primaryEvidenceId'],
          ['createdAt', 'createdAt'],
        ]);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function putRecord(storeName, record, database) {
    const db = database || await openDatabase();
    const transaction = db.transaction(storeName, 'readwrite');
    transaction.objectStore(storeName).put(record);
    await transactionDone(transaction);
    return record;
  }

  async function getRecord(storeName, id, database) {
    const db = database || await openDatabase();
    const transaction = db.transaction(storeName, 'readonly');
    return requestResult(transaction.objectStore(storeName).get(id));
  }

  function putEvidence(record, database) {
    return putRecord('evidence', record, database);
  }

  function cloneDefaultValue(value) {
    if (Array.isArray(value)) return [];
    if (value && typeof value === 'object') return {};
    return value;
  }

  function normalizeEvidenceRecord(record) {
    if (!record) return record;
    const normalized = { ...record };
    for (const [key, value] of Object.entries(DEFAULT_EVIDENCE_FIELDS)) {
      if (normalized[key] === undefined) {
        normalized[key] = cloneDefaultValue(value);
      }
    }
    return normalized;
  }

  async function getEvidence(id, database) {
    const record = await getRecord('evidence', id, database);
    return normalizeEvidenceRecord(record);
  }

  async function listEvidence(filters = {}, database) {
    const db = database || await openDatabase();
    const transaction = db.transaction('evidence', 'readonly');
    const records = await requestResult(transaction.objectStore('evidence').getAll());
    return records
      .map(normalizeEvidenceRecord)
      .filter((record) => filters.sessionId === undefined || record.sessionId === filters.sessionId)
      .filter((record) => filters.featureSpecId === undefined || record.featureSpecId === filters.featureSpecId)
      .sort((left, right) => left.sequenceNo - right.sequenceNo || String(left.capturedAt ?? '').localeCompare(String(right.capturedAt ?? '')));
  }

  async function deleteEvidence(id, database) {
    const db = database || await openDatabase();
    const transaction = db.transaction('evidence', 'readwrite');
    transaction.objectStore('evidence').delete(id);
    await transactionDone(transaction);
  }

  function normalizeReportRecord(record) {
    if (!record) return record;
    return { ...record, isDraft: Boolean(record.isDraft) };
  }

  function putReport(record, database) {
    return putRecord('reports', record, database);
  }

  async function getReport(id, database) {
    const record = await getRecord('reports', id, database);
    return normalizeReportRecord(record);
  }

  async function listReports(database) {
    const db = database || await openDatabase();
    const transaction = db.transaction('reports', 'readonly');
    const records = await requestResult(transaction.objectStore('reports').getAll());
    return records
      .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))
      .map(normalizeReportRecord);
  }

  async function deleteReport(id, database) {
    const db = database || await openDatabase();
    const transaction = db.transaction('reports', 'readwrite');
    transaction.objectStore('reports').delete(id);
    await transactionDone(transaction);
  }

  function putSession(record, database) {
    return putRecord('sessions', record, database);
  }

  function getSession(id, database) {
    return getRecord('sessions', id, database);
  }

  function putEvidenceStep(record, database) {
    return putRecord('evidenceSteps', record, database);
  }

  function getEvidenceStep(id, database) {
    return getRecord('evidenceSteps', id, database);
  }

  async function listEvidenceSteps(filters = {}, database) {
    const db = database || await openDatabase();
    const transaction = db.transaction('evidenceSteps', 'readonly');
    const records = await requestResult(transaction.objectStore('evidenceSteps').getAll());
    return records
      .filter((record) => filters.sessionId === undefined || record.sessionId === filters.sessionId)
      .sort((left, right) => left.stepNo - right.stepNo || String(left.createdAt ?? '').localeCompare(String(right.createdAt ?? '')));
  }

  return {
    deleteEvidence,
    deleteReport,
    getEvidence,
    getEvidenceStep,
    getReport,
    getSession,
    listEvidence,
    listEvidenceSteps,
    listReports,
    normalizeEvidenceRecord,
    openDatabase,
    putEvidence,
    putEvidenceStep,
    putReport,
    putSession,
  };
});
