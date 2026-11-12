# The evidence behind HealthyWork

HealthyWork only asks you to do things that a study supports, and it only promises what that study actually showed. This page lists, for each feature, what the source says, where the study stops, and the product decision that came out of it. The "Why?" sheets inside the app are short versions of these sections.

HealthyWork is not a medical app. Every goal is an adjustable suggestion. If you have a fluid restriction or a health condition, follow what your doctor tells you.

Every claim below was checked against the linked page on 12 November 2026.

## How we write about health

These rules apply to the app, the README and anything else the project publishes.

- We say "less tiredness" and "more energy". We never say "more productivity", "prevents disease" or anything that reads as a medical claim.
- We say "suggestion" and "adjustable goal". We never say "you need to".
- When a study is small or short, we say so next to the claim.
- When something is our own product reasoning and not a finding, we label it as such.
- No source, no feature. New claims need a new source, discussed in an issue first.

An automated test (`src/i18n/i18n.test.ts`) fails the build if the forbidden phrases appear in any language, and another (`src/features/evidence/domain/sources.test.ts`) fails it if the app cites a link that is not on this page.

## Water

**Feature:** a daily water goal with reminders.

**What the sources say.** The "8 glasses of water a day" rule has no scientific evidence behind it, according to physiologist Heinz Valtin, who searched for its origin. A 2008 review by Negoianu and Goldfarb in the _Journal of the American Society of Nephrology_ found no clear evidence of benefit from drinking increased amounts of water. Much of a person's daily water comes from food, and a 2004 Institute of Medicine panel listed coffee, tea, milk, juice and other drinks among the sources of water intake. The European Food Safety Authority considers a daily intake of 2.0 litres adequate for women and 2.5 litres for men.

**The limit.** The EFSA figures are reference values for a population, not a prescription for one person, and the EFSA page cited here does not say whether they count the water in food. The Scientific American piece is journalism that reports on the research, not a study.

**Product decisions.**

- The default goal is 2,000 ml, always presented as a suggestion you can change.
- Every drink counts: water, coffee, tea and anything else.
- The app never mentions "8 glasses".
- Once you reach the goal, water reminders stop for the day. More is not better.

**Sources.**

