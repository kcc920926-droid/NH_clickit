# Requirements Document

## Introduction

CaptureIT의 QA 증적 작성 화면(Report_Editor)은 캡처, 저장 위치, 기능 명세, Evidence Inbox, LLM 설정, 검증 안내, 산출물 생성 버튼들이 한 화면에 동시에 노출되는 평면적 대시보드 구조다. 이 구조는 사용자의 실제 과업("테스트 증적을 만든다")과 화면에 노출되는 정보량·선택지가 일치하지 않아, 사용자가 진입 직후 다음 행동을 스스로 판단하기 어렵다.

현재 화면에서 확인된 핵심 문제는 다음과 같다.

- 저장 위치(초안 저장소, 보고서 ID, 증적 수, 마지막 저장, 마지막 ZIP, 다운로드 위치) 정보가 메인 작업 영역 중앙을 차지하여, 사용자가 저장소 관리 화면에 들어왔다고 오인하게 한다.
- API 엔드포인트, API Key, Model, Adapter, Raw JSON template 같은 LLM 연동 설정이 일반 사용자가 보는 작업 화면에 그대로 노출된다.
- 기능 명세가 비어 있어도 해당 영역이 메인 화면의 큰 비중을 차지한다.
- "중간 ZIP", "마지막 ZIP 열기"처럼 버튼명이 시스템 관점 용어로 되어 있어 사용자의 목적(무엇을 완성하려는가)과 대응되지 않는다.
- Evidence Inbox, 검증 결과, LLM 추천이 사이드바에 같은 층위로 나열되어 각각의 역할과 우선순위를 구분하기 어렵다.
- "검증 안내", "LLM 추천", "HTML 미리보기", "프로젝트 저장"을 포함해 "내부망 LLM 추천/HTML 미리보기/HTML·MD·ZIP 생성/프로젝트로 저장" 액션이 동시에 같은 줄에 노출되어, 사용자가 지금 눌러야 할 하나의 행동을 특정하기 어렵다.
- "START HERE", "STORAGE", "FEATURES", "OFF" 같은 영어 라벨이 업무 용어와 맞지 않아 화면의 의미를 즉시 이해하기 어렵다.
- "기능 명세"라는 용어가 개발 문서에서 쓰이는 표현에 가까워, 테스트 증적 작성이라는 업무 맥락과 어긋난다.

이 기능은 Report_Editor의 시각적 정보 구조(정보 구조·레이아웃·라벨·CTA 배치)를 사용자의 증적 생성 생애주기(캡처 시작 → 증적 확인 → 검증 항목 매핑 → 판정 → 결과 확인/생성 → 선택적 저장)에 맞춰 단계적으로 재구성한다. 이 재설계는 화면에 보여주는 방식과 용어, 정보의 우선순위를 바꾸는 것이며, 이전 스펙(streamlined-report-authoring)에서 확립된 상호작용 모델(캡처 우선 진입, 드래그앤드롭/대체 매핑/더블클릭 즉시매핑, Capture_Graph 시각화, Verdict 기본값과 확인, LLM 초안 제안과 사용자 승인 등)이나 도메인 데이터 모델(`extension/shared/domain.js`), 산출물 생성 로직(`extension/shared/report.js`)은 변경하지 않는다. 모든 기존 기능은 제거 없이 새로운 화면 구조 안에서 적절한 위치로 재배치된다.

## Glossary

