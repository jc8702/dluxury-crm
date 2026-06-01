import { describe, test, expect, beforeAll } from 'vitest';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { existsSync } from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TARGET_URL = 'http://localhost:5173';

let canRun = false;

beforeAll(async () => {
  if (!existsSync(CHROME_PATH)) {
    console.warn(`⏭  Lighthouse skipped: Chrome not found at ${CHROME_PATH}`);
    return;
  }
  try {
    const res = await fetch(TARGET_URL, { method: 'HEAD', signal: AbortSignal.timeout(2000) });
    if (!res.ok) {
      console.warn(`⏭  Lighthouse skipped: dev server returned ${res.status} at ${TARGET_URL}`);
      return;
    }
    canRun = true;
  } catch {
    console.warn(`⏭  Lighthouse skipped: dev server not reachable at ${TARGET_URL}`);
  }
});

describe('Lighthouse Performance Benchmark', () => {
  test.runIf(canRun)(
    'Lighthouse score >= 90 (performance + accessibility)',
    async () => {
      const chrome = await launch({
        chromePath: CHROME_PATH,
        chromeFlags: [
          '--headless=chrome',
          '--no-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-software-rasterizer',
        ],
      });

      const options = {
        logLevel: 'error' as const,
        output: 'html' as const,
        onlyCategories: ['performance', 'accessibility', 'best-practices'],
        port: chrome.port,
      };

      let runnerResult;
      try {
        runnerResult = await lighthouse(TARGET_URL, options);
      } finally {
        try {
          await chrome.kill();
        } catch (_killError) {
          // Chrome may already be dead; ignore
        }
      }

      const perfScore = runnerResult.lhr.categories.performance.score * 100;
      const a11yScore = runnerResult.lhr.categories.accessibility.score * 100;

      expect(perfScore).toBeGreaterThanOrEqual(90);
      expect(a11yScore).toBeGreaterThanOrEqual(90);
    },
    120_000,
  );
});
