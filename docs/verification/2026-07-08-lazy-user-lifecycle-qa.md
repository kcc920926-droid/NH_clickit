# CaptureIT 편집기 UX 개편 QA 검증 — "귀찮은 유저" 관점

- 최초 검증일: 2026-07-08
- 재검증일: 2026-07-08 (2차) — 사용자가 증적확인 단계에 곡선 커넥터/인라인 편집/SVG 아이콘 패치를 추가 적용한 뒤 재검토
- 재검증일: 2026-07-08 (3차) — "2단계(증적확인+매핑)와 3단계(결과 입력)를 굳이 나눌 필요가 있는가"라는 사용자 질문에 따라 두 단계를 `stage-mapping-result` 하나로 통합. 전체 구조가 캡처(1) → 매핑+결과입력(2) → 완료(3) 3단계로 축소됨

## 3차 재검증 요약 — 2·3단계 통합

**배경**: 2차 검증에서 지적한 1-1 문제(매핑된 증적이 3단계에서 안 보임)의 근본 원인은 "매핑 화면"과 "결과 입력 화면"이 서로 다른 컨테이너로 분리돼 있었기 때문이었다. 사용자가 이 분리 자체의 필요성에 의문을 제기했고, 검토 결과 두 단계가 겹치는 정보(테스트케이스, 매핑된 증적)가 많아 통합이 타당하다고 판단했다.

**변경 내용**:
- `extension/shared/wizard-stage.js`: `STAGES`가 `['capture', 'evidence-review', 'result', 'completion']`(4단계)에서 `['capture', 'mapping-result', 'completion']`(3단계)로 축소. `computeReachableStages`/`planActions`도 3단계 기준으로 재작성
- `extension/editor.html`: `#stage-evidence-review`와 `#stage-result`를 `#stage-mapping-result` 하나로 병합. Evidence Inbox(좌)와 테스트케이스 목록+결과 입력 폼(우)을 나란히 배치하는 `.mapping-result-grid` 2컬럼 레이아웃 신설. `#feature-mapping-target`은 이제 항상(어떤 조건에서도) 보이는 상태로 정적 배치됨 — 더 이상 숨겨지는 컨테이너로 재배치되지 않음
- `extension/editor.js`: `mountRegion()`(런타임 DOM 재배치 헬퍼)이 완전히 제거됨 — evidence-drop-zone/feature-panel/feature-mapping-target/.actions가 이제 전부 `stage-mapping-result` 안에 고정 배치되어 있어 재배치가 필요 없어짐. `advanceToMapping`/`stageEvidenceReview`/`stageResult`/`sideColumn`/`workColumn` 관련 코드 전부 제거. `renderMappingLinks()`는 계속 곡선 커넥터를 그리되, 이제 그 대상(테스트케이스 카드)이 같은 화면에 있으므로 "매핑 확인"이 판정 입력과 분리되지 않음
- `extension/editor.css`: `#stage-evidence-review`/`#stage-result`/`.side-column`/`.work-column` 관련 규칙을 `#stage-mapping-result`/`.mapping-result-grid`/`.mapping-result-column`으로 교체
- 관련 테스트(`tests/editor-shell.test.cjs`, `tests/wizard-stage-shell.test.cjs`, `tests/wizard-stage-properties.test.cjs`) 9건을 3단계 구조에 맞게 갱신

**1-1 문제의 결과**: 별도 수정 없이 구조적으로 해소됨. 매핑된 증적이 이제 항상 화면에 있는 `#feature-mapping-target`에 표시되며, 곡선 커넥터도 같은 화면에서 테스트케이스 카드까지 이어진다. "2단계에서 잘 보이던 정보가 3단계에서 사라진다"는 낙차 자체가 없어졌다.

**1-2 문제의 결과**: 부분 개선. `planActions` stage 1(매핑+결과)의 `secondary`에 `add-feature`가 항상 포함되므로, 테스트케이스가 하나도 없어도 최소한 보조 스타일 버튼들은 화면에 계속 보인다(이전엔 조건 미충족 시 다음 버튼이 완전히 사라졌음). 다만 `add-feature`가 primary로 승격되는 조건은 여전히 없어, "지금 뭘 눌러야 하는지"에 대한 강한 신호는 아직 부족하다.

