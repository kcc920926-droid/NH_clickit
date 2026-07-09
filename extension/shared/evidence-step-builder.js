(function attachEvidenceStepBuilder(root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.CaptureITEvidenceStepBuilder = api;
})(globalThis, function createEvidenceStepBuilderApi(root) {
  const domain = root.CaptureITDomain || (typeof require === 'function' ? require('./domain.js') : null);
  const ACTION_STEP_TYPES = new Set(['baseline', 'form-input', 'click', 'submit', 'route-change', 'manual-pin']);
  const STEP_TYPES = new Set([...ACTION_STEP_TYPES, 'result-check']);

  function bounded(value, limit = 300) {
    return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, limit);
  }

  function messageTexts(entries) {
    return (entries || [])
      .map((entry) => typeof entry === 'string' ? entry : entry && entry.text)
      .filter(Boolean)
      .map((text) => bounded(text, 300));
  }

  function resultMessagesOf(evidence) {
    return [
      ...messageTexts(evidence.domDiff && evidence.domDiff.resultMessages),
      ...messageTexts(evidence.domDiff && evidence.domDiff.validationMessages),
      ...messageTexts(evidence.resultMessages),
      ...messageTexts(evidence.validationMessages),
    ];
  }

  function hasResultOnlySignal(evidence) {
    return evidence.triggerType === 'result-check'
      || (!ACTION_STEP_TYPES.has(evidence.triggerType) && resultMessagesOf(evidence).length > 0);
  }

  function formSelectorOf(evidence) {
    return evidence.formSelector
      || evidence.form && evidence.form.selector
      || evidence.context && evidence.context.formSelector
      || evidence.context && evidence.context.container && evidence.context.container.selector
      || evidence.containerContext && evidence.containerContext.selector
      || '';
  }

  function sortEvidence(evidenceList) {
    return [...evidenceList].sort((left, right) =>
      Number(left.sequenceNo ?? 0) - Number(right.sequenceNo ?? 0)
      || String(left.id).localeCompare(String(right.id)),
    );
  }

  function startGroup(evidence, stepType) {
    return {
      stepType: STEP_TYPES.has(stepType) ? stepType : 'result-check',
      formSelector: formSelectorOf(evidence),
      evidenceItems: [evidence],
    };
  }

  function appendToGroup(group, evidence) {
    group.evidenceItems.push(evidence);
  }

  function summarizeEvents(events) {
    if (events === undefined || events === null) return '';
    if (!Array.isArray(events)) throw new Error('events must be an array');
    return events.slice(0, 20).map((event) => {
      if (!event || typeof event !== 'object') throw new Error('event must be an object');
      JSON.stringify(event);
      return {
        method: bounded(event.method || event.type || '', 20),
        url: bounded(event.url || event.path || '', 160),
        status: event.status ?? event.statusCode ?? null,
      };
    });
  }

  function buildLlmSummary(evidenceList) {
    const summary = {
      visibleText: '',
      targetText: '',
      resultMessages: [],
      apiSummary: '',
      serverSummary: '',
    };
    const targetTexts = [];
    const visibleTexts = [];
    const resultMessages = [];
    const apiEvents = [];
    const serverEvents = [];
    let apiFailed = false;
    let serverFailed = false;

    for (const evidence of evidenceList) {
      const context = evidence.context || {};
      const targetText = context.target && context.target.visibleText || evidence.targetText || '';
      const containerText = evidence.containerContext && (evidence.containerContext.heading || evidence.containerContext.visibleText)
        || context.container && (context.container.heading || context.container.visibleText)
        || context.surroundingContext && context.surroundingContext.nearestHeading
        || '';
      if (targetText) targetTexts.push(bounded(targetText, 200));
      if (containerText) visibleTexts.push(bounded(containerText, 300));
      resultMessages.push(...resultMessagesOf(evidence));
      if (evidence.apiEvents !== undefined) apiEvents.push(evidence.apiEvents);
      if (evidence.serverEvents !== undefined) serverEvents.push(evidence.serverEvents);
    }

    summary.visibleText = [...new Set(visibleTexts)].join(' | ');
    summary.targetText = [...new Set(targetTexts)].join(' | ');
    summary.resultMessages = [...new Set(resultMessages)];

    try {
      summary.apiSummary = summarizeEvents(apiEvents.flat());
    } catch (_error) {
      apiFailed = true;
      summary.apiSummary = { status: 'summary-failed' };
    }

    try {
      summary.serverSummary = summarizeEvents(serverEvents.flat());
    } catch (_error) {
      serverFailed = true;
      summary.serverSummary = { status: 'summary-failed' };
    }

    if (apiFailed || serverFailed) summary.status = 'summary-failed';
    return summary;
  }

  function pickPrimaryEvidenceId(step) {
    const evidenceItems = step.evidenceItems || [];
    const byPriority = ['submit', 'click', 'manual-pin', 'route-change'];
    for (const triggerType of byPriority) {
      const match = evidenceItems.find((item) => item.triggerType === triggerType);
      if (match) return match.id;
    }
    if (step.stepType === 'form-input' && evidenceItems.length) {
      return evidenceItems[evidenceItems.length - 1].id;
    }
    if (step.stepType === 'baseline' && evidenceItems.length) {
      return evidenceItems[0].id;
    }
    if (evidenceItems.length) return evidenceItems[0].id;
    return step.primaryEvidenceId || step.evidenceIds && step.evidenceIds[0] || null;
  }

  function finalizeGroup(group, index) {
    const evidenceIds = group.evidenceItems.map((item) => item.id);
    const stepShape = {
      sessionId: group.evidenceItems[0] && group.evidenceItems[0].sessionId || null,
      stepNo: index + 1,
      stepType: group.stepType,
      evidenceIds,
      primaryEvidenceId: pickPrimaryEvidenceId(group),
      llmSummary: buildLlmSummary(group.evidenceItems),
    };
    const step = domain.createEvidenceStep(stepShape, `STEP-${index + 1}`);
    if (group.formSelector) step.formSelector = group.formSelector;
    return step;
  }

  function buildEvidenceSteps(evidenceList = []) {
    const groups = [];
    for (const evidence of sortEvidence(evidenceList)) {
      const lastGroup = groups[groups.length - 1];

      if (hasResultOnlySignal(evidence)) {
        if (lastGroup) {
          appendToGroup(lastGroup, evidence);
        } else {
          groups.push(startGroup(evidence, 'result-check'));
        }
        continue;
      }

      if (evidence.triggerType === 'form-input') {
        const formSelector = formSelectorOf(evidence);
        if (lastGroup && lastGroup.stepType === 'form-input' && lastGroup.formSelector === formSelector) {
          appendToGroup(lastGroup, evidence);
        } else {
          groups.push(startGroup(evidence, 'form-input'));
        }
        continue;
      }

      groups.push(startGroup(evidence, evidence.triggerType));
    }

    return groups.map(finalizeGroup);
  }

  return {
    buildEvidenceSteps,
    buildLlmSummary,
    pickPrimaryEvidenceId,
  };
});
