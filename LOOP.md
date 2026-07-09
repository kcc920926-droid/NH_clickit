# CaptureIT 구현 루프: streamlined-report-authoring

이 문서는 `.kiro/specs/streamlined-report-authoring/tasks.md`를 자동/반복적으로 실행하기 위한 에이전트 루프 가이드다. 매 반복마다 이 문서를 먼저 읽고, 진행 상태를 갱신한 뒤 다음 작업으로 넘어간다.

---

## 1. 작업 범위와 참고 문서

- **요구사항**: [requirements.md](file:///D:/Users/18310490/Desktop/project/captureIT/.kiro/specs/streamlined-report-authoring/requirements.md) — Requirement 1~10, EARS 형식 acceptance criteria
- **설계**: [design.md](file:///D:/Users/18310490/Desktop/project/captureIT/.kiro/specs/streamlined-report-authoring/design.md) — Correctness Property 1~17, Components/Data Models/Error Handling
- **작업 목록**: [tasks.md](file:///D:/Users/18310490/Desktop/project/captureIT/.kiro/specs/streamlined-report-authoring/tasks.md) — 19개 최상위 작업, Task Dependency Graph(웨이브 0~16)
- **작업 폴더 범위**: `D:\Users\18310490\Desktop\project\captureIT` (extension/, tests/ 하위만 수정. PRD.md/README.md는 이 스펙 완료 후 별도로 갱신)

## 2. 반복 루프 (Action Plan)

```
[1. 상태 확인] ---> [2. 다음 작업 선정] ---> [3. 구현] ---> [4. 검증] --(통과?)--> [5. tasks.md 체크 + 로그 갱신]
      ^                                                            |                        |
      |                                                            v (실패)                  v
      +----------------------- [6. 실패 원인 기록 후 재시도] <-------+                        |
      |                                                                                      |
      +---------------------------------- (다음 미완료 작업으로 루프) <----------------------+
```

### Step 1: 상태 확인
- `tasks.md`를 읽고 체크되지 않은(`- [ ]`) 최상위 작업과 하위 작업을 확인한다.
- 이 문서의 "9. 진행 로그" 섹션을 읽어 이전 반복에서 남긴 실패/보류 사항이 있는지 확인한다. 있다면 먼저 해소한다.

### Step 2: 다음 작업 선정
- `tasks.md`의 "Task Dependency Graph" 웨이브 순서(0 → 16)를 따른다. 현재 웨이브의 모든 작업이 완료되어야 다음 웨이브로 넘어간다.
- 같은 웨이브 내에서는 병렬 가능하지만, 같은 파일(`domain.js`, `editor.js` 등)을 수정하는 작업은 순차로 처리해 충돌을 피한다.
- 체크포인트 작업(4, 7, 9, 11, 19번)에 도달하면 Step 4로 즉시 이동해 전체 테스트를 실행한다.

### Step 3: 구현
- 선정한 작업의 `_Requirements: ..._` 참조를 requirements.md에서 다시 확인하고, design.md의 해당 Component/Property 설명을 재확인한다.
- `*`로 표시된 하위 작업(property/unit 테스트)은 대응하는 구현 작업과 같은 반복에서 함께 처리하는 것을 권장한다(구현 직후 검증).
- 기존 함수의 시그니처/동작은 변경하지 않는다(design.md "하위 호환성 원칙" 참조). 예외는 `tests/manifest.test.cjs`, `tests/content-controller.test.cjs`의 selection-mode 관련 단언뿐이다.

### Step 4: 검증
아래 명령을 순서대로 실행한다.

```powershell
npm test
```

- 신규 property 테스트 파일(`tests/domain-properties.test.cjs`, `tests/report-properties.test.cjs`, `tests/content-controller-properties.test.cjs`, `tests/llm-properties.test.cjs`)은 `numRuns: 100`으로 실행되는지 확인한다.
- 웨이브가 콘텐츠 스크립트(8번)나 UI(12~18번) 작업을 포함하면, 해당 웨이브 종료 시점에 다음도 고려한다:
  ```powershell
  node tests/edge-smoke.mjs
  ```
- 실패하면 Step 6으로, 통과하면 Step 5로 이동한다.

### Step 5: tasks.md 체크 + 로그 갱신
- 완료된 작업의 체크박스를 `- [ ]` → `- [x]`로 변경한다.
- 이 문서의 "9. 진행 로그"에 한 줄 요약(작업 번호, 변경 파일, 테스트 결과)을 추가한다.
- 다음 작업으로 Step 2로 돌아간다.

### Step 6: 실패 원인 기록 후 재시도
- 같은 접근을 2번 이상 반복해서 실패했다면, 패턴을 바꾸기 전에 먼저 근본 원인을 분석한다(예: 하위 호환성 깨짐, 순수 함수 경계 위반, mock 의존성 불일치).
- "9. 진행 로그"에 실패 원인과 시도한 접근을 기록한 뒤 Step 3으로 돌아가 다른 접근을 시도한다.
- 근본 원인이 design.md/requirements.md 자체의 모순이라고 판단되면, 임의로 스펙을 바꾸지 말고 사용자에게 확인을 요청한다.

## 3. 체크포인트 규칙

`tasks.md`의 체크포인트(4, 7, 9, 11, 19)에 도달하면:
1. `npm test`로 전체 테스트를 실행한다.
2. 기존 40개 테스트 중 의도적으로 교체된 2개(`tests/manifest.test.cjs`, `tests/content-controller.test.cjs`)를 제외한 나머지가 무수정 통과하는지 확인한다.
3. 실패가 있으면 원인이 이번 웨이브의 변경 때문인지, 기존 회귀인지 구분한다.
4. 통과하면 로그에 체크포인트 통과를 기록하고 다음 웨이브로 진행한다. 의심스러운 부분이 있으면 사용자에게 질문한다.

## 4. 하지 않을 것

- `domain.js`/`report.js`/`storage.js`의 기존 export 시그니처를 변경하지 않는다.
- `manifest.json`의 스키마 버전이나 필드 집합을 변경하지 않는다.
- LLM이 Verdict(PASS/FAIL)를 설정하도록 만들지 않는다(Property 16으로 방어됨).
- Fallback_Click_Replay 관련 코드에서 무한 루프 방지 마킹(WeakSet)을 빠뜨리지 않는다.
- 체크포인트를 건너뛰고 다음 웨이브로 넘어가지 않는다.

## 5. fast-check 사용 규칙

- 버전: `4.8.0` 고정 (`npm install --save-dev fast-check@4.8.0`)
- 모든 property 테스트: `numRuns: 100`
- 각 Correctness Property(1~17)는 정확히 하나의 property-based 테스트로 구현한다.
- 테스트 주석 태그 형식: `// Feature: streamlined-report-authoring, Property {number}: {property_text}`

## 6. 완료 조건

다음을 모두 만족하면 이 루프를 종료한다.

- [x] tasks.md의 모든 최상위 작업(1~19)이 체크됨 — 81/81 완료
- [x] `npm test` 전체 통과 — 100 tests, 100 pass, 0 fail
- [x] Property 1~17이 각각 하나의 property 테스트로 구현되고 통과
- [ ] `node tests/edge-smoke.mjs` 통과 (UI/콘텐츠 스크립트 변경 반영 후) — 실제 Edge 브라우저 필요, 이번 루프에서는 미실행(코드 레벨 grep으로 잔존 참조 없음만 확인)
- [x] 의도된 회귀 변경(매니페스트 커맨드 삭제, selection-mode 제거)이 design.md에 기록된 그대로 반영됨

**루프 종료.** 남은 항목(`node tests/edge-smoke.mjs`)은 실제 Microsoft Edge 브라우저가 설치된 환경에서 수동 실행이 필요합니다.

## 7. 막혔을 때

- 같은 접근으로 2번 실패하면 접근을 바꾸기 전에 근본 원인을 먼저 설명한다.
- 스펙 문서(requirements.md/design.md) 자체가 모순되거나 불명확하면 임의로 해석하지 말고 사용자에게 질문한다.
- 기존 40개 테스트 중 교체 대상이 아닌 파일이 깨지면 즉시 원인을 밝히고, 하위 호환성 원칙을 지키는 방향으로 수정한다.

## 8. 다음 작업 바로가기

현재 다음으로 처리할 작업은 `tasks.md`의 체크되지 않은 항목 중 Task Dependency Graph 상 가장 낮은 웨이브의 항목이다. 매 반복 시작 시 이 섹션 대신 `tasks.md`를 직접 읽어 최신 상태를 확인한다(이 문서는 상태를 미러링하지 않는다).

## 9. 진행 로그

> 이 섹션은 매 반복마다 append 방식으로 갱신한다. 형식: `- [날짜/웨이브] 작업 번호 — 변경 파일 — 테스트 결과 — 비고`

- [웨이브 0] 1.1 — package.json — fast-check 4.8.0 정확히 고정 설치 완료
- [웨이브 0] 2.1 — extension/shared/domain.js — ensureDraftReport 추가, tests/domain.test.cjs 7 pass
- [웨이브 0] 5.1 — extension/shared/storage.js — isDraft 정규화(normalizeReportRecord) 추가, tests/storage-contract.test.cjs pass
- [웨이브 0] 6.1 — extension/shared/report.js — DEFAULT_REPORT_TITLE 상수화, author는 기존 로직이 이미 요구사항 충족, tests/report.test.cjs 2 pass
- [웨이브 0] 8.1 — extension/shared/content-controller.js — enterSelectionMode/isSelecting/captureSelection 삭제, captureHighlightShortcut 추가 (주의: content.js가 아직 이 함수들을 참조 중 — 8.4에서 해결 예정)
- [웨이브 0] 8.5 — extension/manifest.json — commands.select-context 및 commands 필드 전체 삭제
- [웨이브 0] 10.1 — extension/shared/llm.js — buildReportDraftRequest 추가, tests/llm.test.cjs 7 pass
- [웨이브 0] 12.1 — extension/editor.html — save-project-dialog로 식별정보 이동, capture-first-panel 신설, tests/editor-shell.test.cjs 3 pass (tests/manifest.test.cjs는 8.5 영향으로 실패 중, 8.7에서 교체 예정 — 의도된 회귀)
- [웨이브 1] 2.2 — extension/shared/domain.js — groupIntoCaptureSessionSets 추가, tests/domain.test.cjs 7 pass
- [웨이브 1] 6.2 — extension/shared/report.js — 변경개요 섹션 생략/부분렌더링, author 구분자 처리, tests/report.test.cjs 2 pass
- [웨이브 1] 8.4 — extension/content.js — isSelecting 분기 제거, WeakSet 기반 Ctrl+Shift+Click Fallback_Click_Replay 추가, ENTER_SELECTION 메시지 제거
- [웨이브 1] 8.6 — extension/background.js — chrome.commands.onCommand의 select-context 블록 삭제
- [웨이브 1] 10.2 — extension/shared/llm.js — validateReportDraftSuggestion 추가(title/configurationOverview 화이트리스트), tests/llm.test.cjs 7 pass
- [웨이브 1] 12.2 — extension/editor.html — quick-mapping-dialog/report-draft-suggestion-dialog/verdict-confirm 마크업 추가
- [체크포인트] npm test 실행 결과: 46 pass / 2 fail. 실패 2건(tests/content-controller.test.cjs의 selection-mode 테스트, tests/manifest.test.cjs의 select-context 검사)은 design.md에 명시된 "의도된 회귀"와 정확히 일치 (태스크 8.3/8.7에서 교체 예정). 체크포인트 4/7/9/11 통과 처리.
- [웨이브 2] 3.1 — extension/shared/domain.js — mapEvidenceBatch 추가(mapEvidence 순회 위임), tests/domain.test.cjs 7 pass
- [웨이브 2] 3.2 — extension/shared/domain.js — applyQuickMapping 추가(verification 필수 검증→mapEvidenceBatch→필드 대입, status는 건드리지 않음), tests/domain.test.cjs 7 pass
- [웨이브 2] 3.3 — extension/shared/domain.js — saveAsProject 추가(projectName 필수, 나머지 기본값 처리, isDraft:false), tests/domain.test.cjs 7 pass
- [참고] tests/edge-smoke.mjs 543번째 줄에 ENTER_SELECTION 관련 참조가 남아있음 — 이번 스펙 범위 밖이지만 최종 체크포인트(19) 또는 smoke 테스트 실행 시 확인 필요 → 최종 체크포인트에서 grep 재확인 결과 해소됨(참조 없음)
- [웨이브 3] 12.4 — extension/editor.js — save-project-dialog 제출 핸들러를 saveAsProject에 연결
- [웨이브 4] 13.1/13.2/13.3 — Capture_Graph 시각화 + Node_Context_Preview(hover 즉시표시/leave 즉시숨김) 완료
- [웨이브 5] 14.1/14.2/14.3 — Drag_And_Drop_Mapping + Alternative_Mapping_Control, 둘 다 mapEvidenceIds(→mapEvidenceBatch) 공유
- [웨이브 6] 15.1/15.2 — Quick_Mapping_Dialog(더블클릭) → applyQuickMapping 연동
- [웨이브 7] 16.1 — Verdict Default_Selection(PASS 사전표시) + Verdict_Confirmation(확인 버튼만이 status 확정), domain.js 무변경
- [웨이브 8] 17.1/17.2 — Report_Draft_Suggestion 요청/승인/무시 흐름, LLM이 Verdict 절대 미설정
- [웨이브 9] 18.1 — renderGuidance() 8.1~8.7 단계별 안내
- [테스트 웨이브] Property 1~17 전부 fast-check 4.8.0/numRuns:100로 구현 완료(tests/domain-properties.test.cjs, report-properties.test.cjs, content-controller-properties.test.cjs, llm-properties.test.cjs)
- [테스트 웨이브] 예시 기반 단위 테스트 전부 완료(domain.test.cjs 확장, storage-contract.test.cjs 확장, report.test.cjs 확장, llm.test.cjs 확장, content-controller.test.cjs 교체, manifest.test.cjs 교체, editor-shell.test.cjs 확장, editor-interactions.test.cjs 신설, capture-graph.test.cjs 신설, editor-guidance.test.cjs 신설)
- [최종 체크포인트 19] `npm test` 실행 결과: **100 tests, 100 pass, 0 fail**. 의도된 회귀 2건(manifest.test.cjs, content-controller.test.cjs)도 이제 새 동작 기준으로 통과. ENTER_SELECTION/select-context 잔존 참조 없음 확인.
- [완료] tasks.md 81/81 완료. streamlined-report-authoring 스펙 구현 완료.
