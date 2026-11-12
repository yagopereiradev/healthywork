# Contributing to HealthyWork

Thank you for wanting to help. HealthyWork is small on purpose, and the bar for what goes in is "calm, honest and finished", so a small, complete change is worth more than a large one that is almost there.

## Getting started

```bash
git clone https://github.com/yagopereiradev/healthywork.git && cd healthywork
npm install
npm run dev
```

No `.env`, no keys. Useful addresses while you work:

- http://localhost:5173/?demo=1 opens the app with a month of sample data, in a separate database. `?demo=0` leaves it.
- http://localhost:5173/dev/ui shows every colour token and base component, in the light and dark themes side by side.

Before opening a pull request, run what CI runs:

```bash
npm run lint && npm run format:check && npm run typecheck && npm test && npm run build
npm run e2e
```

## What makes a good first contribution

- Issues labelled [good first issue](https://github.com/yagopereiradev/healthywork/labels/good%20first%20issue).
- **A translation.** Copy `src/i18n/locales/en` to a new folder, translate the values, add the language to `LANGUAGES` in `src/data/settings.ts`, to `src/i18n/loadLanguage.ts`, `src/i18n/languages.ts`, `src/i18n/resources.ts` and to `resolveLanguage`. The tests will tell you if a key is missing.
- **A bug you ran into**, with the steps to see it.

For anything larger, open an issue first so we can agree on the shape before you spend time on it.

## The rules of the house

These keep the project coherent. They are short, and the tooling enforces most of them.

**Health claims need a source.** HealthyWork only asks people to do things a study supports, and only promises what that study showed. Do not add or change a health claim, a default goal or a "Why?" text without a source, and open an issue to discuss the source before the pull request. [docs/EVIDENCE.md](docs/EVIDENCE.md) is the reference.

**Mind the words.** The app says "less tiredness" and "more energy". It never says "more productivity" or "prevents", and it says "suggestion" and "adjustable goal", never "you need to". A test fails the build if those phrases appear in any language.

**The app only states what it knows.** A break logged by hand has no type, because the app did not see what the person did. Never fill a record or a screen with a guess.

**Nothing leaves the device.** No analytics, no remote fonts, no network calls at run time, no account. A feature that needs a server belongs in an issue first.

**Logic is separate from screens.** The rules of a feature live in `src/features/<feature>/domain` as plain TypeScript functions: no React, no storage, and no reading the clock (the current time is a parameter). That is what makes every reminder rule testable. ESLint enforces it.

**Data goes through `DataStore`** (`src/data/store.ts`). Screens and domain code never import Dexie.

**People keep their data for years.** Never edit a released database version or backup migration; add a new one, with a test.

**Colours come from tokens.** `src/styles/tokens.css` is the only place a colour is defined. Each module keeps its own: water (teal), breaks (terracotta), focus (indigo). A new text and background pair goes into `src/styles/tokens.test.ts`, which checks contrast in both themes.

**Accessible by default.** Real buttons and links, visible focus, full keyboard use, and motion that respects "reduce motion". `src/test/a11y.test.tsx` runs axe on every screen.

**No text in components.** Add the key to every language in `src/i18n/locales`.

There is more detail, written for anyone (or any AI assistant) working in the code, in [CLAUDE.md](CLAUDE.md).

## Pull requests

- One change per pull request, with tests for the behaviour you add or fix.
- Say what you changed and how you checked it. A screenshot or a short recording helps for anything visual, in both themes.
- If the screens in the README changed, run `npm run media` to recapture them.

## Code of conduct

By taking part you agree to follow the [code of conduct](CODE_OF_CONDUCT.md).
