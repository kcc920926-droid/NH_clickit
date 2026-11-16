const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const budget = require('../extension/shared/ai-budget.js');
const editor = fs.readFileSync(path.resolve(__dirname, '../extension/editor.js'), 'utf8');

test('분당 한도 안이면 바로 보내고, 넘으면 가장 오래된 요청이 1분을 지날 때까지 기다린다', () => {
  const tokens = budget.createTokenBudget(150000);
  assert.equal(tokens.waitMs(20000, 0), 0, '처음 요청은 바로');
  tokens.record(100000, 0);
  assert.equal(tokens.waitMs(40000, 1000), 0, '합이 한도 안');
  tokens.record(40000, 1000);
  assert.equal(tokens.waitMs(20000, 5000), 55000, '합이 넘으면 첫 요청이 빠질 때(60초)까지');
  assert.equal(tokens.waitMs(20000, 60000), 0, '1분이 지나면 빠진다');
  assert.equal(tokens.used(60000), 40000);
});

test('한도보다 큰 요청 하나는 기다려도 소용없으니 기록이 비었으면 보낸다', () => {
  assert.equal(budget.createTokenBudget(10000).waitMs(50000, 0), 0);
});

test('429를 받으면 이번 1분은 다 쓴 것으로 본다', () => {
  const tokens = budget.createTokenBudget(150000);
  const entry = tokens.record(10000, 0);
  tokens.exhaust(entry);
  assert.equal(tokens.waitMs(1000, 1000), 59000);
});

test('토큰 어림: 이미지는 장당 따로 세고, base64 글자는 세지 않는다', () => {
  const text = budget.estimateRequestTokens({ messages: [{ content: [{ type: 'text', text: 'a'.repeat(2000) }] }] });
  const withImages = budget.estimateRequestTokens({ messages: [{ content: [{ type: 'text', text: 'a'.repeat(2000) }, { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'x'.repeat(500000) } }] }] });
  assert.ok(withImages - text >= budget.IMAGE_TOKEN_ESTIMATE && withImages - text < budget.IMAGE_TOKEN_ESTIMATE + 50, `${withImages - text}`);
  assert.equal(budget.estimateRequestTokens({ image: `data:image/png;base64,${'x'.repeat(100000)}` }) < 5000, true);
});

test('응답의 실제 사용량을 읽는다(Anthropic·OpenAI 형식)', () => {
  assert.equal(budget.usageTokens({ usage: { input_tokens: 1200, output_tokens: 300 } }), 1500);
  assert.equal(budget.usageTokens({ usage: { total_tokens: 900 } }), 900);
  assert.equal(budget.usageTokens({}), null);
});

test('다시 보낼 때까지 기다리는 시간: Retry-After를 따르고, 없으면 429는 1분(한도가 1분 단위로 풀림), 서버 오류는 10·20초', () => {
  assert.equal(budget.retryDelayMs('7', 0), 7000);
  assert.equal(budget.retryDelayMs('600', 0), 90000);
  assert.equal(budget.retryDelayMs(null, 0), 60000);
  assert.equal(budget.retryDelayMs(null, 1, 429), 60000);
  assert.equal(budget.retryDelayMs(null, 0, 503), 10000);
  assert.equal(budget.retryDelayMs(null, 1, 503), 20000);
});

test('이미지를 못 읽는 모델용으로 이미지를 빼되 원래 요청은 바꾸지 않는다', () => {
  const payload = { evidence: [{ captureId: 'C1', image: 'data:image/jpeg;base64,AAAA' }], images: ['data:image/png;base64,BB'] };
  const stripped = budget.stripImages(payload);
  assert.equal(budget.hasImages(payload), true);
  assert.equal(budget.hasImages(stripped), false);
  assert.equal(stripped.evidence[0].captureId, 'C1');
  assert.equal(payload.evidence[0].image, 'data:image/jpeg;base64,AAAA');
});

test('편집기: AI 요청은 하나씩, 한도 대기·429 재시도·글자만 다시 보내기·모델별 한도', () => {
  assert.match(editor, /const result = llmChain\.then\(run, run\);/, '한 번에 하나씩');
  assert.match(editor, /onStatus\(`분당 한도를 넘지 않게 \$\{Math\.ceil\(waitMs \/ 1000\)\}초 기다리는 중`\)/);
  assert.match(editor, /const retryable = response\.status === 429 \|\| response\.status >= 500;/);
  assert.match(editor, /if \(response\.status === 429 && !retryAfter\) tokenBudget\.exhaust\(entry\);/, 'Retry-After가 있으면 그 시간을 따른다');
  assert.match(editor, /onStatus\('이미지를 빼고 다시 보내는 중'\);/);
  assert.match(editor, /await rememberTextOnlyModel\(settings\.model\);/);
  assert.match(editor, /llmTokensPerMinuteByModel: \{ \.\.\.tokensPerMinuteByModel,/);
  assert.match(editor, /status === 429 \? '사내 AI 사용량 한도\(분당\)에 걸렸습니다'/);
});

test('"이미지 지원 안 함"이라고 분명히 말한 오류일 때만 글자로 다시 보낸다(멀티모달 모델을 잘못 기억하지 않게)', () => {
  assert.equal(budget.looksLikeImageUnsupported(400, '{"error":{"message":"image input is not supported by this model"}}'), true);
  assert.equal(budget.looksLikeImageUnsupported(400, '{"error":"이 모델은 이미지를 지원하지 않습니다"}'), true);
  assert.equal(budget.looksLikeImageUnsupported(429, 'image rate limit, not supported right now'), false, '한도 초과는 아니다');
  assert.equal(budget.looksLikeImageUnsupported(400, '{"error":{"message":"Request too large: image tokens exceed context"}}'), false, '크기 문제는 아니다');
  assert.equal(budget.looksLikeImageUnsupported(500, 'vision not supported'), false, '서버 오류는 아니다');
  assert.equal(budget.looksLikeImageUnsupported(400, 'invalid json'), false);
  assert.match(editor, /CaptureITAiBudget\.looksLikeImageUnsupported\(error\.status, bodyText\)/);
});
