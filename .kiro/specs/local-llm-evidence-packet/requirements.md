# Requirements Document

## Introduction

CaptureIT은 브라우저 화면을 캡처하고 DOM 맥락을 테스트 증적과 연결해 QA 보고서를 생성하는 확장 프로그램이다. 현재 파이프라인은 `content.js`가 click/submit/route-change를 감지하고, `page-context.js`가 대상 요소의 기본 태그·role·visibleText 정도를 수집하고, `capture-coordinator.js`가 `chrome.tabs.captureVisibleTab()`으로 전체 뷰포트 스크린샷을 그대로 저장하고, `editor.js`가 이 원본 이미지로부터 UI 미리보기용 thumbnail을 만들고, `llm.js`가 이 thumbnail을 증적 추천과 보고서 초안 요청에 재사용하는 구조다.

이 구조를 로컬 LLM(Gemma 계열 30B급 등)에 테스트케이스와 증적, DOM, 스크린샷을 전달해 테스트케이스 설명을 자동 작성하게 만드는 용도로 쓰기에는 다음 문제가 있다.

- 전체 뷰포트 스크린샷이 그대로 저장되어 LLM 입력에 불필요한 시각 정보가 많고, UI 미리보기용 이미지와 LLM 입력용 이미지가 분리되어 있지 않다.
- Ctrl+Shift+클릭 기반 수동 캡처가 기본 캡처 방식에 가까워, 사용자가 녹화만 시작해도 자동으로 증적이 쌓이는 흐름이 약하다.
- click/submit/route-change 트리거는 있으나 input/change/blur 기반 폼 증적 수집이 없어, 사용자가 폼을 채우는 과정이 증적에 반영되지 않는다.
- 이벤트 발생 전 대상 요소 정보와 이벤트 발생 후 결과 영역 정보가 분리되어 있지 않고, DOM 맥락에 bbox·selector·accessible name·label·필드 값·가장 가까운 컨테이너 정보가 부족하다.
- LLM에 전달되는 payload가 raw context 중심이고, step(사용자에게 의미 있는 테스트 단계) 단위로 증적을 묶는 구조가 없다.
- base64 이미지가 JSON 문자열 필드 안에 들어가는 구조라, adapter에 따라 실제 멀티모달 입력으로 처리되는지 불명확하다.
- 로컬 LLM에 너무 많은 이미지·DOM·raw text를 전달할 가능성이 높다.

이 기능은 위 문제를 해결하기 위해 녹화 시작 → baseline 화면 수집 → 사용자 이벤트 자동 감지 → 이벤트 전 대상 요소 맥락 수집 → 이벤트 후 DOM/화면 안정화 대기 → 변경 영역·대상 영역 crop 생성 → step 단위 evidence packet 생성 → LLM용 최소 이미지·요약 맥락 구성 → 로컬 LLM의 테스트케이스 설명·증적 설명 생성이라는 흐름으로 기존 캡처 파이프라인을 확장한다.

이 기능은 `extension/content.js`, `extension/shared/page-context.js`, `extension/shared/content-controller.js`, `extension/shared/capture-coordinator.js`, `extension/shared/storage.js`, `extension/shared/domain.js`, `extension/shared/llm.js`, `extension/editor.js`를 확장하고, `extension/shared/interaction-settler.js`, `extension/shared/dom-diff.js`, `extension/shared/screenshot-cropper.js`, `extension/shared/evidence-step-builder.js`를 신규로 추가한다. 기존 QA 보고서 작성 흐름(기능 명세·검증 항목·PASS/FAIL 판정·HTML/Markdown/ZIP 생성)과 `manifest.json` 기반 산출물 생성 로직, 그리고 IndexedDB에 이미 저장된 기존 Evidence·Report·Session 레코드는 이 기능으로 인해 손상되거나 제거되지 않는다.