이제 화면은 캡처(1) → 매핑+결과입력(2, 좌우 2컬럼) → 완료(3) 3단계로 구성된다. 아래 1차/2차 검증 내용은 통합 이전 4단계 구조를 기준으로 작성됐으므로, 구조 관련 서술(1-1, 3-1 일부)은 참고용으로만 남기고 상태를 갱신했다.
- 검증 방식: 정적 코드 분석(`extension/editor.html`, `extension/editor.js`, `extension/shared/wizard-stage.js`, `extension/shared/domain.js`, `tests/*.test.cjs`) + `node --test tests/*.test.cjs` 전체 실행
- 미실행 항목: 실제 Edge/Chrome 브라우저 렌더링 검증(이 환경에 브라우저 실행 파일 없음). 아래 판정은 DOM 구조/이벤트 바인딩/CSS `hidden` 로직/SVG path 계산을 코드 레벨로 추적한 결과이며, 실제 클릭 흐름은 코드가 정확히 반영됨을 전제로 한다. 배포 전 최소 1회 실제 브라우저 스팟 체크를 권장한다.
- 페르소나: "클릭/입력이 아주 귀찮고, 뭘 눌러야 할지 모르는" 최소 개입 사용자

## 2차 재검증 요약 (사용자 요청 3건)

사용자가 직접 요청한 3가지는 모두 코드에 반영되어 있다.

| # | 요청 | 상태 | 근거 |
|---|---|---:|---|
| 1 | Evidence가 테스트케이스에 매핑됐다는 시각 정보(곡선 노드 연결) | 구현됨 | `#mapping-link-layer`(SVG), `renderMappingLinks()`가 매핑된 `capture-graph`와 테스트케이스 카드 사이를 3차 베지어 곡선(`C` 커맨드)으로 연결 |
| 2 | 테스트케이스명 인라인 input 편집 | 구현됨 | `featureCard()`의 `<input class="feature-title-input">`이 목록에 상시 노출되며 `change`/Enter로 저장 |
| 3 | 멘트 버튼 → 아이콘/SVG | 구현됨(부분) | `iconSvg()`/`iconButton()` 헬퍼로 위/아래/삭제/펼치기/접기/매핑/상세보기 버튼을 SVG 아이콘화. 단, `#add-feature`(＋)는 여전히 텍스트 문자이고, 완료 단계의 4개 액션 버튼(LLM 추천/미리보기/생성/저장)은 여전히 텍스트임 — 요청 범위가 "증적확인 세션"이었으므로 이 두 곳은 범위 밖일 수 있음, 확인 필요 |

세부 코드 검토 결과는 아래 3-1~3-3.

### 3-1. 곡선 커넥터 구현 세부 검토

`renderMappingLinks()`(editor.js)가 하는 일:
- `activeStageIndex !== 1`이거나 stage가 `hidden`이면 아무것도 안 그림(불필요한 계산 방지) — 적절함
- `#evidence-inbox` 안의 매핑된 `.capture-graph[data-feature-ids]`를 찾아, 그 헤더 우측 끝(`.capture-graph-header`)에서 대응하는 테스트케이스 카드(`.feature-title-row`) 좌측까지 3차 베지어 곡선을 그림
- `bend = Math.max(80, Math.abs(endX - startX) * 0.5)`로 곡률을 좌우 거리에 비례시켜 "자연스럽게 굴절되는" 느낌을 준다 — 요청 의도에 부합
- `scheduleMappingLinks()`가 `requestAnimationFrame`으로 디바운스하고, `renderFeatures()`/`renderEvidence()`/`renderStage()`/펼치기토글/윈도우 리사이즈 시점마다 재계산을 트리거함 — 레이아웃이 바뀔 때마다 선이 따라가도록 되어 있어 견고함

