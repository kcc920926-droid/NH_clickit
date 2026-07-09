# Requirements Document

## Introduction

CaptureIT의 QA 보고서 작성 화면(Report_Editor)은 지금까지 보고서명·프로젝트명·작성자 같은 프로젝트 식별 정보를 화면 최상단에 배치하고, 이 정보를 먼저 입력해야 다음 단계로 넘어갈 수 있는 구조였다. 또한 Evidence를 Feature_Spec에 연결하는 방법이 버튼 클릭 중심이어서, 여러 장의 캡처를 하나씩 눌러 연결해야 하는 반복 작업이 발생했다.

이 기능은 Report_Editor의 핵심 상호작용 모델을 다음 두 가지 축으로 전환한다.

1. **매핑 상호작용의 전환**: Evidence를 Feature_Spec의 Test_Result_Set에 연결하는 주된 방법을 드래그앤드롭으로 바꾸고, 동일한 Capture_Session에서 수집된 Evidence들을 Capture_Session_Set이라는 하나의 묶음으로 다루어, 세트 전체를 한 번의 드래그로 매핑할 수 있게 한다. 세트를 펼쳐 개별 Evidence 단위로 드래그하는 것은 예외적인 보조 동작으로 유지한다.
2. **작업 흐름의 전환**: 프로젝트 식별 정보 입력을 화면의 시작 조건에서 제거하고, 캡처 시작과 Evidence-Feature 매핑을 화면의 중심 작업으로 재배치한다. 미리보기와 산출물 생성(ZIP 등)은 프로젝트 식별 정보 없이도 도달할 수 있어야 하며, "프로젝트로 저장"은 캡처와 매핑, 그리고 결과물 확인까지 마친 뒤 사용자가 원할 때 수행하는 마무리 단계가 된다. 기존에 필수 입력에서 선택 입력으로 전환되었던 변경 목적/수정 내용 요약/형상·체크아웃 개요 항목은 삭제하지 않고, 이 "프로젝트로 저장" 단계에 속하는 선택 입력 항목으로 재배치한다.

보고서명과 작성자는 생성된 QA_Report가 최종적으로 업로드되는 레거시 시스템에 이미 표기되어 있으므로, CaptureIT 내에서 이 두 값을 채우도록 요구할 필요가 없다. 따라서 보고서명과 작성자는 "프로젝트로 저장" 단계에서도 값 입력이 요구되지 않는 Optional_Identification_Field로 취급되며, 값이 비어 있어도 저장·미리보기·산출물 생성 전 과정이 아무 문제 없이 완료된다. 프로젝트명은 이번 재설계에서도 Project를 식별하고 다시 불러오기 위한 필수 값으로 남는다.

이 재설계로 사용자가 "다음에 뭘 해야 하는지 헷갈리는" 문제를 해소하기 위해, Report_Editor는 새 작업 흐름의 각 단계마다 다음 행동을 안내하는 빈 상태(empty state) 및 유도 메시지를 제공한다.

재설계 이후에도 다음 원칙은 그대로 유지한다: PASS/FAIL 판정, 단 PASS 를 default 로 지정한 후 FAIL 전환은 토글방식. 판정 후에도 편집 차단 없음, Feature_Spec당 Test_Result_Set 1개, 검증 내용/기대 결과/실제 결과/증적 누락 및 미판정에 대한 경고는 비차단(non-blocking), 기존 `manifest.json` 스키마·ZIP 구조·HTML/Markdown 산출물·QA 뷰어와의 하위 호환성. 단, PRD FR-04-3의 `Ctrl+Shift+E` 2단계 선택 모드와 원래 클릭 차단 규칙은 이 스펙 범위 내에서 `Ctrl+Shift+Click` 기반의 즉시 캡처 방식으로 명시적으로 대체된다(Requirement 9).

이 기능은 상호작용 모델을 다음 세 가지 축으로 추가 확장한다. 이 세 확장은 위 두 가지 축을 대체하지 않고 그 위에 더해진다.

