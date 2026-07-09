# Implementation Plan: capture-wizard-ux-redesign

## Overview

이 구현은 `extension/editor.html`, `extension/editor.js`, `extension/editor.css`, 그리고 신규 순수 모듈 `extension/shared/wizard-stage.js`만 변경한다. 구현 순서는 (1) 순수 로직 모듈 `wizard-stage.js`와 그 Property-Based 테스트 → (2) `editor.html` 마크업 재편(Wizard_Stage 컨테이너, 내비게이션 탭, Settings_Entry_Point 다이얼로그, 한국어 라벨 교체) → (3) `editor.js` 오케스트레이션 계층(재배치 헬퍼, 단계 전환, 액션 계획 적용, 라벨 문자열 교체) → (4) `editor.css` 스타일 → (5) 전체 회귀 테스트 확인 순으로 진행한다. `domain.js`, `report.js`, `storage.js`, `llm.js`, `zip.js`, `content-controller.js`, `content.js`, `background.js`, `manifest.json`은 어떤 작업에서도 수정하지 않는다. 기존 40여 개 테스트 파일은 (설계에서 명시한 대로) `tests/editor-shell.test.cjs`에 한국어 라벨/다이얼로그 위치를 검증하는 단언을 추가하는 것 외에는 수정하지 않는다.

## Tasks

- [x] 1. `extension/shared/wizard-stage.js` 순수 모듈 구현
  - [x] 1.1 모듈 스켈레톤과 도달성 계산 함수 작성
    - `domain.js`와 동일한 IIFE 패턴(`root.CaptureITWizardStage`, Node `module.exports`와 브라우저 `window` 양쪽 지원)으로 파일 생성
    - `STAGES = ['capture', 'evidence-review', 'mapping', 'result', 'completion']` 상수 정의
    - `computeReachableStages(snapshot)`: `{evidenceCount, featureCount, mappedFeatureCount, sessionActive}`를 입력받아 `boolean[5]`를 반환 (인덱스 0은 항상 `true`, 인덱스 1은 `evidenceCount > 0`, 인덱스 2는 인덱스 1이 도달 가능하고 `featureCount > 0`, 인덱스 3은 인덱스 2가 도달 가능하고 `mappedFeatureCount > 0`, 인덱스 4는 인덱스 3이 도달 가능하면 항상 `true`)
    - `furthestReachableIndex(snapshot)`: `computeReachableStages`가 반환한 배열에서 `true`인 가장 큰 인덱스를 반환
    - `canNavigateTo(snapshot, targetIndex)`: `computeReachableStages(snapshot)[targetIndex]`를 반환 (범위 밖 인덱스는 `false`)
    - _Requirements: 1.1, 1.4_

  - [x] 1.2 순수 전환 함수 `navigate` 구현
    - `navigate(snapshot, currentIndex, targetIndex)`: `snapshot`이나 다른 인자를 변경하지 않고(부작용 없음), `canNavigateTo(snapshot, targetIndex)`가 `true`이면 `targetIndex`를, 아니면 `currentIndex`를 그대로 반환
    - _Requirements: 1.7, 8.3_

  - [x] 1.3 액션 계획 함수 `planActions` 구현
    - `planActions(stageIndex, context)`: `context = {sessionActive, currentFeatureHasMappedEvidence}`를 입력받아 `{primary: string|null, secondary: string[]}` 반환
    - stage 0(Capture): `sessionActive`가 `false`면 `primary: 'start-session'`, `secondary: ['import-images']`; `true`면 `primary: 'end-session'`, `secondary: ['import-images']`
    - stage 1(Evidence_Review): `primary: 'advance-to-mapping'`, `secondary: []`
    - stage 2(Mapping): `primary: 'advance-to-result'`, `secondary: ['add-feature']`
    - stage 3(Result): `currentFeatureHasMappedEvidence`가 `true`면 `primary: 'confirm-verdict'`; `secondary: ['request-recommendations', 'preview-report', 'export-report', 'open-save-project']`
    - stage 4(Completion): `primary: 'export-report'`, `secondary: ['preview-report', 'open-save-project']`
    - 반환값에서 `primary`가 `null`이 아니면 그 식별자가 `secondary` 배열에 절대 포함되지 않도록 구현
    - _Requirements: 1.2, 1.3, 6.1, 6.2, 6.3_

  - [x]* 1.4 Property 1 테스트 작성 (`tests/wizard-stage-properties.test.cjs` 신설)
    - **Property 1: 임의의 활성 단계에 대해 정확히 하나의 Wizard_Stage만 visible이다**
    - **Validates: Requirements 1.1, 3.3, 3.4**
    - fast-check(고정 버전 `4.8.0`), `numRuns: 100`, `// Feature: capture-wizard-ux-redesign, Property 1: ...` 태그 주석 포함

  - [x]* 1.5 Property 2 테스트 작성 (`tests/wizard-stage-properties.test.cjs`)
    - **Property 2: Primary_Action은 항상 0개 또는 1개이며 Secondary_Action 집합과 겹치지 않는다**
    - **Validates: Requirements 1.2, 1.3**
    - `numRuns: 100`, stage index 0~4와 `sessionActive`/`currentFeatureHasMappedEvidence` 조합을 fast-check로 생성

  - [x]* 1.6 Property 3 테스트 작성 (`tests/wizard-stage-properties.test.cjs`)
    - **Property 3: 도달 가능한 가장 먼 단계는 데이터가 늘어날 때 결코 감소하지 않는다**
    - **Validates: Requirements 1.4**
    - 기본 snapshot과, 카운트만 증가시키거나 `sessionActive`를 `false→true`로만 바꾸는 성장분을 함께 생성해 `furthestReachableIndex`가 비감소함을 검증

  - [x]* 1.7 Property 4 테스트 작성 (`tests/wizard-stage-properties.test.cjs`)
    - **Property 4: 단계 전환은 어떤 snapshot 필드도 변경하지 않으며, 도달 불가능한 단계로는 결코 전환되지 않는다**
    - **Validates: Requirements 1.7, 8.3**
    - `navigate` 호출 전후 snapshot의 각 필드가 동일한지(deep-equal), 반환된 인덱스가 항상 `0`~`furthestReachableIndex(snapshot)` 범위인지 검증

