# Implementation Plan: local-llm-evidence-packet

## Overview

이 구현은 design.md의 원칙(순수 로직 모듈 우선 → 브라우저 의존 통합 지점 나중)을 그대로 따른다. 순서는 (1) `domain.js`/`storage.js`의 데이터 모델·저장소 확장 → (2) 순수 로직 모듈 `interaction-settler.js`/`dom-diff.js`/`page-context.js` 확장 → (3) `screenshot-cropper.js`(좌표 계산 순수 함수 + 의존성 주입된 렌더링)와 `evidence-step-builder.js` → (4) `llm.js` 확장(이미지 선별·payload 구성·응답 검증) → (5) `capture-coordinator.js`/`content-controller.js`(백그라운드·콘텐츠 스크립트 오케스트레이션, settler/diff를 의존성으로 사용) → (6) `content.js`(실제 브라우저 이벤트 배선) → (7) `editor.js`(UI 오케스트레이션과 이미지/LLM 위임) 순으로 진행한다.

폼 입력 디바운스 누적(REQ 3, Property 7~9)의 실제 로직은 design.md가 `content.js`의 모듈 스코프 변수로 스케치했지만, `interaction-settler.js`와 동일한 "의존성 주입 가능한 순수 로직" 원칙을 지키기 위해 이 구현에서는 그 누적/타이머 로직을 `content-controller.js`에 `setTimer`/`clearTimer`/`now`를 주입받는 형태로 두고, `content.js`는 실제 DOM 이벤트를 그 함수에 위임하는 얇은 배선만 담당한다. 이는 design.md Overview의 테스트 가능성 원칙과 일치하는 구현 선택이며 계약(REQ 3.1~3.6)은 동일하게 지켜진다.

기존 QA 보고서 작성 흐름(`report.js`, `zip.js`, `viewer.js`, `background-events.js`, `wizard-stage.js`)과 `manifest.json`, `background.js`의 기존 메시지 계약은 이 기능에서 수정하지 않는다. 49개 Correctness Property는 각각 정확히 하나의 property-based 테스트(fast-check `4.8.0` 고정, `numRuns: 100`)로 구현되며, 구현 직후(가능한 가장 가까운 하위 작업)에 배치된다.

## Tasks

- [x] 1. `domain.js` 확장: RecordingSession/Recording_Policy/EvidenceStep 헬퍼
  - [x] 1.1 `createRecordingSession(recordingPolicy, now, id)`, `defaultRecordingPolicy(overrides)`, `createEvidenceStep({stepNo, stepType, evidenceIds, primaryEvidenceId}, id)` 구현 및 export 추가
    - 기존 `createSession`/`nextSequence`/`groupIntoCaptureSessionSets` 등 기존 export는 시그니처와 동작을 그대로 유지
    - `createRecordingSession`은 `createSession(mode, now, id)`을 내부에서 호출해 그 결과에 `recordingPolicy`, `lastEvidenceId: null`, `baselineEvidenceId: null`을 추가한 객체를 반환
    - `defaultRecordingPolicy`는 누락된 필드만 기본값(`captureBaselineOnStart:true, captureFullViewportPerStep:true, createLlmCrop:true, inputDebounceMs:800, mutationQuietMs:300, maxSettleMs:2000, maxLlmImagesPerFeature:5`)으로 채움
    - _Requirements: 14.1_

  - [x]* 1.2 Property 43 테스트 작성 (`tests/domain-properties.test.cjs` 확장)
    - **Property 43: createRecordingSession의 출력은 항상 createSession의 출력을 완전히 포함하는 상위집합이다**
    - **Validates: Requirements 14.1**

  - [x]* 1.3 `defaultRecordingPolicy`/`createEvidenceStep` 단위 테스트 작성 (`tests/domain.test.cjs` 확장)
    - 일부 필드만 override했을 때 나머지가 기본값으로 채워지는지, `createEvidenceStep`이 `primaryEvidenceId`를 그대로 보존하는지 확인
    - _Requirements: 14.1, 11.3_

- [x] 2. `storage.js` 확장: IndexedDB v2, `evidenceSteps` 스토어, `normalizeEvidenceRecord`
  - [x] 2.1 `DATABASE_VERSION`을 2로 상향하고 `evidenceSteps` 오브젝트 스토어(keyPath: `stepId`)와 인덱스(`sessionId`, `stepNo`, `primaryEvidenceId`, `createdAt`) 추가
    - `objectStoreNames.contains(...)` 가드를 `evidence`/`reports`/`sessions`에도 계속 적용해 기존 스토어를 재생성하지 않음(REQ 14.2, 14.5)
    - _Requirements: 14.2, 14.4, 14.5_

  - [x] 2.2 `normalizeEvidenceRecord(record)` 구현, `getEvidence`/`listEvidence`에 적용
    - 누락 시 기본값: `stepId:null, event:null, page:null, target:null, container:null, domBefore:null, domAfter:null, apiEvents:[], serverEvents:[], assertions:[], thumbnailDataUrl:null, llmImageDataUrl:null, docImageDataUrl:null, imageMeta:{}`
    - 스프레드 후 없는 키만 기본값 대입(이미 존재하는 필드 값은 절대 덮어쓰지 않음), 기존 `normalizeReportRecord` 패턴을 재사용
    - _Requirements: 14.3_

  - [x] 2.3 `putEvidenceStep(record, database)`, `getEvidenceStep(id, database)`, `listEvidenceSteps(filters, database)` 구현 및 export 추가
    - 기존 `putRecord`/`getRecord` 헬퍼를 재사용, `listEvidenceSteps`는 `sessionId` 필터와 `stepNo` 오름차순 정렬 지원
    - _Requirements: 14.4_

  - [x]* 2.4 Property 44 테스트 작성 (`tests/storage-properties.test.cjs` 신설)
    - **Property 44: normalizeEvidenceRecord는 누락된 필드만 기본값으로 채우고 기존 값은 절대 덮어쓰지 않는다**
    - **Validates: Requirements 14.3**

  - [x]* 2.5 `tests/storage-contract.test.cjs` 확장: v1 레거시 fixture 정규화, DB 버전/인덱스 정적 확인
    - 모든 신규 필드가 없는 순수 v1 Evidence 객체 상수로 정규화 결과 스냅샷 검증, `DATABASE_VERSION===2` 소스 패턴 확인, `evidenceSteps` 인덱스 4종 소스 패턴 확인, `onupgradeneeded` 본문에 `evidence`/`reports`/`sessions`에 대한 `.clear(`/`.delete(` 호출이 없음을 정적 확인, `putEvidenceStep`/`getEvidenceStep`/`listEvidenceSteps`가 export되는지 확인
    - _Requirements: 14.2, 14.3, 14.4, 14.5_