이 기능은 API/XHR 훅 기반 요청·응답 수집과 서버 로그 연동의 실제 수집 메커니즘 구현을 범위에 포함하지 않는다. 이 기능은 Evidence와 EvidenceStep 데이터 모델에 apiEvents·serverEvents를 위한 확장 지점을 남기고, 이미 채워진 apiEvents·serverEvents가 있을 경우 그것을 요약해 LLM payload에 마스킹된 형태로만 포함하는 것까지를 범위로 한다.

## Glossary

- **RecordingSession**: 기존 Capture_Session이 확장된, 녹화 시작부터 종료까지 사용자 이벤트를 자동으로 감지하고 Evidence를 생성하는 세션 단위. `recordingPolicy`, `lastEvidenceId`, `baselineEvidenceId` 필드를 가진다
- **Recording_Policy**: RecordingSession에 적용되는 수집 정책 값 묶음(`captureBaselineOnStart`, `captureFullViewportPerStep`, `createLlmCrop`, `inputDebounceMs`, `mutationQuietMs`, `maxSettleMs`, `maxLlmImagesPerFeature`)
- **EventCollector**: RecordingSession이 활성화된 동안 click, input, change, blur, submit, route-change, manual-pin 이벤트를 감지하는 `content.js` 내 컴포넌트
- **ElementContextExtractor**: 이벤트 발생 전후 대상 요소와 주변 컨테이너의 맥락을 수집하는 `page-context.js` 확장 컴포넌트
- **Target_Context**: 이벤트 대상 요소에 대해 수집되는 tagName, type, role, ariaLabel, accessibleName, label, visibleText, value, maskedValue, selector, xpath, stableLocator, bbox로 구성된 맥락 구조
- **Container_Context**: 대상 요소를 감싸는 가장 가까운 의미 있는 컨테이너(dialog/modal, form, section/article/main, card-like, table row, body 우선순위)에 대해 수집되는 type, selector, heading, visibleText, bbox로 구성된 맥락 구조
- **InteractionSettler**: 이벤트 발생 직후 DOM 변경이 잦아들 때까지 대기한 뒤에야 이벤트 후 맥락 수집과 스크린샷 캡처가 진행되도록 만드는 신규 컴포넌트(`interaction-settler.js`)
- **DomDiffExtractor**: 이벤트 전/후 맥락을 비교해 changedText, resultMessages, validationMessages, candidateResultElements를 추출하는 신규 컴포넌트(`dom-diff.js`)
- **Dom_Diff**: DomDiffExtractor가 산출하는 비교 결과 구조
- **Result_Message**: DomDiffExtractor가 이벤트 후 화면에서 식별하는 완료·성공 메시지, toast, modal, alert류 텍스트
- **Validation_Message**: DomDiffExtractor가 이벤트 후 화면에서 식별하는 입력 검증 오류 메시지 텍스트
- **Manual_Pin**: Ctrl+Shift+클릭으로 사용자가 직접 지정하는 보조 캡처 동작이 생성하는 Evidence의 트리거 유형
- **Baseline_Evidence**: RecordingSession 시작 시점에 자동으로 생성되는, triggerType이 `baseline`인 최초 Evidence
- **ScreenshotCropper**: 원본 전체 뷰포트 스크린샷에서 LLM 입력용·문서 삽입용 crop 이미지를 생성하는 신규 컴포넌트(`screenshot-cropper.js`)
- **Crop_Type**: ScreenshotCropper가 생성하는 crop의 종류를 나타내는 값(`target_context_crop`, `form_context_crop`, `result_context_crop`, `container_context_crop`, `full_screenshot_resized`, `manual_pin_crop`)
- **Original_Image**: Evidence의 `imageDataUrl` 필드에 저장되는, 후처리되지 않은 원본 전체 뷰포트 스크린샷
- **Thumbnail_Image**: Evidence의 `thumbnailDataUrl` 필드에 저장되는, Report_Editor UI 미리보기 전용 이미지
- **Llm_Image**: Evidence의 `llmImageDataUrl` 필드에 저장되는, ScreenshotCropper가 생성한 로컬 LLM 입력 전용 crop/resize 이미지
- **Doc_Image**: Evidence의 `docImageDataUrl` 필드에 저장되는, 최종 HTML/Markdown 보고서 삽입 전용 이미지
- **EvidenceStep**: 하나 이상의 Evidence를 사용자에게 의미 있는 하나의 테스트 단계로 묶은 신규 데이터 단위(`stepId`, `stepNo`, `stepType`, `title`, `userAction`, `evidenceIds`, `primaryEvidenceId`, `llmSummary` 등을 가진다)
- **EvidenceStepBuilder**: 원시 Evidence 목록으로부터 EvidenceStep 목록을 생성하는 신규 컴포넌트(`evidence-step-builder.js`)
- **Step_Type**: EvidenceStep에 부여되는 종류 값(`baseline`, `form-input`, `click`, `submit`, `route-change`, `manual-pin`, `result-check`)
- **Image_Selection_Score**: LlmEvidencePacketBuilder가 각 Evidence의 이미지를 LLM 입력에 포함할지 우선순위를 매기기 위해 계산하는 가중치 점수
- **LlmEvidencePacketBuilder**: Feature_Spec과 EvidenceStep 목록으로부터 로컬 LLM 입력에 최적화된 payload를 구성하는 `llm.js` 확장 컴포넌트
- **Vision_Payload_Mode**: LlmEvidencePacketBuilder가 이미지를 LLM 요청에 포함하는 방식을 나타내는 설정 값(`text-only`, `json-data-url`, `content-parts`, `images-array`)
- **ReportDraftGenerator**: EvidenceStep 기반으로 테스트케이스 설명(목적, 절차, 증적 설명, 판정 근거)을 생성하도록 로컬 LLM에 요청을 구성하고 응답을 검증하는 `llm.js` 확장 컴포넌트
- **Test_Case_Description_Request**: ReportDraftGenerator가 로컬 LLM에 보내는, task/outputLanguage/writingStyle/feature/evidenceSteps/constraints/responseSchema로 구성된 요청 구조
- **Evidence_Store**: Evidence, EvidenceStep, Report, Session 레코드를 저장하는 IndexedDB 기반 저장소(`storage.js`)
- **Feature_Spec**: 검증 대상이 되는 하나의 기능 요구사항 항목을 나타내는 기존 내부 데이터 모델(변경 없음)
- **CaptureCoordinator**: 캡처 요청을 받아 원본 스크린샷을 촬영하고 Evidence를 생성해 저장하는 기존 컴포넌트(`capture-coordinator.js`, 이 기능에서 필드 확장)
- **Report_Editor**: 사용자가 QA 보고서를 작성·수정하는 CaptureIT 확장 프로그램 화면(기존 유지, 이 기능에서 오케스트레이션 함수 확장)

