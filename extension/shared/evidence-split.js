(function attachEvidenceSplit(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CaptureITEvidenceSplit = api;
})(globalThis, function createEvidenceSplitApi() {
  // 녹화 세트를 "화면"마다 나눈다. 한 번 녹화하면 여러 테스트케이스(설명서라면 여러 장면)를 지나가는데,
  // 세트 전체를 하나에 연결하면 다시 나눠 붙이는 일이 생겼다.
  // 같은 화면: 페이지 주소(경로 + 앱 안의 # 경로)가 같고 연달아 찍힌 증적. 붙여넣거나 불러온 이미지는 각각 한 화면이다.

  function screenKey(evidence) {
    const context = evidence && evidence.context || {};
    const url = String(context.pageUrl || '');
    if (!url) return null;
    try {
      const parsed = new URL(url);
      return `${parsed.origin}${parsed.pathname}${parsed.hash}`;
    } catch {
      return url;
    }
  }

  function screenTitle(items) {
    const first = items[0] || {};
    const context = first.context || {};
    const title = String(context.pageTitle || '').trim();
    // 화면 안에서 누른 첫 동작을 덧붙여 구분하기 쉽게 한다(예: "주문 승인 · 승인 클릭").
    // 실제로 누른 것(클릭·강조·제출)의 짧은 글자만 쓴다. 화면 진입 때의 대상은 메뉴 전체 글자 같은 것이라 쓰지 않는다.
    const action = items
      .filter((item) => ['click', 'manual-pin', 'submit', 'shortcut-context', 'context-menu'].includes(item && item.triggerType))
      .map((item) => String(item.context && item.context.target && item.context.target.visibleText || '').replace(/\s+/g, ' ').trim())
      .find((text) => text && text.length <= 20);
    const base = title || '화면';
    return action && first.triggerType !== 'clipboard-paste' && first.triggerType !== 'file-import'
      ? `${base} · ${action}`
      : base;
  }

  // evidenceList: 같은 세트의 증적(순서 무관). → [{ title, evidenceIds }] 화면이 바뀌는 순서대로.
  function splitByScreen(evidenceList = []) {
    const ordered = [...evidenceList].sort((left, right) => Number(left.sequenceNo || 0) - Number(right.sequenceNo || 0));
    const parts = [];
    let current = null;
    for (const evidence of ordered) {
      const key = screenKey(evidence);
      if (!current || key === null || current.key === null || key !== current.key) {
        current = { key, items: [] };
        parts.push(current);
      }
      current.items.push(evidence);
    }
    return parts.map((part) => ({ title: screenTitle(part.items), evidenceIds: part.items.map((item) => item.id) }));
  }

  return { screenKey, splitByScreen };
});