- [x] 3. 체크포인트 - 데이터 모델/저장소 계층 테스트 통과 확인
  - `npm test`로 `tests/domain-properties.test.cjs`, `tests/domain.test.cjs`, `tests/storage-properties.test.cjs`, `tests/storage-contract.test.cjs`가 통과하는지 확인
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. `extension/shared/interaction-settler.js` 신설
  - [x] 4.1 `createInteractionSettler(dependencies)`와 `waitForSettle({mutationQuietMs, maxSettleMs})` 구현
    - `domain.js`와 동일한 IIFE 패턴(`root.CaptureITInteractionSettler`, Node `module.exports`)으로 파일 생성
    - `dependencies = { observe(callback): () => void, now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout }`
    - `observe` 콜백이 호출될 때마다 quiet 타이머를 리셋, 별도의 `maxSettleMs` 상한 타이머를 처음부터 걸어 두 타이머 중 먼저 해소되는 쪽으로 `{settled:true, reason:'quiet'|'max-settle', waitedMs}`로 resolve(다른 타이머는 해제)
    - `observe` 콜백이 한 번도 호출되지 않아도 `mutationQuietMs` 경과 시 `reason:'quiet'`로 resolve
    - _Requirements: 5.1, 5.2_

  - [x]* 4.2 Property 15 테스트 작성 (`tests/interaction-settler-properties.test.cjs` 신설)
    - **Property 15: InteractionSettler는 조용한 구간이 mutationQuietMs에 도달하는 즉시 resolve한다**
    - **Validates: Requirements 5.1**

  - [x]* 4.3 Property 16 테스트 작성 (`tests/interaction-settler-properties.test.cjs`)
    - **Property 16: 충분한 조용한 구간이 없으면 InteractionSettler는 항상 maxSettleMs에 강제 resolve된다**
    - **Validates: Requirements 5.2**

  - [x]* 4.4 `tests/interaction-settler.test.cjs` 신설: mutation이 전혀 없는 경우, `mutationQuietMs===0`인 경계 케이스 단위 테스트
    - _Requirements: 5.1, 5.2_

- [x] 5. `extension/shared/dom-diff.js` 신설
  - [x] 5.1 `diffContexts(beforeContext, afterContext)`와 `RESULT_PATTERNS`/`VALIDATION_PATTERNS` 어휘 사전 구현
    - `changedText`: after에서 새로 나타난, before에 없던 visibleText 조각
    - `resultMessages`/`validationMessages`: `role="alert"` > `role="status"`/`aria-live` > `.toast`/`.modal`/`.dialog` 클래스 힌트 > 기타 우선순위로 `{text, selector, priority}` 배열 산출
    - `candidateResultElements`: priority 내림차순 정렬된 배열
    - _Requirements: 4.4_

  - [x]* 5.2 Property 13 테스트 작성 (`tests/dom-diff-properties.test.cjs` 신설)
    - **Property 13: Dom_Diff의 분류는 이전/이후 텍스트 집합과 어휘 사전에 의해 결정적으로 계산된다**
    - **Validates: Requirements 4.4**

  - [x]* 5.3 `tests/dom-diff.test.cjs` 신설: 우선순위 4단계 각각의 예시, 중립 텍스트가 어느 쪽에도 안 들어가는 경계 케이스
    - _Requirements: 4.4_