- **Report_Editor**: 사용자가 QA_Report를 작성·수정하는 CaptureIT 확장 프로그램 화면
- **Wizard_Stage**: 사용자의 증적 생성 생애주기 상 하나의 단계를 나타내는 화면 구성 단위. Capture_Stage, Evidence_Review_Stage, Mapping_Stage, Result_Stage, Completion_Stage로 구성된다
- **Capture_Stage**: 캡처 세션 시작 또는 이미지 불러오기를 수행하는 Wizard_Stage
- **Evidence_Review_Stage**: Evidence_Inbox에서 수집된 Evidence 또는 Capture_Graph를 확인하는 Wizard_Stage
- **Mapping_Stage**: Evidence 또는 Capture_Graph를 검증 항목의 Test_Result_Set에 매핑하는 Wizard_Stage
- **Result_Stage**: 검증 항목별 검증 내용·기대 결과·실제 결과·판정을 입력·확인하는 Wizard_Stage
- **Completion_Stage**: 미리보기, 산출물 생성, 선택적 프로젝트 저장을 수행하는 Wizard_Stage
- **Primary_Action**: 사용자가 현재 Wizard_Stage에서 다음으로 수행해야 하는 단 하나의 강조된 행동. Report_Editor 화면 안에서 시각적으로 가장 강조된 스타일(주(primary) 버튼 스타일)로 표시된다
- **Secondary_Action**: Primary_Action이 아니면서 현재 Wizard_Stage에서 수행 가능한 보조 행동으로, Primary_Action보다 낮은 시각적 강조 수준으로 표시된다
- **검증 항목**: 기존 Feature_Spec을 화면에 표시할 때 사용하는 사용자 대상 라벨. 내부 데이터 필드명, `manifest.json` 스키마, Feature_Spec이라는 내부 식별자는 변경하지 않는다
- **Feature_Spec**: 검증 대상이 되는 하나의 기능 요구사항 항목을 나타내는 기존 내부 데이터 모델 명칭(변경 없음)
- **Test_Result_Set**: 하나의 Feature_Spec에 정확히 1개씩 연결되는 결과 데이터 단위(변경 없음)
- **Storage_Detail_Panel**: 초안 저장소, 보고서 ID, 증적 수, 마지막 저장, 마지막 ZIP, 다운로드 위치 정보와 "마지막 ZIP 열기"·"다운로드 폴더 열기"·"증적만 ZIP" 동작을 모아 표시하는, Report_Editor의 주 작업 흐름 바깥에 위치하는 보조 화면 영역
- **LLM_Settings_Panel**: API 엔드포인트, API Key, Model, Adapter, Raw JSON template 등 LLM 연동 설정 입력 항목을 모아 표시하는, Report_Editor의 주 작업 흐름 바깥에 위치하는 보조 화면 영역
- **Settings_Entry_Point**: 사용자가 Storage_Detail_Panel 또는 LLM_Settings_Panel에 접근할 수 있도록 Report_Editor가 제공하는 진입 동작(아이콘, 메뉴, 또는 별도 화면 링크)
- **Evidence_Inbox**: 아직 어떤 Feature_Spec에도 매핑되지 않은 Evidence를 표시하는 Report_Editor 영역(기존 유지)
- **Capture_Graph**: 동일한 Capture_Session에 속한 Evidence를 순서대로 연결해 시각화하는 기존 표현 방식(기존 유지)
- **Guidance_Message**: 각 Wizard_Stage에서 사용자가 다음에 무엇을 해야 하는지 설명 없이도 알 수 있도록 화면에 표시되는 상태 기반 안내 문구 또는 시각적 강조

## Requirements

### Requirement 1: 진입 즉시 인지 가능한 현재 단계와 다음 행동

**User Story:** As an 작성자, I want Report_Editor를 열었을 때 지금 무엇을 해야 하는지 설명 없이도 알고 싶다, so that 화면의 여러 영역 중 어디를 먼저 봐야 할지 스스로 판단하지 않아도 된다.

#### Acceptance Criteria

1. WHEN a user opens the Report_Editor, THE Report_Editor SHALL display exactly one Wizard_Stage as the currently active stage.
2. WHILE a Wizard_Stage is active, THE Report_Editor SHALL display that Wizard_Stage's Primary_Action with a visually distinct emphasis level from every Secondary_Action displayed on the same Wizard_Stage.
3. WHILE a Wizard_Stage is active, THE Report_Editor SHALL display at most one Primary_Action for that Wizard_Stage.
4. WHEN the condition that defines completion of the active Wizard_Stage becomes true, THE Report_Editor SHALL advance the active Wizard_Stage to the next Wizard_Stage in the sequence Capture_Stage, Evidence_Review_Stage, Mapping_Stage, Result_Stage, Completion_Stage.
5. WHILE the Evidence_Inbox contains no Evidence and no Capture_Session is active, THE Report_Editor SHALL display a Guidance_Message directing the user to start a Capture_Session or import images as the Capture_Stage's Primary_Action.
6. WHILE at least one Feature_Spec has a Test_Result_Set with no mapped Evidence, THE Report_Editor SHALL display a Guidance_Message directing the user to map a Capture_Graph or Evidence item to that Test_Result_Set.
7. THE Report_Editor SHALL always allow a user to navigate to any previously completed Wizard_Stage, regardless of the current Wizard_Stage, without losing data entered in the current or any other Wizard_Stage.

### Requirement 2: 저장 위치 정보를 주 작업 흐름에서 분리

**User Story:** As an 작성자, I want 저장 위치·보고서 ID·마지막 ZIP 같은 저장소 정보가 주 작업 화면을 차지하지 않기를 원한다, so that 증적을 만드는 작업 중에 저장소 관리 화면에 들어왔다고 오인하지 않는다.

#### Acceptance Criteria

