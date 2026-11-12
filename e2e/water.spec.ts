import { expect, test } from '@playwright/test';

test('a new person sets up the app and logs water', async ({ page }) => {
  await page.goto('/');

  // First run: three steps, every one with a default already chosen.
  await expect(
    page.getByRole('heading', { name: 'How much water makes sense for you?' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'What are your working hours?' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(
    page.getByRole('heading', { name: 'Want reminders as notifications?' }),
  ).toBeVisible();
  // "Not now" where the browser would ask; "Get started" where it already said no.
  await page.getByRole('button', { name: /^(Not now|Get started)$/ }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();
  const water = page.getByRole('progressbar', { name: 'Water' });
  await expect(water).toHaveAttribute('aria-valuetext', '0 of 2,000 ml');
  await expect(page.getByText('Your day starts here')).toBeVisible();

  // One tap logs 250 ml: the bar, the timeline and a toast all show it.
  await page.getByRole('button', { name: '+ 250 ml of water' }).click();
  await expect(water).toHaveAttribute('aria-valuetext', '250 of 2,000 ml');
  await expect(page.getByText('Water · 250 ml')).toBeVisible();
  await expect(page.getByText('250 ml logged')).toBeVisible();

  // The shortcut does the same.
  await page.keyboard.press('w');
  await expect(water).toHaveAttribute('aria-valuetext', '500 of 2,000 ml');

  // Undo takes the last one back.
  await page.getByRole('button', { name: 'Undo' }).last().click();
  await expect(water).toHaveAttribute('aria-valuetext', '250 of 2,000 ml');

  // Another amount and another drink go through the sheet.
  await page.getByRole('button', { name: 'Another amount or drink' }).click();
  const sheet = page.getByRole('dialog', { name: 'Log a drink' });
  await sheet.getByRole('radio', { name: '500 ml' }).click();
  await sheet.getByRole('radio', { name: 'Tea' }).click();
  await sheet.getByRole('button', { name: 'Log 500 ml' }).click();
  await expect(page.getByText('Tea · 500 ml')).toBeVisible();
  await expect(water).toHaveAttribute('aria-valuetext', '750 of 2,000 ml');

  // Everything is stored on the device: it is still there after a reload.
  await page.reload();
  await expect(page.getByRole('progressbar', { name: 'Water' })).toHaveAttribute(
    'aria-valuetext',
    '750 of 2,000 ml',
  );
  await expect(page.getByText('Tea · 500 ml')).toBeVisible();
});
