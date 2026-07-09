# CaptureIT

사내 폐쇄망에서 QA 증적을 순서·맥락과 함께 수집하고, 기능 명세별 PASS/FAIL 결과를 HTML·Markdown·ZIP 보고서로 생성하는 Chromium 확장 프로그램입니다. Microsoft Edge를 1차 대상으로 하고, Chrome/Chromium은 폴백·테스트 용도입니다.

## 현재 구현 범위

- Edge MV3 확장 프로그램
- 이벤트 드리븐 캡처: navigation, route-change, click, submit
- 컨텍스트 지정 캡처: 단축키/우클릭 흐름에서 선택 요소 강조 후 주변 화면 캡처
- 기존 이미지 파일 import 후 Evidence Inbox에 저장
- 기능 명세 1개당 테스트 결과 Set 1개
- 사용자가 직접 PASS/FAIL/미판정 선택
- 내부망 LLM 후보 추천용 2단계 payload 생성/응답 검증
- HTML, Markdown, manifest.json, PNG 이미지를 포함한 ZIP 생성
- 확장 프로그램 내 ZIP viewer
- chrome.storage.local + IndexedDB 기반 로컬 저장
- 브라우저 재시작 후 evidence/session 복원 smoke 검증

미구현 범위는 PRD의 비목표를 따릅니다. 자동 PASS/FAIL 판정, 판정 후 조작 차단, 레거시 시스템 자동 업로드, Spring/JAR viewer, HWPX/Excel/PDF 출력은 현재 범위가 아닙니다.

## 디렉터리

```text
extension/                 확장 프로그램 본체
extension/shared/          도메인, 저장소, 리포트, ZIP, LLM, viewer 공통 모듈
fixtures/order-demo/       실제 캡처 smoke용 주문 승인 데모 페이지
tests/                     node:test 단위/계약/브라우저 smoke
scripts/serve-fixture.mjs  loopback fixture 서버
assets/icons/              원본/생성 아이콘
artifacts/                 smoke 산출물
PRD.md                     확정 PRD
docs/verification/         검증 기록
```

## 설치/실행

1. Edge에서 `edge://extensions` 접속
2. 개발자 모드 ON
3. `압축 해제된 항목 로드` 선택
4. `D:\Users\18310490\Desktop\project\captureIT\extension` 폴더 선택
5. 확장 아이콘을 눌러 `editor.html` 진입

Chrome 실사용은 사내 정책에 따라 `--load-extension`이 차단될 수 있습니다. 자동 smoke의 `smoke:chrome`은 이 경우를 피하기 위해 테스트용 Playwright Chromium을 우선 사용합니다.

## 사용 흐름

1. 캡처 세션 시작
2. 캡처 모드 선택
   - 이벤트 모드: 화면 전환/버튼 클릭/폼 제출 등을 즉시 캡처
   - 컨텍스트 모드: 특정 요소 선택 후 빨간 박스/노란 highlight 포함 캡처
3. 필요하면 기존 PNG/JPEG/WebP 이미지 import
4. 기능 명세 추가/편집
5. Evidence Inbox에서 기능 명세로 증적 연결
6. 검증 내용, 기대 결과, 실제 결과, PASS/FAIL 입력
7. 미리보기 확인
8. ZIP export
9. 레거시 시스템에는 사용자가 ZIP을 내려받아 직접 업로드

## 산출물 구조

```text
qa-result.zip
├─ report.html
├─ report.md
├─ manifest.json
└─ assets/
   ├─ FS-001-001.png
   ├─ FS-001-002.png
   └─ ...
```

`report.html`은 정적 HTML이며 외부 CDN이나 네트워크 의존성이 없습니다. `manifest.json`은 viewer 검증과 증적 파일 매핑에 사용합니다.

## 개발 명령

```powershell
node --test tests/*.test.cjs
node tests/edge-smoke.mjs
node tests/chrome-smoke.mjs
```

`node tests/edge-smoke.mjs`는 실제 Edge를 실행하고 다음을 검증합니다.

- fixture 페이지 로딩
- 확장 프로그램 로딩
- navigation/click/context 캡처
- 강조 overlay 포함 이미지 생성
- ZIP/HTML/MD/manifest 생성
- 브라우저 relaunch 후 chrome.storage.local/IndexedDB 복원

`node tests/chrome-smoke.mjs`는 Chrome 호환성 폴백 검증입니다. 기본은 Playwright Chromium이며, 실제 Chrome으로 강제하려면 다음 환경변수를 지정합니다.

```powershell
$env:CAPTUREIT_BROWSER_PATH='C:\Program Files\Google\Chrome\Application\chrome.exe'
$env:CAPTUREIT_BROWSER_LABEL='Chrome'
node tests/edge-smoke.mjs
```

## 최근 검증 산출물

- Edge smoke: `artifacts/demo-report/qa-result.zip`
- Chromium smoke: `artifacts/chrome-demo-report/qa-result.zip`
- 렌더링 확인 스크린샷: `artifacts/report-render-check.png`

상세 검증 기록은 `docs/verification/2026-07-06-vertical-slice-checklist.md`를 참조합니다.