**발견된 문제 (경미)**: `graphLinkSources(graph, featureId)`가 항상 `.capture-graph-header` 하나만 반환한다. 즉 그래프 안에 서로 다른 여러 테스트케이스에 매핑된 evidence가 섞여 있어도(예: 세션 캡처 3개 중 1개는 테스트케이스 A, 2개는 테스트케이스 B에 매핑), 시작점은 그래프 헤더 하나뿐이라 두 선이 같은 지점에서 시작해서 겹쳐 보일 수 있다. 이는 "이 evidence가 정확히 어디 매핑됐는지"라는 요청 1의 취지를 그래프가 여러 매핑을 가질 때는 완전히 만족하지 못하는 부분이다. 다만 흔한 경우(그래프 전체가 한 테스트케이스에 매핑)에서는 문제없다.

**여전히 남은 이슈 (1차 검증에서 지적한 1-1과 연결)**: 곡선 커넥터는 2단계(증적확인+매핑)에서만 그려진다(`activeStageIndex !== 1`이면 스킵). 3단계(결과 입력, Result_Stage)로 넘어가면 `#feature-mapping-target`이 여전히 강제로 `hidden = true`이고 `sideColumn`(숨겨진 컨테이너)으로 옮겨진다(아래 1-1 참고, 미해결). 즉 "매핑됐다"는 시각 정보가 2단계에서는 잘 보이지만, 실제 판정을 내리는 3단계에서는 다시 안 보이는 상태로 되돌아간다. 요청 1을 2단계에 한정해서 봤다면 충분히 해결됐지만, "매핑 확인"이라는 목적 자체는 3단계에서도 필요하므로 1-1 수정과 함께 고려할 필요가 있다.

### 3-2. 테스트케이스명 인라인 input 검토

`featureCard()`가 `.feature-title-row`에 `<span class="feature-index">`, `<input class="feature-title-input">`, `<span class="feature-status-pill">`를 나란히 배치한다. `titleInput`은:
- `focus`/`click`에서 `stopPropagation`으로 카드 선택 로직과 분리
- `change`에서 `saveFeatureTitle()` 호출, Enter 키는 `blur()`를 트리거해 자연스럽게 저장
- 빈 값 저장 시 `saveFeatureTitle()`이 `'제목 없는 테스트케이스'`로 대체(빈 제목 방지)

기존에 있던 더블클릭 인라인 편집(`startFeatureTitleEdit`, `.feature-select` 버튼 기반)은 `featureCard()`에서 완전히 걷어내졌다. `tests/editor-shell.test.cjs`의 관련 테스트도 이미 "feature cards expose testcase title as an editable input..."으로 갱신되어 새 `<input>` 패턴을 검사하므로 회귀는 아니다.

**정리 필요(경미)**: 다만 `startFeatureTitleEdit()` 함수 자체는 `editor.js`에 여전히 정의돼 있고 어디서도 호출되지 않는 죽은 코드로 남아있다(`saveFeatureTitle`은 여전히 새 `<input>`의 `change` 핸들러에서 쓰이므로 죽은 코드가 아님 — `startFeatureTitleEdit`만 해당). 기능상 문제는 없으나 다음 정리 때 제거를 권장한다.

### 3-3. 아이콘/SVG 전환 검토

`iconSvg(name)`이 `iconPaths` 맵(위/아래 화살표, 체브런, 눈, 링크, 플러스, 트래시)에서 path data를 가져와 인라인 SVG를 만들고, `iconButton()`이 `aria-label`/`title`을 유지하면서 텍스트 대신 아이콘을 붙인다. 스크린리더 접근성이 텍스트 라벨로 유지되는 점은 좋다.

적용된 곳: 테스트케이스 카드의 위/아래/삭제 버튼, evidence의 "테스트케이스에 매핑" 버튼(`mapToFeatureButton`), Capture_Graph 펼치기/접기 토글, 최근 캡처의 "상세" 버튼.

적용 안 된 곳(텍스트 그대로): `#add-feature`(＋ 문자, `class="icon-button"`이지만 SVG가 아니라 유니코드 플러스 문자), Evidence 카드의 "↑"/"↓"/"Inbox로"/"삭제"/"이 테스트케이스에 연결" 버튼(`evidenceCard()` 함수는 여전히 `button('↑', ...)` 텍스트 버튼 헬퍼를 사용), 완료 단계의 4개 액션 버튼.

