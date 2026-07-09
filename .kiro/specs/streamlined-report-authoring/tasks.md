# Implementation Plan: streamlined-report-authoring

## Overview

기존 CaptureIT 확장 프로그램의 `extension/` 코드베이스에 대한 증분 변경이다. 구현 순서는 `domain.js`(순수 로직) → `storage.js` → `report.js` → 콘텐츠 스크립트(`content-controller.js`/`content.js`/`manifest.json`/`background.js`) → `llm.js` → `editor.html`/`editor.js`/`editor.css`(UI 오케스트레이션) 순으로 진행한다. 각 순수 로직 계층은 해당 계층 구현 직후 Property-Based 테스트(fast-check, `numRuns: 100`, 버전 고정 `4.8.0`)로 검증하고, UI 계층은 예시 기반 단위 테스트로 검증한다. 기존 40개 테스트 중 `tests/manifest.test.cjs`, `tests/content-controller.test.cjs`의 selection-mode 관련 단언만 의도적으로 교체하며 나머지는 수정하지 않는다.

## Tasks

- [x] 1. 프로젝트 설정: fast-check 의존성 추가
  - [x] 1.1 `package.json`에 `fast-check` 버전 `4.8.0`을 정확히 고정한 devDependency로 추가하고 설치
    - `npm install --save-dev fast-check@4.8.0` 실행 후 `package.json`/`package-lock.json`에 정확한 버전이 고정되었는지 확인
    - _Requirements: (design.md Testing Strategy - Property-Based 테스트)_

- [x] 2. 도메인 로직: Draft_Report 생성과 Capture_Session_Set 그룹화
  - [x] 2.1 `extension/shared/domain.js`에 `ensureDraftReport(existingReport, title = '')` 구현 및 export 추가
    - 기존 report가 있으면 그대로 반환, 없으면 `createReport('')`에 `isDraft: true`를 얹어 반환
    - 기존 export(`addFeature`, `createEditorState`, `createFeature`, `createReport`, `createSession`, `deleteFeature`, `mapEvidence`, `moveFeature`, `nextSequence`, `overallStatus`, `unmapEvidence`, `validationWarnings`)는 시그니처와 동작을 그대로 유지
    - _Requirements: 1.2, 1.4, 1.5, 1.6, 1.7_

  - [x] 2.2 `extension/shared/domain.js`에 `groupIntoCaptureSessionSets(evidenceList)` 구현 및 export 추가
    - 입력 evidence 배열을 `sessionId`로 파티션해 `{ sessionId, evidenceIds, count }` 배열을 반환
    - 각 세트 내부는 `sequenceNo` 오름차순, 세트 간은 세트의 최소 `sequenceNo` 오름차순으로 정렬
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 2.7_

  - [x]* 2.3 Property 1 테스트 작성 (`tests/domain-properties.test.cjs` 신설)
    - **Property 1: Capture_Session_Set 그룹화는 sessionId 파티션과 동치**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.5**

  - [x]* 2.4 Property 17 테스트 작성 (`tests/domain-properties.test.cjs`)
    - **Property 17: Capture_Session_Set 그룹화는 인접 Capture_Node 연결 관계를 세션 내부로 한정한다**
    - **Validates: Requirements 2.6, 2.7**

  - [x]* 2.5 `ensureDraftReport` 예시 기반 단위 테스트 작성 (`tests/domain.test.cjs`)
    - report 없을 때 `isDraft: true` 생성, 이미 있을 때 그대로 반환하는 경우를 검증
    - _Requirements: 1.2, 1.5, 1.6, 1.7_

