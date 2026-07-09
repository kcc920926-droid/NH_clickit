(function attachWizardStage(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.CaptureITWizardStage = api;
})(globalThis, function createWizardStageApi() {
  // 3단계 순서. 증적 확인, 테스트케이스 매핑, 결과 입력을 모두 같은 단계에서 처리한다.
  const STAGES = ['capture', 'mapping-result', 'completion'];

  // snapshot: {
  //   evidenceCount: number,
  //   featureCount: number,
  //   mappedFeatureCount: number,
  //   sessionActive: boolean,
  // }
  // -> boolean[3], STAGES와 동일 인덱스로 "이 단계에 도달 가능한가"
  function computeReachableStages(snapshot) {
    const reachable = new Array(STAGES.length).fill(false);

    reachable[0] = true;
    reachable[1] = snapshot.evidenceCount > 0;
    reachable[2] = reachable[1] && snapshot.featureCount > 0 && snapshot.mappedFeatureCount > 0;

    return reachable;
  }

  // -> 0~2, 현재 snapshot에서 도달 가능한 가장 마지막 단계의 인덱스
  function furthestReachableIndex(snapshot) {
    const reachable = computeReachableStages(snapshot);
    let furthest = 0;
    for (let index = 0; index < reachable.length; index += 1) {
      if (reachable[index]) furthest = index;
    }
    return furthest;
  }

  // -> boolean, targetIndex가 현재 snapshot에서 도달 가능한 단계인가
  function canNavigateTo(snapshot, targetIndex) {
    if (targetIndex < 0 || targetIndex >= STAGES.length) return false;
    return computeReachableStages(snapshot)[targetIndex];
  }

  // 순수 전환 함수: snapshot이나 다른 어떤 인자도 변경하지 않는다(부작용 없음).
  // targetIndex가 도달 가능하면 targetIndex를, 아니면 currentIndex를 그대로 반환한다.
  function navigate(snapshot, currentIndex, targetIndex) {
    return canNavigateTo(snapshot, targetIndex) ? targetIndex : currentIndex;
  }

  // context: { sessionActive: boolean, currentFeatureHasMappedEvidence: boolean }
  // -> { primary: string|null, secondary: string[] }
  // primary가 null이 아니면 secondary 배열에는 절대 포함되지 않는다.
  function planActions(stageIndex, context) {
    switch (stageIndex) {
      case 0:
        return {
          primary: context.sessionActive ? 'end-session' : 'start-session',
          secondary: ['import-images'],
        };
      case 1: {
        const secondary = ['add-feature', 'request-recommendations'];
        return {
          primary: null,
          secondary,
        };
      }
      case 2:
        return {
          primary: 'export-report',
          secondary: ['preview-report', 'open-save-project'],
        };
      default:
        return { primary: null, secondary: [] };
    }
  }

  return {
    STAGES,
    computeReachableStages,
    furthestReachableIndex,
    canNavigateTo,
    navigate,
    planActions,
  };
});