3. **그래프 시각화를 통한 직관적 인지**: Capture_Session_Set은 데이터 모델상 동일하게 유지되지만, Evidence_Inbox는 이를 Capture_Node(개별 Evidence)가 sequenceNo 순서로 연결된 선형(linear) Capture_Graph로 시각화한다. 다른 Capture_Session으로 캡처하면 별도의 Capture_Graph가 생성된다. 사용자는 Capture_Node에 마우스를 올려(hover) 해당 Evidence와 함께 수집된 컨텍스트(대상 DOM 요소 정보, 주변 화면 맥락)를 즉시 확인할 수 있다.
4. **컨텍스트 지정 캡처의 단축키 동작 변경**: Context_Driven_Capture 모드에서 `Ctrl+Shift+Click`을 누르면, 기존의 "선택 모드 진입 → 다음 클릭으로 대상 지정 → 원래 클릭 차단" 2단계 방식을 대신하여, 그 자리에서 즉시 하이라이트가 적용된 캡처(Highlight_Shortcut_Capture)를 수행한 뒤 Fallback_Click_Replay를 통해 원래의 클릭 이벤트를 재발생시켜 원래 업무 동작이 그대로 실행되도록 한다. 이 변경은 기존 PRD(FR-04-3)의 2단계 방식과 원래 클릭 차단 규칙을 이 스펙 범위 내에서 대체(override)한다.
5. **그래프 단위 즉시 매핑과 리포트 초안 자동 생성**: Capture_Graph(또는 그 안의 Capture_Node)를 Feature_Spec 위로 드래그하는 것 외에, 더블클릭으로 Quick_Mapping_Dialog를 열어 테스트케이스 정보를 입력하면서 동시에 매핑을 완료할 수 있다. 또한 리포트 생성 시 내부망 LLM이 매핑된 Evidence의 이미지 시퀀스와 컨텍스트 정보를 바탕으로 보고서명(체크아웃명)과 형상·체크아웃 개요(개요)의 초안(Report_Draft_Suggestion)을 자동으로 작성하며, 사용자는 이 초안을 검토해 승인하거나 직접 수정할 수 있다. LLM은 이 두 필드를 자동으로 확정하지 않으며, 최종 확정은 항상 사용자가 한다.
6. **Verdict 기본 선택값과 자동 추론 금지의 구분**: Verdict 선택 UI는 아직 확정되지 않은 각 Test_Result_Set에 대해 PASS를 Default_Verdict_Selection으로 미리 선택된 상태로 보여준다. 이는 이미지·텍스트 분석에 기반한 자동 PASS/FAIL 추론과는 다르다 — 확장 프로그램은 여전히 Evidence를 분석해 판정을 추론하지 않으며, 사용자가 Verdict_Confirmation 동작을 거쳐야만 Verdict가 확정된다. 사용자가 아무 상호작용도 하지 않은 Test_Result_Set은 Default_Verdict_Selection이 PASS로 표시되어 있더라도 여전히 미판정으로 취급되어 overallStatus 계산과 비차단 경고 로직에 반영된다.

### 사용자가 따라야 하는 순서

이 기능이 완성되면, 사용자는 다음 순서로 작업을 진행하면 된다.

1. **캡처 시작**: Report_Editor를 열면 즉시 캡처 세션을 시작하거나 기존 이미지를 불러온다. 프로젝트명·보고서명 등 어떤 식별 정보도 먼저 입력할 필요가 없다. 사용자는 진입 즉시 세션이 시작되어 있는지, 또는 세션을 새로 시작해야 하는지를 화면에서 바로 인지할 수 있다.
2. **그래프 확인**: Evidence_Inbox에서 방금 수집된 Evidence들이 Capture_Session_Set(Capture_Graph로 시각화됨) 단위로 sequenceNo 순서에 따라 연결된 선형 그래프로 표시되는 것을 확인한다. 다른 세션으로 캡처하면 별도의 그래프가 나타난다. 각 Capture_Node에 마우스를 올리면 관련 컨텍스트가 보인다.
3. **필요하면 하이라이트 단축키 캡처**: Context_Driven_Capture 모드에서 `Ctrl+Shift+Click`으로 대상 요소를 강조 캡처하면, 원래의 클릭 동작도 그대로 이어서 실행된다.
4. **그래프를 기능에 매핑**: Feature_Spec을 추가(또는 선택)한 뒤, Capture_Graph(또는 개별 Capture_Node)를 해당 Feature_Spec의 Test_Result_Set 위로 드래그하여 놓거나, Capture_Node/Capture_Graph를 더블클릭해 Quick_Mapping_Dialog에서 테스트케이스 정보를 입력하면서 바로 매핑한다.
5. **필요 시 세부 내용 입력**: 필요하면 검증 내용, 기대 결과, 실제 결과를 입력한다. Verdict 컨트롤은 PASS가 기본으로 선택되어 있으므로, 그대로 확인(Verdict_Confirmation)하면 PASS로 확정되고, 예외적으로 FAIL인 경우에만 값을 바꾼 뒤 확인한다. 확인 전까지는 미판정으로 취급되며, 확인하지 않고 넘어가도 다음 단계로 진행할 수 있다(비차단 경고만 표시됨).
6. **미리보기/생성**: 프로젝트명 등 식별 정보 없이 HTML 미리보기를 확인하거나 ZIP(HTML·Markdown·manifest.json) 산출물을 생성한다. 이 시점에 LLM이 매핑된 Evidence를 바탕으로 보고서명과 형상·체크아웃 개요의 초안을 제시하면, 사용자는 이를 승인하거나 수정한다.
7. **원하면 프로젝트로 저장**: 결과물을 확인한 뒤, 원할 경우에만 프로젝트명을 지정해 다시 불러올 수 있는 단위로 저장한다. 보고서명과 작성자는 레거시 업로드 시스템에 이미 표기되므로 입력하지 않아도 되며, 변경 목적/수정 내용 요약/형상·체크아웃 개요도 선택적으로 입력할 수 있다.