- [x] 3. 도메인 로직: 배치 매핑, Quick_Mapping, 프로젝트 저장
  - [x] 3.1 `extension/shared/domain.js`에 `mapEvidenceBatch(state, evidenceIds, featureId)` 구현 및 export 추가
    - 내부적으로 `evidenceIds`를 순서대로 기존 `mapEvidence(state, id, featureId)`에 위임해 "이전 Test_Result_Set에서 자동 이동" 규칙을 재사용
    - _Requirements: 3.2, 3.4_

  - [x] 3.2 `extension/shared/domain.js`에 `applyQuickMapping(state, evidenceIds, featureId, fields)` 구현 및 export 추가
    - `fields.verification.trim()`이 비면 `Error`를 던지고 state를 변경하지 않음
    - 검증 통과 시 `mapEvidenceBatch`를 호출한 뒤 대상 feature의 `verification`/`expectedResult`/`actualResult`를 설정(선택 필드 기본값 `''`)
    - `result.status`(Verdict)는 절대 건드리지 않음
    - _Requirements: 3.8, 3.9, 3.10, 3.11_

  - [x] 3.3 `extension/shared/domain.js`에 `saveAsProject(draftReport, projectDetails)` 구현 및 export 추가
    - `projectName`이 비거나 공백이면 `Error`를 던짐(유일한 필수 값)
    - 나머지 선택 필드는 생략 시 빈 문자열로 기본값 처리, `isDraft: false`로 전환
    - _Requirements: 5.1, 5.3, 5.5, 5.7_

  - [x]* 3.4 Property 2 테스트 작성 (`tests/domain-properties.test.cjs`)
    - **Property 2: 배치 매핑은 이전 연결을 대체하며 원자적으로 적용된다**
    - **Validates: Requirements 3.2, 3.4**

  - [x]* 3.5 Property 3 테스트 작성 (`tests/domain-properties.test.cjs`)
    - **Property 3: 드래그앤드롭과 Alternative_Mapping_Control은 항상 동일한 결과를 만든다**
    - **Validates: Requirements 3.5, 3.6**

  - [x]* 3.6 Property 10 테스트 작성 (`tests/domain-properties.test.cjs`)
    - **Property 10: Quick_Mapping_Dialog는 mapEvidenceBatch와 동일한 매핑 결과를 만들며 검증 내용 필수 게이팅을 지킨다**
    - **Validates: Requirements 3.8, 3.9, 3.10, 3.11**

  - [x]* 3.7 Property 4 테스트 작성 (`tests/domain-properties.test.cjs`)
    - **Property 4: 프로젝트 저장 시 선택 필드는 항상 빈 문자열로 기본값 처리되고 저장은 실패하지 않는다**
    - **Validates: Requirements 5.3, 5.5, 5.7**

  - [x]* 3.8 Property 11 테스트 작성 (`tests/domain-properties.test.cjs`)
    - **Property 11: Default_Verdict_Selection의 UI 표시와 무관하게 미확인 Test_Result_Set은 항상 미판정으로 집계된다**
    - **Validates: Requirements 6.6**

  - [x]* 3.9 Property 12 테스트 작성 (`tests/domain-properties.test.cjs`)
    - **Property 12: Verdict는 오직 Verdict_Confirmation을 통해서만, 그리고 확인 시점의 선택값과 정확히 같은 값으로만 확정된다**
    - **Validates: Requirements 6.7, 6.8, 6.9**

  - [x]* 3.10 `saveAsProject`/`applyQuickMapping` 에지 케이스 단위 테스트 작성 (`tests/domain.test.cjs`)
    - 프로젝트명 누락 시 에러, verification 공백 시 에러 및 state 불변 확인
    - _Requirements: 3.10, 5.1_

- [x] 4. 체크포인트 - 도메인 레이어 테스트 통과 확인
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. 저장소: Draft_Report 구분 필드
  - [x] 5.1 `extension/shared/storage.js`의 `reports` 레코드에 `isDraft` 필드 취급 반영
    - `putReport`/`getReport`/`listReports`/`deleteReport` 시그니처는 변경하지 않음, 새 인덱스/스토어 추가하지 않음
    - _Requirements: (design.md storage.js 변경, Requirement 1.2 관련)_

  - [x]* 5.2 `isDraft` 필드 저장/조회 단위 테스트 작성 (`tests/storage-contract.test.cjs`)
    - 기존 레코드에 `isDraft`가 없을 때 `Boolean(record.isDraft)`로 안전하게 취급되는지 확인
    - _Requirements: (design.md storage.js 변경)_

