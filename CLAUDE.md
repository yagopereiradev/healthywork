# HealthyWork

Free, open-source PWA that helps people who work at a computer with the basics: water, movement breaks and focus blocks. No backend, no login, no paid APIs. Data lives in the user's IndexedDB and never leaves the device. Public repo: `yagopereiradev/healthywork`.

The product owner writes in Portuguese (pt-BR). Code, comments, commits and docs are in English. The app ships in pt-BR, es and en.

## Commands

```bash
npm run dev          # http://localhost:5173, no .env needed
npm run lint         # ESLint
npm run typecheck    # tsc -b (app, tests, service worker, config)
npm test             # Vitest, single run
npm run build        # typecheck + production build with service worker
npm run e2e          # Playwright, against the production build (two flows)
npm run media        # recapture README screenshots and GIF (needs `npm run preview -- --port 4173`)
npm run format       # Prettier (sorts Tailwind classes)
npm run icons        # regenerate favicon (.svg and .ico) and PWA icons from scripts/generate-icons.mjs
```

`/dev/ui` (development only) shows every token and base component in both themes. Check it after touching tokens or `src/ui`.

`/?demo=1` opens the app with a month of sample data in a separate database (for GIFs and screenshots); `/?demo=0` leaves it. Real data is never touched. The sample data is rebuilt each time the address carries `?demo=1`, and once a day.

## Layout

```
src/app/        shell, routes, theme, PWA registration
src/ui/         base components, no feature knowledge
src/styles/     tokens.css (all colours), fonts.css, index.css (Tailwind theme)
src/lib/        clock, dates, small hooks
src/data/       DataStore interfaces, settings, backup format; dexie/ is the only IndexedDB code
src/i18n/       setup and locales/<lang>/<namespace>.json
src/features/<feature>/domain/   pure logic + tests
src/features/<feature>/ui/       components
src/sw.ts       service worker (Workbox injectManifest)
docs/EVIDENCE.md                 the source for every health claim
```

Features: today, water, breaks, focus, notifications, evidence, history, share, settings, onboarding.

## Rules

**Domain logic is pure.** Files in `features/*/domain` do not import React, UI or Dexie, and never read the clock. `now` arrives as a parameter (`src/lib/clock.ts`). ESLint enforces this. Every reminder rule (working hours, snooze, "in a meeting", stop after the goal, day rollover) must be testable with a fixed timestamp.

**Data goes through `DataStore`** (`src/data/store.ts`). UI and domain never import Dexie. This is what allows optional sync later.

**The data must last for years.**

- Never edit a shipped `version(n)` block in `src/data/dexie/db.ts`. Add `version(n + 1)` with an `upgrade` and a test.
- The backup file format is versioned separately (`src/data/backup.ts`). Bump `BACKUP_FORMAT_VERSION` and add a migration step; never edit an existing step. Old exports must keep importing.
- New settings get a default and a validator in `src/data/settings.ts`. `normalizeSettings` fills them in for existing users, so no migration is needed.
- Records keep units in the field name (`amountMl`, `focusedSec`) and store the local `day` at write time.

**Colours come from tokens only.** `src/styles/tokens.css` is the single source. Tailwind's default palette is disabled. Each module always uses its own colour: water (teal), move (terracotta, for breaks), focus (indigo). The primary button takes the colour of the module where the action happens. Any new text/background pair goes into `src/styles/tokens.test.ts`, which checks WCAG AA in both themes. The dark theme is designed, not inverted.

**Never override a component's base class through `className`.** Two utilities for the same property (`rounded-card` and `rounded-2xl`, `px-[18px]` and `px-0`) have no guaranteed winner in Tailwind. Add a prop or a size to the component instead (`Card radius`, `Button size`). Responsive variants (`md:`) are safe.

**Design direction "Calma".** Sora for titles and numbers (600/700, `tabular-nums`), Inter for text and buttons. Radius 12-16px on controls, 18-28px on cards. Touch targets at least 44px. No gradients. Icons are Lucide, never emoji. White cards on the page background, generous spacing. Follow the design references closely; where there is none, derive from the same patterns.

**Motion.** Use Motion (`motion/react`). Everything honours `prefers-reduced-motion` (`MotionConfig reducedMotion="user"` plus the global CSS rule).

**Accessibility is AA.** Real buttons and links, labels, visible focus, full keyboard use. Sheets and modals trap focus, close on Esc and return focus to the trigger. Toasts are announced. Shortcuts (W, P, F, M, ?) never fire while typing in a field.

