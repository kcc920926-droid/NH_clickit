# CaptureIT 작업 walkthrough

## 2026-07-06 UX·저장 위치·LLM 진단 개선

### 목적

캡처 후 사용자가 “무엇이 캡처됐는지”, “어디에 저장됐는지”, “내부망 LLM 연동이 어떤 형식으로 호출되는지” 확인할 수 없던 문제를 개선했다.

### 변경 내용

1. 캡처 직후 사용자 피드백
   - 웹페이지 하단에 `CaptureIT 캡처 #N` toast를 표시한다.
   - toast에는 트리거 종류, 페이지 제목, 대상 텍스트가 표시된다.
   - 클릭하면 닫히고, 5초 후 자동으로 사라진다.
   - `background.js`가 저장 완료 후 원본 탭에 `CAPTURE_RECEIPT` 메시지를 보낸다.
   - `content-controller.js`도 캡처 성공 응답을 받아 `notifyCapture` 콜백으로 동일 receipt를 전달한다.
   - 중복 receipt는 `evidenceId` 기준으로 한 번만 표시한다.
   - 편집기 Evidence Inbox 상단에 `최근 캡처` 영역을 표시한다.
   - 최근 캡처를 클릭하면 증적 상세 dialog에서 이미지, 순번, 트리거, 페이지, 대상 텍스트, 전후 captureId를 확인할 수 있다.

2. 저장 위치 확인 UX
   - `editor.html`에 STORAGE 패널을 추가했다.
   - 표시 항목:
     - 초안 저장소: Edge 프로필의 확장 저장소(`chrome.storage.local` + IndexedDB)
     - 보고서 ID
     - 증적 수
     - 마지막 저장 시각
     - 마지막 ZIP 파일명
     - 다운로드 경로
   - 마지막 ZIP 열기, 다운로드 폴더 열기, 증적만 ZIP 생성 버튼을 추가했다.
   - ZIP 생성 후 `chrome.downloads.search`로 다운로드 항목을 조회하고 `lastExport`로 저장한다.

3. 내부망 LLM 연동 체계화
   - 기본 endpoint:
     - `http://ai-driven-gw.aihb.kube.test.nhbank/v1/messages`
   - 기본 adapter:
     - `nh-ai-gateway`
   - NH adapter는 API key를 HTTP Authorization 헤더가 아니라 JSON payload의 `api_key` 필드에 넣는다.
   - OpenAI compatible, Raw JSON template adapter도 선택 가능하게 했다.
   - 연결 테스트, 추천 요청 테스트 버튼을 추가했다.
   - 진단 결과에는 HTTP status, content-type, latency, guidance, redacted request/response가 표시된다.
   - API key는 진단 출력에서 `***redacted***`로 마스킹된다.

4. 증적 전용 ZIP
   - 보고서 전체 ZIP 외에 `증적만 ZIP`을 생성할 수 있다.
   - 포함 파일:
     - `evidence-index.html`
     - `manifest.json`
     - `assets/evidence-001.png` 형식의 이미지 파일

5. Smoke 검증 안정화
   - 사내 관리 브라우저/기존 브라우저 프로세스가 많은 환경에서 Edge/Chromium DevTools 응답이 10초를 넘는 경우가 있었다.
   - `tests/edge-smoke.mjs`의 브라우저 시작 대기와 CDP 명령 timeout을 환경변수 기반으로 조정 가능하게 했다.
   - 기본값:
     - `CAPTUREIT_BROWSER_START_TIMEOUT_MS=30000`
     - `CAPTUREIT_CDP_COMMAND_TIMEOUT_MS=30000`
     - `CAPTUREIT_CDP_CONNECT_TIMEOUT_MS=10000`

### 주요 파일

- `extension/editor.html`
  - STORAGE 패널, LLM 설정/진단 UI 추가
- `extension/editor.css`
  - 저장 상태 패널, LLM 진단 출력 스타일 추가
- `extension/editor.js`
  - 저장 상태 렌더링
  - 마지막 다운로드 추적
  - 증적 전용 ZIP 생성
  - LLM adapter 호출 및 진단 실행
  - 최근 캡처 렌더링 및 증적 상세 dialog