> **참고(Verdict 기본값과 자동 판정의 구분)**: Verdict 선택 UI가 PASS를 기본으로 미리 선택해 두는 것은 PRD의 비목표인 "AI·LLM 기반 PASS·FAIL 자동 판정 금지"를 위반하지 않는다. 이 기본값은 이미지나 텍스트 분석 결과가 아니라 단순한 UI 컨트롤의 초기 선택 상태이며, 사용자가 Verdict_Confirmation 동작을 거쳐야만 해당 Test_Result_Set의 Verdict가 확정된다(Requirement 6 참고).

## Glossary

- **Report_Editor**: 사용자가 QA_Report를 작성·수정하는 CaptureIT 확장 프로그램 화면
- **QA_Report**: 하나의 제출 단위가 되는 보고서 데이터 객체로, 보고서명·프로젝트명·작성자·변경 목적·수정 내용 요약·형상·체크아웃 개요·Feature_Spec 목록을 포함한다
- **Draft_Report**: 사용자가 캡처 또는 이미지 불러오기를 시작하는 즉시 Report_Editor가 자동으로 생성하는 QA_Report로, 아직 Project로 저장되지 않은 상태를 의미한다
- **Project**: 사용자가 프로젝트명을 지정하여 저장한 QA_Report로, 이후 Report_Editor에서 다시 불러올 수 있는 단위
- **Capture_Session**: 사용자가 캡처를 시작한 시점부터 종료한 시점까지 이어지는 연속된 캡처 동작의 묶음으로, 고유한 세션 ID를 가진다
- **Evidence**: 하나의 캡처 동작 또는 이미지 불러오기로 생성된 스크린샷과 그 메타데이터(세션 ID, 순서번호, 트리거 유형, 캡처 시각 등)를 포함하는 데이터 단위
- **Evidence_Inbox**: 아직 어떤 Feature_Spec에도 매핑되지 않은 Evidence를 표시하는 Report_Editor 영역
- **Capture_Session_Set**: Evidence_Inbox에서 동일한 Capture_Session에 속한 모든 Evidence를 하나의 단위로 표시하는 그룹
- **Feature_Spec**: 검증 대상이 되는 하나의 기능 요구사항 항목
- **Test_Result_Set**: 하나의 Feature_Spec에 정확히 1개씩 연결되는 결과 데이터 단위로, 검증 내용·기대 결과·실제 결과·Verdict·매핑된 Evidence 목록을 포함한다
- **Verdict**: 사용자가 직접 선택하는 PASS 또는 FAIL 상태이며, 선택 이전은 미판정 상태다
- **Drag_And_Drop_Mapping**: Capture_Session_Set 또는 개별 Evidence를 Feature_Spec의 Test_Result_Set 드롭 영역 위로 끌어 놓아 매핑을 수행하는 주(primary) 상호작용 방식
- **Alternative_Mapping_Control**: 마우스 드래그를 사용할 수 없는 사용자를 위해 Report_Editor가 제공하는 키보드 또는 버튼 기반의 보조 매핑 수단
- **Report_Builder**: manifest.json, HTML, Markdown 산출물을 생성하는 모듈
- **Optional_Project_Detail_Field**: Project로 저장하는 단계에서 선택적으로 입력하는 변경 목적, 수정 내용 요약, 형상·체크아웃 개요 각각의 입력 항목
- **Optional_Identification_Field**: 보고서명과 작성자 각각의 입력 항목으로, 생성된 QA_Report가 최종적으로 업로드되는 레거시 시스템에 이미 표기되어 있어 CaptureIT 내에서 값 입력이 요구되지 않는다
- **변경 개요 섹션**: HTML 및 Markdown 보고서에서 변경 목적, 수정 내용 요약, 형상·체크아웃 개요를 표시하는 영역
- **기본 보고서명**: 보고서명이 비어 있을 때 Report_Builder가 manifest.json, HTML, Markdown 산출물에 표시하는 시스템 지정 고정 문자열
- **Capture_Node**: Capture_Graph 안에서 하나의 Evidence를 나타내는 시각적 단위
- **Capture_Graph**: 동일한 Capture_Session_Set에 속한 Capture_Node들을 sequenceNo 오름차순으로 연결한 선형(linear) 그래프 시각화. Capture_Session_Set과 동일한 데이터를 표현하는 시각화 표현 방식이며 별도의 데이터 구조를 추가하지 않는다
- **Node_Context_Preview**: 사용자가 Capture_Node에 마우스를 올렸을 때 표시되는, 해당 Evidence의 대상 DOM 요소 정보와 주변 화면 맥락(기존 page-context.js가 수집하는 target 및 surroundingContext 데이터)
- **Event_Driven_Capture**: 클릭·제출·URL 변경 등 일반 이벤트를 트리거로 수행하는 기존 캡처 방식(PRD FR-04-2)
- **Context_Driven_Capture**: 사용자가 특정 DOM 요소를 지정해 강조 캡처를 수행하는 기존 캡처 방식(PRD FR-04-3)
- **Highlight_Shortcut_Capture**: Context_Driven_Capture 모드에서 `Ctrl+Shift+Click`을 누른 즉시, 별도의 선택 모드 진입 단계 없이 그 자리에서 하이라이트가 적용된 캡처를 수행하는 동작
- **Fallback_Click_Replay**: Highlight_Shortcut_Capture가 캡처를 완료한 직후, 캡처로 인해 실행되지 못한 원래의 클릭 이벤트를 대상 요소에 재발생시켜 원래 업무 동작이 실행되도록 하는 동작
- **Quick_Mapping_Dialog**: Capture_Graph 또는 Capture_Node를 더블클릭하면 열리는 대화상자로, 검증 내용/기대 결과/실제 결과를 입력받아 제출과 동시에 대상 Feature_Spec의 Test_Result_Set에 매핑을 완료한다
- **Report_Draft_Suggestion**: 리포트 생성 시 내부망 LLM이 Feature_Spec에 매핑된 Evidence의 이미지 시퀀스와 컨텍스트 정보를 바탕으로 생성하는 보고서명과 형상·체크아웃 개요의 초안. 사용자가 승인하거나 수정하기 전까지는 QA_Report에 확정 반영되지 않는다
- **Default_Verdict_Selection**: 아직 Verdict가 확정되지 않은 Test_Result_Set의 Verdict 선택 UI에서 PASS가 미리 선택되어 있는 초기 표시 상태. 이미지·텍스트 분석에 기반한 자동 판정이 아니며, Verdict_Confirmation을 거치기 전까지 해당 Test_Result_Set은 미판정으로 취급된다
- **Verdict_Confirmation**: 사용자가 Verdict 선택 UI에서 PASS 또는 FAIL 값을 명시적으로 확인하는 동작으로, 이 동작이 완료되어야 해당 Test_Result_Set의 Verdict가 확정 상태(미판정이 아닌 상태)로 전환된다