- [x] 2. 체크포인트 - `wizard-stage.js` 모듈과 Property 테스트 통과 확인
  - `npm test`로 `tests/wizard-stage-properties.test.cjs`가 통과하는지 확인
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. `editor.html`: Wizard_Stage 내비게이션과 5개 단계 컨테이너
  - [x] 3.1 `#wizard-stage-nav`와 5개 `.stage-tab` 버튼 추가
    - `data-stage-index="0"`~`"4"`, `id="stage-tab-capture"`/`"stage-tab-evidence-review"`/`"stage-tab-mapping"`/`"stage-tab-result"`/`"stage-tab-completion"`
    - Wizard_Stage 내비게이션은 `#guidance-banner` 위, 헤더/보고서 전환 패널 아래에 배치
    - _Requirements: 1.1_

  - [x] 3.2 `<main>`을 5개 `.wizard-stage` `<section>` 컨테이너로 재구성
    - `#stage-capture`(기존 `capture-first-panel` 내용 이동, `hidden` 없음), `#stage-evidence-review`(`hidden`, `#advance-to-mapping` 버튼 포함), `#stage-mapping`(`hidden`, `#advance-to-result` 버튼 포함), `#stage-result`(`hidden`, 기존 검증 항목 편집 폼 유지), `#stage-completion`(`hidden`, 기존 검증 안내 박스 이동)
    - `#evidence-drop-zone`, `#feature-panel`(기존 `feature-panel` 섹션), `.actions` 액션 도크는 이 단계에서는 원래 위치 그대로 두고(재배치는 JS가 런타임에 수행), 각 컨테이너에는 재배치 대상이 아닌 마크업(제목, 안내 문구, 신규 버튼)만 추가
    - _Requirements: 1.1, 3.1, 3.2, 3.3, 3.4, 8.3_

  - [x] 3.3 `#feature-mapping-target` 래퍼 추가
    - 기존 `#feature-editor` 내부의 "선택된 증적" `<h3>` + `#feature-mapping-guidance` + `#mapped-evidence`를 `<section id="feature-mapping-target">`으로 감싸기(내부 id는 변경하지 않음)
    - _Requirements: 8.3_