**판단**: 사용자가 "증적확인 세션"을 지목했으므로, 증적확인 단계(2단계)에 실제로 노출되는 버튼들(Capture_Graph의 매핑/펼치기 버튼)은 커버됐다. 다만 **매핑된 evidence 카드**(`evidenceCard()`, `#mapped-evidence`에 렌더링되는 카드)의 ↑/↓/Inbox로/삭제 버튼은 텍스트 그대로인데, 이 카드는 3단계(결과 입력)에서 보여야 할 대상이라 지금은 `#feature-mapping-target`이 숨겨져 있어(1-1) 사용자가 마주칠 일이 없다. 1-1을 고치면 이 텍스트 버튼들도 같이 아이콘화 대상에 들어가야 한다.

## 총평 (갱신)

구조 단순화(5단계→4단계 병합, select→토글 버튼, 캡처 노드 그리드 개선)에 이어, 이번 패치에서 곡선 커넥터·인라인 편집·아이콘화까지 잘 반영됐다. 다만 아래 1-1(매핑 결과를 3단계에서 볼 수 없음)은 **여전히 미해결**이고, 이번 패치로 오히려 "2단계에서는 곡선으로 잘 보이는데 3단계로 가면 안 보인다"는 낙차가 더 뚜렷해졌다. 나머지는 지난 검증과 동일하거나 경미한 후속 정리 항목이다.

## 1. 심각도 높음 — 3차 검증 결과: 해결됨 (참고용으로 원문 유지)

### 1-1. [해결됨] 매핑된 증적이 3단계(결과 입력)에서 여전히 보이지 않음 → 2·3단계 통합으로 구조적 해소

**3차 검증 결과**: 2단계(증적확인+매핑)와 3단계(결과 입력)를 하나로 합치면서, 매핑된 증적을 보여주는 `#feature-mapping-target`이 항상 화면에 존재하는 정적 위치로 옮겨졌다. 더 이상 `hidden`이나 `sideColumn`(숨겨진 컨테이너)으로 옮겨지지 않는다. 아래는 통합 전(4단계 구조) 기준으로 작성된 원래 분석이다.

**증상**: 테스트케이스에 증적을 매핑해도(`이 테스트케이스에 매핑` 버튼 클릭, 드래그앤드롭, Quick Mapping 다이얼로그 무엇을 쓰든), "선택된 증적" 그리드(`#mapped-evidence`)와 매핑 안내 문구(`#feature-mapping-guidance`)가 화면에 절대 나타나지 않는다.

**근거**(`extension/editor.js`, `renderStage()`):
```js
mountRegion(elements.featureMappingTarget, elements.sideColumn);
elements.featureMappingTarget.hidden = true;
```
`elements.sideColumn`은 `editor.html`에서 `<aside class="side-column" hidden>`로 항상 숨겨진 컨테이너다. `renderStage()`는 `activeStageIndex`와 무관하게 매번 `featureMappingTarget`을 이 숨겨진 컨테이너로 옮기고, 추가로 `hidden = true`를 직접 지정한다. Result_Stage(3단계, "결과 입력")에서도 예외 처리가 없다.

**영향**:
- "이 테스트케이스에 무슨 증적이 몇 개 연결됐는지" 확인 불가 → 3단계(테스트 성공여부 확인)에서 판정을 내릴 때 근거 이미지를 볼 수 없음
- 매핑된 증적을 순서 변경(`↑`/`↓`)하거나 "Inbox로" 되돌리는(unmap) 기능이 UI에서 도달 불가 — 코드는 살아있지만 진입 경로가 없음
- 유일한 대체 신호는 Evidence Inbox 카드에 붙는 작은 뱃지(`.capture-node-mapping-badge`, 매핑된 테스트케이스명 표시)뿐이며, 이건 "이 카드가 어딘가엔 매핑됐다"만 알려주고 "이 테스트케이스엔 정확히 이 증적들이 연결됐다"는 확인은 못 해준다.

**"귀찮은 유저" 관점 문제**: 매핑을 했는지 안 했는지, 제대로 됐는지 눈으로 확신할 수 없으면 사용자는 같은 증적을 여러 번 클릭해서 매핑을 반복 시도하거나, 매핑이 안 됐다고 오해하고 이탈할 가능성이 높다.

