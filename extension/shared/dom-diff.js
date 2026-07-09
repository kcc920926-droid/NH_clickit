(function attachDomDiff(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.CaptureITDomDiff = api;
})(globalThis, function createDomDiffApi() {
  const RESULT_PATTERNS = Object.freeze([
    /완료/,
    /성공/,
    /저장\s*됨?/,
    /저장되었습니다/,
    /등록되었습니다/,
    /처리되었습니다/,
    /\bsaved\b/i,
    /\bsuccess\b/i,
    /\bcomplete(?:d)?\b/i,
  ]);

  const VALIDATION_PATTERNS = Object.freeze([
    /오류/,
    /실패/,
    /필수입니다/,
    /올바르지 않습니다/,
    /유효하지 않습니다/,
    /입력하세요/,
    /\berror\b/i,
    /\bfailed?\b/i,
    /\brequired\b/i,
    /\binvalid\b/i,
  ]);

  function normalizeText(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }

  function textFragments(value) {
    const normalized = normalizeText(value);
    if (!normalized) return [];
    return normalized.split(' ').filter(Boolean);
  }

  function changedText(beforeContext, afterContext) {
    const beforeSet = new Set(textFragments(beforeContext && beforeContext.visibleText));
    const output = [];
    for (const fragment of textFragments(afterContext && afterContext.visibleText)) {
      if (!beforeSet.has(fragment) && !output.includes(fragment)) {
        output.push(fragment);
      }
    }
    return output;
  }

  function priorityOf(candidate) {
    const role = normalizeText(candidate.role).toLowerCase();
    const ariaLive = normalizeText(candidate.ariaLive ?? candidate['aria-live']).toLowerCase();
    const className = normalizeText(candidate.className ?? candidate.classes).toLowerCase();
    if (role === 'alert') return 4;
    if (role === 'status' || ariaLive) return 3;
    if (/\b(toast|modal|dialog)\b/.test(className)) return 2;
    return 1;
  }

  function matchesAny(text, patterns) {
    return patterns.some((pattern) => pattern.test(text));
  }

  function normalizeCandidate(candidate, fallbackSelector) {
    if (typeof candidate === 'string') {
      return { text: normalizeText(candidate), selector: fallbackSelector || '', priority: 1 };
    }
    return {
      ...candidate,
      text: normalizeText(candidate && candidate.text),
      selector: candidate && candidate.selector || fallbackSelector || '',
      priority: priorityOf(candidate || {}),
    };
  }

  function collectCandidates(afterContext) {
    const candidates = [];
    for (const candidate of afterContext && afterContext.resultCandidates || []) {
      candidates.push(normalizeCandidate(candidate));
    }
    const surroundingText = normalizeText(afterContext && afterContext.surroundingContext && afterContext.surroundingContext.visibleText);
    if (surroundingText) {
      candidates.push(normalizeCandidate({ text: surroundingText }, 'surroundingContext.visibleText'));
    }
    return candidates.filter((candidate) => candidate.text);
  }

  function toMessageEntry(candidate) {
    return {
      text: candidate.text,
      selector: candidate.selector,
      priority: candidate.priority,
    };
  }

  function diffContexts(beforeContext = {}, afterContext = {}) {
    const candidates = collectCandidates(afterContext);
    const resultMessages = [];
    const validationMessages = [];

    for (const candidate of candidates) {
      if (matchesAny(candidate.text, VALIDATION_PATTERNS)) {
        validationMessages.push(toMessageEntry(candidate));
      } else if (matchesAny(candidate.text, RESULT_PATTERNS)) {
        resultMessages.push(toMessageEntry(candidate));
      }
    }

    const candidateResultElements = [...resultMessages, ...validationMessages]
      .sort((left, right) => right.priority - left.priority);

    return {
      changedText: changedText(beforeContext, afterContext),
      resultMessages,
      validationMessages,
      candidateResultElements,
    };
  }

  return {
    RESULT_PATTERNS,
    VALIDATION_PATTERNS,
    diffContexts,
  };
});
