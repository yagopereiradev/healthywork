import 'i18next';
import type breaks from './locales/en/breaks.json';
import type common from './locales/en/common.json';
import type evidence from './locales/en/evidence.json';
import type focus from './locales/en/focus.json';
import type reminders from './locales/en/reminders.json';
import type settings from './locales/en/settings.json';
import type onboarding from './locales/en/onboarding.json';
import type history from './locales/en/history.json';
import type share from './locales/en/share.json';
import type today from './locales/en/today.json';
import type water from './locales/en/water.json';

// Translation keys are type-checked against the English files.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
      today: typeof today;
      water: typeof water;
      breaks: typeof breaks;
      evidence: typeof evidence;
      reminders: typeof reminders;
      focus: typeof focus;
      share: typeof share;
      history: typeof history;
      onboarding: typeof onboarding;
      settings: typeof settings;
    };
  }
}