- [x] 6. Report_Builder 보강: 식별 정보 기본값과 변경 개요 섹션
  - [x] 6.1 `extension/shared/report.js`의 `buildManifest`에서 기본 보고서명 상수화 및 author 폴백 제거
    - `DEFAULT_REPORT_TITLE` 상수로 명명(기존 값 `'CaptureIT QA 보고서'` 유지), `author`는 원본 값(빈 문자열 포함)을 그대로 통과
    - _Requirements: 7.7, 7.8_

  - [x] 6.2 `extension/shared/report.js`의 `renderHtml`/`renderMarkdown`에 변경 개요 섹션 생략/부분 렌더링 로직 추가
    - `changePurpose`/`changeSummary`/`configurationOverview`가 모두 빈 문자열이면 섹션 전체 생략, 하나라도 있으면 값이 있는 항목만 렌더링
    - author 표시 영역은 비었을 때 구분자·플레이스홀더 없이 빈 값으로 렌더링
    - _Requirements: 7.3, 7.4_

  - [x]* 6.3 Property 5 테스트 작성 (`tests/report-properties.test.cjs` 신설)
    - **Property 5: manifest 생성은 식별 정보의 존재 여부와 무관하게 항상 성공하고 6개 필드를 모두 포함한다**
    - **Validates: Requirements 7.1, 7.2, 4.1, 4.2**

  - [x]* 6.4 Property 6 테스트 작성 (`tests/report-properties.test.cjs`)
    - **Property 6: 변경 개요 섹션의 존재와 내용은 HTML과 Markdown 사이에 항상 일치한다**
    - **Validates: Requirements 7.3, 7.4, 7.5**

  - [x]* 6.5 Property 7 테스트 작성 (`tests/report-properties.test.cjs`)
    - **Property 7: Evidence 필드는 매핑 경로와 무관하게 manifest에서 항상 보존된다**
    - **Validates: Requirements 7.6**

  - [x]* 6.6 Property 8 테스트 작성 (`tests/report-properties.test.cjs`)
    - **Property 8: 보고서명이 비면 세 산출물 모두 동일한 기본 보고서명을 일관되게 표시한다**
    - **Validates: Requirements 7.7**

  - [x]* 6.7 Property 9 테스트 작성 (`tests/report-properties.test.cjs`)
    - **Property 9: 작성자가 비면 플레이스홀더 없이 항상 빈 값으로 렌더링된다**
    - **Validates: Requirements 7.8**

  - [x]* 6.8 변경 개요 섹션 생략 에지 케이스 단위 테스트 작성 (`tests/report.test.cjs`)
    - 세 필드 모두 빈 문자열일 때 HTML/Markdown에 섹션 자체가 없는지 확인
    - _Requirements: 7.3, 7.4_