## Requirements

### Requirement 1: RecordingSession 시작과 Baseline Evidence 자동 생성

**User Story:** As an 작성자, I want 녹화를 시작하면 현재 화면이 자동으로 baseline 증적으로 저장되기를 원한다, so that 첫 클릭 이전 상태부터 테스트 흐름이 기록된다.

#### Acceptance Criteria

1. WHEN a user starts a RecordingSession, THE EventCollector SHALL capture exactly one Baseline_Evidence for that RecordingSession before any other Evidence is captured within it.
2. THE Baseline_Evidence SHALL include the full viewport screenshot, page title, route, main heading text, a bounded visible-text summary, and the list of interactive elements present at RecordingSession start.
3. WHEN a RecordingSession starts, THE CaptureCoordinator SHALL record the Baseline_Evidence's id as that RecordingSession's baselineEvidenceId.
4. WHEN a user activates the start-recording control, THE Report_Editor SHALL immediately set that control to a STARTING state before the RecordingSession start request completes.
5. WHILE the start-recording control is in the STARTING or already-active state, THE Report_Editor SHALL ignore any additional activation of that control, so that only the first start request is processed and rapid repeated clicks produce no additional RecordingSession start requests.
6. IF the RecordingSession start request fails, THEN THE Report_Editor SHALL revert the start-recording control from the STARTING state back to its inactive state, so that the user can retry starting a RecordingSession.
7. IF a user attempts to start a RecordingSession while another RecordingSession is already active for the same tab, THEN THE EventCollector SHALL NOT start a second concurrent RecordingSession for that tab.

