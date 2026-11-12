import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_AMOUNT_ML } from '@/features/water/domain/water';
import { formatNumber } from '@/lib/format';
import { Button } from '@/ui/Button';
import { buttonClasses } from '@/ui/buttonStyles';

interface QuickActionsProps {
  onAddWater: () => void;
  onMoreWater: () => void;
  onTookBreak: () => void;
  /** phone: fixed above the tab bar. desktop: inline in the page header. */
  layout: 'phone' | 'desktop';
}

/**
 * The two things done many times a day, always one tap away: log water and log
 * a break. The small button attached to the water one opens other amounts and
 * drinks.
 */
export function QuickActions({ onAddWater, onMoreWater, onTookBreak, layout }: QuickActionsProps) {
  const { t, i18n } = useTranslation('today');
  const phone = layout === 'phone';

  return (
    <div
      role="group"
      aria-label={t('actions.label')}
      className={
        phone
          ? 'fixed inset-x-0 bottom-[calc(61px+env(safe-area-inset-bottom))] z-20 grid grid-cols-[3fr_2fr] gap-2 bg-bg px-5 py-2'
          : 'flex flex-wrap gap-2'
      }
    >
      <div className="flex min-w-0">
        <Button
          tone="water"
          size={phone ? 'bar' : 'lg'}
          shortcut="W"
          onClick={onAddWater}
          className="min-w-0 flex-1 rounded-r-none"
        >
          {t('actions.addWater', { amount: formatNumber(DEFAULT_AMOUNT_ML, i18n.language) })}
        </Button>
        <button
          type="button"
          aria-label={t('actions.moreWater')}
          aria-haspopup="dialog"
          onClick={onMoreWater}
          className={buttonClasses({
            tone: 'water',
            size: phone ? 'bar-icon' : 'lg-icon',
            className: 'rounded-l-none border-l border-water-on/25',
          })}
        >
          <ChevronDown aria-hidden="true" size={18} strokeWidth={2.25} />
        </button>
      </div>
      <Button variant="outline" size={phone ? 'bar' : 'lg'} shortcut="P" onClick={onTookBreak}>
        {t('actions.tookBreak')}
      </Button>
    </div>
  );
}