- [x] 7. 체크포인트 - Report_Builder 테스트 통과 확인
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. 콘텐츠 스크립트 캡처 파이프라인 재작성 (Ctrl+Shift+Click 즉시 캡처)
  - [x] 8.1 `extension/shared/content-controller.js`에서 `enterSelectionMode`/`isSelecting`/`captureSelection` 삭제, `captureHighlightShortcut(target)` 추가
    - 각 `await` 지점 전후로 `target.isConnected`를 재확인해 캡처 완료 전 무효화 시 `false` 반환(예외 없음)
    - 기존 하이라이트 오버레이 렌더링(`showOverlay`/`hideOverlay`)과 `triggerType: 'shortcut-context'` 재사용
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [x]* 8.2 Property 13 테스트 작성 (`tests/content-controller-properties.test.cjs` 신설)
    - **Property 13: Highlight_Shortcut_Capture의 결과는 대상 요소의 연결 상태 궤적에 의해 결정된다**
    - **Validates: Requirements 9.2, 9.4, 9.6**

  - [x]* 8.3 `tests/content-controller.test.cjs`의 selection-mode 관련 테스트를 `captureHighlightShortcut` 검증 테스트로 교체 (의도된 회귀 변경)
    - `enterSelectionMode`/`isSelecting`/`captureSelection`이 더 이상 export되지 않음을 확인, `captureHighlightShortcut`이 `showOverlay`/`hideOverlay`를 호출하는지 확인
    - _Requirements: 9.1, 9.3, 9.5_

  - [x] 8.4 `extension/content.js`에서 `isSelecting` 분기 제거, capture 단계 Ctrl+Shift+Click 리스너와 Fallback_Click_Replay 추가
    - capture 단계 리스너가 `ctrlKey && shiftKey`인 원본 클릭에만 `preventDefault`/`stopImmediatePropagation`을 적용해 이번 디스패치만 보류시키고, `captureHighlightShortcut`이 `true`를 반환할 때만 동일 속성의 `MouseEvent('click', ...)`를 재발생(WeakSet으로 재생 이벤트 마킹해 무한 루프 방지)
    - _Requirements: 9.1, 9.2, 9.5_

  - [x] 8.5 `extension/manifest.json`에서 `commands.select-context`(`Ctrl+Shift+E`) 삭제
    - _Requirements: 9.5_

  - [x] 8.6 `extension/background.js`에서 `chrome.commands.onCommand`의 `select-context` 분기 제거
    - _Requirements: 9.5_

  - [x]* 8.7 `tests/manifest.test.cjs`의 `select-context` 단언을 `commands`에 `select-context`가 없음(또는 `commands` 필드 부재)을 확인하는 단언으로 교체 (의도된 회귀 변경)
    - _Requirements: 9.5_

- [x] 9. 체크포인트 - 콘텐츠 스크립트 테스트 통과 확인
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. `llm.js`에 Report_Draft_Suggestion 요청/검증 함수 추가
  - [x] 10.1 `extension/shared/llm.js`에 `buildReportDraftRequest(report, mappedEvidenceByFeature)` 구현 및 export 추가
    - 기존 `featureContext`/`evidenceContext`를 재사용해 이미지 시퀀스+컨텍스트 payload 생성, thumbnailDataUrl 누락 시 기존과 동일하게 에러
    - _Requirements: 10.1_

  - [x] 10.2 `extension/shared/llm.js`에 `validateReportDraftSuggestion(response)` 구현 및 export 추가
    - `title`/`configurationOverview`가 둘 다 string이 아니면 `Error`, 그 외에는 이 두 필드만 남긴 객체를 반환(판정류 키 등 다른 필드는 절대 통과시키지 않음)
    - _Requirements: 10.7_

  - [x]* 10.3 Property 14 테스트 작성 (`tests/llm-properties.test.cjs` 신설)
    - **Property 14: Report_Draft_Suggestion은 승인 또는 수정-후-승인을 거쳤을 때만, 그리고 정확히 그 값으로 QA_Report에 반영된다**
    - **Validates: Requirements 10.2, 10.3, 10.4, 10.5**

  - [x]* 10.4 Property 15 테스트 작성 (`tests/llm-properties.test.cjs`)
    - **Property 15: LLM 요청 실패 시 필드는 항상 불변이며 리포트 생성 흐름을 막지 않는다**
    - **Validates: Requirements 10.6**

  - [x]* 10.5 Property 16 테스트 작성 (`tests/llm-properties.test.cjs`)
    - **Property 16: Report_Draft_Suggestion 검증기는 판정 관련 필드를 절대 통과시키지 않는다**
    - **Validates: Requirements 10.7**

  - [x]* 10.6 `buildReportDraftRequest` payload 구조 단위 테스트 작성 (`tests/llm.test.cjs`)
    - `task`/`features`/`responseSchema` 필드 존재와 이미지 누락 시 에러를 확인
    - _Requirements: 10.1_

