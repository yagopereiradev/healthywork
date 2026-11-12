import { expect, test } from '@playwright/test';

test('a focus block runs to its end and opens the break', async ({ page }) => {
  // A Thursday morning, inside working hours. The clock jumps when told to, and
  // otherwise runs normally, so times are checked to the minute, not the second.
  await page.clock.install({ time: new Date('2026-11-12T10:00:00-03:00') });
  await page.goto('/focus?demo=1');

  await expect(page.getByText('Block 1 of 4')).toBeVisible();
  await expect(page.getByRole('img', { name: '25 minutes of focus ahead' })).toBeVisible();

  await page.getByRole('button', { name: 'Start block' }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();

  // Ten minutes in: fifteen left, and the block length can no longer be changed.
  await page.clock.fastForward('10:00');
  await expect(page.getByRole('img', { name: /^1[45]:\d\d left of 25 minutes$/ })).toBeVisible();
  await expect(
    page.getByRole('radio', { name: '50 minutes of focus, 10 of break' }),
  ).toBeDisabled();

  // A pause stops the clock; time passing changes nothing until it resumes.
  // (Five minutes only: a paused block no longer holds the regular break reminder back.)
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.clock.fastForward('05:00');
  await expect(page.getByRole('img', { name: /^Paused, 1[45]:\d\d left$/ })).toBeVisible();
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();

  // The block ends: the break opens by itself, five minutes long.
  await page.clock.fastForward('15:01');
  const breakScreen = page.getByRole('dialog');
  await expect(breakScreen.getByText('Time for a break')).toBeVisible();
  await expect(breakScreen.getByRole('img', { name: /^[45]:\d\d left$/ })).toBeVisible();
  await expect(breakScreen.getByRole('listitem')).toHaveCount(3);

  await breakScreen.getByRole('button', { name: 'Done' }).click();
  // The break is logged and the page behind is in use again. (That the screen
  // also leaves the page is checked in break.spec.ts: here the clock has been
  // jumped forward, which leaves the browser's animation clock behind, so the
  // fade-out never reports that it finished.)
  await expect(page.getByText('Break done')).toBeVisible();

  // The next block waits to be started, and the finished one is in the day's record.
  await expect(page.getByRole('button', { name: 'Start block 2' })).toBeEnabled();
  await expect(page.getByText('Block 2 of 4')).toBeVisible();

  await page.getByRole('link', { name: 'Today' }).click();
  // The sample data already had 2h55 of focus and one 25-minute block.
  await expect(page.getByRole('progressbar', { name: 'Focus' })).toHaveAttribute(
    'aria-valuetext',
    '3h 20m of 4h',
  );
  await expect(page.getByText('Focus · 25 minutes')).toHaveCount(2);
  await expect(page.getByText('Up next · block 2 of 4')).toBeVisible();
});
