import { test, expect } from '@playwright/test';
import { mockAuthenticatedSession } from './helpers/auth';
import { mockAllAPIs, ROUTES } from './helpers/auditMock';

/**
 * REGRESSÃO VISUAL (TSK-15) — snapshot de todas as rotas do app.
 *
 * As baselines são geradas localmente (`npx playwright test tests/e2e/visual.spec.ts
 * --update-snapshots`) e commitadas. No CI elas são ignoradas porque as fontes do
 * runner Linux diferem das fontes locais.
 */

test.describe('Regressão visual — todas as rotas', () => {
  test.skip(!!process.env.CI, 'Baselines geradas localmente (fontes diferentes no CI)');

  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page);
    await mockAllAPIs(page);
  });

  for (const { route, label } of ROUTES) {
    test(`Tela: ${label} (#/${route})`, async ({ page }) => {
      await page.goto(`/#/${route}`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(800);
      await expect(page).toHaveScreenshot(`${route.replace(/\//g, '-')}.png`, {
        animations: 'disabled',
        caret: 'hide',
        maxDiffPixelRatio: 0.02,
      });
    });
  }
});