- [x] 11. 체크포인트 - LLM 모듈 테스트 통과 확인
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Editor UI: 레이아웃 재배치와 캡처 우선 진입
  - [x] 12.1 `extension/editor.html`에서 기존 `report-panel`을 `<dialog id="save-project-dialog">`로 이동, 최상단에 `capture-first-panel`(캡처 시작/이미지 불러오기) 배치
    - 기존 input id(`report-title`, `project-name`, `report-author`, `change-purpose`, `change-summary`, `configuration-overview`)는 그대로 유지, "프로젝트로 저장" 버튼은 미리보기/생성 버튼 다음에 배치
    - _Requirements: 1.1, 1.3, 4.3, 4.4_

  - [x] 12.2 `extension/editor.html`에 `quick-mapping-dialog`, `report-draft-suggestion-dialog`, `verdict-confirm` 버튼 마크업 추가
    - `quick-mapping-dialog`: 대상 Feature_Spec `<select>`, 필수 검증 내용 textarea(`required`), 선택 기대/실제 결과 textarea
    - _Requirements: 3.7, 6.7, 6.8, 10.2_

  - [x] 12.3 `extension/editor.js`에서 캡처 시작/이미지 불러오기 핸들러 진입 시 `CaptureITDomain.ensureDraftReport` 호출 연결
    - `putReport` 실패 시에도 캡처/불러오기 자체는 계속 진행되도록 `try/catch`로 감쌈
    - _Requirements: 1.1, 1.2, 1.5, 1.6, 1.7_

  - [x] 12.4 `extension/editor.js`에서 `save-project-dialog` 제출 핸들러를 `CaptureITDomain.saveAsProject` 호출로 연결
    - 프로젝트명 누락 시 에러를 캐치해 폼 제출을 막고 입력란에 포커스, 승인된 Report_Draft_Suggestion 값이 있으면 해당 필드를 미리 채움
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [x]* 12.5 `tests/editor-shell.test.cjs` 갱신: 이동된 엘리먼트 위치와 신규 다이얼로그 id 검사 추가
    - 캡처/불러오기 컨트롤이 최상단에 있는지, 식별 정보 입력란이 `save-project-dialog` 내부에 있는지, "프로젝트로 저장" 버튼이 미리보기/생성 버튼보다 마크업 순서상 뒤에 있는지, `quick-mapping-dialog`/`verdict-confirm`/`report-draft-suggestion-dialog` 필수 엘리먼트 존재 확인(기존 id 검사는 유지)
    - _Requirements: 1.3, 4.3, 4.4_

- [x] 13. Editor UI: Capture_Graph 시각화와 Node_Context_Preview
  - [x] 13.1 `extension/editor.js`에서 `CaptureITDomain.groupIntoCaptureSessionSets` 결과를 Capture_Graph 카드로 렌더링
    - 그룹별 `<div class="capture-graph">`에 `evidenceIds` 순서대로 `<div class="capture-node">` 배치, `count` 표시, 펼치기 토글로 개별 노드 표시
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 2.7_

  - [x] 13.2 `extension/editor.js`에서 `capture-node`에 `mouseenter`/`mouseleave` 기반 Node_Context_Preview 추가
    - `mouseenter` 시 `context.target`/`context.surroundingContext`를 툴팁에 채움, `mouseleave` 시 `setTimeout` 등 지연 없이 즉시 숨김
    - _Requirements: 2.8, 2.9_

  - [x] 13.3 `extension/editor.css`에 `capture-graph`/`capture-node`/Node_Context_Preview 스타일 추가
    - 연속된 두 노드를 커넥터로 연결, 그래프 컨테이너 사이에는 커넥터를 그리지 않음
    - _Requirements: 2.6, 2.7, 2.8_

  - [x]* 13.4 `tests/capture-graph.test.cjs` 신설: hover 시 Node_Context_Preview 표시, mouseleave 시 즉시 숨김(가짜 타이머로 지연 호출 부재 확인), 세트별 count 표시 예시 기반 테스트
    - _Requirements: 2.3, 2.8, 2.9_