**제안**: `activeStageIndex === 2`(Result_Stage)일 때는 `featureMappingTarget`을 `stageResult`로 되돌려 마운트하고 `hidden`을 해제해야 한다. 즉:
```js
mountRegion(elements.featureMappingTarget, activeStageIndex === 2 ? elements.stageResult : elements.sideColumn);
elements.featureMappingTarget.hidden = activeStageIndex !== 2;
```

2차 검증에서 이 문제가 더 눈에 띄게 된 이유: 이번 패치로 2단계에 곡선 커넥터가 추가되면서 "이 evidence가 어디 매핑됐는지"가 2단계에서는 아주 잘 보이게 됐다. 그런데 정작 판정을 내려야 하는 3단계로 넘어가면 그 정보가 다시 사라진다. 사용자 입장에서는 "방금 잘 보였던 정보가 다음 단계에서 없어졌다"는 낙차를 느끼게 되므로 우선순위가 더 올라간 문제로 본다.

### 1-2. [부분 개선] 2단계(증적확인+매핑)에서 "다음 행동" CTA가 조건 충족 전까지 완전히 사라짐

**3차 검증 결과**: `add-feature`가 이제 통합된 stage 1의 `secondary`에 항상 포함되어(이전엔 `advance-to-mapping`이 primary 조건 미충족 시 유일한 액션이 통째로 사라졌음) 최소한의 보조 버튼은 계속 보인다. 다만 `add-feature`를 primary로 승격하는 조건은 추가하지 않았으므로, "테스트케이스가 0개일 때 여기부터 시작하라"는 강한 시각적 신호는 여전히 없다. 아래는 통합 전 분석 원문이다.

**증상**: 2단계에 처음 진입하면(아직 테스트케이스를 추가하지 않았거나, 추가했지만 증적을 매핑하지 않은 상태) 화면에 강조된 버튼이 하나도 없다. "결과 입력으로 이동" 버튼(`#advance-to-mapping`)은 아예 `hidden` 처리되어 사라진다.

**근거**(`extension/shared/wizard-stage.js`, `planActions` stage 1):
```js
case 1:
  return {
    primary: context.currentFeatureHasMappedEvidence ? 'advance-to-mapping' : null,
    secondary: ['add-feature'],
  };
```
`applyActionPlan()`은 `primary`도 `secondary`도 아닌 액션에 대해 `button.hidden = true`를 적용하므로, 매핑이 하나도 안 된 상태에서는 "다음으로" 버튼이 완전히 숨겨지고, 유일하게 강조되는 요소는 테스트케이스 목록 패널의 작은 `＋` 아이콘 버튼(34×34px, `#add-feature`)뿐이다.

**"귀찮은 유저" 관점 문제**: 처음 이 화면을 본 사용자는 "지금 뭘 눌러야 하는지" 힌트가 화면 어디에도 크게 없다. 유일한 인터랙션은 잘 안 보이는 작은 ＋ 아이콘이고, 그마저도 클릭한 뒤 증적을 매핑해야만 다음 버튼이 나타난다는 사실을 안내받지 못한다.

**제안**: `add-feature`가 primary일 조건이 없어 항상 secondary 스타일(약한 강조)로만 보인다. 테스트케이스가 0개인 상태에서는 `add-feature`를 primary로, 1개 이상이지만 매핑이 0인 상태에서는 "증적을 드래그하거나 매핑 버튼을 누르세요" 같은 안내를 이 단계 전용 배너로 노출하는 것이 필요하다(현재 `renderGuidance()`는 이 상태를 위한 전용 문구가 없다).

2차 검증 결과: `wizard-stage.js`의 `planActions`와 `editor.js`의 `renderGuidance()`는 이전 검증 시점과 동일하며, 이번 패치에서 손대지 않았다. 즉 이 문제는 그대로 남아있다. `#add-feature` 버튼도 여전히 유니코드 "＋" 문자이고 SVG로 바뀌지 않았다(요청 3의 아이콘화 대상에서 빠진 것으로 보임 — 3-3 참고).

## 2. 심각도 중간 (2차 검증에서도 미해결, 이번 패치 범위 밖으로 추정)

### 2-1. 판정 토글에 영어 잔존 — "NONE"

**증상**: 판정 선택 토글에 `PASS` / `FAIL` / `NONE` 세 버튼이 있는데, 마지막 버튼 텍스트가 영어 "NONE"이다.