- [x] 6. `extension/shared/page-context.js` 확장
  - [x] 6.1 `collectTargetContext(target, documentRef, windowRef)` 구현
    - `accessibleName`은 aria-label > aria-labelledby 텍스트 > `<label for>` > placeholder 순으로 계산, `stableLocator`는 data-testid/id/name 우선, 없으면 selector로 fallback
    - `shouldMaskField`/`maskSensitiveValue`(6.3)를 사용해 `value`/`maskedValue`를 채움
    - 항상 tagName, type, role, ariaLabel, accessibleName, label, visibleText, value, maskedValue, selector, xpath, stableLocator, bbox 13개 키를 포함(누락 입력은 문서화된 기본값)
    - _Requirements: 4.1, 4.2_

  - [x] 6.2 `collectContainerContext(target, documentRef)` 구현
    - 우선순위: dialog/[role=dialog] > form > section/article/main > card-like > 'tr' > body
    - _Requirements: 4.3_

  - [x] 6.3 `shouldMaskField(fieldMeta)`, `maskSensitiveValue(rawValue, fieldMeta)` 구현, `DENIED_KEYS`에 마스킹 규칙 추가
    - password/hidden/authorization/cookie/token/session류 필드는 `value`를 비우고 `maskedValue`만 채움
    - 주민번호/전화번호/계좌/OTP 숫자 패턴은 정규식 매칭 시에만 마스킹, 매칭 안 되면 원본 그대로 반환
    - 기존 `collectPageContext`/`sanitizeContext`의 출력 구조는 변경하지 않음
    - _Requirements: 15.1, 15.2, 15.3_

  - [x]* 6.4 Property 10 테스트 작성 (`tests/page-context-properties.test.cjs` 신설)
    - **Property 10: Target_Context는 이벤트 기본 동작이 상태를 변경하기 전 스냅샷을 반영한다**
    - **Validates: Requirements 4.1**

  - [x]* 6.5 Property 11 테스트 작성 (`tests/page-context-properties.test.cjs`)
    - **Property 11: Target_Context는 입력 완전성과 무관하게 항상 고정된 키 전체를 포함한다**
    - **Validates: Requirements 4.2**

  - [x]* 6.6 Property 12 테스트 작성 (`tests/page-context-properties.test.cjs`)
    - **Property 12: Container_Context는 항상 우선순위가 가장 높은 존재하는 조상 타입을 선택한다**
    - **Validates: Requirements 4.3**

  - [x]* 6.7 Property 45 테스트 작성 (`tests/page-context-properties.test.cjs`)
    - **Property 45: 지정된 민감 필드 범주는 항상 마스킹/제외되고, 그 외 필드는 항상 그대로 통과한다**
    - **Validates: Requirements 15.1**

  - [x]* 6.8 Property 46 테스트 작성 (`tests/page-context-properties.test.cjs`)
    - **Property 46: 민감 숫자 패턴은 정의된 정규식과 매칭될 때만 마스킹된다**
    - **Validates: Requirements 15.2**

  - [x]* 6.9 Property 47 테스트 작성 (`tests/page-context-properties.test.cjs`)
    - **Property 47: 정제된 컨텍스트는 원본 HTML 소스를 그대로 포함하지 않는다**
    - **Validates: Requirements 15.3**

  - [x]* 6.10 `tests/page-context.test.cjs` 확장: selector 없는 익명 요소 마스킹 처리, 기존 `collectPageContext` 출력 구조 불변 회귀 확인
    - _Requirements: 4.1, 4.2, 4.3, 15.1, 15.2, 15.3_

- [x] 7. 체크포인트 - 순수 컨텍스트/Diff 모듈 테스트 통과 확인
  - `npm test`로 `tests/interaction-settler*.test.cjs`, `tests/dom-diff*.test.cjs`, `tests/page-context*.test.cjs`가 통과하는지 확인
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. `extension/shared/screenshot-cropper.js` 신설
  - [x] 8.1 `selectCropRegion(regionCandidates, viewport, options)` 순수 좌표 계산 함수 구현
    - 우선순위: result_context_crop 후보 > form_context_crop 후보 > target_context_crop 후보 > container_context_crop 후보 중 존재하는 첫 후보 선택, 없으면 `full_screenshot_resized`(리사이즈만, crop 없음)
    - 선택된 bbox에 padding 140px 적용 → viewport 경계로 clamp → 최소 760x480/최대 1280x900·최장변 1280 이하로 보정
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.6_

  - [x] 8.2 `renderCrop(sourceImageDataUrl, region, {loadImage, createCanvas})` 구현 (브라우저 의존, 의존성 주입 가능)
    - `image/jpeg`, quality `0.82`로 dataURL 반환
    - _Requirements: 9.1_

  - [x] 8.3 `ensureLlmImage(evidence, {domDiff, targetContext, containerContext, viewport})`, `ensureDocImage(evidence, {...})` 구현
    - `selectCropRegion` 결과의 `cropType`을 `evidence.imageMeta.cropType`에 기록(REQ 9.5), 대입은 렌더링이 완전히 끝난 마지막 줄에서만 수행(중간 실패 시 필드에 아무것도 쓰지 않음)
    - Manual_Pin Evidence는 regionCandidates가 target bbox 하나뿐이고 `cropType`이 항상 `manual_pin_crop`으로 강제됨
    - 각 함수는 자신의 목표 필드(`llmImageDataUrl`/`docImageDataUrl`)만 변경하고 나머지 세 이미지 필드는 절대 건드리지 않음
    - _Requirements: 8.5, 8.6, 9.5_

  - [x]* 8.4 Property 14 테스트 작성 (`tests/screenshot-cropper-properties.test.cjs` 신설)
    - **Property 14: 결과/검증 메시지가 있으면 crop은 항상 최우선 후보를 대상으로 한다**
    - **Validates: Requirements 4.5, 9.1**

  - [x]* 8.5 Property 26 테스트 작성 (`tests/screenshot-cropper-properties.test.cjs`)
    - **Property 26: crop 패딩은 클램핑 전에 항상 정확히 140px다**
    - **Validates: Requirements 9.2**

  - [x]* 8.6 Property 27 테스트 작성 (`tests/screenshot-cropper-properties.test.cjs`)
    - **Property 27: crop 영역은 viewport가 허용하는 한 항상 최소 크기 이상이다**
    - **Validates: Requirements 9.3**

  - [x]* 8.7 Property 28 테스트 작성 (`tests/screenshot-cropper-properties.test.cjs`)
    - **Property 28: crop 영역은 항상 최대 크기와 최장변 제한을 지킨다**
    - **Validates: Requirements 9.4**

  - [x]* 8.8 Property 29 테스트 작성 (`tests/screenshot-cropper-properties.test.cjs`)
    - **Property 29: crop 영역은 항상 viewport 경계 안에 있다**
    - **Validates: Requirements 9.6**

  - [x]* 8.9 Property 30 테스트 작성 (`tests/screenshot-cropper-properties.test.cjs`)
    - **Property 30: cropType은 항상 6개의 열거값 중 하나다**
    - **Validates: Requirements 9.5**

  - [x]* 8.10 Property 23 테스트 작성 (`tests/screenshot-cropper-properties.test.cjs`)
    - **Property 23: ensureLlmImage/ensureDocImage는 각각 자신의 목표 필드만 변경한다**
    - **Validates: Requirements 8.5, 8.6**

  - [x]* 8.11 Property 24 테스트 작성 (`tests/screenshot-cropper-properties.test.cjs`)
    - **Property 24: 이미지 생성 실패는 목표 필드를 절대 부분적으로 채우지 않는다**
    - **Validates: Requirements 8.4**

  - [x]* 8.12 `tests/screenshot-cropper.test.cjs` 신설: `renderCrop`에 mock `loadImage`/`createCanvas`(고정 `toDataURL` 반환, `drawImage` 호출만 기록) 주입, `regionCandidates`가 빈 배열일 때 `full_screenshot_resized` 반환 확인
    - _Requirements: 9.1, 9.5_

