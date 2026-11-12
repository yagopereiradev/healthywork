import { useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataStore, useLive, useSettings } from '@/data/hooks';
import { useFormatDuration } from '@/i18n/useFormatDuration';
import { dayKey, dayStart, formatPeriod } from '@/lib/dates';
import { formatLiters, formatNumber, formatWeekdayInitial } from '@/lib/format';
import { useNow } from '@/lib/useNow';
import { Button } from '@/ui/Button';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { Sheet } from '@/ui/Sheet';
import { Skeleton } from '@/ui/StateViews';
import { useToasts } from '@/ui/toast/toastStore';
import { summarizeWeek, summaryDays } from '../domain/week';
import { CARD_HEIGHT, CARD_WIDTH, renderSummaryPng, type SummaryCard } from '../render/summaryCard';

type WeekChoice = 'this' | 'last';

/**
 * The weekly summary: a preview of the image, and the buttons to download or
 * share it. The image is made on the device from what is stored on it.
 */
export function ShareSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const titleId = useId();
  return (
    <Sheet open={open} onClose={onClose} labelledBy={titleId}>
      <ShareContent titleId={titleId} />
    </Sheet>
  );
}

function ShareContent({ titleId }: { titleId: string }) {
  const { t, i18n } = useTranslation('share');
  const store = useDataStore();
  const show = useToasts((state) => state.show);
  const formatDuration = useFormatDuration();
  const [week, setWeek] = useState<WeekChoice>('this');

  const today = dayKey(useNow());
  const settings = useSettings();
  const workdays = settings.value?.workday.days;
  const workdaysKey = workdays?.join(',') ?? '';
  const days = useMemo(
    () => summaryDays(today, week === 'this' ? 0 : 1, workdays ?? []),
    // `workdays` is a new array on every settings read; its content is in workdaysKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [today, week, workdaysKey],
  );
  const from = days[0] ?? today;
  const to = days.at(-1) ?? today;

  const water = useLive(() => store.water.watchBetween(from, to), [store, from, to]);
  const breaks = useLive(() => store.breaks.watchBetween(from, to), [store, from, to]);
  const focus = useLive(() => store.focus.watchBetween(from, to), [store, from, to]);

  const ready =
    settings.status === 'ready' &&
    water.status === 'ready' &&
    breaks.status === 'ready' &&
    focus.status === 'ready';

  const model = useMemo(() => {
    if (!ready) return null;
    const summary = summarizeWeek(
      today,
      days,
      { water: water.value, breaks: breaks.value, focus: focus.value },
      settings.value.water.goalMl,
    );
    const period = formatPeriod(from, to, i18n.language);
    const card: SummaryCard = {
      period,
      heading: t('card.heading'),
      liters: t('card.liters', { amount: formatLiters(summary.waterMl, i18n.language) }),
      waterLabel: t('card.water'),
      breaks: formatNumber(summary.breaks, i18n.language),
      breaksLabel: t('card.breaks', { count: summary.breaks }),
      focus: formatDuration(summary.focusMin),
      focusLabel: t('card.focus'),
      daysLine: t('card.days', { count: summary.reachedDays }),
      days: summary.days.map((day) => ({
        letter: formatWeekdayInitial(dayStart(day.day), i18n.language),
        state: day.state,
      })),
      footer: t('card.footer'),
    };
    return {
      card,
      empty: summary.empty,
      alt: t('alt', {
        period,
        liters: card.liters,
        breaks: card.breaks,
        breaksLabel: card.breaksLabel,
        focus: card.focus,
        days: card.daysLine,
      }),
      fileName: t('fileName', { date: from }),
    };
  }, [
    ready,
    today,
    days,
    from,
    to,
    water.value,
    breaks.value,
    focus.value,
    settings.value,
    i18n.language,
    t,
    formatDuration,
  ]);

  // The picture itself: drawn again whenever the numbers behind it change.
  const [image, setImage] = useState<{ blob: Blob; url: string; card: SummaryCard } | null>(null);
  const [failed, setFailed] = useState(false);
  const card = model?.card;
  useEffect(() => {
    if (!card) return;
    let current = true;
    let url: string | null = null;
    renderSummaryPng(card)
      .then((blob) => {
        if (!current) return;
        url = URL.createObjectURL(blob);
        setFailed(false);
        setImage({ blob, url, card });
      })
      .catch(() => {
        if (current) setFailed(true);
      });
    return () => {
      current = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [card]);

  const fresh = image && image.card === card ? image : null;
  const file =
    fresh && model ? new File([fresh.blob], model.fileName, { type: 'image/png' }) : null;
  const canShare = Boolean(file && navigator.canShare?.({ files: [file] }));

  const download = () => {
    if (!fresh || !model) return;
    const link = document.createElement('a');
    link.href = fresh.url;
    link.download = model.fileName;
    document.body.append(link);
    link.click();
    link.remove();
    show({ message: t('downloaded') });
  };

  const share = async () => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: t('title') });
    } catch {
      // The person closed the share sheet: nothing to report.
    }
  };

  return (
    <>
      <header className="flex flex-col gap-1">
        <h2 id={titleId} className="text-[22px]">
          {t('title')}
        </h2>
        <p className="text-[15px] leading-[1.45] text-ink-2">{t('body')}</p>
      </header>

      <SegmentedControl<WeekChoice>
        label={t('week.label')}
        on="surface"
        value={week}
        onChange={setWeek}
        options={[
          { value: 'this', label: t('week.this') },
          { value: 'last', label: t('week.last') },
        ]}
      />

      <div
        className="mx-auto w-full max-w-[280px] shrink-0 overflow-hidden rounded-2xl bg-water-solid"
        style={{ aspectRatio: `${CARD_WIDTH} / ${CARD_HEIGHT}` }}
      >
        {fresh && model ? (
          <img src={fresh.url} alt={model.alt} className="block h-full w-full" />
        ) : failed ? (
          <p role="alert" className="flex h-full items-center p-6 text-center text-solid-on">
            {t('failed')}
          </p>
        ) : (
          <div role="status" aria-label={t('generating')} className="h-full w-full">
            <Skeleton className="h-full w-full bg-water-deep" />
          </div>
        )}
      </div>

      {model?.empty ? <p className="text-sm text-ink-2">{t('empty')}</p> : null}

      <div className={canShare ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-1'}>
        {canShare ? (
          <Button variant="outline" size="xl" disabled={!fresh} onClick={() => void share()}>
            {t('share')}
          </Button>
        ) : null}
        <Button tone="water" size="xl" disabled={!fresh} onClick={download} data-autofocus>
          {t('download')}
        </Button>
      </div>
    </>
  );
}
