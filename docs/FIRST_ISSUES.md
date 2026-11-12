# First issues

A starting set of issues to open once the repository is public. Each is small enough for a first contribution and says where to look.

To create them all at once, with the GitHub CLI signed in to the repository owner's account:

```bash
gh label create "good first issue" --color 7057ff --description "Good for newcomers" --force
gh label create "evidence" --color 17707C --description "About a source or a health claim" --force
```

Then open each one below with `gh issue create --label "good first issue" --title "..." --body "..."`, or paste them into the "New issue" page.

---

## 1. Remove a single record from "Your day"

**Labels:** good first issue, enhancement

Today a record can only be undone from the toast, for a few seconds after it is logged. If you log 500 ml by mistake and miss the toast, it stays.

Add a way to remove one line of "Your day" (water, break or focus), with the same "Undo" toast so it can be brought back.

- The list is `src/features/today/ui/DayTimeline.tsx`, each line is `src/ui/TimelineRow.tsx`.
- Removing and restoring already exist on the repositories: `remove(id)` and `restore(entry)` in `src/data/store.ts`.
- It needs to work with the keyboard and announce what the button does ("Remove Water, 250 ml, 15:02").
- Add a test next to `src/features/today/ui/TodayPage.test.tsx`.

## 2. A longer break after the fourth focus block

**Labels:** good first issue, enhancement

After the last block of a cycle, the break is the same length as the others. Many people expect a longer one there.

Add an optional "long break" length in Settings > Focus (off by default), used for the break that closes the cycle.

- The timer rules are in `src/features/focus/domain/timer.ts` (`completeBlock`), with tests beside it.
- The break length is handed to the reminders in `src/features/focus/FocusProvider.tsx`.
- A new setting needs a default and a validator in `src/data/settings.ts`.

## 3. Show the day and the value when pointing at a bar in History

**Labels:** good first issue, enhancement

In the 30-day view the bars have no labels, so it is hard to tell which day is which. Screen readers already get "12 November: 1,250 ml" for each bar; sighted people do not.

Show that same text when a bar is hovered or focused.

- The chart is `src/ui/BarChart.tsx`. Each bar already receives a `description`.
- It must work with the keyboard too, and must not rely on colour alone.

## 4. Add a translation

**Labels:** good first issue, help wanted

HealthyWork ships in Portuguese, Spanish and English. French, Italian and German are natural next ones.

[CONTRIBUTING.md](../CONTRIBUTING.md) lists the files to touch. The tests check that no key is missing. Please keep the tone of the existing texts: plain, warm, and never "you need to".

## 5. Your own quick amounts for water

**Labels:** good first issue, enhancement

The quick button always logs 250 ml. Someone with a 350 ml glass or a 600 ml bottle has to open the sheet every time.

Let people choose the amount of the quick button in Settings > Water.

- The amounts are in `src/features/water/domain/water.ts`.
- The button is in `src/features/today/ui/QuickActions.tsx`, and the W shortcut in `src/app/GlobalShortcuts.tsx`.

## 6. Remember the goal of each day

**Labels:** enhancement, help wanted

History and the streak judge every past day against the water goal as it is today. Raising the goal makes past days look like they fell short.

Store the goal that was in force each day, and judge each day against its own.

- This changes what is stored, so read the notes on the database version and the backup format in `src/data/dexie/db.ts` and `src/data/backup.ts` first: a new version, a migration and a test are needed.
- Worth discussing the design in the issue before starting.

## 7. Keep the end of a focus block punctual in a background tab

**Labels:** enhancement, help wanted

Browsers slow down timers in tabs that are not visible, so the sound and the notification at the end of a focus block can arrive up to a minute late. The recorded time is always right; only the alert is late.

Explore a timer in a Web Worker, which browsers do not slow down in the same way.

- The timer is armed in `src/features/focus/FocusProvider.tsx`.

## 8. A reminder to export a backup

**Labels:** good first issue, enhancement

Everything lives in the browser, so clearing the site data erases it. A quiet reminder to export a backup, about once a month and never more, would save someone's history one day.

- Export already exists in `src/features/settings/dataFile.ts`.
- Keep it gentle: one toast or one line in Settings, easy to dismiss.
