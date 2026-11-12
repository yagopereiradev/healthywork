import { ExternalLink } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/Button';
import { cn } from '@/ui/cn';
import { Sheet } from '@/ui/Sheet';
import { TONES, type Tone } from '@/ui/tones';
import { EVIDENCE, type EvidenceTopic } from '../domain/sources';

const TOPIC_TONE: Record<EvidenceTopic, Tone> = {
  water: 'water',
  breaks: 'move',
  eyes: 'move',
  microbreaks: 'move',
  focus: 'focus',
};

/** What the person can change after reading: the goal, the pace or the block. */
const CHANGE_LABEL: Record<EvidenceTopic, 'water' | 'breaks' | 'focus'> = {
  water: 'water',
  breaks: 'breaks',
  eyes: 'breaks',
  microbreaks: 'breaks',
  focus: 'focus',
};

interface WhySheetProps {
  /** The topic to explain, or null while closed. */
  topic: EvidenceTopic | null;
  onClose: () => void;
  /** Called by "Change the pace" (or goal, or block). Leave out to hide that button. */
  onChange?: () => void;
}

/**
 * "Why?": what the study showed, where it stops, and where to read it.
 * The limit of the study gets as much room as the finding, on purpose.
 */
export function WhySheet({ topic, onClose, onChange }: WhySheetProps) {
  const titleId = useId();
  // Keeps the last topic on screen while the sheet animates out.
  const [shown, setShown] = useState(topic);
  if (topic && topic !== shown) setShown(topic);

  return (
    <Sheet open={topic !== null} onClose={onClose} labelledBy={titleId}>
      {shown ? (
        <WhyContent topic={shown} titleId={titleId} onClose={onClose} onChange={onChange} />
      ) : null}
    </Sheet>
  );
}

function WhyContent({
  topic,
  titleId,
  onClose,
  onChange,
}: {
  topic: EvidenceTopic;
  titleId: string;
  onClose: () => void;
  onChange?: () => void;
}) {
  const { t } = useTranslation('evidence');
  const { t: tc } = useTranslation();
  const tone = TOPIC_TONE[topic];
  const tones = TONES[tone];

  return (
    <>
      <header className="flex flex-col gap-1.5">
        <p className={cn('text-[13px] font-semibold tracking-wider uppercase', tones.ink)}>
          {t(`${topic}.eyebrow`)}
        </p>
        <h2 id={titleId} className="text-2xl">
          {t(`${topic}.question`)}
        </h2>
      </header>

      <section className="flex flex-col gap-1.5">
        <h3 className="font-sans text-[13px] font-semibold tracking-normal text-ink-2">
          {t(`${topic}.findingLabel`)}
        </h3>
        <p>{t(`${topic}.finding`)}</p>
      </section>

      <section className={cn('flex flex-col gap-1 rounded-2xl px-4 py-3.5', tones.soft)}>
        <h3 className={cn('font-sans text-[13px] font-semibold tracking-normal', tones.ink)}>
          {t(`${topic}.limitLabel`)}
        </h3>
        <p className="text-[15px] leading-[1.45]">{t(`${topic}.limit`)}</p>
      </section>

      <ul className="flex flex-col gap-2 text-sm text-ink-2">
        {EVIDENCE[topic].map((source) => (
          <li key={source.id} className="flex flex-col gap-0.5">
            {/* The ids come from the EVIDENCE registry; a test checks each has its texts. */}
            <span>{t(`${topic}.sources.${source.id}.authors` as never)}</span>
            <span>{t(`${topic}.sources.${source.id}.where` as never)}</span>
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className={cn(
                'inline-flex items-center gap-1.5 self-start py-3 font-semibold underline underline-offset-2',
                tones.ink,
              )}
            >
              {t('readSource')}
              <ExternalLink aria-hidden="true" size={15} strokeWidth={2.25} />
              <span className="sr-only">{tc('actions.newTab')}</span>
            </a>
          </li>
        ))}
      </ul>

      <div className={cn('grid gap-2', onChange ? 'grid-cols-2' : 'grid-cols-1')}>
        {onChange ? (
          <Button
            variant="outline"
            size="xl-pair"
            onClick={() => {
              onClose();
              onChange();
            }}
          >
            {t(`change.${CHANGE_LABEL[topic]}`)}
          </Button>
        ) : null}
        <Button tone={tone} size={onChange ? 'xl-pair' : 'xl'} onClick={onClose} data-autofocus>
          {tc('actions.gotIt')}
        </Button>
      </div>
    </>
  );
}