**근거**(`extension/editor.html`):
```html
<button class="verdict-toggle-option" data-verdict-value="" type="button" role="radio" aria-checked="false">NONE</button>
```
`confirmVerdict()`의 메시지도 동일하게 새어나온다: `` setMessage(`판정을 확정했습니다: ${confirmedValue || 'NONE'}`) ``.

이전 UX 개편 스펙(`capture-wizard-ux-redesign`)에서 "영어 기술 라벨을 한국어로 전면 교체"가 명시적 요구사항이었던 것과 배치된다. "미판정" 등 한국어 라벨로 교체가 필요하다.

### 2-2. 표기 통일 안 됨 — "캡처" vs "캡쳐"

**증상**: 같은 화면 안에서 두 표기가 혼용된다.
- 올바른 표기(다수): `1단계 · 캡처 시작`, `캡처 시작`(h2)
- 비표준 표기: 세션 상태 배지 `자동캡쳐 꺼짐`/`자동캡쳐 켜짐`, 버튼 `자동 캡쳐 시작`/`자동 캡쳐 종료`, 힌트 문구 `...또는 우클릭 후 캡쳐.`

**"귀찮은 유저" 관점 문제**: 크게 기능적 문제는 아니지만, 짧은 문서 안에서 표기가 흔들리면 신뢰도가 떨어진다. "캡처"로 통일 권장.

### 2-3. "검증 내용" 입력창이 숨겨져 있어 일반 흐름에서는 채워지지 않음 → 완료 단계에서 항상 경고

**증상**: `#verification`(검증 내용) textarea가 `hidden` 처리됐다(입력 폼 단순화 목적으로 보임). 그런데 `CaptureITDomain.validationWarnings()`는 여전히 `result.verification.trim()`이 비어 있으면 경고를 발생시킨다:
```js
if (!result.verification.trim()) add('MISSING_VERIFICATION', '검증 내용이 비어 있습니다.');
```
일반 매핑 경로(Alternative_Mapping_Control 버튼, 드래그앤드롭)로 매핑한 테스트케이스는 `verification`을 채울 방법이 UI에 없다(Quick Mapping Dialog로 매핑한 경우만 예외적으로 채워짐). 결과적으로 4단계(완료)의 "검증 안내" 박스에는 거의 항상 "검증 내용이 비어 있습니다" 경고가 뜨게 된다.

**"귀찮은 유저" 관점 문제**: 사용자가 화면에 보이는 필드(기대 결과/실제 결과/판정)를 전부 채웠는데도 경고가 계속 뜨면 "내가 뭘 빠뜨렸다는 건지" 혼란스럽고, 경고를 무시하는 습관이 생긴다.

**제안**: 셀 중 하나를 선택 —
  (a) `validationWarnings()`에서 `verification` 체크를 제거(입력 UI를 없앤 의도를 데이터 모델에도 반영), 또는
  (b) "기대 결과" 필드 값을 저장 시 `verification`에도 자동 매핑, 또는
  (c) 완료 단계 경고 문구를 실제로 입력 가능한 필드 기준으로만 재작성.
  현재 상태로 두면 경고가 항상 "거짓 양성"으로 뜬다.

2차 검증 결과: `domain.js`의 `validationWarnings()`는 변경 없이 동일하다. 이 문제도 그대로 남아있다.

## 3. 잘 구현된 부분 (유지/참고, 2차 검증 반영)