## Requirements

### Requirement 1: 캡처 우선 진입, 식별 정보 선행 요구 제거

**User Story:** As an 작성자, I want Report_Editor를 열자마자 프로젝트 식별 정보 입력 없이 캡처를 시작하거나 이미지를 불러오고 싶다, so that 무엇을 먼저 해야 하는지 헷갈리지 않고 즉시 증적 수집을 시작할 수 있다.

#### Acceptance Criteria

1. WHEN a user opens the Report_Editor, THE Report_Editor SHALL present Capture_Session 시작 동작과 이미지 불러오기 동작을 즉시 사용 가능한 상태로 표시함 without requiring 보고서명, 프로젝트명, or 작성자 값을 먼저 입력하도록 요구하지 않는다.
2. WHEN a user starts a Capture_Session or imports an image for the first time in a new authoring session, THE Report_Editor SHALL automatically create a Draft_Report without prompting the user for 보고서명, 프로젝트명, or 작성자.
3. THE Report_Editor SHALL NOT display 보고서명, 프로젝트명, and 작성자 입력란 as the topmost element of the primary workflow layout.
4. WHERE a Draft_Report already exists in the current Report_Editor session, THE Report_Editor SHALL allow the user to continue adding Evidence and Feature_Spec content to that Draft_Report without requiring 프로젝트명 to be set.
5. WHEN a user attempts to add Evidence or a Feature_Spec before any Draft_Report has been created in the current Report_Editor session, THE Report_Editor SHALL automatically create a Draft_Report in the background and SHALL allow the Evidence or Feature_Spec addition to complete without prompting the user for 보고서명, 프로젝트명, or 작성자.
6. WHEN a user starts a Capture_Session or imports an image, THE Report_Editor SHALL always attempt Draft_Report creation first.
7. IF Draft_Report creation fails when a user starts a Capture_Session or imports an image, THEN THE Report_Editor SHALL allow the Capture_Session or image import to proceed without a Draft_Report container.

### Requirement 2: Capture_Session_Set 단위의 세트화와 그래프 시각화

**User Story:** As an 작성자, I want 동일한 캡처 세션에서 수집한 여러 Evidence가 Evidence_Inbox에서 순서대로 연결된 그래프로 표시되고, 각 항목에 마우스를 올리면 관련 맥락이 보이기를 원한다, so that 개별 항목을 일일이 다루지 않고 세트 단위로 관리하면서도 각 캡처의 맥락을 직관적으로 파악할 수 있다.

