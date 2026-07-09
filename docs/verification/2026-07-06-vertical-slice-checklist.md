# CaptureIT 수직 슬라이스 검증 체크리스트

- 검증일: 2026-07-06
- 작업 디렉터리: `D:\Users\18310490\Desktop\project\captureIT`
- 대상: PRD 기반 Edge 우선 확장 프로그램 MVP 수직 슬라이스

## 요구사항별 상태

| 항목 | 상태 | 근거 |
|---|---:|---|
| Edge MV3 확장 로드 | PASS | `extension/manifest.json`, `node tests/edge-smoke.mjs` |
| 이벤트 드리븐 캡처 | PASS | navigation/click 캡처 smoke, `tests/content-controller.test.cjs` |
| 업무 완료 대기 없이 이벤트 시점 캡처 | PASS | `event mode captures a click after the render scheduler without waiting for business state` |
| 컨텍스트 지정 캡처 | PASS | shortcut-context/context-menu 캡처 smoke |
| 강조 overlay 포함 캡처 | PASS | `artifacts/report-render-check.png`에서 빨간 박스/노란 highlight 확인 |
| 주변 맥락 포함 | PASS | manifest의 target/surroundingContext 검증, `tests/report.test.cjs` |
| 기존 이미지 import | PASS | `extension/editor.js`, editor shell 계약 테스트 |
| 기능 명세 1개당 결과 Set 1개 | PASS | `tests/domain.test.cjs`, `tests/report.test.cjs` |
| PASS/FAIL 사용자 판정 | PASS | domain/report/editor 테스트 |
| 판정 후 조작 차단 미구현 | PASS | PRD 비목표와 일치 |
| HTML/Markdown 보고서 | PASS | `artifacts/demo-report/report.html`, `report.md`, 렌더링 검증 |
| ZIP 패키지 | PASS | `artifacts/demo-report/qa-result.zip`, `artifacts/chrome-demo-report/qa-result.zip` |
| ZIP viewer 검증 | PASS | `tests/viewer.test.cjs`, artifact ZIP manifest validation |
| 내부망 LLM 추천 payload | PASS | `tests/llm.test.cjs` |
| LLM 자동 판정 없음 | PASS | LLM은 후보 추천만 수행 |
| 로컬 저장 | PASS | `tests/storage-contract.test.cjs`, browser relaunch smoke |
| 브라우저 재시작 후 복원 | PASS | `CDP: storage restored after Edge relaunch`, `CDP: storage restored after Chromium relaunch` |
| Edge 우선 | PASS | `node tests/edge-smoke.mjs` |
| Chrome/Chromium 폴백 | PASS | `node tests/chrome-smoke.mjs`; 테스트용 Chromium 우선 |
| 폐쇄망 동작 | PASS | CDN/외부 패키지 없이 정적 HTML/로컬 확장 구조 |

## 실행한 검증

### 단위/계약 테스트

```powershell
node --test tests/*.test.cjs
```

결과:

```text
1..40
# tests 40
# pass 40
# fail 0
```

### Edge 실제 smoke

```powershell
node tests/edge-smoke.mjs
```

결과:

```text
CDP: page Runtime.enable
CDP: page Page.enable
CDP: CaptureIT extension page ready
CDP: storage restored after Edge relaunch
Edge smoke PASS: 4 captures, PASS
```

산출물:

- `artifacts/demo-report/report.html`
- `artifacts/demo-report/report.md`
- `artifacts/demo-report/manifest.json`
- `artifacts/demo-report/qa-result.zip`
- `artifacts/demo-report/assets/FS-001-001.png` ~ `FS-001-004.png`

### Chromium 폴백 smoke

```powershell
node tests/chrome-smoke.mjs
```

결과:

```text
CDP: page Runtime.enable
CDP: page Page.enable
CDP: CaptureIT extension page ready
CDP: storage restored after Chromium relaunch
Chromium smoke PASS: 4 captures, PASS
```

산출물:

- `artifacts/chrome-demo-report/report.html`
- `artifacts/chrome-demo-report/report.md`
- `artifacts/chrome-demo-report/manifest.json`
- `artifacts/chrome-demo-report/qa-result.zip`
- `artifacts/chrome-demo-report/assets/FS-001-001.png` ~ `FS-001-004.png`

### ZIP/manifest/artifact 검증

검증 내용:

- `report.html`, `report.md`, `manifest.json`, `qa-result.zip` 존재
- manifest overallStatus = `PASS`
- manifest evidence 파일이 모두 PNG signature를 가짐
- HTML/Markdown이 모든 evidence 파일을 참조
- ZIP reader round-trip 성공
- viewer package validation 성공

결과:

```json
[
  {
    "dir": "artifacts/demo-report",
    "status": "PASS",
    "evidence": 4
  },
  {
    "dir": "artifacts/chrome-demo-report",
    "status": "PASS",
    "evidence": 4
  }
]
```

### HTML 렌더링 검증

검증 내용:

- Chromium headless에서 `artifacts/demo-report/report.html` HTTP 렌더링
- manifest evidence 수와 DOM image 수 일치
- 모든 이미지 `complete === true`
- 모든 이미지 `naturalWidth`, `naturalHeight` 양수
- 본문에 `PASS` 표시
- 전체 페이지 스크린샷 생성

결과:

```json
{
  "title": "CaptureIT 주문 승인 QA 보고서",
  "imageCount": 4,
  "screenshotPath": "D:\\Users\\18310490\\Desktop\\project\\captureIT\\artifacts\\report-render-check.png"
}
```

## 확인된 환경 이슈

실제 설치된 Google Chrome은 이 환경에서 `--load-extension`으로 CaptureIT unpacked extension을 로드하지 않았다. 사내 정책 또는 Chrome 배포 설정의 영향으로 추정된다. 따라서 `smoke:chrome`은 테스트용 Playwright Chromium을 우선 사용한다.

실제 Chrome 강제 검증이 필요하면 다음처럼 실행한다.

```powershell
$env:CAPTUREIT_BROWSER_PATH='C:\Program Files\Google\Chrome\Application\chrome.exe'
$env:CAPTUREIT_BROWSER_LABEL='Chrome'
node tests/edge-smoke.mjs
```

## 남은 제품화 항목

- 사내 배포용 확장 패키징/서명 정책 확인
- QA 매니저용 설치 안내서 작성
- 내부망 LLM 실제 endpoint contract 확정
- 레거시 시스템 업로드 운영 절차 정리
- 장기 사용 시 IndexedDB 용량/정리 정책 결정