- [x] 4. `editor.html`: Settings_Entry_Point 다이얼로그와 한국어 라벨 교체
  - [x] 4.1 `<dialog id="storage-detail-dialog">` 추가 및 저장 위치 정보 이동
    - 기존 `storage-panel`의 `<dl class="storage-list">`(6개 필드)와 `.storage-actions`의 3개 버튼(`show-last-download`, `show-download-folder`, `export-evidence-only`)을 id를 바꾸지 않고 다이얼로그로 이동
    - `.app-header`에 `#open-storage-detail` 버튼 추가, 클릭 시 `storage-detail-dialog.showModal()`(닫기 버튼 포함)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 4.2 `<dialog id="llm-settings-dialog">` 추가 및 LLM 연동 설정 이동
    - 기존 `.llm-settings` 섹션의 엔드포인트/API Key/Model/Adapter/템플릿 입력과 `test-llm-connection`/`test-llm-recommendation`/`llm-diagnostics`를 id를 바꾸지 않고 다이얼로그로 이동
    - `#recommendation-list`와 `#request-recommendations`는 다이얼로그로 옮기지 않고 Result_Stage(메인 화면)에 남김
    - `.app-header`에 `#open-llm-settings` 버튼 추가, 클릭 시 `llm-settings-dialog.showModal()`(닫기 버튼 포함)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 4.3 한국어 라벨 교체 (editor.html)
    - eyebrow 6개: `START HERE`→`1단계 · 캡처 시작`, `STORAGE`(다이얼로그 제목)→`저장 위치 정보`, `FEATURES`→`검증 항목`, `DRAFT / PROJECT`→`작업 보고서 상태`, `EVIDENCE`→`증적 수집함`, `FEATURE RESULT`→`검증 항목 결과`
    - `feature-list-heading`/`add-feature` aria-label 등 "기능"/"기능 명세"를 포함하는 정적 텍스트를 "검증 항목"으로 교체 (id·속성명은 변경하지 않음)
    - _Requirements: 4.1, 4.2, 7.1, 7.2_

  - [x]* 4.4 `tests/editor-shell.test.cjs` 확장: 새 구조와 한국어 라벨 검증 추가
    - `storage-detail-dialog` 내부에 6개 저장 위치 필드+3개 액션 버튼이 있는지, `llm-settings-dialog` 내부에 5개 LLM 입력 필드가 있는지, `open-storage-detail`/`open-llm-settings` 버튼 존재, `request-recommendations`가 `llm-settings-dialog` 바깥에 있는지 확인
    - "START HERE", "STORAGE", "FEATURES", "DRAFT / PROJECT", "EVIDENCE", "FEATURE RESULT", `>OFF<`, `>ON<`, "기능 명세"가 `editor.html`에 나타나지 않는지, 5개 `wizard-stage` 컨테이너가 존재하고 `stage-capture` 외 4개가 `hidden`으로 시작하는지 확인
    - _Requirements: 2.3, 2.4, 2.5, 4.2, 5.1, 5.3, 5.4, 7.1_