- [x] 9. `extension/shared/evidence-step-builder.js` 신설
  - [x] 9.1 `buildEvidenceSteps(evidenceList)` 구현
    - `triggerType==='baseline'`은 항상 단독 EvidenceStep(`stepType:'baseline'`)
    - 같은 form selector의 연속된 `'form-input'` Evidence는 하나의 EvidenceStep(`stepType:'form-input'`)으로 병합
    - `'click'/'submit'/'route-change'/'manual-pin'`은 그 자체가 하나의 EvidenceStep(`stepType`은 `triggerType`과 동일)
    - 결과 전용 Evidence(사용자 액션 없이 결과만 캡처)만 단독 `stepType:'result-check'`, 그 외 `resultMessages`/`validationMessages`는 직전 EvidenceStep에 흡수
    - `domain.js`의 `createEvidenceStep`을 사용해 뼈대 생성
    - _Requirements: 11.1, 11.2, 11.4_

  - [x] 9.2 `pickPrimaryEvidenceId(step)` 구현
    - 우선순위: submit/click/manual-pin > route-change > form-input 그룹의 마지막(blur/submit flush) > baseline
    - _Requirements: 11.3_

  - [x] 9.3 `buildLlmSummary(evidenceList)` 구현
    - `context.target.visibleText`/`containerContext` 요약 등 "이미 축약된 필드"만 조합, 원본 body 전체 텍스트(2000자 필드)는 포함하지 않음
    - `apiEvents`/`serverEvents` 요약 실패 시 `status:'summary-failed'` 세팅(예외를 던지지 않음)
    - _Requirements: 11.5, 16.2, 16.3_

  - [x]* 9.4 Property 34 테스트 작성 (`tests/evidence-step-builder-properties.test.cjs` 신설)
    - **Property 34: EvidenceStep 그룹화는 원시 이벤트 수보다 결코 많은 step을 만들지 않으며 같은 폼의 연속 입력을 항상 하나로 합친다**
    - **Validates: Requirements 11.1**

  - [x]* 9.5 Property 35 테스트 작성 (`tests/evidence-step-builder-properties.test.cjs`)
    - **Property 35: 모든 EvidenceStep의 stepType은 7개 열거값 중 하나이고, primaryEvidenceId는 항상 자신의 evidenceIds의 원소다**
    - **Validates: Requirements 11.2, 11.3**

  - [x]* 9.6 Property 36 테스트 작성 (`tests/evidence-step-builder-properties.test.cjs`)
    - **Property 36: EvidenceStep은 항상 stepNo 오름차순이며 이는 기저 Evidence의 sequenceNo 순서와 일치한다**
    - **Validates: Requirements 11.4**

  - [x]* 9.7 `tests/evidence-step-builder.test.cjs` 신설: 결과 전용 Evidence의 단독 result-check step 생성 예시, 직전 step으로 결과 흡수되는 예시, apiEvents/serverEvents 요약 실패 시 `llmSummary`에 `summary-failed` 상태가 기록되는 예시
    - _Requirements: 11.2, 16.2, 16.3_

