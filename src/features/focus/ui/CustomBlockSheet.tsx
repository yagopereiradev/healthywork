import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/Button';
import { Sheet } from '@/ui/Sheet';
import { CUSTOM_LIMITS, isValidCustomBlock } from '../domain/timer';

interface CustomBlockSheetProps {
  open: boolean;
  onClose: () => void;
  /** The current block, to start from. */
  focusMin: number;
  breakMin: number;
  onSave: (focusMin: number, breakMin: number) => void;
}

/** "Other": a block with the person's own focus and break lengths. */
export function CustomBlockSheet({ open, onClose, ...rest }: CustomBlockSheetProps) {
  const titleId = useId();
  return (
    <Sheet open={open} onClose={onClose} labelledBy={titleId}>
      <CustomBlockForm titleId={titleId} onClose={onClose} {...rest} />
    </Sheet>
  );
}

function CustomBlockForm({
  titleId,
  onClose,
  focusMin,
  breakMin,
  onSave,
}: Omit<CustomBlockSheetProps, 'open'> & { titleId: string }) {
  const { t } = useTranslation('focus');
  const { t: tc } = useTranslation();
  const focusId = useId();
  const restId = useId();
  const errorId = useId();
  const [focus, setFocus] = useState(String(focusMin));
  const [rest, setRest] = useState(String(breakMin));
  const [showError, setShowError] = useState(false);

  const whole = (text: string) => (/^\s*\d{1,3}\s*$/.test(text) ? Number(text) : Number.NaN);
  const valid = isValidCustomBlock(whole(focus), whole(rest));
  const invalid = showError && !valid;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!valid) {
      setShowError(true);
      return;
    }
    onSave(whole(focus), whole(rest));
    onClose();
  };

  const inputClass =
    'min-h-12 w-full rounded-control border border-control bg-surface px-3 font-display text-lg font-semibold tabular-nums';

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 id={titleId} className="text-[22px]">
          {t('custom.title')}
        </h2>
        <p className="text-[15px] leading-[1.45] text-ink-2">{t('custom.body')}</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={focusId} className="text-[13px] font-semibold text-ink-2">
            {t('custom.focus')}
          </label>
          <input
            id={focusId}
            data-autofocus
            inputMode="numeric"
            autoComplete="off"
            value={focus}
            onChange={(event) => setFocus(event.target.value)}
            aria-invalid={invalid}
            aria-describedby={invalid ? errorId : undefined}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={restId} className="text-[13px] font-semibold text-ink-2">
            {t('custom.rest')}
          </label>
          <input
            id={restId}
            inputMode="numeric"
            autoComplete="off"
            value={rest}
            onChange={(event) => setRest(event.target.value)}
            aria-invalid={invalid}
            aria-describedby={invalid ? errorId : undefined}
            className={inputClass}
          />
        </div>
      </div>

      {invalid ? (
        <p id={errorId} role="alert" className="text-[13px] font-medium text-move-ink">
          {t('custom.invalid', {
            focusMin: CUSTOM_LIMITS.focusMin.min,
            focusMax: CUSTOM_LIMITS.focusMin.max,
            restMin: CUSTOM_LIMITS.breakMin.min,
            restMax: CUSTOM_LIMITS.breakMin.max,
          })}
        </p>
      ) : null}

      <div className="grid grid-cols-[1fr_2fr] gap-2">
        <Button variant="ghost" size="xl" onClick={onClose}>
          {tc('actions.cancel')}
        </Button>
        <Button type="submit" tone="focus" size="xl">
          {t('custom.save')}
        </Button>
      </div>
    </form>
  );
}
