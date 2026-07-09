// LLM 실 연동 스모크 테스트 스크립트.
//
// tests/edge-smoke.mjs / tests/chrome-smoke.mjs와 동일한 스타일을 따른다: 환경변수로 설정을 읽고,
// 필수 값이 없으면 명확한 한국어 에러 메시지를 출력하고 비정상 종료 코드로 끝낸다.
//
// 기본값은 테스트용 OpenAI(gpt-4o-mini)를 겨냥하지만, 같은 스크립트를 코드 변경 없이 내부망 liteLLM
// 게이트웨이(모델 gemma4)로 그대로 돌릴 수 있도록 endpoint/model/adapter를 모두 환경변수로 오버라이드
// 가능하게 한다 - extension/shared/llm.js의 'openai-compatible' adapter가 두 경우 모두를 그대로
// 처리하도록 설계되어 있기 때문이다(buildAdapterRequest의 openai-compatible 분기 참고).
//
// 주의: 이 스크립트는 npm test(node --test tests/*.test.cjs)에는 포함되지 않는다 - 실제 네트워크
// 호출과 비밀 값(API 키)이 필요해 hermetic한 테스트 실행을 깨뜨리기 때문이다. `npm run smoke:llm`으로
// 별도 실행한다.

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const projectRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  process.stderr.write(
    'LLM smoke FAIL: OPENAI_API_KEY 환경변수가 설정되지 않았습니다.\n'
    + '테스트용 OpenAI API 키를 발급받아 아래처럼 설정한 뒤 다시 실행하십시오:\n'
    + '  PowerShell:  $env:OPENAI_API_KEY = "sk-..."\n'
    + '  그 다음:     npm run smoke:llm\n'
    + '내부망 liteLLM 게이트웨이(모델 gemma4)를 대신 테스트하려면 다음도 함께 설정하십시오:\n'
    + '  CAPTUREIT_LLM_ENDPOINT, CAPTUREIT_LLM_MODEL=gemma4, CAPTUREIT_LLM_ADAPTER\n',
  );
  process.exitCode = 1;
  process.exit(1);
}

const endpoint = process.env.CAPTUREIT_LLM_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
const model = process.env.CAPTUREIT_LLM_MODEL || 'gpt-4o-mini';
const adapter = process.env.CAPTUREIT_LLM_ADAPTER || 'openai-compatible';

// extension/shared/llm.js는 (function attachLlm(root, factory) {...})(globalThis, ...) 형태의 UMD
// 모듈로, module.exports가 있으면 그대로 내보내고 root.CaptureITLlm에도 붙인다. tests/*.test.cjs가
// require()로 곧바로 불러오는 것과 동일하게, .mjs 컨텍스트에서는 createRequire를 통해 불러온다.
const CaptureITLlm = require(resolve(projectRoot, 'extension/shared/llm.js'));

function syntheticEvidenceGroup() {
  const evidenceList = [
    {
      id: 'SMOKE-CAP-1',
      sequenceNo: 1,
      triggerType: 'navigation',
      capturedAt: new Date().toISOString(),
      context: { pageTitle: '주문 목록', route: '/orders', target: { visibleText: '주문 목록 진입' } },
    },
    {
      id: 'SMOKE-CAP-2',
      sequenceNo: 2,
      triggerType: 'click',
      capturedAt: new Date().toISOString(),
      context: { pageTitle: '주문 상세', route: '/orders/1002', target: { visibleText: '승인 버튼 클릭' } },
    },
    {
      id: 'SMOKE-CAP-3',
      sequenceNo: 3,
      triggerType: 'route-change',
      capturedAt: new Date().toISOString(),
      context: { pageTitle: '주문 승인 완료', route: '/orders/1002/done', target: { visibleText: '승인 완료 화면' } },
    },
  ];
  const group = { evidenceIds: evidenceList.map((item) => item.id) };
  return { group, evidenceList };
}

async function run() {
  const { group, evidenceList } = syntheticEvidenceGroup();
  const payload = CaptureITLlm.buildSessionTitleRequest(group, evidenceList, 'LLM 스모크 테스트');

  const adapterRequest = CaptureITLlm.buildAdapterRequest({
    adapter,
    apiKey,
    endpoint,
    model,
    payload,
  });

  process.stdout.write(`LLM smoke: adapter=${adapter} endpoint=${endpoint} model=${model}\n`);

  const response = await fetch(adapterRequest.url, adapterRequest.options);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { content: text };
  }

  if (!response.ok) {
    throw new Error(`LLM 요청 실패: HTTP ${response.status} - ${text.slice(0, 500)}`);
  }

  const parsed = CaptureITLlm.parseAdapterResponse(body);
  const validated = CaptureITLlm.validateSessionTitleSuggestion(parsed);

  process.stdout.write(`LLM smoke PASS: 추천 제목 = "${validated.title}"\n`);
}

run().catch((error) => {
  process.stderr.write(`LLM smoke FAIL: ${error.stack || error.message}\n`);
  process.exitCode = 1;
});