- [x] 10. 체크포인트 - Crop/Step 빌더 테스트 통과 확인
  - `npm test`로 `tests/screenshot-cropper*.test.cjs`, `tests/evidence-step-builder*.test.cjs`가 통과하는지 확인
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. `extension/shared/llm.js` 확장
  - [x] 11.1 `computeImageSelectionScore(evidence, featureEvidenceList)` 구현
    - 가산: resultMessage 존재, apiEvents 연결, post-submit/click changed-region 존재, clicked target 존재, form-field 존재, route-change 직후 첫 화면 또는 manual-pin
    - 감산: storage/config/debug 화면 키워드매치, raw JSON/API-key 화면 패턴, 중복 화면, visibleText 길이 부족
    - Manual_Pin 전용 고정 양의 보너스 상수 적용
    - _Requirements: 7.3, 10.1_

  - [x] 11.2 `selectTopImages(candidateEvidenceList, maxImages)`, `buildTextOnlyDescriptor(evidence)` 구현
    - 최대 5개, 점수 내림차순, 동점은 `sequenceNo` 오름차순, `{selected, excluded}`로 전체 후보를 정확히 분할(버리지 않음)
    - _Requirements: 10.2, 10.3, 10.4_

  - [x] 11.3 `buildLlmEvidencePacket(featureSpec, evidenceSteps, options)` 구현
    - `mode==='text-only'`: `images` 필드 생략, `mode==='content-parts'`: 이미지를 별도 파츠 배열로(JSON 문자열 내부 base64 금지), `mode==='json-data-url'|'images-array'`: 기존 `buildStageTwo` 스타일과 호환
    - 모든 모드에서 `evidence.imageDataUrl`은 참조하지 않고 `llmImageDataUrl`만 사용, `summary-failed` 상태의 `apiSummary`/`serverSummary`는 키 자체를 생략
    - _Requirements: 8.7, 12.1, 12.2, 12.3, 12.4, 12.5, 16.4, 16.5_

  - [x] 11.4 `summarizeApiEvents(apiEvents)`, `summarizeServerEvents(serverEvents)` 구현
    - 처리 실패(잘못된 타입, 예외를 던지는 getter 등) 시 예외를 던지지 않고 항상 `{status:'summary-failed'}` 반환
    - _Requirements: 16.2, 16.3, 16.5_

  - [x] 11.5 `buildTestCaseDescriptionRequest(featureSpec, evidenceSteps, options)` 구현
    - 항상 `task, outputLanguage, writingStyle, feature, evidenceSteps, constraints, responseSchema` 7개 키 포함
    - `constraints`는 항상 4개 고정 지침(제공된 증적만 사용/추론 금지/판정은 assertions 기반/마스킹 유지) 포함
    - _Requirements: 13.1, 13.2_

  - [x] 11.6 `validateTestCaseDescriptionResponse(response)` 구현
    - 필수 필드(testPurpose, preconditions, testProcedure, expectedResult, actualResult, judgementBasis, finalStatus) 누락 시 예외, `finalStatus`가 `PASS|FAIL|INCOMPLETE|NOT_JUDGED` 밖이면 예외
    - _Requirements: 13.3, 13.4_

  - [x]* 11.7 Property 21 테스트 작성 (`tests/llm-properties.test.cjs` 확장)
    - **Property 21: Manual_Pin 이미지는 항상 양의 고정 보너스만큼 더 높은 점수를 받는다**
    - **Validates: Requirements 7.3**

  - [x]* 11.8 Property 25 테스트 작성 (`tests/llm-properties.test.cjs`)
    - **Property 25: LLM payload의 이미지 데이터는 항상 llmImageDataUrl에서만 오며 imageDataUrl은 결코 참조되지 않는다**
    - **Validates: Requirements 8.7, 12.2**

  - [x]* 11.9 Property 31 테스트 작성 (`tests/llm-properties.test.cjs`)
    - **Property 31: Image_Selection_Score는 가산 요인에 대해 단조 비감소, 감산 요인에 대해 단조 비증가한다**
    - **Validates: Requirements 10.1**

  - [x]* 11.10 Property 32 테스트 작성 (`tests/llm-properties.test.cjs`)
    - **Property 32: 상위 5개 이미지 선택은 점수 내림차순이며 동점은 sequenceNo 오름차순으로 해소된다**
    - **Validates: Requirements 10.2, 10.3**

  - [x]* 11.11 Property 33 테스트 작성 (`tests/llm-properties.test.cjs`)
    - **Property 33: 선택되지 않은 후보는 버려지지 않고 이미지 없는 텍스트 설명으로 정확히 보존된다**
    - **Validates: Requirements 10.4**

  - [x]* 11.12 Property 37 테스트 작성 (`tests/llm-properties.test.cjs`)
    - **Property 37: llmSummary와 최종 LLM payload는 원본 raw 텍스트를 그대로 포함하지 않는다**
    - **Validates: Requirements 11.5, 12.1, 12.3**

  - [x]* 11.13 Property 38 테스트 작성 (`tests/llm-properties.test.cjs`)
    - **Property 38: content-parts 모드는 각 선택된 이미지를 llmImageDataUrl을 참조하는 별도의 구조적 파츠로 인코딩한다**
    - **Validates: Requirements 12.4**

  - [x]* 11.14 Property 39 테스트 작성 (`tests/llm-properties.test.cjs`)
    - **Property 39: text-only 모드는 이미지가 존재하더라도 항상 이미지 데이터를 완전히 생략한다**
    - **Validates: Requirements 12.5**

  - [x]* 11.15 Property 40 테스트 작성 (`tests/llm-properties.test.cjs`)
    - **Property 40: Test_Case_Description_Request는 항상 7개 필수 최상위 키와 4개 고정 제약 지침을 포함한다**
    - **Validates: Requirements 13.1, 13.2**

  - [x]* 11.16 Property 41 테스트 작성 (`tests/llm-properties.test.cjs`)
    - **Property 41: 응답 검증은 7개 필수 필드가 모두 있고 finalStatus가 4개 허용값 중 하나일 때만 통과한다**
    - **Validates: Requirements 13.3, 13.4**

  - [x]* 11.17 Property 48 테스트 작성 (`tests/llm-properties.test.cjs`)
    - **Property 48: apiEvents/serverEvents 요약과 최종 payload는 원본 로그 내용을 그대로 노출하지 않으며, 요약 실패는 항상 안전하게 처리된다**
    - **Validates: Requirements 16.2, 16.3, 16.5**

  - [x]* 11.18 Property 49 테스트 작성 (`tests/llm-properties.test.cjs`)
    - **Property 49: summary-failed로 표시된 항목은 최종 LLM payload에서 항상 제외된다**
    - **Validates: Requirements 16.4**

  - [x]* 11.19 `tests/llm.test.cjs` 확장: 모든 가산/감산 요인이 동시에 존재하는 최악의 경우 조합, `evidenceSteps`가 빈 배열인 packet(빈 feature), `validateTestCaseDescriptionResponse`의 4개 finalStatus 값 각각의 성공 케이스
    - _Requirements: 10.1, 12.1, 13.3, 13.4_