| 항목 | 상태 | 근거 |
|---|---:|---|
| 5단계 → 4단계 병합(증적확인+매핑 통합) | 구현됨 | `wizard-stage.js` STAGES 배열, `#stage-tab-mapping` 완전 제거, `tests/wizard-stage-shell.test.cjs` |
| 캡처 모드 select → 토글 버튼 | 구현됨 | `.mode-toggle`, `setCaptureMode()`, 접근성 role="radiogroup"/aria-checked 적용 |
| 판정 select → 토글 버튼(PASS/FAIL/NONE) | 구현됨(라벨만 영어 잔존, 2-1 참고) | `.verdict-toggle`, `setVerdictValue()` |
| Verdict_Confirmation 원칙(확정 전까지 status는 null) 유지 | 유지됨 | `confirmVerdict()`가 유일한 확정 지점, `pendingVerdictByFeatureId`로 표시값만 분리 |
| Evidence 카드에 매핑 여부 뱃지 표시 | 유지됨 | `.capture-node-mapping-badge`, `mappedFeatureTitle()` |
| 증적 상세 다이얼로그 이전/다음 탐색 | 유지됨 | `#previous-evidence-detail`/`#next-evidence-detail`, `moveEvidenceDetail()` |
| **곡선 커넥터로 매핑 시각화(2단계 한정)** | **신규 구현(요청 1)** | `#mapping-link-layer` SVG, `renderMappingLinks()`, 3차 베지어 곡선. 3단계에서는 여전히 안 보임(1-1과 연결) |
| **테스트케이스명 상시 인라인 input** | **신규 구현(요청 2)** | `featureCard()`의 `.feature-title-input`, 더블클릭 방식에서 상시 노출 방식으로 전환 |
| **주요 아이콘 버튼 SVG화** | **신규 구현(요청 3, 부분)** | `iconSvg()`/`iconButton()`, 위/아래/삭제/펼치기/접기/매핑/상세보기 아이콘화. `#add-feature`·완료 단계 버튼·매핑된 evidence 카드 버튼은 아직 텍스트(3-3 참고) |
| 저장 위치/LLM 설정/작업 보고서를 헤더 다이얼로그로 분리 | 유지됨 | `#storage-detail-dialog`, `#llm-settings-dialog`, `#report-switch-dialog` |
| 단계 탭 자유 이동(비활성화 제거) | 구현됨(의도적 완화로 추정) | `renderStage()`의 `elements.stageTabs[index].disabled = false` — 데이터 충족 여부와 무관하게 모든 탭 클릭 가능. 마찰은 줄지만 완료 탭으로 바로 이동해 빈 화면을 볼 수 있는 리스크는 있음 |

## 4. "귀찮은 유저" 개선 제안 (우선순위 순, 2차 검증 갱신)

1. **(필수)** 1-1 수정 — Result_Stage(3단계)에서 매핑된 증적/곡선 연결 정보를 다시 보이게 한다. 2단계에서 잘 보이던 정보가 3단계에서 사라지는 낙차가 이번 패치로 더 뚜렷해졌다.
2. **(필수)** 2-3 처리 — 완료 단계 경고가 항상 거짓 양성으로 뜨지 않게 한다(`verification` 필드 관련, `domain.js` 변경 필요).
3. **(권장)** 1-2 개선 — 2단계 진입 시 안내 배너 추가 또는 `add-feature`를 조건부 primary로 승격.
4. **(권장)** `renderGuidance()`에 "테스트케이스는 있지만 매핑 안 됨" 전용 안내 문구 추가.
5. **(권장)** 2-1 라벨 교체 — "NONE" → "미판정".
6. **(권장, 신규)** `#add-feature`(＋ 문자)와 매핑된 evidence 카드(`evidenceCard()`)의 ↑/↓/Inbox로/삭제/연결 버튼도 `iconSvg()`/`iconButton()`으로 통일 — 요청 3의 적용 범위를 증적확인 단계 전체로 넓히면 일관성이 생긴다. 특히 매핑된 evidence 카드는 1-1을 고치면 곧 사용자에게 노출될 영역이라 함께 처리하는 게 효율적이다.
7. **(선택)** 2-2 표기 통일 — "캡쳐" → "캡처".
8. **(선택)** 3-1에서 지적한 대로, 한 Capture_Graph 안에 여러 테스트케이스로 나뉘어 매핑된 evidence가 있을 때 곡선 시작점이 겹치는 문제 — 실사용 빈도가 낮다면 우선순위 낮게 유지해도 무방.
9. **(선택)** `startFeatureTitleEdit()` 죽은 코드 제거(3-2).
10. **(선택)** 단계 탭 자유 이동을 유지할 경우, 완료 탭에 데이터가 부족할 때 보여줄 빈 상태 안내가 있는지 확인.

## 5. 테스트 실행 결과 (3차 검증, 2·3단계 통합 이후)

```powershell
node --test tests/*.test.cjs
```

