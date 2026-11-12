import { expect, test } from '@playwright/test';

test('a break is opened, done, and leaves the screen', async ({ page }) => {
  // A Thursday morning inside working hours, so a break is on the way. The
  // offset matches the time zone in playwright.config.ts, so it is 10:00 in the
  // browser wherever the tests run.
  await page.clock.install({ time: new Date('2026-11-12T10:00:00-03:00') });
  await page.goto('/?demo=1');

  await expect(page.getByText(/^Up next · break in \d+ min$/)).toBeVisible();
  await page.getByRole('button', { name: 'Do it now' }).click();

  const breakScreen = page.getByRole('dialog');
  await expect(breakScreen.getByText('Time for a break')).toBeVisible();
  await expect(breakScreen.getByRole('listitem')).toHaveCount(3);
  await expect(breakScreen.getByRole('button', { name: 'Done' })).toBeFocused();

  // The evidence behind the break opens over it, and closes back to it.
  await breakScreen.getByRole('button', { name: 'Why?' }).click();
  const why = page.getByRole('dialog').filter({ hasText: 'The limit' });
  await expect(why).toBeVisible();
  await why.getByRole('button', { name: 'Got it' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(1);

  await breakScreen.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Break done')).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Breaks' })).toHaveAttribute(
    'aria-valuetext',
    '4 of 18',
  );

  // With nothing in the way, the keyboard works again.
  await page.keyboard.press('m');
  await expect(page.getByRole('dialog', { name: 'In a meeting?' })).toBeVisible();
});