- [x] 12. 체크포인트 - `llm.js` 확장 테스트 통과 확인
  - `npm test`로 `tests/llm-properties.test.cjs`, `tests/llm.test.cjs`가 통과하는지 확인
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. `extension/shared/capture-coordinator.js` 확장
  - [x] 13.1 `capture(request)` 확장: 신규 필드 매핑과 이미지 필드 초기화
    - `request.before/after/domDiff`가 있으면 `evidence.event/page/target/container/domBefore/domAfter`에 매핑
    - `evidence.imageDataUrl`에는 항상 원본 전체 스크린샷만 저장, `thumbnailDataUrl`/`llmImageDataUrl`/`docImageDataUrl`은 null로 초기화, `evidence.stepId`는 캡처 시점에 null
    - _Requirements: 8.2_

  - [x] 13.2 `startRecordingSession({tabId, recordingPolicy, captureBaselineContext})` 구현
    - `ensureRecordingLock(tabId)` 의존성으로 동일 탭 중복 세션 방지, 이미 활성 세션이 있으면 기존 세션을 그대로 반환
    - baseline Evidence를 정확히 1개 생성하고 `session.baselineEvidenceId` 설정, baseline은 항상 그 세션의 다른 모든 Evidence보다 작은 `sequenceNo`를 가짐
    - _Requirements: 1.1, 1.3, 1.7_

  - [x] 13.3 `stopRecordingSession(session)` 구현
    - `session.active=false`, `endedAt` 설정, Evidence는 삭제하지 않음
    - _Requirements: (design.md capture-coordinator.js 변경)_

  - [x]* 13.4 Property 1 테스트 작성 (`tests/capture-coordinator-properties.test.cjs` 신설)
    - **Property 1: Baseline Evidence는 정확히 하나이며 항상 가장 먼저 온다**
    - **Validates: Requirements 1.1, 1.3**

  - [x]* 13.5 Property 3 테스트 작성 (`tests/capture-coordinator-properties.test.cjs`)
    - **Property 3: 동일 탭에서 RecordingSession은 항상 최대 하나만 활성 상태다**
    - **Validates: Requirements 1.7**

  - [x]* 13.6 Property 22 테스트 작성 (`tests/capture-coordinator-properties.test.cjs`)
    - **Property 22: 캡처는 항상 imageDataUrl만 채우고 나머지 세 이미지 필드는 비운다**
    - **Validates: Requirements 8.2**

  - [x]* 13.7 `tests/capture-coordinator.test.cjs` 확장: `stopRecordingSession`이 Evidence를 삭제하지 않는 예시, `startRecordingSession`이 잠금 획득 실패 시 기존 세션을 반환하는 예시
    - _Requirements: 1.7_

- [x] 14. `extension/shared/content-controller.js` 확장
  - [x] 14.1 `captureSettledEvent(triggerType, target, beforeContext)` 구현
    - `dependencies.getRecordingPolicy()`로 `mutationQuietMs`/`maxSettleMs` 조회 → `dependencies.settler.waitForSettle(...)` 대기 → `afterContext` 수집 → `dependencies.diffContexts(beforeContext, afterContext)` → `requestCapture({triggerType, before, after, domDiff})`
    - 실제 스크린샷 촬영(`captureVisible`)은 이 함수가 반환하는 캡처 요청이 처리되는 시점, 즉 settler resolve 이후에만 발생하도록 호출 순서를 보장
    - _Requirements: 4.1, 5.3_

  - [x] 14.2 폼 필드 dirty 추적기와 `captureFormEvidence(formSelector, dirtyFieldEntries)` 구현
    - dirty 추적기는 `{setTimer, clearTimer, now}`를 주입받는 순수 로직으로 구현(REQ 3.1~3.3), `inputDebounceMs===0`이면 타이머 없이 즉시 flush
    - blur/submit 시 대기 중인 디바운스 타이머를 취소하고 동기적으로 즉시 flush(REQ 3.4, 3.5)
    - `dirtyFields` 배열의 각 항목은 selector/label/accessibleName/maskedValue를 포함
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 14.3 `captureBaseline()`과 route-change/Manual_Pin 판별 헬퍼 구현
    - `captureBaseline`은 호출자가 세션 시작 시 1회만 호출되도록 보장된 상태에서 baseline Evidence 캡처 요청 구성
    - route 기록은 `try/catch`로 감싸 실패 시 route 필드 없이 Evidence 생성을 계속 진행(REQ 6.3)
    - 클릭 이벤트의 modifier 조합(`ctrlKey`, `shiftKey`, `altKey`, `metaKey`)만으로 Manual_Pin 경로와 자동 click 경로를 상호 배타적으로 결정하는 순수 판별 함수 구현(REQ 7.1)
    - _Requirements: 1.2, 6.2, 6.3, 7.1_

  - [x]* 14.4 Property 4 테스트 작성 (`tests/content-controller-properties.test.cjs` 확장)
    - **Property 4: 비활성 상태에서는 어떤 자동 이벤트도 Evidence를 만들지 않는다**
    - **Validates: Requirements 2.3**

  - [x]* 14.5 Property 5 테스트 작성 (`tests/content-controller-properties.test.cjs`)
    - **Property 5: 중복 트리거는 억제 윈도 내에서만 억제된다**
    - **Validates: Requirements 2.4**

  - [x]* 14.6 Property 6 테스트 작성 (`tests/content-controller-properties.test.cjs`)
    - **Property 6: Manual_Pin 처리 중에도 다른 이벤트 감지는 억제되지 않는다**
    - **Validates: Requirements 2.5**

  - [x]* 14.7 Property 7 테스트 작성 (`tests/content-controller-properties.test.cjs`)
    - **Property 7: 폼 필드 디바운스 flush는 누적된 dirty 필드 집합과 정확히 일치하는 단일 Evidence를 만든다**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.6**

  - [x]* 14.8 Property 8 테스트 작성 (`tests/content-controller-properties.test.cjs`)
    - **Property 8: blur는 inputDebounceMs와 무관하게 즉시 flush한다**
    - **Validates: Requirements 3.4**

  - [x]* 14.9 Property 9 테스트 작성 (`tests/content-controller-properties.test.cjs`)
    - **Property 9: submit은 대기 중인 dirty 필드를 submit Evidence보다 먼저 flush한다**
    - **Validates: Requirements 3.5**

  - [x]* 14.10 Property 17 테스트 작성 (`tests/content-controller-properties.test.cjs`)
    - **Property 17: 전체 화면 캡처는 항상 InteractionSettler resolve 이후에만 발생한다**
    - **Validates: Requirements 5.3**

  - [x]* 14.11 Property 18 테스트 작성 (`tests/content-controller-properties.test.cjs`)
    - **Property 18: route-change Evidence는 주어진 이전/새 라우트 쌍을 정확히 기록한다**
    - **Validates: Requirements 6.2**

  - [x]* 14.12 Property 19 테스트 작성 (`tests/content-controller-properties.test.cjs`)
    - **Property 19: 라우트 기록 실패는 Evidence 생성이나 이후 캡처를 절대 막지 않는다**
    - **Validates: Requirements 6.3**

  - [x]* 14.13 Property 20 테스트 작성 (`tests/content-controller-properties.test.cjs`)
    - **Property 20: Manual_Pin 경로와 자동 click 경로는 상호 배타적이며 정확히 modifier 조합에 의해 결정된다**
    - **Validates: Requirements 7.1**

  - [x]* 14.14 `tests/content-controller.test.cjs` 확장: Manual_Pin이 세션 비활성 상태에서 시도된 경우 아무 동작도 하지 않는 경계 케이스, `captureBaseline`이 세션 시작 시 정확히 1회 호출되는 예시
    - _Requirements: 1.7, 7.1_

