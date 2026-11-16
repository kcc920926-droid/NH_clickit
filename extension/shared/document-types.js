(function attachDocumentTypes(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CaptureITDocumentTypes = api;
})(globalThis, function createDocumentTypesApi() {
  // 문서 유형: 목적에 따라 항목 이름, 항목에 적는 칸, 상태 이름이 달라진다.
  // 저장 구조(feature.description, feature.result.verification/expectedResult/actualResult/status)는
  // 모든 유형이 같고 이름만 바뀐다. 그래서 유형을 바꿔도 적은 내용이 사라지지 않고,
  // 새 유형에 없는 칸은 지우지 않고 숨긴다. manifest의 schemaVersion도 그대로다.
  //
  // fields: 화면과 문서에 보일 순서대로. key는 저장 위치, label은 보일 이름.
  // verdict: 상태 이름. null이면 상태(판정) 자체가 없는 유형이다.
  const DOCUMENT_TYPES = Object.freeze([
    {
      id: 'qa',
      name: 'QA 결과 보고',
      summary: '테스트케이스마다 PASS/FAIL 판정',
      item: '테스트케이스',
      descriptionLabel: '테스트케이스 설명',
      fields: [
        { key: 'verification', label: '검증 내용', placeholder: '무엇을 확인했는지' },
        { key: 'expectedResult', label: '기대 결과', placeholder: '' },
        { key: 'actualResult', label: '실제 결과', placeholder: '' },
      ],
      verdict: { label: '판정', PASS: 'PASS', FAIL: 'FAIL', none: '미판정' },
      reportKicker: 'QA 결과 보고',
      when: '기능이 기대대로 동작하는지 확인하고 PASS/FAIL을 남길 때',
      output: '판정 표와 테스트케이스별 화면이 담긴 결과 보고서',
      defaultTitle: '새 QA 결과 보고서',
      newItemTitle: '새 테스트케이스',
      defaultTemplate: 'editorial',
      exportLabel: 'QA 결과 보고서 ZIP 만들기',
      zipSuffix: 'QA결과',
      capture: {
        title: '테스트 화면을 녹화하세요',
        idle: '테스트를 평소처럼 진행하면 화면과 맥락이 자동으로 저장됩니다.',
        recording: '테스트 화면을 평소처럼 조작하세요. 끝나면 녹화 종료를 누르세요.',
      },
      aiTask: 'Write a concise Korean QA test case description (purpose, preconditions, procedure, expected and actual result) from the provided evidence only.',
      warningText: { noItems: '테스트케이스가 없습니다.', unsetVerdict: '판정이 선택되지 않았습니다.', failWithoutResult: 'FAIL 판정의 실제 결과가 비어 있습니다.' },
    },
    {
      id: 'test',
      name: '단위·통합 테스트 결과서',
      summary: '테스트 항목마다 사전조건·기대·실제 결과와 판정',
      item: '테스트 항목',
      descriptionLabel: '테스트 설명',
      fields: [
        { key: 'verification', label: '사전조건·테스트 데이터', placeholder: '로그인 계정, 입력값 등' },
        { key: 'expectedResult', label: '기대 결과', placeholder: '' },
        { key: 'actualResult', label: '실제 결과', placeholder: '' },
      ],
      verdict: { label: '판정', PASS: 'PASS', FAIL: 'FAIL', none: '미판정' },
      reportKicker: '테스트 결과서',
      when: '단위·통합 테스트를 수행하고 결과서를 제출할 때',
      output: '사전조건·기대·실제 결과와 판정이 정리된 결과서(공문서 양식)',
      defaultTitle: '새 테스트 결과서',
      newItemTitle: '새 테스트 항목',
      defaultTemplate: 'formal',
      exportLabel: '테스트 결과서 ZIP 만들기',
      zipSuffix: '테스트결과서',
      capture: {
        title: '테스트할 화면을 녹화하세요',
        idle: '테스트 절차대로 화면을 진행하면 단계마다 화면이 저장됩니다.',
        recording: '테스트 절차대로 진행하세요. 끝나면 녹화 종료를 누르세요.',
      },
      aiTask: 'Write a concise Korean unit/integration test record (purpose, preconditions and test data, procedure, expected and actual result) from the provided evidence only.',
      warningText: { noItems: '테스트 항목이 없습니다.', unsetVerdict: '판정이 선택되지 않았습니다.', failWithoutResult: 'FAIL 판정의 실제 결과가 비어 있습니다.' },
    },
    {
      id: 'poc',
      name: 'PoC 확인 기록',
      summary: '확인 포인트마다 확인 결과와 남은 질문',
      item: '확인 포인트',
      descriptionLabel: '확인하려던 것',
      fields: [
        { key: 'actualResult', label: '확인 결과', placeholder: '실제로 확인한 내용' },
        { key: 'expectedResult', label: '질문·후속', placeholder: '남은 질문, 다음에 할 일' },
      ],
      verdict: { label: '확인', PASS: '확인됨', FAIL: '안 됨', none: '미정' },
      reportKicker: 'PoC 확인 기록',
      when: 'PoC에서 무엇이 되는지 확인하고 남은 질문을 공유할 때',
      output: '확인 포인트마다 확인 결과와 질문·후속이 있는 기록',
      defaultTitle: '새 PoC 확인 기록',
      newItemTitle: '새 확인 포인트',
      defaultTemplate: 'editorial',
      exportLabel: 'PoC 확인 기록 ZIP 만들기',
      zipSuffix: 'PoC기록',
      capture: {
        title: '확인할 화면을 녹화하세요',
        idle: '확인하려는 기능을 시연하듯 조작하면 화면이 저장됩니다.',
        recording: '확인하려는 기능을 조작하세요. 끝나면 녹화 종료를 누르세요.',
      },
      aiTask: 'Write a concise Korean PoC checkpoint note: in testPurpose state what was meant to be confirmed, in actualResult state what the evidence actually shows. Use the provided evidence only.',
      warningText: { noItems: '확인 포인트가 없습니다.', unsetVerdict: '확인 상태를 고르지 않았습니다.', failWithoutResult: '안 됨으로 표시했는데 확인 결과가 비어 있습니다.' },
    },
    {
      id: 'proposal',
      name: '제안·화면 설명서',
      summary: '장면마다 화면과 설명 문구. 판정 없음',
      item: '장면',
      descriptionLabel: '설명 문구',
      fields: [],
      verdict: null,
      reportKicker: '화면 설명서',
      when: '제안·보고 자리에서 화면 흐름을 장면별로 설명할 때',
      output: '장면마다 화면을 크게 보여 주는 설명서(그림 중심 양식)',
      defaultTitle: '새 화면 설명서',
      newItemTitle: '새 장면',
      defaultTemplate: 'gallery',
      exportLabel: '화면 설명서 ZIP 만들기',
      zipSuffix: '화면설명서',
      capture: {
        title: '보여 줄 화면을 녹화하세요',
        idle: '설명할 순서대로 화면을 넘기면 장면이 차례로 쌓입니다.',
        recording: '설명할 순서대로 화면을 넘기세요. 끝나면 녹화 종료를 누르세요.',
      },
      aiTask: 'Write a short Korean caption for this scene for a proposal or walkthrough: in testProcedure, explain in one or two sentences what the screen shows and why it matters. Use the provided evidence only. Do not judge pass or fail.',
      warningText: { noItems: '장면이 없습니다.', unsetVerdict: '', failWithoutResult: '' },
    },
  ]);
  const DEFAULT_DOCUMENT_TYPE = 'qa';
  const DEFAULT_TITLES = new Set(DOCUMENT_TYPES.map((type) => type.defaultTitle).concat(['새 QA 보고서']));

  // 사용자가 직접 바꾸지 않은(기본) 제목인지. 유형을 바꿀 때 기본 제목이면 새 유형의 기본 제목으로 바꾼다.
  function isDefaultTitle(title) {
    return !String(title || '').trim() || DEFAULT_TITLES.has(String(title).trim());
  }

  function documentType(id) {
    return DOCUMENT_TYPES.find((type) => type.id === id) || DOCUMENT_TYPES[0];
  }

  // 받침에 맞는 조사. josa('장면', '이/가') → '장면이', josa('확인 포인트', '을/를') → '확인 포인트를'
  function josa(word, pair) {
    const text = String(word || '');
    const [withFinal, withoutFinal] = pair.split('/');
    const last = text.charCodeAt(text.length - 1);
    if (Number.isNaN(last) || last < 0xac00 || last > 0xd7a3) return `${text}${withoutFinal}`;
    const finalConsonant = (last - 0xac00) % 28;
    // '으로/로'는 받침이 ㄹ(8)이면 '로'
    if (pair === '으로/로' && finalConsonant === 8) return `${text}${withoutFinal}`;
    return `${text}${finalConsonant ? withFinal : withoutFinal}`;
  }

  // 상태 이름: verdictLabel(type, 'PASS') → 'PASS' | '확인됨', null → '미판정' | '미정'
  function verdictLabel(type, status) {
    const verdict = type && type.verdict;
    if (!verdict) return '';
    if (status === 'PASS') return verdict.PASS;
    if (status === 'FAIL') return verdict.FAIL;
    return verdict.none;
  }

  return { DOCUMENT_TYPES, DEFAULT_DOCUMENT_TYPE, documentType, isDefaultTitle, josa, verdictLabel };
});