#### Acceptance Criteria

1. WHEN two or more Evidence items share the same Capture_Session, THE Evidence_Inbox SHALL display those Evidence items grouped as a single Capture_Session_Set rather than as separate individual entries.
2. WHEN a single Evidence item's Capture_Session contains no other unmapped Evidence, THE Evidence_Inbox SHALL display that Evidence item as a Capture_Session_Set containing exactly one Evidence.
3. THE Evidence_Inbox SHALL display, for each Capture_Session_Set, the number of Evidence items it contains.
4. WHERE a user expands a Capture_Session_Set, THE Evidence_Inbox SHALL display each individual Evidence item within that set.
5. WHEN an Evidence item is mapped to a Feature_Spec's Test_Result_Set, THE Evidence_Inbox SHALL remove that Evidence item from its Capture_Session_Set's unmapped display, consistent with existing inbox filtering behavior.
6. THE Evidence_Inbox SHALL render each Capture_Session_Set as a Capture_Graph in which each contained Evidence item is displayed as a Capture_Node and consecutive Capture_Nodes are visually connected in strict sequenceNo ascending order.
7. WHEN Evidence items belong to different Capture_Session_Set groups, THE Evidence_Inbox SHALL render each group as a visually separate Capture_Graph without connecting any Capture_Node in one group to a Capture_Node in a different Capture_Session_Set group, even when the two Capture_Graph groups are displayed adjacent to each other.
8. WHEN a user hovers the pointer over a Capture_Node, THE Evidence_Inbox SHALL display a Node_Context_Preview containing that Evidence item's target element context and surrounding context.
9. WHEN a user moves the pointer away from a Capture_Node, THE Evidence_Inbox SHALL immediately hide that Capture_Node's Node_Context_Preview without a delay.

### Requirement 3: 드래그앤드롭 우선 매핑과 더블클릭 즉시 매핑

**User Story:** As an 작성자, I want Capture_Graph 또는 개별 Capture_Node를 Feature_Spec 위로 드래그해서 놓거나, 더블클릭해서 테스트케이스 정보를 입력하는 즉시 매핑을 완료하고 싶다, so that 여러 캡처를 하나씩 눌러 연결하는 반복 작업을 줄이고, 필요하면 입력과 매핑을 한 번에 끝낼 수 있다.

#### Acceptance Criteria

1. THE Report_Editor SHALL provide Drag_And_Drop_Mapping as the primary interaction for connecting Evidence to a Feature_Spec's Test_Result_Set.
2. WHEN a user drags a Capture_Graph (representing a Capture_Session_Set) and drops it onto a Feature_Spec's Test_Result_Set drop target, THE Report_Editor SHALL map every Evidence item represented by that Capture_Graph's Capture_Nodes to that Test_Result_Set in a single action.
3. WHERE a user has expanded a Capture_Session_Set, THE Report_Editor SHALL allow the user to drag an individual Capture_Node within that Capture_Graph onto a Feature_Spec's Test_Result_Set drop target independently of the rest of the graph.
4. IF a dragged Capture_Graph or Capture_Node is dropped onto a Feature_Spec's Test_Result_Set drop target and one or more of the Evidence items were already mapped to a different Feature_Spec, THEN THE Report_Editor SHALL automatically move each such Evidence item from its previous Test_Result_Set to the drop target's Test_Result_Set without requiring user confirmation.
5. THE Report_Editor SHALL provide an Alternative_Mapping_Control that performs the same Evidence-to-Test_Result_Set mapping as Drag_And_Drop_Mapping, for users who cannot perform mouse-based drag interactions.
6. WHEN a user completes a mapping action using either Drag_And_Drop_Mapping or Alternative_Mapping_Control, THE Report_Editor SHALL produce the same resulting Evidence-to-Test_Result_Set association regardless of which mechanism was used.
7. WHEN a user double-clicks a Capture_Graph or a Capture_Node, THE Report_Editor SHALL open a Quick_Mapping_Dialog for selecting the target Feature_Spec and entering 검증 내용, 기대 결과, and 실제 결과.
8. THE Quick_Mapping_Dialog SHALL require a value for 검증 내용 and SHALL treat 기대 결과 and 실제 결과 as optional inputs.
9. WHEN a user submits the Quick_Mapping_Dialog with a selected target Feature_Spec and a non-empty 검증 내용 value, THE Report_Editor SHALL map every Evidence item represented by the double-clicked Capture_Graph or Capture_Node to that Feature_Spec's Test_Result_Set and SHALL apply the entered 검증 내용, 기대 결과, and 실제 결과 values to that Test_Result_Set in a single action.
10. IF a user submits the Quick_Mapping_Dialog without a value for 검증 내용, THEN THE Report_Editor SHALL prevent submission and SHALL indicate that 검증 내용 is required.
11. WHEN a user completes mapping through the Quick_Mapping_Dialog, THE Report_Editor SHALL produce the same resulting Evidence-to-Test_Result_Set association as an equivalent Drag_And_Drop_Mapping action for the same Evidence items and target Feature_Spec, in addition to applying the entered Test_Result_Set content.