### Requirement 2: 녹화 기반 자동 이벤트 수집을 기본 캡처 방식으로 전환

**User Story:** As an 작성자, I want 녹화를 시작한 뒤 별도 단축키 없이 평소처럼 클릭하고 입력하기만 하면 증적이 자동으로 쌓이기를 원한다, so that 매 동작마다 수동으로 캡처를 트리거하지 않아도 된다.

#### Acceptance Criteria

1. WHILE a RecordingSession is active, THE EventCollector SHALL detect click, input, change, blur, submit, and route-change events without requiring the user to invoke any capture-specific keyboard shortcut.
2. WHEN a user clicks an element while a RecordingSession is active and the click is not a manual pin, THE EventCollector SHALL queue that click as a candidate for automatic Evidence creation.
3. WHILE no RecordingSession is active, THE EventCollector SHALL NOT create Evidence from click, input, change, blur, submit, or route-change events.
4. IF a click, submit, or route-change trigger for the same route occurs again within the configured suppression window, THEN THE EventCollector SHALL suppress the duplicate automatic Evidence.
5. WHILE a RecordingSession is active, THE EventCollector SHALL continue detecting click, input, change, blur, submit, and route-change events regardless of whether a Ctrl+Shift+click Manual_Pin is invoked concurrently, so that shortcut invocation never suppresses normal event detection.

### Requirement 3: input/change/blur 기반 폼 단위 Evidence 그룹화

**User Story:** As an 작성자, I want 폼에 값을 입력하는 과정이 매 키 입력마다 증적으로 남지 않고 의미 있는 단위로 묶이기를 원한다, so that 증적 인박스가 불필요한 입력 이벤트로 채워지지 않는다.

#### Acceptance Criteria

1. WHEN an input or change event occurs on a form field while a RecordingSession is active, THE EventCollector SHALL mark that field as dirty without immediately creating Evidence for that event.
2. WHEN a dirty form field receives no further input or change event for the RecordingSession's configured inputDebounceMs, THE EventCollector SHALL create a form-level Evidence summarizing the dirty fields collected since the previous form-level Evidence.
3. IF the RecordingSession's configured inputDebounceMs is 0, THEN THE EventCollector SHALL create the form-level Evidence immediately upon the first input or change event on a dirty form field, without waiting for any delay.
4. WHEN a blur event occurs on a dirty form field, THE EventCollector SHALL create a form-level Evidence for that field's form without waiting for inputDebounceMs to elapse.
5. WHEN a submit event occurs while one or more form fields are dirty, THE EventCollector SHALL flush the pending dirty fields into a form-level Evidence before creating the submit-triggered Evidence.
6. THE form-level Evidence SHALL record each included dirty field's selector, label, accessible name, and masked value.

### Requirement 4: 이벤트 전/후 맥락 수집 (대상 요소, 컨테이너, DOM 변화)

**User Story:** As an 작성자, I want 클릭한 요소가 사라지기 전 정보와 클릭 후 결과 화면 정보가 모두 증적에 남기를 원한다, so that 나중에 무엇을 클릭해서 무엇이 바뀌었는지 재구성할 수 있다.

#### Acceptance Criteria

