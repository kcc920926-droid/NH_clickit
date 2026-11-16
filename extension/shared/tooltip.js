(function attachTooltip(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CaptureITTooltip = api;
})(globalThis, function createTooltipApi() {
  // 버튼 설명: 마우스를 올리면(키보드로 가면) 바로 뜬다. 브라우저 기본 title 말풍선은 1초쯤 늦게 뜨고
  // 아무 데나 겹쳐서, title을 data-tip으로 옮기고 직접 그린다.
  // 자리는 위·아래·오른쪽·왼쪽 중에서 다른 버튼을 가장 적게 가리는 쪽을 고른다.
  const GAP = 3;
  const MARGIN = 4;
  const SIDES = ['top', 'bottom', 'right', 'left'];

  // align: 'center' | 'start' | 'end' — 위·아래면 가로 정렬, 옆이면 세로 정렬.
  function rectFor(side, anchor, width, height, align = 'center') {
    const right = anchor.left + anchor.width;
    const bottom = anchor.top + anchor.height;
    if (side === 'top' || side === 'bottom') {
      const left = align === 'start' ? anchor.left : align === 'end' ? right - width : anchor.left + anchor.width / 2 - width / 2;
      return { left, top: side === 'top' ? anchor.top - GAP - height : bottom + GAP, width, height };
    }
    const top = align === 'start' ? anchor.top : align === 'end' ? bottom - height : anchor.top + anchor.height / 2 - height / 2;
    return { left: side === 'right' ? right + GAP : anchor.left - GAP - width, top, width, height };
  }

  // 화면 안으로 밀어 넣는다(위·아래 자리는 좌우로, 좌우 자리는 위아래로).
  function clamp(rect, viewport) {
    const left = Math.min(Math.max(rect.left, MARGIN), viewport.width - rect.width - MARGIN);
    const top = Math.min(Math.max(rect.top, MARGIN), viewport.height - rect.height - MARGIN);
    return { ...rect, left, top };
  }

  function overlapArea(a, b) {
    const width = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
    const height = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
    return width > 0 && height > 0 ? width * height : 0;
  }

  // 순수 계산: 가릴 버튼들(obstacles)과 화면 크기로 가장 나은 자리를 고른다.
  // 점수 = 가리는 버튼 넓이 + 화면 밖으로 밀려 원래 자리에서 벗어난 거리(작을수록 좋다). 같으면 SIDES 순서.
  function choosePlacement(anchor, size, obstacles, viewport) {
    let best = null;
    // 가운데 정렬을 먼저 보고, 막히면 한쪽 끝에 맞춘 자리도 본다(모서리 버튼에서 빈자리를 찾기 위해).
    const candidates = [];
    for (const align of ['center', 'end', 'start']) for (const side of SIDES) candidates.push([side, align]);
    for (const [side, align] of candidates) {
      const ideal = rectFor(side, anchor, size.width, size.height, align);
      const placed = clamp(ideal, viewport);
      const covered = obstacles.reduce((total, obstacle) => total + overlapArea(placed, obstacle), 0);
      // 밀려서 버튼 자체를 덮으면 크게 감점
      const coversAnchor = overlapArea(placed, { left: anchor.left, top: anchor.top, width: anchor.width, height: anchor.height });
      const shift = Math.abs(placed.left - ideal.left) + Math.abs(placed.top - ideal.top);
      const alignCost = align === 'center' ? 0 : 1;
      const score = covered * 4 + coversAnchor * 10 + shift * 2 + alignCost;
      if (!best || score < best.score) best = { side, align, left: placed.left, top: placed.top, score };
    }
    return best;
  }

  const TARGET_SELECTOR = '[data-tip], [title], button[aria-label], [role="button"][aria-label]';
  const OBSTACLE_SELECTOR = 'button, a[href], input, select, textarea, label.button, [role="button"], .choice';

  function install(documentRef = document) {
    const windowRef = documentRef.defaultView;
    const tip = documentRef.createElement('div');
    tip.className = 'captureit-tip';
    tip.setAttribute('role', 'tooltip');
    tip.id = 'captureit-tip';
    // 열린 대화상자 위에도 보이도록 popover(맨 위 층)로 띄운다.
    const usePopover = typeof tip.showPopover === 'function';
    if (usePopover) tip.popover = 'manual';
    tip.hidden = !usePopover;
    documentRef.body.append(tip);
    let current = null;

    function tipText(element) {
      if (element.hasAttribute('title')) {
        const text = element.getAttribute('title');
        element.removeAttribute('title');
        if (text) element.dataset.tip = text;
      }
      if (element.dataset.tip) return element.dataset.tip;
      // 글자가 보이는 버튼은 aria-label을 다시 띄우지 않는다(아이콘만 있는 버튼만).
      // ⋯ ⋮ ✕ ‹ › 같은 기호만 있는 버튼은 글자가 없는 것으로 본다.
      const label = element.getAttribute('aria-label');
      const hasWords = /[\p{L}\p{N}]/u.test(element.textContent || '');
      return label && !hasWords ? label : '';
    }

    function hide() {
      if (!current) return;
      current.removeAttribute('aria-describedby');
      current = null;
      if (usePopover) {
        try { tip.hidePopover(); } catch { /* 이미 닫힘 */ }
      } else {
        tip.hidden = true;
      }
    }

    function show(element) {
      const text = tipText(element);
      if (!text) return hide();
      if (current === element) return undefined;
      hide();
      current = element;
      tip.textContent = text;
      tip.style.left = '0px';
      tip.style.top = '0px';
      if (usePopover) tip.showPopover(); else tip.hidden = false;
      const size = tip.getBoundingClientRect();
      const anchor = element.getBoundingClientRect();
      const obstacles = [...documentRef.querySelectorAll(OBSTACLE_SELECTOR)]
        .filter((item) => item !== element && !item.contains(element) && item.offsetParent !== null)
        .map((item) => item.getBoundingClientRect())
        .filter((rect) => rect.width > 0 && rect.bottom > 0 && rect.top < windowRef.innerHeight);
      const placement = choosePlacement(anchor, { width: size.width, height: size.height }, obstacles, { width: windowRef.innerWidth, height: windowRef.innerHeight });
      tip.dataset.side = placement.side;
      tip.style.left = `${Math.round(placement.left)}px`;
      tip.style.top = `${Math.round(placement.top)}px`;
      element.setAttribute('aria-describedby', tip.id);
      return undefined;
    }

    documentRef.addEventListener('pointerover', (event) => {
      const element = event.target.closest && event.target.closest(TARGET_SELECTOR);
      if (!element) {
        hide();
        return;
      }
      show(element);
    });
    documentRef.addEventListener('pointerout', (event) => {
      if (!current) return;
      if (event.relatedTarget && current.contains(event.relatedTarget)) return;
      hide();
    });
    documentRef.addEventListener('focusin', (event) => {
      const element = event.target.closest && event.target.closest(TARGET_SELECTOR);
      if (element && element.matches(':focus-visible')) show(element);
    });
    documentRef.addEventListener('focusout', hide);
    documentRef.addEventListener('pointerdown', hide, true);
    documentRef.addEventListener('keydown', (event) => { if (event.key === 'Escape') hide(); });
    windowRef.addEventListener('scroll', hide, true);
    windowRef.addEventListener('resize', hide);
    return { hide, show };
  }

  return { choosePlacement, install };
});