```text
# tests 138
# pass 138
# fail 0
```

통합 작업 중 9개 테스트(4단계 구조를 직접 가정한 것들: `editor stage renderer...`, `evidence review stage mounts...`, `editor shell has four wizard-stage containers...`, `editor shell uses testcase wording...`, `evidence review shell labels stage 2...`, `result stage omits...`, `wizard stage model merges...`, `editor shell exposes four stage-tab buttons...`, `editor shell exposes only the merged review advance button`)이 실패했고, 전부 3단계 구조를 검증하도록 다시 작성해 통과시켰다. `mountRegion` 관련 assertion처럼 이제 존재하지 않는 함수/패턴을 찾던 테스트는 새 정적 배치 구조(`.mapping-result-grid`, `#feature-mapping-target`이 항상 보임)를 검증하도록 교체했다.

`get_diagnostics` 결과: `editor.html`/`editor.js`/`editor.css`/`wizard-stage.js` 모두 이상 없음.

**2차 검증 시점 결과(참고, 통합 전)**:
```text
# tests 138
# pass 138
# fail 0
```

**주의**: 위 138개 테스트는 전부 정적 문자열/구조 검사(`fs.readFileSync` 기반) 또는 순수 함수 property 테스트이며, "요소가 실제로 화면에 렌더링되는가"(예: `hidden` 속성이 런타임에 어떤 값으로 계산되는가, SVG path의 좌표가 실제로 올바른가) 같은 DOM 실행 결과는 검증하지 않는다. 1-1 문제가 두 차례 검증 모두에서 테스트 스위트를 통과하면서도 실제로는 존재하는 것이 이를 보여준다. 곡선 커넥터(`renderMappingLinks()`)의 좌표 계산 로직도 마찬가지로 정적 검사로는 "SVG path가 그려지는 코드가 있다"까지만 확인 가능하고 "실제로 두 카드 사이를 정확히 연결하는가"는 브라우저 확인이 필요하다. 최소한의 jsdom 기반 렌더 테스트(또는 실제 브라우저 스모크) 도입을 다시 권장한다(신규 devDependency 추가는 별도 논의 필요).

## 6. 결론 (3차 검증, 최신)

2단계(증적확인+매핑)와 3단계(결과 입력)를 하나로 통합하면서, 2차 검증의 최우선 문제였던 1-1(매핑 정보가 다음 단계에서 사라짐)이 별도 패치 없이 구조적으로 해소됐다. 이제 화면은 캡처(1) → 매핑+결과입력(2) → 완료(3) 3단계이고, 매핑과 판정을 같은 화면에서 처리할 수 있어 "귀찮은 유저"가 단계를 오가며 정보를 잃을 걱정이 없다.

남은 항목 중 배포 전 수정을 권장하는 것은 2-3(완료 단계 거짓 경고, `domain.js`의 `verification` 필드 관련)이다. 1-2(단계 진입 시 CTA 부재)는 부분 개선됐으나 완전하지는 않다. 2-1(NONE 라벨), 2-2(캡쳐 표기), 3-3(add-feature/완료 버튼 아이콘화 누락) 등은 마감 다듬기 수준으로 남아있다.

## 7. 3차 검증 갱신 우선순위 (최종)

1. **(권장)** 2-3 처리 — 완료 단계 경고가 항상 거짓 양성으로 뜨지 않게 한다(`domain.js`의 `validationWarnings()` 변경 필요, 3차 검증에서도 미착수).
2. **(권장)** 1-2 마무리 — 테스트케이스가 0개인 상태에서 `add-feature`를 primary로 승격하거나 전용 안내 배너 추가.
3. **(권장)** 2-1 라벨 교체 — "NONE" → "미판정".
4. **(권장)** `#add-feature`와 매핑된 evidence 카드의 ↑/↓/Inbox로/삭제/연결 버튼도 아이콘화(3-3 연속).
5. **(선택)** 2-2 표기 통일 — "캡쳐" → "캡처".
6. **(선택)** `startFeatureTitleEdit()` 죽은 코드 제거.
7. **(선택)** 3-1에서 지적한, 한 Capture_Graph 안에 여러 테스트케이스로 매핑이 나뉠 때 곡선 시작점이 겹치는 문제.
