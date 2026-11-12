import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { DRINK_TYPES, type DrinkType } from '@/data/types';
import { formatNumber } from '@/lib/format';
import { Button } from '@/ui/Button';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { Sheet } from '@/ui/Sheet';
import { MAX_ENTRY_ML, parseAmount, QUICK_AMOUNTS_ML } from '../domain/water';

const CUSTOM = 'custom';
type AmountChoice = `${(typeof QUICK_AMOUNTS_ML)[number]}` | typeof CUSTOM;

interface LogDrinkSheetProps {
  open: boolean;
  onClose: () => void;
  onLog: (amountMl: number, drink: DrinkType) => void;
}

/** Another amount or another drink: 250, 500 or a typed value, and what it was. */
export function LogDrinkSheet({ open, onClose, onLog }: LogDrinkSheetProps) {
  const titleId = useId();
  return (
    <Sheet open={open} onClose={onClose} labelledBy={titleId}>
      <LogDrinkForm titleId={titleId} onClose={onClose} onLog={onLog} />
    </Sheet>
  );
}

function LogDrinkForm({
  titleId,
  onClose,
  onLog,
}: Omit<LogDrinkSheetProps, 'open'> & { titleId: string }) {
  const { t, i18n } = useTranslation('water');
  const { t: tc } = useTranslation();
  const inputId = useId();
  const errorId = useId();

  const [choice, setChoice] = useState<AmountChoice>(`${QUICK_AMOUNTS_ML[0]}`);
  const [customText, setCustomText] = useState('');
  const [drink, setDrink] = useState<DrinkType>('water');
  const [showError, setShowError] = useState(false);

  const number = (value: number) => formatNumber(value, i18n.language);
  const amount = choice === CUSTOM ? parseAmount(customText) : Number(choice);
  const invalid = choice === CUSTOM && showError && amount === null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (amount === null) {
      setShowError(true);
      return;
    }
    onLog(amount, drink);
    onClose();
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 id={titleId} className="text-[22px]">
          {t('log.title')}
        </h2>
        <p className="text-[15px] leading-[1.45] text-ink-2">{t('log.body')}</p>
      </header>

      <div className="flex flex-col gap-2">
        <SegmentedControl<AmountChoice>
          label={t('log.amount')}
          on="surface"
          value={choice}
          onChange={(next) => {
            setChoice(next);
            setShowError(false);
          }}
          options={[
            ...QUICK_AMOUNTS_ML.map((value) => ({
              value: `${value}` as AmountChoice,
              label: t('log.amountOption', { amount: number(value) }),
            })),
            { value: CUSTOM, label: t('log.custom') },
          ]}
        />

        {choice === CUSTOM ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={inputId} className="text-[13px] font-semibold text-ink-2">
              {t('log.customLabel')}
            </label>
            <input
              id={inputId}
              // The person just chose "Other": typing the amount is the next step.
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              inputMode="numeric"
              autoComplete="off"
              value={customText}
              onChange={(event) => setCustomText(event.target.value)}
              aria-invalid={invalid}
              aria-describedby={invalid ? errorId : undefined}
              className="min-h-12 w-full rounded-control border border-control bg-surface px-3 font-display text-lg font-semibold tabular-nums"
            />
            {invalid ? (
              <p id={errorId} role="alert" className="text-[13px] font-medium text-move-ink">
                {t('log.invalid', { max: number(MAX_ENTRY_ML) })}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <SegmentedControl<DrinkType>
        label={t('log.drink')}
        on="surface"
        value={drink}
        onChange={setDrink}
        options={DRINK_TYPES.map((value) => ({ value, label: t(`drinks.${value}`) }))}
        columns="grid-cols-2 sm:grid-cols-4"
      />

      <div className="grid grid-cols-[1fr_2fr] gap-2">
        <Button variant="ghost" size="xl" onClick={onClose}>
          {tc('actions.cancel')}
        </Button>
        <Button type="submit" tone="water" size="xl">
          {amount === null ? t('log.submitEmpty') : t('log.submit', { amount: number(amount) })}
        </Button>
      </div>
    </form>
  );
}