- [x] 15. 체크포인트 - `capture-coordinator.js`/`content-controller.js` 테스트 통과 확인
  - `npm test`로 `tests/capture-coordinator*.test.cjs`, `tests/content-controller*.test.cjs`가 통과하는지 확인
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. `extension/content.js` 확장
  - [x] 16.1 `input`/`change`/`blur` 리스너 등록과 EventCollector 상태 확장
    - 모듈 스코프 변수(`recordingActive`, `manualPinInProgress`) 추가, `input`/`change` 발생 시 `content-controller.js`의 dirty 추적기에 위임
    - 기존 click 핸들러의 Ctrl+Shift+click 분기는 유지하되, `manualPinInProgress` 동안에도 click/input/change/blur/submit 리스너는 계속 활성 상태로 둠(억제는 오직 `event-policy.js`의 윈도 기반 억제에만 위임, REQ 2.5)
    - _Requirements: 2.1, 2.2, 2.5, 3.1, 3.4_

  - [x] 16.2 `hashchange`/`popstate`/폴링 route-change 감지에 이전 라우트 기록 연동
    - `captureRouteChange`가 `content-controller.js`의 route 판별 헬퍼로 이전/새 라우트를 전달, 기록 실패 시에도 캡처 자체는 계속 진행
    - _Requirements: 6.1, 6.3_

  - [x] 16.3 recording 비활성 시 자동 이벤트 무시, `captureSettledEvent`/`captureFormEvidence`/`captureBaseline` 배선
    - `recordingActive`가 false인 동안 click/input/change/blur/submit/route-change로부터 어떤 캡처 요청도 발생하지 않도록 최상단에서 게이트
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

  - [x]* 16.4 `tests/content-controller.test.cjs` 또는 신규 정적 소스 테스트: `content.js`에 `addEventListener('input'/'change'/'blur', ...)`가 등록되어 있는지, `hashchange`/`popstate`/폴링 세 가지 신호가 각각 route-change 캡처를 호출하는지 정적 패턴 및 예시 기반 확인
    - _Requirements: 2.1, 6.1_

- [x] 17. 체크포인트 - `content.js` 이벤트 배선 테스트 통과 확인
  - `npm test`로 관련 콘텐츠 스크립트 테스트가 통과하는지 확인
  - Ensure all tests pass, ask the user if questions arise.

- [x] 18. `extension/editor.js` 확장
  - [x] 18.1 `toggleRecordingSession()`을 RecordingSession 전용 흐름으로 교체
    - 클릭 즉시 버튼을 `STARTING` 상태로 전환하고 disable, `STARTING`이거나 이미 활성이면 핸들러 최상단에서 클릭을 무시
    - 시작 요청 실패 시 버튼을 원래(비활성) 상태로 복구, 성공 시 활성 상태 유지
    - _Requirements: 1.4, 1.5, 1.6_

  - [x] 18.2 `ensureLlmImage(evidence)`, `ensureDocImage(evidence)` 위임 wrapper 구현
    - `screenshot-cropper.js`의 `ensureLlmImage`/`ensureDocImage`에 위임, 실패 시 그대로 throw(기존 `ensureThumbnail`과 동일 계약)
    - _Requirements: 8.5, 8.6_

  - [x] 18.3 `requestTestCaseDescription(feature)` 구현
    - `evidence-step-builder.js` + `llm.js`의 `buildLlmEvidencePacket`/`buildTestCaseDescriptionRequest`를 호출해 요청을 구성하고 로컬 LLM에 전달, `validateTestCaseDescriptionResponse`로 응답 검증
    - 검증 통과 시에만 `feature.description`/`result` 필드에 반영, 실패(네트워크 오류 또는 검증 예외) 시 `catch` 블록에서 사용자 메시지 표시만 수행하고 어떤 필드도 대입하지 않음
    - _Requirements: 13.5_

  - [x] 18.4 Report_Editor UI 배선: RecordingSession 시작/종료를 Primary_Action으로, Ctrl+Shift+클릭 안내를 보조 힌트로 노출
    - DOM/CSS 변경만 수행(로직 없음), 기존 캡처 버튼 마크업을 재사용
    - _Requirements: 7.4_

  - [x]* 18.5 Property 2 테스트 작성 (`tests/editor-interactions-properties.test.cjs` 신설)
    - **Property 2: STARTING 상태는 시작 요청 완료 전에 잠기고, 오직 하나의 시작 요청만 발생한다**
    - **Validates: Requirements 1.4, 1.5, 1.6**

  - [x]* 18.6 Property 42 테스트 작성 (`tests/editor-interactions-properties.test.cjs`)
    - **Property 42: 검증에 실패한 응답은 Report/Feature의 어떤 필드도 변경하지 않는다**
    - **Validates: Requirements 13.5**

  - [x]* 18.7 `tests/editor-shell.test.cjs`/`tests/editor-interactions.test.cjs` 확장: RecordingSession 시작/종료 버튼이 Primary_Action 위치에 있는지, Ctrl+Shift+클릭 안내 힌트 텍스트가 보조 위치에 있는지(7.4 smoke), `validateTestCaseDescriptionResponse`가 허용하는 4개 `finalStatus` 값 각각에 대해 `requestTestCaseDescription`이 성공적으로 필드를 반영하는 예시
    - _Requirements: 7.4, 13.3, 13.4_