- [x] 14. Editor UI: Drag_And_Drop_Mapping과 Alternative_Mapping_Control
  - [x] 14.1 `extension/editor.js`에서 Capture_Graph/Capture_Node의 `dragstart`와 Feature_Spec 드롭 타겟의 `dragover`/`drop`을 `CaptureITDomain.mapEvidenceBatch` 호출로 연결
    - `dragstart`는 `application/x-captureit-evidence-ids`에 세트 전체 또는 단일 노드의 evidenceIds를 JSON으로 실음
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 14.2 `extension/editor.js`에 Alternative_Mapping_Control(버튼 + 키보드 Enter/Space 흐름) 추가, 동일하게 `mapEvidenceBatch` 호출
    - _Requirements: 3.5, 3.6_

  - [x] 14.3 `extension/editor.css`에 드롭 타겟, `draggable` 카드, Alternative_Mapping_Control 버튼 스타일 추가
    - _Requirements: 3.1, 3.5_

  - [x]* 14.4 `tests/editor-interactions.test.cjs` 신설: Drag_And_Drop_Mapping과 Alternative_Mapping_Control이 동일한 도메인 함수(`mapEvidenceBatch`)를 호출해 동일한 결과를 만드는지 예시 기반으로 검증
    - _Requirements: 3.6_

- [x] 15. Editor UI: Quick_Mapping_Dialog
  - [x] 15.1 `extension/editor.js`에서 Capture_Graph/Capture_Node `dblclick` 핸들러로 `quick-mapping-dialog`를 열고 대상 evidenceIds를 다이얼로그 상태에 보관
    - _Requirements: 3.7_

  - [x] 15.2 `extension/editor.js`에서 `quick-mapping-dialog` 제출 핸들러를 `CaptureITDomain.applyQuickMapping` 호출로 연결
    - `verification` 공백 에러를 캐치해 폼 제출을 막고 입력란에 필수 표시, 성공 시 다이얼로그를 닫고 Evidence/Feature/경고 영역을 다시 렌더링
    - _Requirements: 3.8, 3.9, 3.10, 3.11_

  - [x]* 15.3 `tests/editor-interactions.test.cjs`에 Quick_Mapping_Dialog 제출/검증 에러 테스트 추가
    - 검증 내용 공백 시 제출 차단, 정상 제출 시 매핑과 필드 적용이 함께 일어나는지 확인
    - _Requirements: 3.8, 3.9, 3.10, 3.11_

- [x] 16. Editor UI: Verdict Default_Selection과 Verdict_Confirmation
  - [x] 16.1 `extension/editor.js`에 `pendingVerdictByFeatureId` 로컬 상태와 `#verdict-confirm` 버튼 핸들러 추가
    - `<select>` `change`는 로컬 상태만 갱신(즉시 `feature.result.status` 미설정), 초기값은 `feature.result.status ?? 'PASS'`, 확인 버튼 클릭 시점의 선택값을 `feature.result.status`에 대입
    - _Requirements: 6.1, 6.2, 6.6, 6.7, 6.8, 6.9_

  - [x]* 16.2 `tests/editor-interactions.test.cjs`에 Verdict_Confirmation 테스트 추가
    - 기본값(PASS)을 바꾸지 않고 확인해도 직접 선택으로 취급되는지, 확인 전에는 `status`가 변경되지 않는지 확인
    - _Requirements: 6.7, 6.8_

- [x] 17. Editor UI: Report_Draft_Suggestion 검토 흐름
  - [x] 17.1 `extension/editor.js`에서 미리보기/ZIP 생성 트리거 시 매핑된 Evidence가 있으면 `CaptureITLlm.buildReportDraftRequest` → `buildAdapterRequest`/`postLlm` → `validateReportDraftSuggestion` 순서로 호출해 `report-draft-suggestion-dialog`에 표시
    - 요청 실패(네트워크 오류/스키마 오류) 시 다이얼로그를 띄우지 않고 조용히 무시, 미리보기/ZIP 생성 흐름은 계속 진행
    - _Requirements: 10.1, 10.2, 10.6_

  - [x] 17.2 `extension/editor.js`에 승인/수정-후-승인/무시 핸들러 추가
    - 승인 시에만 `report.title`/`report.configurationOverview`를 갱신 후 저장 큐에 반영, 무시하면 아무 것도 변경하지 않음, LLM은 Verdict를 절대 설정하지 않음
    - _Requirements: 10.2, 10.3, 10.4, 10.5, 10.7_

  - [x]* 17.3 `tests/editor-interactions.test.cjs`에 Report_Draft_Suggestion 검토 흐름 테스트 추가
    - 무시/즉시 승인/수정 후 승인 각각의 결과가 QA_Report 필드에 정확히 반영되는지 확인
    - _Requirements: 10.3, 10.4, 10.5_

