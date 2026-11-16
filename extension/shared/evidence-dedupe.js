(function attachEvidenceDedupe(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.CaptureITEvidenceDedupe = api;
})(globalThis, function createEvidenceDedupeApi() {
  // 중복 화면 판단: 증적 이미지를 64x36 회색조 격자로 줄인 "지문"을 비교한다.
  // 격자 칸 중 밝기 차이가 pixelTolerance를 넘는 칸의 비율이 maxChangedRatio 이하이고
  // 같은 페이지(URL)이면 "거의 같은 화면"으로 본다.
  const FINGERPRINT_WIDTH = 64;
  const FINGERPRINT_HEIGHT = 36;
  const DEFAULT_OPTIONS = Object.freeze({
    maxChangedRatio: 0.004,
    pixelTolerance: 24,
  });

  // 사용자가 직접 지정했거나 의미가 분명한 증적은 합치거나 지우지 않는다.
  const PROTECTED_TRIGGERS = new Set([
    'baseline',
    'manual-pin',
    'shortcut-context',
    'context-menu',
    'form-input',
    'file-import',
    'clipboard-paste',
  ]);

  function bytesToBase64(bytes) {
    let binary = '';
    for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
    return typeof btoa === 'function' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
  }

  function base64ToBytes(value) {
    const binary = typeof atob === 'function' ? atob(value) : Buffer.from(value, 'base64').toString('binary');
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  // RGBA 픽셀 배열(FINGERPRINT_WIDTH x FINGERPRINT_HEIGHT)을 회색조 지문 문자열로 바꾼다.
  function fingerprintFromRgba(rgba) {
    const cells = FINGERPRINT_WIDTH * FINGERPRINT_HEIGHT;
    const gray = new Uint8Array(cells);
    for (let index = 0; index < cells; index += 1) {
      const offset = index * 4;
      gray[index] = Math.round(rgba[offset] * 0.299 + rgba[offset + 1] * 0.587 + rgba[offset + 2] * 0.114);
    }
    return bytesToBase64(gray);
  }

  // 브라우저(편집기 페이지, 서비스 워커 공통)에서 data URL 이미지의 지문을 만든다.
  async function fingerprintImageDataUrl(dataUrl) {
    if (!dataUrl || typeof createImageBitmap !== 'function' || typeof OffscreenCanvas !== 'function') return null;
    const blob = await (await fetch(dataUrl)).blob();
    const bitmap = await createImageBitmap(blob);
    try {
      const canvas = new OffscreenCanvas(FINGERPRINT_WIDTH, FINGERPRINT_HEIGHT);
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(bitmap, 0, 0, FINGERPRINT_WIDTH, FINGERPRINT_HEIGHT);
      return fingerprintFromRgba(context.getImageData(0, 0, FINGERPRINT_WIDTH, FINGERPRINT_HEIGHT).data);
    } finally {
      if (typeof bitmap.close === 'function') bitmap.close();
    }
  }

  // 0(완전히 같음) ~ 1(전부 다름). 지문이 없거나 크기가 다르면 1을 돌려준다.
  function changedRatio(fingerprintA, fingerprintB, pixelTolerance = DEFAULT_OPTIONS.pixelTolerance) {
    if (!fingerprintA || !fingerprintB) return 1;
    if (fingerprintA === fingerprintB) return 0;
    const left = base64ToBytes(fingerprintA);
    const right = base64ToBytes(fingerprintB);
    if (left.length !== right.length || left.length === 0) return 1;
    let changed = 0;
    for (let index = 0; index < left.length; index += 1) {
      if (Math.abs(left[index] - right[index]) > pixelTolerance) changed += 1;
    }
    return changed / left.length;
  }

  function pageKeyOf(evidence) {
    const context = evidence && evidence.context || {};
    const page = evidence && evidence.page || {};
    const url = String(context.pageUrl || page.pageUrl || '');
    return url.split('#')[0];
  }

  // 결과 메시지는 알림창(role=alert/status, aria-live, toast·modal·dialog)에 뜬 것만 인정한다.
  // 페이지 본문 전체에서 "저장"·"완료" 같은 단어를 찾으면 버튼 이름에도 걸려 거의 모든 화면이 보호됐다.
  function hasMessages(evidence) {
    const diff = evidence && (evidence.domDiff || evidence.domAfter) || {};
    const messages = [...(diff.resultMessages || []), ...(diff.validationMessages || [])];
    return messages.some((message) => Number(message && message.priority) >= 2);
  }

  // 동작 뒤 화면 글자가 바뀌었으면(입력값 반영, 오류 문구 등) 그림이 비슷해도 합치지 않는다.
  function hasTextChange(evidence) {
    const diff = evidence && evidence.domDiff || {};
    return Array.isArray(diff.changedText) && diff.changedText.length > 0;
  }

  function isProtected(evidence) {
    if (!evidence) return true;
    if (PROTECTED_TRIGGERS.has(evidence.triggerType)) return true;
    if (evidence.featureSpecId) return true;
    return hasMessages(evidence);
  }

  // 이전 증적(previous) 뒤에 새로 찍힌 증적(candidate)이 거의 같은 화면인지 판단한다.
  // candidate는 아직 저장 전일 수 있으므로 triggerType/context/domDiff/fingerprint만 있으면 된다.
  function isNearDuplicate(previous, candidate, options = {}) {
    const settings = { ...DEFAULT_OPTIONS, ...options };
    if (!previous || !candidate) return false;
    if (previous.sessionId && candidate.sessionId && previous.sessionId !== candidate.sessionId) return false;
    if (isProtected(candidate)) return false;
    if (hasTextChange(candidate)) return false;
    if (previous.featureSpecId) return false;
    if (pageKeyOf(previous) !== pageKeyOf(candidate)) return false;
    return changedRatio(previous.fingerprint, candidate.fingerprint, settings.pixelTolerance) <= settings.maxChangedRatio;
  }

  // 합쳐진 증적이 어떤 동작에서 나왔는지 남기는 짧은 기록. 이미지는 남기지 않는다.
  function mergedEventOf(evidence) {
    const context = evidence && evidence.context || {};
    const target = context.target || {};
    return {
      triggerType: evidence.triggerType || '',
      capturedAt: evidence.capturedAt || new Date().toISOString(),
      targetText: String(target.visibleText || target.ariaLabel || '').slice(0, 120),
    };
  }

  function appendMergedEvents(keeper, absorbed) {
    const existing = Array.isArray(keeper.mergedEvents) ? keeper.mergedEvents : [];
    const incoming = [];
    for (const item of absorbed) {
      incoming.push(...(Array.isArray(item.mergedEvents) ? item.mergedEvents : []), mergedEventOf(item));
    }
    keeper.mergedEvents = [...existing, ...incoming];
    return keeper;
  }

  // 이미 쌓인 증적에서 정리할 중복을 계산한다(순수 함수, 입력을 바꾸지 않는다).
  // 같은 세션 안에서 순번 순으로 훑으며, 직전에 남긴 증적과 거의 같은 화면이면 지울 목록에 넣는다.
  // -> [{ keepId, removeIds: [...] }]  (removeIds가 비어 있는 묶음은 돌려주지 않는다)
  function planDuplicateCleanup(evidenceList = [], options = {}) {
    const bySession = new Map();
    for (const evidence of evidenceList) {
      const key = evidence.sessionId || '';
      if (!bySession.has(key)) bySession.set(key, []);
      bySession.get(key).push(evidence);
    }
    const groups = [];
    for (const items of bySession.values()) {
      const ordered = [...items].sort((left, right) => Number(left.sequenceNo || 0) - Number(right.sequenceNo || 0));
      let keeper = null;
      let current = null;
      for (const evidence of ordered) {
        if (keeper && isNearDuplicate(keeper, evidence, options)) {
          current.removeIds.push(evidence.id);
          continue;
        }
        keeper = evidence;
        current = { keepId: evidence.id, removeIds: [] };
        groups.push(current);
      }
    }
    return groups.filter((group) => group.removeIds.length > 0);
  }

  return {
    DEFAULT_OPTIONS,
    FINGERPRINT_HEIGHT,
    FINGERPRINT_WIDTH,
    PROTECTED_TRIGGERS,
    appendMergedEvents,
    changedRatio,
    fingerprintFromRgba,
    fingerprintImageDataUrl,
    isNearDuplicate,
    isProtected,
    mergedEventOf,
    planDuplicateCleanup,
  };
});