- [x] 19. 최종 체크포인트 - 전체 테스트 통과 및 회귀 확인
  - `npm test` (`node --test tests/*.test.cjs`) 실행으로 다음을 확인:
    - `report*.test.cjs`, `zip.test.cjs`, `viewer.test.cjs`, `background-events.test.cjs`, `manifest.test.cjs`, `wizard-stage*.test.cjs` 등 이 기능이 건드리지 않는 파일들이 수정 없이 그대로 통과
    - 확장된 `tests/domain*.test.cjs`, `tests/storage*.test.cjs`, `tests/page-context*.test.cjs`, `tests/llm*.test.cjs`, `tests/capture-coordinator*.test.cjs`, `tests/content-controller*.test.cjs`, `tests/editor-shell.test.cjs`, `tests/editor-interactions*.test.cjs`가 모두 통과
    - 신규 `tests/interaction-settler*.test.cjs`, `tests/dom-diff*.test.cjs`, `tests/screenshot-cropper*.test.cjs`, `tests/evidence-step-builder*.test.cjs`가 모두 통과
    - 49개 Correctness Property(Property 1~49)가 각각 정확히 하나의 property-based 테스트로 커버되어 있는지 확인
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- `*`로 표시된 하위 작업은 선택 사항이며 빠른 MVP를 위해 건너뛸 수 있다.
- 각 작업은 requirements.md의 세부 조항(예: `9.3`)을 참조한다.
- 체크포인트는 증분 검증을 보장한다.
- Property 테스트는 design.md의 Correctness Property를 검증하며, Property 1~49는 각각 정확히 하나의 property-based 테스트로 구현된다(fast-check `4.8.0` 고정, `numRuns: 100`, 이미 `package.json`에 devDependency로 존재).
- 단위/예시 기반 테스트는 특정 fixture, 경계·에러 조건, 정적 소스 패턴(리스너 등록, DB 버전, IndexedDB 가드 등)을 검증한다.
- 폼 입력 디바운스 누적 로직은 `content.js`가 아닌 `content-controller.js`에 의존성 주입 가능한 형태로 구현한다(테스트 가능성 원칙 유지, Overview 참고).
- `report.js`, `zip.js`, `viewer.js`, `background-events.js`, `wizard-stage.js`, `manifest.json`, `background.js`의 기존 메시지 계약은 어떤 작업에서도 수정하지 않는다.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.1"] },
    { "id": 2, "tasks": ["2.2", "4.1"] },
    { "id": 3, "tasks": ["2.3", "4.2", "4.3", "5.1"] },
    { "id": 4, "tasks": ["2.4", "2.5", "4.4", "5.2", "5.3", "6.1"] },
    { "id": 5, "tasks": ["6.2"] },
    { "id": 6, "tasks": ["6.3"] },
    { "id": 7, "tasks": ["6.4", "6.5", "6.6", "6.7", "6.8", "6.9", "6.10"] },
    { "id": 8, "tasks": ["3", "7"] },
    { "id": 9, "tasks": ["8.1", "9.1"] },
    { "id": 10, "tasks": ["8.2", "9.2"] },
    { "id": 11, "tasks": ["8.3", "9.3"] },
    { "id": 12, "tasks": ["8.4", "8.5", "8.6", "8.7", "8.8", "8.9", "8.10", "8.11", "8.12", "9.4", "9.5", "9.6", "9.7"] },
    { "id": 13, "tasks": ["10"] },
    { "id": 14, "tasks": ["11.1"] },
    { "id": 15, "tasks": ["11.2"] },
    { "id": 16, "tasks": ["11.3"] },
    { "id": 17, "tasks": ["11.4"] },
    { "id": 18, "tasks": ["11.5"] },
    { "id": 19, "tasks": ["11.6"] },
    { "id": 20, "tasks": ["11.7", "11.8", "11.9", "11.10", "11.11", "11.12", "11.13", "11.14", "11.15", "11.16", "11.17", "11.18", "11.19"] },
    { "id": 21, "tasks": ["12"] },
    { "id": 22, "tasks": ["13.1"] },
    { "id": 23, "tasks": ["13.2"] },
    { "id": 24, "tasks": ["13.3"] },
    { "id": 25, "tasks": ["13.4", "13.5", "13.6", "13.7", "14.1"] },
    { "id": 26, "tasks": ["14.2"] },
    { "id": 27, "tasks": ["14.3"] },
    { "id": 28, "tasks": ["14.4", "14.5", "14.6", "14.7", "14.8", "14.9", "14.10", "14.11", "14.12", "14.13", "14.14"] },
    { "id": 29, "tasks": ["15"] },
    { "id": 30, "tasks": ["16.1"] },
    { "id": 31, "tasks": ["16.2"] },
    { "id": 32, "tasks": ["16.3"] },
    { "id": 33, "tasks": ["16.4"] },
    { "id": 34, "tasks": ["17"] },
    { "id": 35, "tasks": ["18.1"] },
    { "id": 36, "tasks": ["18.2"] },
    { "id": 37, "tasks": ["18.3"] },
    { "id": 38, "tasks": ["18.4"] },
    { "id": 39, "tasks": ["18.5", "18.6", "18.7"] },
    { "id": 40, "tasks": ["19"] }
  ]
}
```
