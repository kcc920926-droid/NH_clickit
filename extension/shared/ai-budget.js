(function attachAiBudget(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CaptureITAiBudget = api;
})(globalThis, function createAiBudgetApi() {
  // 사내 AI 게이트웨이의 분당 토큰 한도를 넘지 않게 요청을 나눠 보내기 위한 계산(순수 함수).
  const DEFAULT_TOKENS_PER_MINUTE = 150000;
  const IMAGE_TOKEN_ESTIMATE = 1600; // 1280px 너비 화면 한 장이 대략 1,300~1,600 토큰
  const OUTPUT_TOKEN_ESTIMATE = 1500;
  const WINDOW_MS = 60000;

  // 요청 하나가 쓸 토큰을 넉넉하게 어림한다. 한글·JSON은 2글자에 1토큰, 이미지는 장당 IMAGE_TOKEN_ESTIMATE.
  function estimateRequestTokens(requestBody) {
    let images = 0;
    const json = JSON.stringify(requestBody, (key, value) => {
      if (typeof value === 'string' && value.startsWith('data:image/')) { images += 1; return ''; }
      if (value && typeof value === 'object' && value.type === 'image' && value.source) { images += 1; return { type: 'image' }; }
      return value;
    });
    return Math.ceil(json.length / 2) + images * IMAGE_TOKEN_ESTIMATE + OUTPUT_TOKEN_ESTIMATE;
  }

  // 응답의 실제 사용량(Anthropic: usage.input/output_tokens, OpenAI: usage.total_tokens). 없으면 null.
  function usageTokens(body) {
    const usage = body && body.usage;
    if (!usage) return null;
    const total = Number(usage.total_tokens)
      || (Number(usage.input_tokens || usage.prompt_tokens || 0) + Number(usage.output_tokens || usage.completion_tokens || 0));
    return total > 0 ? total : null;
  }

  // 429 뒤 기다릴 시간. Retry-After(초)가 있으면 그것(최대 90초). 없으면 사내 한도가 1분 단위로 풀리므로
  // 1분을 기다린다(20초쯤에 다시 보내면 또 걸린다). 서버 오류(5xx)는 10초·20초.
  function retryDelayMs(retryAfterHeader, attempt, status = 429) {
    const seconds = Number(retryAfterHeader);
    if (Number.isFinite(seconds) && seconds > 0) return Math.min(seconds, 90) * 1000;
    if (Number(status) === 429) return 60000;
    return 10000 * (attempt + 1);
  }

  // 최근 1분 동안 보낸 요청의 토큰을 기억하고, 다음 요청을 보내려면 얼마나 기다려야 하는지 알려 준다.
  function createTokenBudget(limit = DEFAULT_TOKENS_PER_MINUTE) {
    let tokensPerMinute = limit;
    const log = [];
    const prune = (now) => { while (log.length && now - log[0].at >= WINDOW_MS) log.shift(); };
    return {
      get limit() { return tokensPerMinute; },
      setLimit(value) { tokensPerMinute = Number.isFinite(value) && value >= 1000 ? value : DEFAULT_TOKENS_PER_MINUTE; },
      used(now) { prune(now); return log.reduce((total, entry) => total + entry.tokens, 0); },
      // 0이면 바로 보내도 된다. 한도보다 큰 요청 하나는 기다려도 소용없으니 기록이 비면 보낸다.
      waitMs(estimate, now) {
        prune(now);
        if (log.length === 0) return 0;
        if (this.used(now) + estimate <= tokensPerMinute) return 0;
        return log[0].at + WINDOW_MS - now;
      },
      record(tokens, now) { const entry = { at: now, tokens }; log.push(entry); return entry; },
      // 한도에 걸렸다는 응답을 받으면 이번 1분은 다 쓴 것으로 본다.
      exhaust(entry) { entry.tokens = Math.max(entry.tokens, tokensPerMinute); },
    };
  }

  function hasImages(value) {
    return JSON.stringify(value || null).includes('data:image/');
  }

  // 이미지를 못 읽는 모델에 보낼 수 있게 이미지를 빼고 그 자리에 안내 글자만 남긴다(입력은 바꾸지 않는다).
  function stripImages(value) {
    if (Array.isArray(value)) return value.map(stripImages);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, stripImages(entry)]));
    }
    if (typeof value === 'string' && value.startsWith('data:image/')) return '[이미지 생략: 이 모델은 이미지를 읽지 못함]';
    return value;
  }

  // 서버가 "이미지를 지원하지 않는다"고 분명히 말한 오류인지. 한도(429)·크기·형식 등 다른 이유의 실패로
  // 멀쩡한 멀티모달 모델을 "이미지 못 읽음"으로 잘못 기억하지 않도록 좁게 본다.
  function looksLikeImageUnsupported(status, bodyText) {
    if (![400, 415, 422].includes(Number(status))) return false;
    const text = String(bodyText || '').toLowerCase();
    const aboutImages = /image|vision|multimodal|multi-modal|이미지/.test(text);
    const notSupported = /not support|unsupported|does not support|doesn't support|cannot (?:accept|process|read)|not allowed|지원하지 않|지원되지 않/.test(text);
    return aboutImages && notSupported;
  }

  return { looksLikeImageUnsupported, DEFAULT_TOKENS_PER_MINUTE, IMAGE_TOKEN_ESTIMATE, createTokenBudget, estimateRequestTokens, hasImages, retryDelayMs, stripImages, usageTokens };
});
