(function attachEvidenceSegments(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CaptureITSegments = api;
})(globalThis, function createEvidenceSegmentsApi() {
  // 연결을 "사진마다 붙일 곳 고르기"가 아니라 "순서대로 늘어선 사진을 어디서 끊느냐"로 다룬다.
  // 사진도 항목(테스트케이스·장면)도 순서가 있어서, 실제로 정할 것은 끊는 자리뿐이다.
  //  - 구획(run): 한 녹화 세트 안에서 같은 항목에 연달아 연결된 사진들. 연결 안 된 사진들도 한 구획이다.
  //  - 나누기: 어떤 사진부터 그 구획의 끝까지를 다음 항목으로 보낸다.
  //  - 합치기: 구획을 바로 위 구획과 한 항목으로 합친다.
  //  - 다음 항목: 순서상 뒤에 있는 빈 항목이 있으면 그것을 채우고, 없으면 바로 뒤에 새로 만든다.
  const fromModule = typeof module === 'object' && module.exports && typeof require === 'function';
  const Domain = fromModule ? require('./domain.js') : globalThis.CaptureITDomain;
  const Split = fromModule ? require('./evidence-split.js') : globalThis.CaptureITEvidenceSplit;

  const bySequence = (left, right) => Number(left.sequenceNo || 0) - Number(right.sequenceNo || 0);
  const evidenceCount = (feature) => ((feature.result && feature.result.evidenceIds) || []).length;

  // 세트의 사진들을 순번 순서로 놓고, 같은 항목에 연달아 연결된 것끼리 묶는다.
  function runs(setItems = []) {
    const list = [];
    for (const evidence of [...setItems].sort(bySequence)) {
      const featureId = evidence.featureSpecId || null;
      const last = list[list.length - 1];
      if (last && last.featureId === featureId) last.evidenceIds.push(evidence.id);
      else list.push({ featureId, evidenceIds: [evidence.id] });
    }
    return list;
  }

  // 자동으로 만들어졌고 아무도 손대지 않은 빈 항목. 나누기를 되돌리듯 합치면 남기지 않고 지운다.
  function isBlank(feature) {
    if (!feature || evidenceCount(feature) > 0) return false;
    const result = feature.result || {};
    const written = [feature.description, result.verification, result.expectedResult, result.actualResult]
      .some((value) => String(value || '').trim());
    return !written && !result.status && Boolean(feature.autoTitle) && feature.title === feature.autoTitle;
  }

  function pruneBlank(state) {
    const removed = state.features.filter(isBlank);
    if (removed.length) state.features = state.features.filter((feature) => !removed.includes(feature));
    return removed;
  }

  // afterFeatureId 뒤에 있는 첫 빈 항목(없으면 null). afterFeatureId가 없으면 맨 앞부터 찾는다.
  function peekTarget(state, afterFeatureId = null) {
    const start = afterFeatureId ? state.features.findIndex((feature) => feature.id === afterFeatureId) + 1 : 0;
    return state.features.slice(start).find((feature) => evidenceCount(feature) === 0) || null;
  }

  function uniqueTitle(base, takenTitles) {
    const taken = new Set(takenTitles);
    if (!taken.has(base)) return base;
    let number = 2;
    while (taken.has(`${base} (${number})`)) number += 1;
    return `${base} (${number})`;
  }

  function titleFor(state, items, options) {
    const base = options.title || Split.screenTitle(items);
    return uniqueTitle(base, state.features.map((feature) => feature.title));
  }

  // 다음 항목을 정한다: 뒤에 빈 항목이 있으면 그것, 없으면 after 바로 뒤(없으면 before 앞, 그것도 없으면 맨 끝)에 새로 만든다.
  function claimTarget(state, items, { afterFeatureId = null, beforeFeatureId = null, ...options } = {}) {
    const existing = peekTarget(state, afterFeatureId);
    if (existing) return { feature: existing, created: false };
    const feature = Domain.createFeature(titleFor(state, items, options));
    feature.autoTitle = feature.title;
    const afterIndex = afterFeatureId ? state.features.findIndex((item) => item.id === afterFeatureId) : -1;
    const beforeIndex = beforeFeatureId ? state.features.findIndex((item) => item.id === beforeFeatureId) : -1;
    const index = afterIndex >= 0 ? afterIndex + 1 : beforeIndex >= 0 ? beforeIndex : state.features.length;
    state.features.splice(index, 0, feature);
    return { feature, created: true };
  }

  function itemsOf(state, evidenceIds) {
    const byId = new Map(state.evidence.map((item) => [item.id, item]));
    return evidenceIds.map((id) => byId.get(id)).filter(Boolean);
  }

  function neighbours(list, index) {
    const before = list.slice(0, index).reverse().find((run) => run.featureId);
    const after = list.slice(index + 1).find((run) => run.featureId);
    return { before: before ? before.featureId : null, after: after ? after.featureId : null };
  }

  // 이 사진부터 구획 끝까지 어디로 갈지 미리 알려 준다(버튼 설명에 쓴다). 나눌 수 없으면 null.
  function previewSplit(state, setItems, evidenceId) {
    const list = runs(setItems);
    const index = list.findIndex((run) => run.evidenceIds.includes(evidenceId));
    if (index < 0) return null;
    const run = list[index];
    const at = run.evidenceIds.indexOf(evidenceId);
    if (run.featureId && at === 0) return null;
    const anchor = run.featureId || neighbours(list, index).before;
    return { evidenceIds: run.evidenceIds.slice(at), target: peekTarget(state, anchor) };
  }

  // 나누기: evidenceId 사진부터 그 구획의 끝까지를 다음 항목으로 보낸다.
  function splitAt(state, setItems, evidenceId, options = {}) {
    const list = runs(setItems);
    const index = list.findIndex((run) => run.evidenceIds.includes(evidenceId));
    if (index < 0) return null;
    const run = list[index];
    const at = run.evidenceIds.indexOf(evidenceId);
    if (run.featureId && at === 0) return null;
    const evidenceIds = run.evidenceIds.slice(at);
    const around = neighbours(list, index);
    const target = claimTarget(state, itemsOf(state, evidenceIds), {
      ...options,
      afterFeatureId: run.featureId || around.before,
      beforeFeatureId: run.featureId ? null : around.after,
    });
    Domain.mapEvidenceBatch(state, evidenceIds, target.feature.id);
    return { feature: target.feature, created: target.created, evidenceIds };
  }

  // 합치기: evidenceId가 든 구획을 바로 위 구획과 한 항목으로 만든다.
  // 위가 연결돼 있으면 이 구획이 위 항목으로 가고, 위가 연결 안 된 사진들이면 그 사진들이 이 항목 앞에 붙는다.
  function mergeUp(state, setItems, evidenceId) {
    const list = runs(setItems);
    const index = list.findIndex((run) => run.evidenceIds.includes(evidenceId));
    if (index <= 0) return null;
    const upper = list[index - 1];
    const lower = list[index];
    const intoUpper = Boolean(upper.featureId);
    const targetId = intoUpper ? upper.featureId : lower.featureId;
    const evidenceIds = intoUpper ? lower.evidenceIds : upper.evidenceIds;
    const feature = state.features.find((item) => item.id === targetId);
    if (!feature) return null;
    Domain.mapEvidenceBatch(state, evidenceIds, targetId);
    if (!intoUpper) {
      const moved = new Set(evidenceIds);
      feature.result.evidenceIds = [...evidenceIds, ...feature.result.evidenceIds.filter((id) => !moved.has(id))];
    }
    return { feature, evidenceIds, removed: pruneBlank(state) };
  }

  // 여러 묶음(화면별로 나눈 것)을 차례로 항목에 붙인다. 빈 항목부터 채우고 모자라면 새로 만든다.
  // parts: [{ title, evidenceIds }]
  function assignParts(state, parts, { afterFeatureId = null } = {}) {
    let cursor = afterFeatureId;
    const assigned = [];
    for (const part of parts) {
      const target = claimTarget(state, itemsOf(state, part.evidenceIds), { afterFeatureId: cursor, title: part.title });
      Domain.mapEvidenceBatch(state, part.evidenceIds, target.feature.id);
      cursor = target.feature.id;
      assigned.push({ feature: target.feature, created: target.created, evidenceIds: [...part.evidenceIds] });
    }
    return assigned;
  }

  // 되돌리기용: 항목 목록과 사진이 어디에 연결돼 있는지를 기억해 둔다.
  function snapshot(state) {
    return {
      features: JSON.parse(JSON.stringify(state.features)),
      links: new Map(state.evidence.map((item) => [item.id, item.featureSpecId || null])),
    };
  }

  // 연결 구조만 되돌린다. 그 사이에 고친 글(이름·설명·판정)은 지금 것을 남긴다.
  // 되돌리며 연결이 바뀐 사진의 id를 돌려준다(저장해야 할 것들).
  function restore(state, saved) {
    const current = new Map(state.features.map((feature) => [feature.id, feature]));
    const present = new Set(state.evidence.map((item) => item.id));
    state.features = saved.features.map((before) => {
      const feature = current.get(before.id) || JSON.parse(JSON.stringify(before));
      feature.result.evidenceIds = before.result.evidenceIds.filter((id) => present.has(id));
      return feature;
    });
    const kept = new Set(state.features.map((feature) => feature.id));
    const changed = [];
    for (const evidence of state.evidence) {
      const now = evidence.featureSpecId || null;
      let then = saved.links.has(evidence.id) ? saved.links.get(evidence.id) : now;
      if (then && !kept.has(then)) then = null;
      // 그 뒤에 새로 들어온 사진은 연결된 항목이 남아 있으면 그대로 둔다.
      if (!saved.links.has(evidence.id) && then) {
        const feature = state.features.find((item) => item.id === then);
        if (!feature.result.evidenceIds.includes(evidence.id)) feature.result.evidenceIds.push(evidence.id);
      }
      if (then !== now) {
        evidence.featureSpecId = then;
        changed.push(evidence.id);
      }
    }
    state.inbox = state.evidence.filter((item) => !item.featureSpecId).sort(bySequence);
    return changed;
  }

  return { assignParts, isBlank, mergeUp, peekTarget, previewSplit, pruneBlank, restore, runs, snapshot, splitAt, uniqueTitle };
});