1. THE Report_Editor SHALL NOT display the Storage_Detail_Panel within the main content area of any Wizard_Stage.
2. THE Report_Editor SHALL provide a Settings_Entry_Point through which a user can open the Storage_Detail_Panel.
3. WHEN a user opens the Storage_Detail_Panel through its Settings_Entry_Point, THE Storage_Detail_Panel SHALL display 초안 저장소, 보고서 ID, 증적 수, 마지막 저장, 마지막 ZIP, and 다운로드 위치 information equivalent to what was previously displayed in the main content area.
4. WHEN a user opens the Storage_Detail_Panel through its Settings_Entry_Point, THE Storage_Detail_Panel SHALL provide "마지막 ZIP 열기", "다운로드 폴더 열기", and "증적만 ZIP" actions equivalent to the previously existing actions.
5. THE Report_Editor SHALL NOT remove the "마지막 ZIP 열기", "다운로드 폴더 열기", or "증적만 ZIP" action from the Report_Editor as a result of relocating the Storage_Detail_Panel.

### Requirement 3: 단계에 필요한 정보만 노출하는 화면 구성

**User Story:** As an 작성자, I want Evidence_Inbox, 검증 항목, 검증 결과가 현재 단계와 무관하게 한꺼번에 나열되지 않기를 원한다, so that 지금 봐야 할 정보에만 집중할 수 있다.

#### Acceptance Criteria

1. WHILE the Capture_Stage or Evidence_Review_Stage is active, THE Report_Editor SHALL NOT display LLM_Settings_Panel content within the main content area.
2. WHILE the Mapping_Stage is active, THE Report_Editor SHALL display the Evidence_Inbox and the list of 검증 항목 as the primary visible content, without displaying LLM_Settings_Panel content within the main content area.
3. WHILE the Result_Stage is active for a given 검증 항목, THE Report_Editor SHALL display that 검증 항목's 검증 내용, 기대 결과, 실제 결과, 판정 입력 영역, and mapped Evidence as the primary visible content, and SHALL NOT display the main content area of any other Wizard_Stage at the same time.
4. THE Report_Editor SHALL display the main content area of exactly one Wizard_Stage at any given time, and SHALL NOT display both Evidence_Inbox content and LLM_Settings_Panel content within the same main content area at the same time.
5. WHEN a user completes a mapping action for a 검증 항목's Test_Result_Set for the first time, THE Report_Editor SHALL display a Guidance_Message suggesting the next action for that 검증 항목, including entering 검증 내용/기대 결과/실제 결과 or confirming 판정.

### Requirement 4: "검증 항목" 표시 라벨로 전환

**User Story:** As an 작성자, I want 화면에서 "기능 명세" 대신 "검증 항목"이라는 표현을 보고 싶다, so that 테스트 증적 작성이라는 업무 맥락과 화면의 용어가 일치한다.

#### Acceptance Criteria

1. THE Report_Editor SHALL display "검증 항목" wherever a Feature_Spec is presented to the user, including list headings, empty-state text, and action labels.
2. THE Report_Editor SHALL NOT display the label "기능 명세" anywhere in the user-facing screen text.
3. THE Report_Editor SHALL NOT change the internal field name, identifier, or `manifest.json` schema key associated with Feature_Spec as a result of the label change.
4. THE Report_Editor SHALL continue to write Feature_Spec data to `manifest.json`, HTML, and Markdown outputs using the existing field names, unaffected by the "검증 항목" display label change.

### Requirement 5: LLM 연동 설정을 보조 설정 화면으로 이동

**User Story:** As an 작성자, I want API 엔드포인트, API Key, Model, Adapter, Raw JSON template 같은 LLM 연동 설정을 일반 작업 화면에서 보지 않기를 원한다, so that 필요하지 않은 기술 정보에 방해받지 않고 증적 작업에 집중할 수 있다.

#### Acceptance Criteria

1. THE Report_Editor SHALL NOT display the LLM_Settings_Panel's API 엔드포인트, API Key, Model, Adapter, or Raw JSON template input fields within the main content area of any Wizard_Stage.
2. THE Report_Editor SHALL provide a Settings_Entry_Point through which a user can open the LLM_Settings_Panel.
3. WHEN a user opens the LLM_Settings_Panel through its Settings_Entry_Point, THE LLM_Settings_Panel SHALL open and SHALL provide the same API 엔드포인트, API Key, Model, Adapter, Raw JSON template, "연결 테스트", and "추천 요청 테스트" functionality that previously existed in the main content area, regardless of whether the LLM connection is currently available.
4. THE Report_Editor SHALL NOT require a user to open the LLM_Settings_Panel before requesting LLM 추천 for a 검증 항목.
5. WHERE the LLM 연동 설정 has not been configured, THE Report_Editor SHALL allow the user to complete 미리보기 and 산출물 생성 without displaying the LLM_Settings_Panel's configuration fields.

### Requirement 6: 단계별 단일 주요 CTA

**User Story:** As an 작성자, I want 현재 화면에서 눌러야 할 행동이 하나로 특정되기를 원한다, so that 여러 버튼 중 무엇을 먼저 눌러야 하는지 고민하지 않는다.

#### Acceptance Criteria