1. WHEN a click, submit, input, change, or blur event occurs, THE ElementContextExtractor SHALL collect that event's Target_Context before the event's default action changes the page.
2. THE Target_Context SHALL include the target element's tagName, type, role, ariaLabel, accessibleName, label, visibleText, value, maskedValue, selector, xpath, stableLocator, and bbox.
3. THE ElementContextExtractor SHALL collect a Container_Context for the target element by selecting the nearest ancestor in priority order: dialog/modal, form, section/article/main, card-like container, table row, then body.
4. WHEN an event's after-capture context is collected, THE DomDiffExtractor SHALL produce a Dom_Diff containing changedText, resultMessages, validationMessages, and candidateResultElements derived from comparing the before and after contexts.
5. IF the after-capture context contains one or more Result_Message or Validation_Message entries, THEN THE ScreenshotCropper SHALL generate a result crop image targeting the highest-priority Result_Message or Validation_Message element.

### Requirement 5: 이벤트 후 안정화 대기

**User Story:** As an 작성자, I want 클릭 직후 로딩 중인 화면이 아니라 안정된 결과 화면이 증적으로 남기를 원한다, so that 증적이 실제 결과를 보여준다.

#### Acceptance Criteria

1. WHEN a triggering event's default action has run, THE InteractionSettler SHALL wait until no DOM mutation has occurred for the RecordingSession's configured mutationQuietMs before the after-capture context is collected.
2. IF no mutation-quiet period of mutationQuietMs occurs before the RecordingSession's configured maxSettleMs elapses, THEN THE InteractionSettler SHALL proceed to collect the after-capture context once maxSettleMs has elapsed.
3. THE CaptureCoordinator SHALL NOT capture the full viewport screenshot for an event-triggered Evidence until the InteractionSettler for that event has resolved.

### Requirement 6: SPA route-change 캡처

**User Story:** As an 작성자, I want 새로고침 없이 화면이 바뀌는 SPA 환경에서도 화면 전환이 증적으로 남기를 원한다, so that 라우팅 기반 애플리케이션의 흐름도 빠짐없이 기록된다.

#### Acceptance Criteria

1. WHEN the page URL changes via a hashchange event, a popstate event, or a change detected by polling the current location, THE EventCollector SHALL treat that change as a route-change trigger and collect the after-capture context of the new route.
2. WHEN a route-change trigger is detected, THE EventCollector SHALL record the previous route and the new route on the resulting Evidence.
3. IF recording the previous route or the new route on a route-change Evidence fails, THEN THE EventCollector SHALL continue creating that Evidence without the route data, rather than discarding the Evidence or halting event collection.

### Requirement 7: Ctrl+Shift+클릭 수동 Pin을 보조 기능으로 유지

**User Story:** As an 작성자, I want 자동 수집이 놓친 중요한 영역만 Ctrl+Shift+클릭으로 보완하고 싶다, so that 기본 흐름은 녹화만으로 충분하고 수동 캡처는 예외적으로만 사용한다.

#### Acceptance Criteria

1. WHEN a user performs a Ctrl+Shift+click on an element while a RecordingSession is active, THE EventCollector SHALL create a Manual_Pin Evidence for that element instead of an automatic click-triggered Evidence.
2. THE EventCollector SHALL replay the original click's default action after creating a Manual_Pin Evidence, so that the underlying page action still executes.
3. THE LlmEvidencePacketBuilder SHALL apply an Image_Selection_Score bonus to Manual_Pin Evidence when ranking images for inclusion in an LLM evidence packet.
4. THE Report_Editor SHALL present RecordingSession start/stop as the primary capture action and SHALL present Ctrl+Shift+클릭 manual pin as a supplementary action, not as the primary capture workflow.

### Requirement 8: 원본·미리보기·LLM·문서 이미지 필드 분리

**User Story:** As a 시스템 유지보수자, I want 원본 증적 이미지와 LLM 입력용 이미지, UI 미리보기용 이미지, 문서 삽입용 이미지가 서로 다른 필드에 저장되기를 원한다, so that 한 용도의 이미지 처리가 다른 용도의 이미지를 훼손하지 않는다.

#### Acceptance Criteria

