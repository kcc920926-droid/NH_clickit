import { readFile } from 'node:fs/promises';

const chromeCandidates = [
  { label: 'Chromium', path: `${process.env.LOCALAPPDATA || ''}\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe` },
  { label: 'Chrome', path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' },
  { label: 'Chrome', path: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe' },
  { label: 'Chrome', path: `${process.env.LOCALAPPDATA || ''}\\Google\\Chrome\\Application\\chrome.exe` },
];

async function firstReadable(candidates) {
  for (const candidate of candidates) {
    if (!candidate.path || candidate.path.startsWith('\\')) continue;
    try {
      await readFile(candidate.path);
      return candidate;
    } catch {
      // Continue to the next Chrome/Chromium candidate.
    }
  }
  throw new Error('Chrome or Chromium executable was not found');
}

const selected = process.env.CAPTUREIT_BROWSER_PATH
  ? { label: process.env.CAPTUREIT_BROWSER_LABEL || 'Chrome', path: process.env.CAPTUREIT_BROWSER_PATH }
  : await firstReadable(chromeCandidates);

process.env.CAPTUREIT_BROWSER_PATH = selected.path;
process.env.CAPTUREIT_BROWSER_LABEL ||= selected.label;
process.env.CAPTUREIT_ARTIFACT_DIR ||= 'chrome-demo-report';

await import('./edge-smoke.mjs');