- `extension/shared/llm.js`
  - 내부망 LLM 기본 endpoint
  - adapter request 생성
  - OpenAI/LiteLLM 응답 파싱
  - 진단 결과 secret redaction
- `extension/shared/content-controller.js`
  - 캡처 성공 receipt 콜백 추가
- `extension/content.js`
  - 페이지 내 캡처 완료 toast 추가
- `extension/background.js`
  - 저장 완료 후 원본 탭에 `CAPTURE_RECEIPT` 발송
- `tests/editor-shell.test.cjs`
  - 저장 위치 UI, LLM 진단 UI, 다운로드 API 사용 계약 검증
- `tests/llm.test.cjs`
  - endpoint, payload API key, 응답 파싱, redaction, 에러 분류 검증
- `tests/content-controller.test.cjs`
  - 캡처 성공 receipt 콜백 검증
- `tests/capture-receipt-shell.test.cjs`
  - background/content receipt 계약 검증
- `tests/edge-smoke.mjs`
  - 실제 Edge/Chromium 확장 로드, 캡처, 저장소 복원 smoke 검증
  - STORAGE/최근 캡처/LLM 진단 UI 존재 검증
  - 산출 ZIP에 LLM API key 문자열이 포함되지 않는지 검증

### 검증 항목

- `node --test tests/editor-shell.test.cjs tests/llm.test.cjs`
- `node --test tests/content-controller.test.cjs tests/capture-receipt-shell.test.cjs`
- `node --check extension/editor.js`
- `node --check extension/content.js`
- `node --check extension/background.js`
- `node --check extension/shared/content-controller.js`
- `node --check tests/edge-smoke.mjs`
- `node --check tests/chrome-smoke.mjs`

### 검증 결과

- `node --test` 전체 단위/계약 테스트: 47개 통과
- 문법 검사:
  - `extension/editor.js`
  - `extension/content.js`
  - `extension/background.js`
  - `extension/shared/llm.js`
  - `extension/shared/content-controller.js`
- Edge smoke:
  - 최초 `npm run smoke:edge`는 PowerShell 실행 정책 때문에 `npm.ps1` 실행이 차단됨
  - `npm.cmd run smoke:edge` 최초 실행은 Edge DevTools `Runtime.evaluate` 타임아웃 발생
  - smoke runner timeout 보강 후 직접 실행 `node tests/edge-smoke.mjs`: `Edge smoke PASS: 4 captures, PASS`
- Chrome/Chromium smoke:
  - `npm.cmd run smoke:chrome` 최초 실행은 재기동 단계에서 `DevToolsActivePort` 생성 타임아웃 발생
  - smoke runner timeout 보강 후 직접 실행 `node tests/chrome-smoke.mjs`: `Chromium smoke PASS: 4 captures, PASS`

### 수동 확인 흐름

1. Edge에서 확장 프로그램을 로드한다.
2. CaptureIT 편집기를 열고 세션을 시작한다.
3. 테스트 페이지에서 클릭 또는 컨텍스트 캡처를 수행한다.
4. 페이지 하단 toast에 캡처 순번과 대상 텍스트가 표시되는지 확인한다.
5. 편집기 Evidence Inbox에 증적이 추가됐는지 확인한다.
6. Evidence Inbox 상단의 `최근 캡처`가 방금 캡처한 항목으로 갱신되는지 확인한다.
7. 최근 캡처를 클릭해 상세 dialog에서 이미지와 메타데이터를 확인한다.
8. STORAGE 패널의 증적 수와 마지막 저장 시각이 갱신되는지 확인한다.
9. `HTML·MD·ZIP 생성` 또는 `증적만 ZIP`을 실행한다.
10. STORAGE 패널의 마지막 ZIP/다운로드 경로가 갱신되는지 확인한다.
11. `마지막 ZIP 열기`, `다운로드 폴더 열기`가 동작하는지 확인한다.
12. LLM 설정에서 endpoint, API key, model, adapter를 입력한다.
13. `연결 테스트`와 `추천 요청 테스트`를 실행한다.
14. 진단 출력에 API key가 노출되지 않고 `***redacted***`로 표시되는지 확인한다.