1. THE Evidence data model SHALL provide four distinct image fields: imageDataUrl, thumbnailDataUrl, llmImageDataUrl, and docImageDataUrl.
2. WHEN the CaptureCoordinator captures an Evidence, THE CaptureCoordinator SHALL populate imageDataUrl with the original full-viewport screenshot and SHALL leave thumbnailDataUrl, llmImageDataUrl, and docImageDataUrl unset.
3. WHEN ensureThumbnail is called for an Evidence, THE Report_Editor SHALL populate that Evidence's thumbnailDataUrl without modifying that Evidence's imageDataUrl, llmImageDataUrl, or docImageDataUrl.
4. IF thumbnail generation fails for an Evidence, THEN THE Report_Editor SHALL throw an error and SHALL leave that Evidence's thumbnailDataUrl unset, rather than storing a partial or corrupted thumbnail.
5. WHEN ensureLlmImage is called for an Evidence, THE ScreenshotCropper SHALL populate that Evidence's llmImageDataUrl without modifying that Evidence's imageDataUrl, thumbnailDataUrl, or docImageDataUrl.
6. WHEN ensureDocImage is called for an Evidence, THE Report_Editor SHALL populate that Evidence's docImageDataUrl without modifying that Evidence's imageDataUrl, thumbnailDataUrl, or llmImageDataUrl.
7. THE LlmEvidencePacketBuilder SHALL reference only an Evidence's llmImageDataUrl when including that Evidence's image in an LLM request payload.

### Requirement 9: Screenshot Crop 생성 우선순위와 크기 정책

**User Story:** As an 작성자, I want LLM에 들어가는 이미지가 전체 화면이 아니라 핵심 영역만 잘라낸 적당한 크기의 이미지이기를 원한다, so that 로컬 LLM이 불필요한 시각 정보 없이 핵심을 파악할 수 있다.

#### Acceptance Criteria

1. WHEN generating an llmImageDataUrl or docImageDataUrl for an Evidence, THE ScreenshotCropper SHALL select the crop region using this priority order: result message region, then form/container region, then target element region, then the full screenshot resized.
2. THE ScreenshotCropper SHALL apply a default crop padding of 140 pixels around the selected region.
3. THE ScreenshotCropper SHALL produce a crop image with a width of at least 760 pixels and a height of at least 480 pixels whenever the source viewport is at least that size.
4. THE ScreenshotCropper SHALL produce a crop image whose width does not exceed 1280 pixels, whose height does not exceed 900 pixels, and whose longest side does not exceed 1280 pixels.
5. THE ScreenshotCropper SHALL record the selected Crop_Type on the Evidence's imageMeta as one of target_context_crop, form_context_crop, result_context_crop, container_context_crop, full_screenshot_resized, or manual_pin_crop.
6. THE ScreenshotCropper SHALL produce a crop region that stays within the bounds of the source viewport screenshot.

### Requirement 10: LLM용 이미지 선별 점수와 개수 제한

**User Story:** As an 작성자, I want 기능 하나당 LLM에 전달되는 이미지가 너무 많지 않고 가장 중요한 몇 장만 선택되기를 원한다, so that 로컬 LLM 요청 크기와 처리 시간이 합리적인 수준으로 유지된다.

#### Acceptance Criteria

