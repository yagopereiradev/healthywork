// Captures the screenshots and the GIF used in the README, from demo mode.
//
//   npm run build && npm run preview -- --port 4173   (in one terminal)
//   npm run media                                      (in another)
//
// Everything is shot in English with a fixed clock, so the result is the same
// on every run. Output goes to docs/media.
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const BASE = process.env.MEDIA_URL ?? 'http://localhost:4173';
const OUT = fileURLToPath(new URL('../docs/media/', import.meta.url));
// A Thursday afternoon, inside working hours.
// The offset is São Paulo's, the time zone the browser is given below.
const NOW = new Date('2026-11-12T15:20:00-03:00');

const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

async function open({ viewport, colorScheme = 'light', scale = 2, path = '/' }) {
  // A phone has a coarse pointer: the app hides keyboard hints there.
  const phone = viewport === PHONE;
  const context = await browser.newContext({
    viewport,
    colorScheme,
    deviceScaleFactor: scale,
    isMobile: phone,
    hasTouch: phone,
    locale: 'en-US',
    timezoneId: 'America/Sao_Paulo',
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  await page.clock.install({ time: NOW });
  await page.goto(`${BASE}${path}${path.includes('?') ? '&' : '?'}demo=1`);
  await page.getByRole('navigation', { name: 'Main' }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  // Let the entrance animations finish before the picture is taken.
  await page.waitForTimeout(900);
  return { context, page };
}

async function shot(name, options, prepare) {
  const { context, page } = await open(options);
  if (prepare) await prepare(page);
  await page.screenshot({ path: `${OUT}${name}.png` });
  await context.close();
  console.log(`docs/media/${name}.png`);
}

// --- Screenshots -----------------------------------------------------------

await shot('today-desktop-light', { viewport: DESKTOP, scale: 1 });
await shot('today-desktop-dark', { viewport: DESKTOP, scale: 1, colorScheme: 'dark' });
await shot('today-phone-light', { viewport: PHONE });
await shot('today-phone-dark', { viewport: PHONE, colorScheme: 'dark' });
await shot('focus-phone', { viewport: PHONE, path: '/focus' }, async (page) => {
  await page.getByRole('button', { name: 'Start block' }).click();
  await page.clock.fastForward('06:18');
  await page.waitForTimeout(1200);
});
await shot('history-phone', { viewport: PHONE, path: '/history' });
await shot('break-phone', { viewport: DESKTOP, scale: 1 }, async (page) => {
  await page.getByRole('button', { name: 'Do it now' }).click();
  await page.getByRole('dialog').waitFor();
  await page.setViewportSize(PHONE);
  await page.waitForTimeout(1200);
});
await shot('why-phone', { viewport: PHONE }, async (page) => {
  await page.getByRole('button', { name: 'Why? Breaks' }).click();
  await page.getByRole('dialog').waitFor();
  await page.waitForTimeout(700);
});

// The weekly summary is the image the app itself generates.
{
  const { context, page } = await open({ viewport: PHONE, path: '/history' });
  await page.getByRole('button', { name: 'Create weekly summary' }).click();
  const image = page.getByRole('dialog').getByRole('img');
  await image.waitFor();
  const base64 = await image.evaluate(async (element) => {
    const blob = await fetch(element.src).then((response) => response.blob());
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  });
  await writeFile(`${OUT}weekly-summary.png`, Buffer.from(base64, 'base64'));
  await context.close();
  console.log('docs/media/weekly-summary.png');
}

// --- The GIF -----------------------------------------------------------------
// A short tour on a phone: log water, log a break, read a "Why?", start a
// focus block. Frames are taken while the animations play.
{
  const { context, page } = await open({ viewport: PHONE, scale: 1 });
  const frames = [];
  const frame = async (holdMs = 90) => frames.push({ png: await page.screenshot(), holdMs });
  const burst = async (count, everyMs = 70) => {
    for (let index = 0; index < count; index++) {
      await page.waitForTimeout(everyMs);
      await frame(everyMs);
    }
  };

  await frame(1100);
  await page.getByRole('button', { name: '+ 250 ml of water' }).click();
  await burst(9);
  await frame(900);
  await page.getByRole('button', { name: '+ 250 ml of water' }).click();
  await burst(9);
  await frame(900);
  await page.getByRole('button', { name: 'I took a break' }).click();
  await burst(7);
  await frame(900);
  await page.getByRole('button', { name: 'Why? Breaks' }).click();
  await burst(7);
  await frame(2200);
  await page.getByRole('button', { name: 'Got it' }).click();
  await burst(5);
  await page.getByRole('link', { name: 'Focus' }).click();
  await burst(7);
  await frame(700);
  await page.getByRole('button', { name: 'Start block' }).click();
  await burst(5);
  await page.clock.fastForward('04:10');
  await burst(8, 90);
  await frame(1600);
  await context.close();

  // sharp joins the frames into one animated GIF.
  const gif = await sharp(
    frames.map((item) => item.png),
    { join: { animated: true } },
  )
    .gif({ delay: frames.map((item) => item.holdMs), loop: 0, effort: 8, colours: 128 })
    .toBuffer();
  await writeFile(`${OUT}demo.gif`, gif);
  console.log(`docs/media/demo.gif (${frames.length} frames, ${Math.round(gif.length / 1024)} KB)`);
}

await browser.close();
