(function initializeOrderFixture() {
  const app = document.getElementById('app');
  const toast = document.getElementById('success-toast');
  const ordersTemplate = document.getElementById('orders-template');
  const detailTemplate = document.getElementById('detail-template');
  let approvalState = 'pending';
  let completionTimer = null;

  function showOrders() {
    app.replaceChildren(ordersTemplate.content.cloneNode(true));
    const status = document.getElementById('order-status');
    const button = document.getElementById('approve-order');
    if (approvalState === 'processing') {
      status.className = 'badge processing';
      status.textContent = '승인 처리 중';
      button.textContent = '처리 중';
      button.disabled = true;
    } else if (approvalState === 'approved') {
      status.className = 'badge approved';
      status.textContent = '승인 완료';
      button.textContent = '완료';
      button.disabled = true;
    }
    button.addEventListener('click', approveOrder);
  }

  function approveOrder(event) {
    if (approvalState !== 'pending') return;
    approvalState = 'processing';
    const button = event.currentTarget;
    const status = document.getElementById('order-status');
    button.textContent = '처리 중';
    button.disabled = true;
    status.className = 'badge processing';
    status.textContent = '승인 처리 중';

    // 실제 완료 신호는 늦게 발생한다. CaptureIT 이벤트 캡처는 이 상태를 기다리지 않는다.
    completionTimer = window.setTimeout(() => {
      approvalState = 'approved';
      status.className = 'badge approved';
      status.textContent = '승인 완료';
      button.textContent = '완료';
      toast.hidden = false;
      window.setTimeout(() => { toast.hidden = true; }, 4500);
    }, 1200);
  }

  function renderRoute() {
    if (location.hash === '#/orders/ORD-1002') {
      app.replaceChildren(detailTemplate.content.cloneNode(true));
      return;
    }
    showOrders();
  }

  window.addEventListener('hashchange', renderRoute);
  window.addEventListener('beforeunload', () => window.clearTimeout(completionTimer));
  if (!location.hash) location.hash = '#/orders';
  renderRoute();
})();