1. WHILE the Capture_Stage is active and no Capture_Session is active, THE Report_Editor SHALL present "세션 시작" as the Primary_Action and SHALL present "이미지 불러오기" as a Secondary_Action.
2. WHILE the Result_Stage is active for a 검증 항목 whose Test_Result_Set has at least one mapped Evidence, THE Report_Editor SHALL present a single 판정 확인 또는 다음 단계로 진행 action as the Primary_Action for that 검증 항목, distinct from "내부망 LLM 추천", "HTML 미리보기", "HTML·MD·ZIP 생성", and "프로젝트로 저장", each of which SHALL be presented as a Secondary_Action within the Result_Stage.
3. WHILE the Completion_Stage is active, THE Report_Editor SHALL present "HTML·MD·ZIP 생성" as the Primary_Action and SHALL present "HTML 미리보기" and "프로젝트로 저장" as Secondary_Action.
4. THE Report_Editor SHALL NOT rename any existing action in a way that removes its ability to perform the same underlying operation it performed before this redesign.
5. THE Report_Editor SHALL label the action that produces the final HTML·Markdown·manifest.json ZIP output as "HTML·MD·ZIP 생성" or an equivalent user-goal-oriented label, and SHALL NOT use the label "중간 ZIP" for that action.

### Requirement 7: 영어 기술 라벨을 한국어 업무 용어로 교체

**User Story:** As an 작성자, I want 화면에서 START HERE, STORAGE, FEATURES, OFF 같은 영어 기술 라벨 대신 한국어 업무 용어를 보고 싶다, so that 화면의 각 영역이 무엇을 의미하는지 즉시 이해할 수 있다.

#### Acceptance Criteria

1. THE Report_Editor SHALL NOT display the English eyebrow labels "START HERE", "STORAGE", "FEATURES", "DRAFT / PROJECT", "EVIDENCE", or "FEATURE RESULT" anywhere in the user-facing screen text.
2. THE Report_Editor SHALL replace each English eyebrow label identified in Requirement 7.1 with a visible Korean business-context label that describes the corresponding Wizard_Stage or panel's purpose, rather than removing the label entirely.
3. THE Report_Editor SHALL NOT display the Capture_Session status badge text "OFF" or "ON"; THE Report_Editor SHALL display a Korean phrase indicating whether a Capture_Session is active or inactive.

### Requirement 8: 기존 기능의 무손실 재배치

**User Story:** As a QA 관계자, I want 화면 구조가 바뀌어도 기존에 사용하던 모든 기능을 계속 사용할 수 있기를 원한다, so that 재설계로 인해 업무에 필요한 기능을 잃지 않는다.

#### Acceptance Criteria

1. THE Report_Editor SHALL continue to provide Capture_Session 시작·종료, 이미지 불러오기, Evidence 검색, Capture_Graph 시각화, Drag_And_Drop_Mapping, Alternative_Mapping_Control, Quick_Mapping_Dialog, Default_Verdict_Selection과 Verdict_Confirmation, LLM 추천 요청, Report_Draft_Suggestion 승인/수정, HTML 미리보기, 증적만 ZIP 생성, HTML·MD·ZIP 생성, 프로젝트로 저장, 검증 안내(경고), and QA 뷰어 열기 as user-accessible actions somewhere within the redesigned Report_Editor.
2. FOR ALL functionality accessible in the Report_Editor before this redesign, THE Report_Editor SHALL provide an equivalent action reachable within the redesigned Wizard_Stage structure or its Settings_Entry_Point panels after this redesign.
3. THE Report_Editor SHALL NOT introduce a Wizard_Stage transition that discards Evidence, 검증 항목, Test_Result_Set content, or Verdict state entered in a previous Wizard_Stage.

### Requirement 9: 데이터 모델 및 산출물 하위 호환성 유지

**User Story:** As a 시스템 유지보수자, I want 화면 구조와 라벨이 바뀌어도 QA_Report 데이터 스키마와 생성된 보고서 산출물이 하위 호환성을 유지하기를 원한다, so that 기존 ZIP 뷰어, 자동화 테스트, 레거시 업로드 흐름이 변경 없이 계속 동작한다.

#### Acceptance Criteria

1. THE Report_Editor SHALL NOT change any field name, data type, or structure defined in `extension/shared/domain.js`, `extension/shared/report.js`, or `manifest.json` as a result of this redesign.
2. FOR ALL QA_Report values produced by the redesigned Report_Editor, generating manifest.json, HTML, and Markdown outputs SHALL produce output identical in schema and structure to the output produced by the pre-redesign Report_Editor for the same underlying QA_Report data.
3. THE Report_Editor SHALL NOT change the internal identifier, event name, or storage key associated with any existing domain object (Feature_Spec, Test_Result_Set, Evidence, Capture_Session) as a result of relabeling that object's display text.