- [x] 5. 체크포인트 - HTML 마크업 정적 검사 통과 확인
  - `npm test`로 확장된 `tests/editor-shell.test.cjs`를 포함해 기존 정적 마크업 테스트가 통과하는지 확인 (이 시점에는 JS 오케스트레이션이 아직 없으므로 상호작용 테스트는 이후 단계에서 확인)
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. `editor.js`: Wizard_Stage 오케스트레이션 계층 구현
  - [x] 6.1 `editor.html`에 `wizard-stage.js` 스크립트 태그 추가, `editor.js`의 `elements`에 신규 참조 추가
    - `<script src="shared/wizard-stage.js">`를 `editor.js` 스크립트 태그 앞(다른 `shared/*.js`와 같은 위치)에 추가
    - `elements`에 `stageTabs`(5개 배열 또는 맵), `stageCapture`/`stageEvidenceReview`/`stageMapping`/`stageResult`/`stageCompletion`, `advanceToMapping`, `advanceToResult`, `featurePanel`, `featureMappingTarget`, `actionsDock`, `openStorageDetail`, `openLlmSettings`, `storageDetailDialog`, `llmSettingsDialog` 추가
    - _Requirements: 1.1, 2.2, 5.2_

  - [x] 6.2 `currentStageSnapshot()`, `mountRegion()`, `renderStage()`, `applyActionPlan()` 구현
    - `currentStageSnapshot()`: `editorState.evidence.length`, `editorState.features.length`, 매핑된 Test_Result_Set 수, `session && session.active`로 snapshot 객체 생성
    - `mountRegion(region, container)`: `region.parentElement !== container`일 때만 `container.appendChild(region)` 호출(불필요한 재배치 방지)
    - `renderStage()`: `CaptureITWizardStage.navigate`로 `activeStageIndex`를 clamp, `computeReachableStages`로 탭 `disabled`/`active` 클래스 갱신, 4개 공유 영역(`evidence-drop-zone`, `feature-panel`, `feature-mapping-target`, `.actions` 액션 도크)을 `mountRegion`으로 현재 단계의 컨테이너에 재배치, `applyActionPlan()` 호출
    - `applyActionPlan(snapshot)`: `CaptureITWizardStage.planActions` 결과를 `ACTION_ID_TO_BUTTON` 맵을 통해 각 버튼의 `button-primary`/`button-secondary` 클래스와 `hidden` 속성에 반영
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 3.3, 3.4, 6.1, 6.2, 6.3, 8.3_

  - [x] 6.3 `goToStage(targetIndex)`와 이벤트 리스너 연결
    - `goToStage`: `CaptureITWizardStage.navigate`로 `activeStageIndex` 갱신 후 `renderStage()` 호출
    - 5개 `.stage-tab` 클릭 시 `goToStage(Number(button.dataset.stageIndex))` 호출
    - `#advance-to-mapping` 클릭 시 `goToStage(2)`, `#advance-to-result` 클릭 시 `goToStage(3)`
    - `#open-storage-detail`/`#open-llm-settings` 클릭 시 각각 `storageDetailDialog.showModal()`/`llmSettingsDialog.showModal()`
    - _Requirements: 1.1, 1.7, 2.2, 5.2, 8.3_

  - [x] 6.4 `renderAll()`과 데이터 변경 함수들에 `renderStage()` 호출 통합
    - `renderAll()` 마지막에 `renderStage()` 추가
    - `toggleSession`, `mapEvidence`, `unmapEvidence`, `mapEvidenceIds`, `submitQuickMapping`, `addFeature`, `removeFeature`, `importImages` 각각의 렌더링 호출 부근에 `renderStage()`를 추가해 도달 가능 단계와 재배치 상태를 항상 최신으로 유지
    - _Requirements: 1.4, 1.6, 3.5, 8.3_

  - [x] 6.5 사용자 대상 문자열의 "기능"/"기능 명세"를 "검증 항목"으로 교체 (editor.js)
    - 예: `'새 기능'`, `` `${index + 1}. ${feature.title || '제목 없는 기능'}` ``, `'먼저 기능 명세를 선택하십시오.'`, `'기능 명세를 추가하십시오'`, `featureMappingGuidance` 안내 문구 등
    - 함수명·변수명·HTML id(`feature`, `featureId`, `currentFeatureId`, `CaptureITDomain.addFeature` 등)는 절대 변경하지 않음
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 6.6 `renderSession()`의 세션 상태 텍스트를 한국어로 교체
    - `elements.sessionStatus.textContent`를 `active ? '세션 켜짐' : '세션 꺼짐'`으로 변경 (CSS 클래스 `status-on`/`status-off`는 유지)
    - _Requirements: 7.3_

  - [x]* 6.7 `tests/wizard-stage-shell.test.cjs` 신설
    - 5개 `.stage-tab`의 존재와 `data-stage-index` 값(0~4), `advance-to-mapping`/`advance-to-result` 버튼 존재, `feature-mapping-target`이 `mapped-evidence`와 `feature-mapping-guidance`를 포함하는지 정적 검사
    - _Requirements: 1.1, 8.3_

  - [x]* 6.8 `tests/wizard-stage-guidance.test.cjs` 신설
    - 빈 Evidence Inbox + 비활성 세션 조합에서 Capture_Stage의 안내 문구가 나타나는지(1.5), 매핑되지 않은 Test_Result_Set이 있을 때 안내 문구가 나타나는지(1.6), 첫 매핑 직후 안내 문구가 바뀌는지(3.5) 예시 기반 검증(기존 `tests/editor-guidance.test.cjs` 패턴 확장)
    - _Requirements: 1.5, 1.6, 3.5_

  - [x]* 6.9 `tests/editor-shell.test.cjs` 추가 확장: 핸들러 바인딩과 라벨 회귀 검증
    - `toggleSession`, `mapEvidence`, `mapEvidenceIds`, `applyQuickMapping`, `saveAsProject` 호출 등 기존 핸들러 함수명이 여전히 존재하고 대응 버튼에 바인딩되는지, "검증 항목"이 목록 제목/빈 상태/추가 버튼 라벨에 나타나는지(4.1), 세션 상태 텍스트가 "세션 켜짐"/"세션 꺼짐"인지(7.3) 확인
    - _Requirements: 4.1, 6.4, 7.3, 8.1, 8.2_