### Requirement 4: 식별 정보 없이 미리보기·생성까지 도달

**User Story:** As an 작성자, I want 프로젝트명이나 보고서명을 지정하지 않고도 미리보기와 산출물 생성까지 진행하고 싶다, so that 결과를 먼저 확인한 뒤에 프로젝트로 저장할지 결정할 수 있다.

#### Acceptance Criteria

1. WHEN a user requests HTML 미리보기 for a Draft_Report that has no 프로젝트명 set, THE Report_Editor SHALL allow the user to complete that HTML 미리보기 without requiring a 프로젝트명 값.
2. WHEN a Draft_Report has no 프로젝트명 set, THE Report_Editor SHALL automatically allow ZIP(HTML·Markdown·manifest.json) 산출물 생성 to proceed without requiring a 프로젝트명 값.
3. THE Report_Editor SHALL position the "프로젝트로 저장" action after the 미리보기 and 산출물 생성 actions within the primary workflow layout.
4. THE Report_Editor SHALL NOT require the "프로젝트로 저장" action to be completed before allowing 미리보기 or 산출물 생성.

### Requirement 5: 프로젝트 저장은 후행 마무리 단계

**User Story:** As an 작성자, I want 캡처와 매핑, 결과 확인을 마친 뒤 원할 때만 프로젝트로 저장하고 싶다, so that 저장 시점을 스스로 선택할 수 있고 시작 단계에서 불필요한 입력을 하지 않을 수 있다.

#### Acceptance Criteria

1. WHEN a user triggers the "프로젝트로 저장" action, THE Report_Editor SHALL prompt the user to provide a 프로젝트명 that will be used to identify and reload the resulting Project.
2. WHEN a user triggers the "프로젝트로 저장" action, THE Report_Editor SHALL present each Optional_Identification_Field (보고서명, 작성자) as an optional input within that action rather than as a value required to complete the action.
3. WHEN a user completes the "프로젝트로 저장" action without entering a value for an Optional_Identification_Field, THE Report_Editor SHALL save the resulting Project with that field defaulting to an empty string.
4. WHEN a user triggers the "프로젝트로 저장" action, THE Report_Editor SHALL present each Optional_Project_Detail_Field (변경 목적, 수정 내용 요약, 형상·체크아웃 개요) as an optional input within that action.
5. WHEN a user completes the "프로젝트로 저장" action without entering a value for an Optional_Project_Detail_Field, THE Report_Editor SHALL save the resulting Project with that field defaulting to an empty string.
6. WHERE a Draft_Report has not been saved as a Project, THE Report_Editor SHALL allow the user to continue editing Feature_Spec content, Verdict, and Evidence mappings for an unlimited duration without prompting the user to save or limiting further edits.
7. IF a user saves a Project without entering values for 보고서명 or 작성자, THEN THE Report_Editor SHALL NOT display a validation error and SHALL complete the save.
8. WHERE a Report_Draft_Suggestion for 보고서명 or 형상·체크아웃 개요 has been approved by the user before the "프로젝트로 저장" action is triggered, THE Report_Editor SHALL pre-fill the corresponding field (보고서명 or 형상·체크아웃 개요) with the approved value while still allowing the user to edit it further.

### Requirement 9: 컨텍스트 지정 캡처의 Ctrl+Shift+Click 즉시 캡처와 원 클릭 재발생

**User Story:** As an 작성자, I want Context_Driven_Capture 모드에서 Ctrl+Shift+Click을 누르면 그 자리에서 즉시 하이라이트 캡처가 이루어지고 원래의 클릭 동작도 그대로 실행되기를 원한다, so that 강조 캡처를 위해 별도의 선택 모드를 거치거나 업무 동작이 막히는 일 없이 캡처와 실제 작업을 함께 진행할 수 있다.

#### Acceptance Criteria

1. WHILE Context_Driven_Capture mode is active, WHEN a user performs a Ctrl+Shift+Click on a DOM element, THE Report_Editor SHALL perform a Highlight_Shortcut_Capture on that element without requiring a prior selection-mode entry step.
2. WHEN a Highlight_Shortcut_Capture completes, THE Report_Editor SHALL perform a Fallback_Click_Replay that re-dispatches the original click event on the same target element so that the element's ordinary click behavior executes.
3. THE Highlight_Shortcut_Capture SHALL apply the same highlight overlay rendering (bounding box and translucent background) used by the existing context-menu and Ctrl+Shift+E capture paths before capturing the viewport.
4. THE Report_Editor SHALL record `shortcut-context` as the `triggerType` for Evidence created by a Highlight_Shortcut_Capture, consistent with the existing triggerType taxonomy.
5. THE Report_Editor SHALL NOT provide the prior two-step "Ctrl+Shift+E enters selection mode, next click selects target" interaction, and SHALL NOT apply `preventDefault` or propagation-blocking to the Ctrl+Shift+Click event's original click behavior.
6. IF the target element is removed or becomes invalid before the Highlight_Shortcut_Capture completes, THEN THE Report_Editor SHALL cancel the capture without performing a Fallback_Click_Replay and SHALL indicate that the user should retry; WHILE the target element remains valid throughout the Highlight_Shortcut_Capture, THE Report_Editor SHALL NOT cancel the capture.