- [x] 18. Editor UI: 단계별 다음 행동 안내
  - [x] 18.1 `extension/editor.js`에 `renderGuidance()` 구현
    - Evidence_Inbox 비어있음, Feature_Spec 0개, 매핑 없는 Test_Result_Set 존재, 첫 매핑 발생, Draft 미저장 상태, 캡처 세션 활성 여부, Report_Draft_Suggestion 대기 상태를 각각 안내
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [x]* 18.2 `tests/editor-guidance.test.cjs` 신설: 8.1~8.7 각 조건별 안내 문구 표시/숨김 예시 기반 테스트
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [x] 19. 최종 체크포인트 - 전체 테스트 통과 및 회귀 확인
  - `npm test` 실행으로 기존 40개 테스트 중 의도적으로 교체된 2개(`tests/manifest.test.cjs`, `tests/content-controller.test.cjs`)를 제외한 나머지가 수정 없이 통과하는지, 신규 property/unit 테스트가 모두 통과하는지 확인
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- `*`로 표시된 하위 작업은 선택 사항이며 빠른 MVP를 위해 건너뛸 수 있다.
- 각 작업은 requirements.md의 세부 조항(예: `2.6`)을 참조한다.
- 체크포인트는 증분 검증을 보장한다.
- Property 테스트는 design.md의 Correctness Property를 검증하며, Property 1~17은 각각 정확히 하나의 property-based 테스트로 구현된다(`tests/domain-properties.test.cjs`, `tests/report-properties.test.cjs`, `tests/content-controller-properties.test.cjs`, `tests/llm-properties.test.cjs`).
- 단위 테스트는 특정 예시와 에지 케이스를 검증한다.
- `tests/manifest.test.cjs`와 `tests/content-controller.test.cjs`의 selection-mode 관련 단언 교체는 design.md에서 명시한 의도된 회귀 변경이며, 나머지 38개 기존 테스트 파일은 수정하지 않는다.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "5.1", "6.1", "8.1", "8.5", "10.1", "12.1"] },
    { "id": 1, "tasks": ["2.2", "2.5", "5.2", "6.2", "6.3", "8.2", "8.3", "8.4", "8.6", "8.7", "10.2", "10.6", "12.2", "12.3"] },
    { "id": 2, "tasks": ["2.3", "3.1", "6.4", "6.8", "10.3", "12.5", "13.3"] },
    { "id": 3, "tasks": ["2.4", "3.2", "6.5", "10.4", "14.3"] },
    { "id": 4, "tasks": ["3.3", "3.4", "6.6", "10.5"] },
    { "id": 5, "tasks": ["3.5", "3.10", "6.7", "12.4"] },
    { "id": 6, "tasks": ["3.6", "13.1"] },
    { "id": 7, "tasks": ["3.7", "13.2"] },
    { "id": 8, "tasks": ["3.8", "13.4", "14.1"] },
    { "id": 9, "tasks": ["3.9", "14.2"] },
    { "id": 10, "tasks": ["14.4", "15.1"] },
    { "id": 11, "tasks": ["15.2"] },
    { "id": 12, "tasks": ["15.3", "16.1"] },
    { "id": 13, "tasks": ["16.2", "17.1"] },
    { "id": 14, "tasks": ["17.2"] },
    { "id": 15, "tasks": ["17.3", "18.1"] },
    { "id": 16, "tasks": ["18.2"] }
  ]
}
```