- [x] 7. 체크포인트 - JS 오케스트레이션과 신규 테스트 통과 확인
  - `npm test`로 `tests/wizard-stage-shell.test.cjs`, `tests/wizard-stage-guidance.test.cjs`, 확장된 `tests/editor-shell.test.cjs`가 통과하는지 확인
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. `editor.css`: Wizard_Stage 내비게이션과 다이얼로그 스타일
  - [x] 8.1 `#wizard-stage-nav`와 `.stage-tab` 스타일 추가
    - 활성 탭(`.active`)과 비활성/disabled 탭을 시각적으로 구분, `disabled` 탭은 클릭 불가능한 형태로 표시
    - _Requirements: 1.1, 1.2_

  - [x] 8.2 `storage-detail-dialog`/`llm-settings-dialog` 스타일 추가
    - 기존 `.preview-dialog`/`.evidence-detail-dialog` 패턴(너비, `::backdrop`, `.preview-toolbar` 재사용)을 따라 두 다이얼로그의 크기와 내부 여백을 정의
    - _Requirements: 2.3, 2.4, 2.5, 5.3_

  - [x] 8.3 `.wizard-stage` 컨테이너와 재배치된 영역의 레이아웃 스타일 보강
    - 기존 `[hidden] { display: none !important; }` 규칙을 그대로 활용하고, 각 `.wizard-stage`가 재배치된 공유 영역(Evidence Inbox/검증 항목 목록/매핑 대상/액션 도크)을 자연스럽게 배치하도록 grid/gap 조정
    - _Requirements: 1.1, 3.1, 3.2, 3.3, 3.4_

- [x] 9. 최종 체크포인트 - 전체 테스트 통과 및 회귀 확인
  - `npm test` (`node --test tests/*.test.cjs`) 실행으로 다음을 확인:
    - `domain*.test.cjs`, `report*.test.cjs`, `storage-contract.test.cjs`, `llm*.test.cjs`, `zip.test.cjs`, `content-controller*.test.cjs`, `background-events.test.cjs`, `manifest.test.cjs` 등 이 기능이 건드리지 않는 파일들이 수정 없이 그대로 통과
    - `tests/editor-shell.test.cjs`, `tests/editor-interactions.test.cjs`, `tests/editor-guidance.test.cjs`가 (라벨/구조 변경에 따른 의도된 확장 외에는) 계속 통과
    - 신규 `tests/wizard-stage-properties.test.cjs`(Property 1~4), `tests/wizard-stage-shell.test.cjs`, `tests/wizard-stage-guidance.test.cjs`가 모두 통과
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- `*`로 표시된 하위 작업은 선택 사항이며 빠른 MVP를 위해 건너뛸 수 있다.
- 각 작업은 requirements.md의 세부 조항(예: `2.3`)을 참조한다.
- 체크포인트는 증분 검증을 보장한다.
- Property 테스트는 design.md의 Correctness Property를 검증하며, Property 1~4는 각각 정확히 하나의 property-based 테스트로 구현된다(`tests/wizard-stage-properties.test.cjs`, fast-check `4.8.0` 고정, `numRuns: 100`).
- 단위/예시 기반 테스트는 특정 마크업 위치, 라벨 문자열, 안내 문구 표시/숨김을 검증한다.
- `domain.js`, `report.js`, `storage.js`, `llm.js`, `zip.js`, `content-controller.js`, `content.js`, `background.js`, `manifest.json`은 어떤 작업에서도 수정하지 않는다.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4", "1.5", "1.6", "1.7"] },
    { "id": 3, "tasks": ["2"] },
    { "id": 4, "tasks": ["3.1"] },
    { "id": 5, "tasks": ["3.2"] },
    { "id": 6, "tasks": ["3.3", "4.1", "4.2"] },
    { "id": 7, "tasks": ["4.3"] },
    { "id": 8, "tasks": ["4.4"] },
    { "id": 9, "tasks": ["5"] },
    { "id": 10, "tasks": ["6.1"] },
    { "id": 11, "tasks": ["6.2"] },
    { "id": 12, "tasks": ["6.3", "6.4"] },
    { "id": 13, "tasks": ["6.5", "6.6"] },
    { "id": 14, "tasks": ["6.7", "6.8", "6.9"] },
    { "id": 15, "tasks": ["7"] },
    { "id": 16, "tasks": ["8.1", "8.2", "8.3"] },
    { "id": 17, "tasks": ["9"] }
  ]
}
```