**Strings.** No user-facing text in components: add keys to all three locales (a test checks they match). Health copy rules are in docs/EVIDENCE.md and enforced by `src/i18n/i18n.test.ts`: say "less tiredness" and "more energy", never "more productivity" or "prevents"; say "suggestion" and "adjustable goal", never "you need to".

**Evidence.** Use only the sources in docs/EVIDENCE.md. Do not add a health claim or a source without asking the product owner. The "Why?" texts live in the `evidence` translations and the links in `src/features/evidence/domain/sources.ts`; a test ties both to docs/EVIDENCE.md.

**The app only states what it knows.** A break logged by hand ("I took a break") has no type and no duration, because the app did not see it. A break gets a type only when the person follows a suggested exercise and confirms it. Apply the same rule to anything new: never fill a record with a guess.

**Zero configuration.** `npm install` and `npm run dev` must be enough. No `.env`, no accounts, no network calls at runtime (fonts are self-hosted).

## Product decisions already made

- Default focus block is 25/5, in cycles of 4.
- During a focus block, movement reminders wait for the block to end; the block's break counts as the movement break. Water reminders continue.
- Estimates shown to the user (reminders per day, breaks planned) are computed from the real settings, never hard-coded.
- Reminders only work while the app is open (including minimized or installed). Say so plainly; never imply otherwise.
- Every reminder rule is in `src/features/notifications/domain/reminders.ts` and has a test. `RemindersProvider` is the only place that reads the clock, saves the state and makes sound or notifications; with the app open in two tabs, only one of them does (Web Locks).
- The break screen never says how long the person has been sitting: the app cannot know. It says how long since the last break it recorded.
- Esc on the break screen postpones 10 minutes.
- Until `onboardingDone` is true every address shows onboarding (`FirstRunGate` in `src/app/App.tsx`). It is the only place the app asks for the notification permission on its own, and only when the person taps the button.
- Settings are lines of name and value that open an editor sheet with Cancel and Save. The options offered are in `src/features/settings/domain/options.ts`.
- Importing a backup validates the whole file first, shows what is in it and asks before replacing anything. Erasing asks too, with focus on Cancel.
- The weekly summary image is drawn by hand on a canvas in `src/features/share/render/summaryCard.ts`, from finished strings. It always uses the brand's water colours, whatever the theme, and covers the working days of one week. Nothing is uploaded to make it.
- Every action reads the clock before its first `await` (the time that counts is when the person tapped), and every write to the reminder state re-reads what is saved, under a lock. Both came from bugs the end-to-end tests found.
- Only one break screen exists at a time: a new prompt updates it in place.
- Screens other than Today are lazy chunks (`src/app/lazyRoutes.ts`) and each language is its own chunk (`src/i18n/loadLanguage.ts`). `src/i18n/resources.ts` has every language at once and is for tests only.
- Lighthouse on the production build (November 2026): performance 91 to 100, accessibility 100, best practices 100.
- A line or a choice made of two parts sets `aria-label` with both ("Daily goal: 2,000 ml"). Do not rely on adjacent spans for the accessible name.
- The focus timer (`src/features/focus/domain/timer.ts`) stores when a block started and how long it was paused, never a counter. When a block ends, `FocusProvider` logs it and hands over to the reminders, which open the break with the block's break length. The next block waits for the person to start it; after the fourth the cycle ends.
- A block found finished more than 10 minutes late (app closed, computer asleep) is logged without opening a break.

## Out of scope for now

Accounts, sync, calendar integration, AI, posture detection, a Tauri installer, team challenges. They belong in the README roadmap.

## Phases

The work is delivered in phases, stopping for review after each one.

1. Foundation: setup, tokens, themes, i18n, layout, storage, basic PWA, logo and icons. **Done.**
2. Today + Water: bars, small glass, logging, "Your day", toasts, the "Why?" sheet, demo mode. **Done.** Manual break logging came along with it.
3. Breaks and notifications, including "In a meeting". **Done.** System notifications still need a check in a real browser with permission granted.
4. Focus / Pomodoro integrated with breaks. **Done.**
5. Onboarding, History, Settings, installation. **Done.** The "weekly summary" button on History arrives with phase 6.
6. Shareable weekly summary. **Done.**
7. Polish, accessibility, E2E tests, README, deploy. **Done**, except the push and the first deploy, which wait for the owner.