1. THE LlmEvidencePacketBuilder SHALL compute an Image_Selection_Score for each candidate Evidence image, adding points for result-message presence, API-response linkage, post-submit/click changed-region presence, clicked-target presence, form-field presence, and first-screen-after-route-change status or manual-pin status, and subtracting points for storage/config/debug screen content, raw-JSON/API-key screen content, duplicate-screen content, or insufficient visible text.
2. WHEN building an LLM evidence packet for a Feature_Spec, THE LlmEvidencePacketBuilder SHALL include at most 5 images selected in descending order of Image_Selection_Score.
3. IF two or more candidate images have an equal Image_Selection_Score, THEN THE LlmEvidencePacketBuilder SHALL break the tie using ascending sequenceNo order.
4. WHEN more than 5 candidate images exist for a Feature_Spec, THE LlmEvidencePacketBuilder SHALL NOT discard the Evidence beyond the top 5; it SHALL instead represent each excluded Evidence as a text-only evidence descriptor (containing that Evidence's userAction, target/container summary, and result summary without image data) included in the LLM request payload.

### Requirement 11: Step 단위 Evidence 그룹화

**User Story:** As an 작성자, I want 브라우저 이벤트 하나하나가 아니라 "화면 진입", "입력 완료", "버튼 클릭", "결과 확인"처럼 의미 있는 테스트 단계 단위로 증적이 정리되기를 원한다, so that 테스트케이스 설명을 작성할 때 단계별로 대응시킬 수 있다.

#### Acceptance Criteria

1. WHEN building EvidenceSteps for a RecordingSession, THE EvidenceStepBuilder SHALL group one or more underlying Evidence entries into a single EvidenceStep per user-meaningful action, rather than producing one EvidenceStep per raw browser event.
2. THE EvidenceStepBuilder SHALL assign each EvidenceStep a Step_Type of baseline, form-input, click, submit, route-change, manual-pin, or result-check.
3. THE EvidenceStepBuilder SHALL assign each EvidenceStep exactly one primaryEvidenceId selected from that EvidenceStep's evidenceIds.
4. THE EvidenceStepBuilder SHALL order EvidenceSteps by ascending stepNo, corresponding to the ascending sequenceNo order of each EvidenceStep's underlying Evidence.
5. THE EvidenceStepBuilder SHALL derive each EvidenceStep's llmSummary from that step's Evidence context fields (visibleText, targetText, resultMessages, apiSummary, serverSummary) without including the full raw DOM text of any underlying Evidence.

### Requirement 12: LLM Payload 최소화

**User Story:** As an 작성자, I want 로컬 LLM에 전체 스크린샷 여러 장이나 페이지 전체 DOM이 아니라 요약된 맥락과 소수의 crop 이미지만 전달되기를 원한다, so that 로컬 LLM이 처리 가능한 범위 안에서 정확한 테스트케이스 설명을 생성할 수 있다.

#### Acceptance Criteria

1. WHEN the LlmEvidencePacketBuilder builds a request for a local LLM, THE LlmEvidencePacketBuilder SHALL include only feature information, per-EvidenceStep user action summaries, target/container/result DOM summaries, API/server event summaries, at most 5 selected images, and assertion results.
2. THE LlmEvidencePacketBuilder SHALL NOT include any Evidence's imageDataUrl in an LLM request payload.
3. THE LlmEvidencePacketBuilder SHALL NOT include the full raw DOM text of any page in an LLM request payload.
4. WHERE the configured Vision_Payload_Mode is content-parts, THE LlmEvidencePacketBuilder SHALL encode each selected image as a distinct content-part entry referencing that image's llmImageDataUrl, rather than embedding the image inside a JSON string field.
5. WHERE the configured Vision_Payload_Mode is text-only, THE LlmEvidencePacketBuilder SHALL omit image data from the request payload entirely.

### Requirement 13: 테스트케이스 설명 요청/응답 스키마

**User Story:** As an 작성자, I want 로컬 LLM에 보내는 요청과 받는 응답이 정해진 구조를 따르기를 원한다, so that 응답을 검증하고 보고서에 안전하게 반영할 수 있다.

#### Acceptance Criteria

1. WHEN requesting a test case description from the local LLM, THE ReportDraftGenerator SHALL include task, outputLanguage, writingStyle, feature, evidenceSteps, constraints, and responseSchema fields in the Test_Case_Description_Request.
2. THE ReportDraftGenerator SHALL include, among the Test_Case_Description_Request's constraints, an instruction to use only the provided evidence, an instruction not to infer facts absent from the provided screen or log data, an instruction that PASS/FAIL judgement follows the provided assertions, and an instruction to preserve masked personal information as masked.
3. WHEN validating a test case description response, THE ReportDraftGenerator SHALL reject a response missing any of testPurpose, preconditions, testProcedure, expectedResult, actualResult, judgementBasis, or finalStatus.
4. IF a test case description response's finalStatus value is not one of PASS, FAIL, INCOMPLETE, or NOT_JUDGED, THEN THE ReportDraftGenerator SHALL reject that response.
5. WHEN the ReportDraftGenerator rejects a test case description response, THE ReportDraftGenerator SHALL NOT write that response's content into the Report, so that the user must retry the request or manually edit the affected fields to recover.

### Requirement 14: 데이터 모델 확장과 IndexedDB 하위 호환성

**User Story:** As a 시스템 유지보수자, I want 데이터 모델이 확장되어도 기존에 저장된 Evidence와 보고서가 손상되지 않기를 원한다, so that 기존 사용자의 작업 내용을 잃지 않는다.

#### Acceptance Criteria

1. THE RecordingSession data model SHALL extend the existing Capture_Session model by adding recordingPolicy, lastEvidenceId, and baselineEvidenceId fields without removing any existing Capture_Session field.
2. THE Evidence_Store SHALL upgrade its IndexedDB schema to database version 2 while preserving all Evidence, Report, and Session records created under database version 1.
3. WHEN an Evidence record created before this feature's schema extension is read, THE Evidence_Store SHALL normalize that record by filling stepId, event, page, target, container, domBefore, domAfter, apiEvents, serverEvents, assertions, thumbnailDataUrl, llmImageDataUrl, docImageDataUrl, and imageMeta with default values without discarding any existing field value on that record.
4. THE Evidence_Store SHALL add an evidenceSteps object store indexed by sessionId, stepNo, primaryEvidenceId, and createdAt.
5. THE database version 2 upgrade SHALL NOT delete or overwrite any existing record in the evidence, reports, or sessions object stores.

### Requirement 15: 개인정보 마스킹 강화

**User Story:** As a 시스템 유지보수자, I want 이벤트 맥락 수집 과정에서 민감한 개인정보가 저장되지 않기를 원한다, so that 증적과 LLM 요청에 민감정보가 노출되지 않는다.

#### Acceptance Criteria

1. THE ElementContextExtractor SHALL exclude or mask values from password fields, hidden inputs, and fields identified as authorization, cookie, token, or session-related.
2. IF a field's value matches a resident-registration-number-like, phone-number-like, account-number-like, or OTP-like numeric pattern, THEN THE ElementContextExtractor SHALL mask that value before including it in Target_Context or form-level Evidence.
3. THE ElementContextExtractor SHALL NOT include the full page HTML source in any Evidence context field.

### Requirement 16: API/서버 이벤트 요약을 위한 확장 지점

**User Story:** As a 시스템 유지보수자, I want API 응답과 서버 로그를 나중에 연동할 수 있는 데이터 모델 확장 지점이 지금부터 준비되어 있기를 원한다, so that 향후 fetch/XHR 훅과 서버 로그 연동을 추가할 때 기존 구조를 다시 설계하지 않아도 된다.

#### Acceptance Criteria

1. THE Evidence data model SHALL reserve apiEvents and serverEvents array fields without requiring fetch/XHR hook collection or server-log-integration collection to be implemented as part of this feature.
2. WHERE apiEvents or serverEvents data has been supplied to an Evidence or EvidenceStep, THE EvidenceStepBuilder SHALL summarize that data into apiSummary and serverSummary fields rather than forwarding the raw log content.
3. IF summarizing apiEvents or serverEvents data fails due to malformed data or a processing error, THEN THE EvidenceStepBuilder SHALL NOT fall back to including the raw apiEvents or serverEvents content in apiSummary or serverSummary; it SHALL instead record a summary-failed status on the affected EvidenceStep's llmSummary.
4. THE LlmEvidencePacketBuilder SHALL exclude apiSummary or serverSummary entries marked with a summary-failed status from the LLM request payload.
5. THE LlmEvidencePacketBuilder SHALL NOT include raw serverEvents log content in an LLM request payload; it SHALL include only masked, summarized entries.
