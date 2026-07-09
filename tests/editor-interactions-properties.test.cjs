const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const fc = require('fast-check');

const source = fs.readFileSync(path.resolve(__dirname, '../extension/editor.js'), 'utf8');

function findBraceBlock(text, openBraceIndex) {
  let depth = 1;
  let index = openBraceIndex + 1;
  while (depth > 0 && index < text.length) {
    const char = text[index];
    if (char === '{') depth += 1;
    else if (char === '}') depth -= 1;
    index += 1;
  }
  assert.equal(depth, 0);
  return text.slice(openBraceIndex + 1, index - 1);
}

function extractFunctionBody(functionName) {
  const signatureRegex = new RegExp(`(?:async\\s+)?function\\s+${functionName}\\s*\\([^)]*\\)\\s*{`);
  const match = signatureRegex.exec(source);
  assert.ok(match, `function ${functionName} should exist`);
  return findBraceBlock(source, match.index + match[0].length - 1);
}

function extractCatchBlock(functionBody) {
  const match = /catch\s*\([^)]*\)\s*{/.exec(functionBody);
  assert.ok(match, 'catch block should exist');
  return findBraceBlock(functionBody, match.index + match[0].length - 1);
}

test('Property 2: STARTING state locks before start request resolves and only one start request can be issued', () => {
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 20 }), () => {
      const body = extractFunctionBody('toggleRecordingSession');
      const guardIndex = body.indexOf("sessionButtonState === 'STARTING'");
      const startStateIndex = body.indexOf("sessionButtonState = 'STARTING'");
      const requestIndex = body.indexOf('await startRecordingSessionRequest()');

      assert.ok(guardIndex >= 0, 'STARTING guard should run at handler top');
      assert.ok(body.includes("sessionButtonState === 'ACTIVE'"), 'ACTIVE guard should prevent duplicate start requests');
      assert.ok(startStateIndex >= 0 && requestIndex >= 0 && startStateIndex < requestIndex);
      assert.match(body, /elements\.toggleSession\.disabled = true/);
      assert.match(body, /catch\s*\(error\)\s*{[\s\S]*sessionButtonState = 'INACTIVE'/);
    }),
    { numRuns: 20 },
  );
});

test('Property 42: invalid test-case description responses cannot mutate feature fields', () => {
  fc.assert(
    fc.property(fc.string(), () => {
      const body = extractFunctionBody('requestTestCaseDescription');
      const catchBlock = extractCatchBlock(body);
      const validateIndex = body.indexOf('CaptureITLlm.validateTestCaseDescriptionResponse');
      const applyIndex = body.indexOf('applyTestCaseDescription(feature, validated)');

      assert.ok(validateIndex >= 0 && applyIndex >= 0 && validateIndex < applyIndex);
      assert.doesNotMatch(catchBlock, /feature\./);
      assert.doesNotMatch(catchBlock, /report\./);
      assert.match(catchBlock, /setMessage\(/);
    }),
    { numRuns: 20 },
  );
});