### Requirement 10: 리포트 생성 시 LLM 초안 제안과 사용자 승인

**User Story:** As an 작성자, I want 리포트를 생성할 때 LLM이 매핑된 이미지 시퀀스와 컨텍스트를 바탕으로 보고서명과 형상·체크아웃 개요의 초안을 작성해 주고, 나는 이를 검토해 승인하거나 수정하고 싶다, so that 매번 직접 타이핑하지 않고도 정확한 내용을 빠르게 완성할 수 있다.

#### Acceptance Criteria

1. WHEN a user triggers report generation (미리보기 or ZIP 산출물 생성) for a Draft_Report or Project that has at least one Feature_Spec with mapped Evidence, THE Report_Editor SHALL request a Report_Draft_Suggestion for 보고서명 and 형상·체크아웃 개요 from the internal LLM, using the mapped Evidence's image sequence and context information as input.
2. WHEN the internal LLM returns a Report_Draft_Suggestion, THE Report_Editor SHALL present the suggested 보고서명 and 형상·체크아웃 개요 values to the user for review without applying them to the QA_Report automatically.
3. WHEN a Report_Draft_Suggestion has been presented to the user and the user then approves it, THE Report_Editor SHALL set the QA_Report's 보고서명 and/or 형상·체크아웃 개요 field to the approved value.
4. WHEN a Report_Draft_Suggestion has been presented to the user and the user edits the presented value before approving, THE Report_Editor SHALL save the user-edited value rather than the original LLM-suggested value.
5. THE Report_Editor SHALL NOT finalize 보고서명 or 형상·체크아웃 개요 from a Report_Draft_Suggestion without both a prior presentation of that Report_Draft_Suggestion to the user and an explicit user approval or edit-and-approve action on it.
6. IF the internal LLM connection is unavailable or the request fails when generating a Report_Draft_Suggestion, THEN THE Report_Editor SHALL leave 보고서명 and 형상·체크아웃 개요 at their current values (empty or previously set) and SHALL allow the user to enter or edit those fields manually without blocking 미리보기 or ZIP 산출물 생성.
7. THE Report_Editor SHALL NOT allow a Report_Draft_Suggestion to set a Verdict or any PASS/FAIL determination for any Feature_Spec.

### Requirement 6: 기존 판정·편집·경고 원칙 유지

**User Story:** As a QA 관계자, I want 재설계된 상호작용 흐름이 기존 판정 및 편집 원칙을 그대로 유지하기를 원한다, so that 입력 방식이 바뀌어도 QA 결과의 신뢰성이 약화되지 않는다.

#### Acceptance Criteria

1. THE Report_Editor SHALL require the user to directly select PASS or FAIL for each Feature_Spec's Verdict without inferring the Verdict automatically.
2. WHEN a Verdict has been set for a Feature_Spec, THE Report_Editor SHALL continue to allow editing of that Feature_Spec's content, Verdict, and connected Evidence.
3. THE Report_Editor SHALL maintain exactly one Test_Result_Set per Feature_Spec.
4. IF 검증 내용, 기대 결과, 실제 결과, or Evidence 매핑 is missing for a Feature_Spec, THEN THE Report_Editor SHALL display a non-blocking warning and SHALL allow the user to continue 미리보기 and ZIP 산출물 생성.
5. IF one or more Feature_Spec in a Draft_Report or Project has no Verdict selected, THEN THE Report_Editor SHALL display a non-blocking warning and SHALL allow the user to complete 미리보기 and ZIP 산출물 생성 without requiring a Verdict for every Feature_Spec.
6. WHEN a Feature_Spec's Test_Result_Set has no Verdict_Confirmation yet, THE Report_Editor SHALL display the Verdict selection control with PASS as the Default_Verdict_Selection while continuing to treat that Test_Result_Set's Verdict as unset (미판정) for overallStatus and non-blocking warning purposes.
7. THE Report_Editor SHALL NOT set a Feature_Spec's Verdict to PASS, or to any value, from a Default_Verdict_Selection without the user performing a Verdict_Confirmation action on that Test_Result_Set.
8. WHEN a user performs a Verdict_Confirmation action while the Verdict selection control shows the Default_Verdict_Selection unchanged, THE Report_Editor SHALL set that Feature_Spec's Verdict to PASS as a direct user selection, consistent with 6.1.
9. THE Report_Editor SHALL NOT infer or set any Feature_Spec's Verdict based on analysis of Evidence images or text content, regardless of the Default_Verdict_Selection presented by the Verdict selection control.

