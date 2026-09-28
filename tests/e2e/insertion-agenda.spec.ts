import { test, expect } from '@playwright/test';
import { mockInsertionApi, postsWith } from './helpers/insertionMock';

/**
 * TSK-15 — inserção via ModalEvento (Calendário e Visitas).
 * O modal não tem role="dialog": localizado pelo overlay (.modal-overlay /
 * .fixed.inset-0) contendo o cabeçalho "NOVO EVENTO".
 */

test('Calendário — cria evento', async ({ page }) => {
  const posts = await mockInsertionApi(page);
  await page.goto('/#/calendario');
  await page.getByRole('button', { name: /criar nova tarefa/i }).click();

  const panel = page.locator('div.fixed.inset-0.z-50').filter({ hasText: 'Agendar para:' });
  await expect(panel).toBeVisible({ timeout: 6000 });
  await panel.locator('input[type="text"]').fill('Evento E2E Teste');
  await panel.getByRole('button', { name: /^agendar$/i }).click();

  await expect(panel).not.toBeVisible({ timeout: 8000 });
  expect(postsWith(posts, 'Evento E2E Teste').length).toBeGreaterThan(0);
});

test('Visitas — agenda visita técnica', async ({ page }) => {
  const posts = await mockInsertionApi(page);
  await page.goto('/#/visitas');
  await page.getByRole('button', { name: /agendar visita/i }).click();

  const panel = page.locator('div.fixed.inset-0').filter({ hasText: 'NOVO EVENTO' }).first();
  await expect(panel).toBeVisible({ timeout: 6000 });
  await panel.locator('input').first().fill('Visita E2E Teste');
  await panel.locator('select').first().selectOption({ index: 1 });
  await panel.getByRole('button', { name: /confirmar/i }).click();

  await expect(panel).not.toBeVisible({ timeout: 8000 });
  expect(postsWith(posts, 'Visita E2E Teste').length).toBeGreaterThan(0);
});