- [Fact or Fiction?: You Must Drink 8 Glasses of Water Daily](https://www.scientificamerican.com/article/fact-or-fiction-you-must-drink-8-glasses-of-water-daily/), Karen Bellenir, Scientific American, 2009
- [EFSA sets European dietary reference values for nutrient intakes](https://www.efsa.europa.eu/en/press/news/nda100326), European Food Safety Authority, 2010

## Movement breaks

**Feature:** a reminder to get up and move, by default 5 minutes every 30.

**What the study showed.** Adults sat for 8 hours in a laboratory and tried different walking patterns. Walking for 5 minutes every 30 minutes was the only pattern that significantly lowered both blood sugar and blood pressure: blood sugar spikes after large meals were 58% lower than when sitting all day. Tiredness also went down (Diaz et al., 2023, _Medicine & Science in Sports & Exercise_).

**The limit.** 11 participants, in a laboratory, in their 40s to 60s. Blood pressure also dropped with the lighter walking patterns; what set 5 minutes every 30 apart was the effect on blood sugar. It is a good indication, not a guarantee.

**Product decisions.**

- "5 minutes every 30" is the recommended pace and the default. Every 45, 50 or 60 minutes are offered as alternatives, without the "recommended" label.
- Break suggestions rotate, and getting up to walk is every other suggestion.
- The in-app text states the sample size next to the claim.

**Source.**

- [Rx for Prolonged Sitting: A Five-Minute Stroll Every Half Hour](https://www.cuimc.columbia.edu/node/25711), Columbia University Irving Medical Center, 2023

## Sedentary time

**Feature:** none on its own. This source shapes what the app does not do.

**What the source says.** The World Health Organization's 2020 guidelines say adults should limit the amount of time spent being sedentary (Bull et al., 2020, _British Journal of Sports Medicine_).

**The limit.** The guidelines found the evidence insufficient to set a threshold in hours, and also insufficient to say how often or how long breaks in sedentary time should be.

**Product decisions.**

- The app never shows a "maximum hours sitting" number and never scores you on time spent sitting.
- Breaks are framed as something that makes the day feel better, not as damage control.

**Source.**

- [World Health Organization 2020 guidelines on physical activity and sedentary behaviour](https://pmc.ncbi.nlm.nih.gov/articles/PMC7719906/), British Journal of Sports Medicine, 2020

## Micro-breaks

**Feature:** short breaks, and how the app talks about their benefit.

**What the study showed.** Breaks of up to 10 minutes increase vigor and reduce fatigue. Both effects are small (Albulescu et al., 2022, _PLOS ONE_, a meta-analysis of 22 study samples with 2,335 participants).

**The limit.** The effect on overall performance was not significant. Performance improved only on tasks with lower cognitive demand, and the authors note that recovering from very demanding work may take more than a 10-minute break. Vigor and fatigue were self-reported.

**Product decisions.**

- Breaks are short: 10 minutes at most.
- The app promises less tiredness and more energy. It does not promise that you will get more done.

**Source.**

- ["Give me a break!" A systematic review and meta-analysis on the efficacy of micro-breaks for increasing well-being and performance](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0272460), PLOS ONE, 2022

## Eye breaks (20-20-20)

**Feature:** one of the rotating break suggestions: every 20 minutes, look at something 20 feet (6 metres) away for 20 seconds.

**What the study showed.** Two weeks of reminders to follow the 20-20-20 rule reduced symptoms of digital eye strain and dry eye (Talens-Estarelles et al., 2022, _Contact Lens & Anterior Eye_).

**The limit.** 29 participants. Only the symptoms improved; the clinical measurements of the eye surface did not change. One week after the reminders stopped, the improvement was gone.

**Product decisions.**

- The eye break is part of the regular rotation and keeps coming back. It is a habit the app helps you keep, not a programme you finish.
- The app talks about how your eyes feel and does not claim any change to eyesight or eye health.

**Source.**

- [The effects of breaks on digital eye strain, dry eye and binocular vision: Testing the 20-20-20 rule](https://research.aston.ac.uk/en/publications/the-effects-of-breaks-on-digital-eye-strain-dry-eye-and-binocular/), Aston University, 2022

## Focus blocks (Pomodoro)

**Feature:** focus blocks with a scheduled break at the end of each one, in cycles of 4.

**What the study showed.** Students who took breaks whenever they felt like it reported more fatigue and distraction and less concentration and motivation than students with scheduled breaks (Biwer et al., 2023, _British Journal of Educational Psychology_). The scheduled groups studied for 24 minutes with a 6-minute break, or 12 minutes with a 3-minute break.

**The limit.** 87 university students, over one day of self-study. There was no difference between the groups in how much of the task they completed, so the benefit is in how the work feels, not in how much gets done.

**Product decisions.**

- The break is scheduled: when a block ends, the break opens on its own.
- The default block is 25 minutes of focus and 5 of break, close to the schedule in the study and in step with the movement pace above. 50/10 and a custom length are available.
- While a focus block is running, movement reminders wait for the end of the block. The block's own break counts as the movement break.
- The app does not promise more output.

**Source.**

- [Understanding effort regulation: Comparing "Pomodoro" breaks and self-regulated breaks](https://cris.maastrichtuniversity.nl/en/publications/understanding-effort-regulation-comparing-pomodoro-breaks-and-sel), Maastricht University, 2023

## Reminders on the computer

**Feature:** the reminders themselves, and everything around them.

**What the review showed.** A systematic review of 15 randomized trials with 1,147 office workers found that computer prompts help reduce sitting time, but the effect is small and the differences were not statistically significant (Leppe et al., World Physiotherapy Congress 2023).

**The limit.** It is a conference abstract, not a full peer-reviewed paper. The trials varied a lot from one another, the certainty of the evidence was rated low to moderate, and the authors ask for longer studies and for work on how to keep people responding.

**Our reasoning, not a finding.** If a reminder on its own does little, what the reminder asks for has to be easy and pleasant, or people stop answering it. That is a design bet the app makes; the review does not test it.

**Product decisions.**

- A break takes one tap to confirm and has 2 or 3 plain steps.
- You can always postpone 10 minutes or skip, without any penalty or guilt.
- "In a meeting" silences everything for a while and turns itself back on.
- Reminders only appear during your working hours and days.
- The README is honest that reminders are a nudge with a modest effect, not a treatment.

**Source.**

- [Breaks of sedentary behaviour in office workers using computer prompt: systematic review and meta-analysis](https://www.world.physio/congress-proceeding/breaks-sedentary-behaviour-office-workers-using-computer-prompt-systematic), World Physiotherapy Congress, 2023