### Requirement 7: 데이터 모델 및 산출물 하위 호환성 유지

**User Story:** As a 시스템 유지보수자, I want 상호작용 모델이 바뀌어도 QA_Report 데이터 스키마와 생성된 보고서 산출물이 하위 호환성을 유지하기를 원한다, so that 기존 ZIP 뷰어, 자동화 테스트, 레거시 업로드 흐름이 변경 없이 계속 동작한다.

#### Acceptance Criteria

1. THE QA_Report data model SHALL continue to define 보고서명, 프로젝트명, 작성자, changePurpose, changeSummary, and configurationOverview as fields, each defaulting to an empty string or system-generated default when not provided.
2. WHEN Report_Builder generates manifest.json for a Draft_Report or Project, THE Report_Builder SHALL include the 보고서명, 프로젝트명, 작성자, changePurpose, changeSummary, and configurationOverview fields regardless of whether their values are empty.
3. IF changePurpose, changeSummary, and configurationOverview are all empty for a Draft_Report or Project, THEN THE Report_Builder SHALL always omit the 변경 개요 섹션 entirely from the generated HTML and Markdown report, without rendering an empty placeholder section.
4. WHEN at least one of changePurpose, changeSummary, or configurationOverview is non-empty, THE Report_Builder SHALL render the 변경 개요 섹션 containing only the non-empty fields among the three.
5. FOR ALL QA_Report values with any combination of empty and non-empty changePurpose, changeSummary, and configurationOverview, generating manifest.json then rendering HTML and Markdown from that manifest.json SHALL produce a 변경 개요 섹션 presence and content that is consistent between the HTML and Markdown outputs.
6. THE Report_Builder SHALL preserve the existing manifest.json schema fields used for Evidence-to-Feature_Spec mapping (evidence id, sessionId, sequenceNo, triggerType, capturedAt, source, description, previousCaptureId, nextCaptureId, file, and context fields) regardless of whether Evidence was mapped via Drag_And_Drop_Mapping, Alternative_Mapping_Control, Capture_Session_Set-level mapping, or the Quick_Mapping_Dialog.
9. THE QA_Report data model SHALL NOT require a schema change to represent a Report_Draft_Suggestion; any Report_Draft_Suggestion state SHALL be resolved to a plain 보고서명 or 형상·체크아웃 개요 string value before being written to manifest.json.
7. IF 보고서명 is empty for a Draft_Report or Project, THEN THE Report_Builder SHALL display the 기본 보고서명 in place of 보고서명 in the generated manifest.json title field, HTML report, and Markdown report.
8. IF 작성자 is empty for a Draft_Report or Project, THEN THE Report_Builder SHALL render the HTML and Markdown report's author display area as empty rather than displaying a placeholder value.

### Requirement 8: 단계별 다음 행동 안내

**User Story:** As an 작성자, I want 각 단계에서 다음에 뭘 해야 하는지 안내를 받고 싶다, so that 새로운 흐름에서도 무엇을 먼저 해야 할지 헷갈리지 않는다.

#### Acceptance Criteria

1. WHILE the Evidence_Inbox contains no Evidence, THE Report_Editor SHALL display guidance directing the user to start a Capture_Session or import images.
2. WHILE a Feature_Spec exists with a Test_Result_Set that has no mapped Evidence, THE Report_Editor SHALL display guidance directing the user to drag a Capture_Session_Set or Evidence item onto that Test_Result_Set.
3. WHEN a Capture_Session_Set or individual Evidence item is successfully mapped to a Feature_Spec's Test_Result_Set for the first time in that Test_Result_Set, THE Report_Editor SHALL display guidance suggesting the next action, including entering 검증 내용/기대 결과/실제 결과 또는 Verdict 선택.
4. WHILE a Draft_Report has not been saved as a Project, THE Report_Editor SHALL display guidance indicating that saving as a Project is optional and can be completed after 미리보기 or 산출물 생성.
5. WHILE a Draft_Report contains no Feature_Spec, THE Report_Editor SHALL display guidance directing the user to add a Feature_Spec before mapping Evidence.
6. WHEN a user opens the Report_Editor and a Capture_Session is already active, THE Report_Editor SHALL display an indication that a Capture_Session is currently active; WHEN no Capture_Session is active, THE Report_Editor SHALL display guidance directing the user to start one.
7. WHEN a Report_Draft_Suggestion is presented to the user, THE Report_Editor SHALL display guidance indicating that the suggested 보고서명 and 형상·체크아웃 개요 values require the user's approval or edit before being saved.
