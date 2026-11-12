import { Sprout } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { cn } from '@/ui/cn';
import { Logo, LogoMark } from '@/ui/Logo';
import { ProgressBar } from '@/ui/ProgressBar';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { EmptyState, ErrorState, Skeleton } from '@/ui/StateViews';
import { TimelineList, TimelineRow } from '@/ui/TimelineRow';
import { TONES, type Tone } from '@/ui/tones';

/**
 * Development-only page (/dev/ui): every token and base component, in the
 * light and dark themes side by side. Sample copy is fixed in Portuguese to
 * match the design references; nothing here ships to production.
 */
export default function DevGallery() {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
        <div>
          <p className="text-[13px] font-semibold tracking-wider text-water-ink uppercase">
            Direction A · Calma
          </p>
          <h1 className="text-2xl">Tokens and components</h1>
        </div>
        <Link to="/" className="text-sm font-semibold text-water-ink underline">
          Back to the app
        </Link>
      </header>
      <div className="grid xl:grid-cols-2">
        <Theme name="light" />
        <Theme name="dark" />
      </div>
    </div>
  );
}

function Theme({ name }: { name: 'light' | 'dark' }) {
  return (
    <div data-theme={name} className="flex flex-col gap-10 bg-bg p-6 text-ink md:p-10">
      <h2 className="text-lg capitalize">{name}</h2>
      <Brand />
      <Swatches />
      <Typography />
      <Buttons />
      <Progress />
      <Cards />
      <Timeline />
      <Controls />
      <States />
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-sans text-xs font-semibold tracking-wider text-ink-2 uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Brand() {
  return (
    <Section title="Logo">
      <div className="flex flex-wrap gap-4">
        <Card className="flex items-center px-7 py-6 text-[34px]">
          <Logo size={64} className="gap-4" />
        </Card>
        <Card className="flex items-center gap-4 px-7 py-6">
          <LogoMark size={48} />
          <LogoMark size={32} />
          <LogoMark size={20} />
        </Card>
      </div>
    </Section>
  );
}

const SWATCHES: { name: string; className: string }[] = [
  { name: 'bg', className: 'bg-bg' },
  { name: 'surface', className: 'bg-surface' },
  { name: 'raised', className: 'bg-raised' },
  { name: 'ink', className: 'bg-ink' },
  { name: 'ink-2', className: 'bg-ink-2' },
  { name: 'line', className: 'bg-line' },
  { name: 'divider', className: 'bg-divider' },
  { name: 'water', className: 'bg-water' },
  { name: 'water-soft', className: 'bg-water-soft' },
  { name: 'water-weak', className: 'bg-water-weak' },
  { name: 'water-solid', className: 'bg-water-solid' },
  { name: 'water-deep', className: 'bg-water-deep' },
  { name: 'move', className: 'bg-move' },
  { name: 'move-soft', className: 'bg-move-soft' },
  { name: 'move-weak', className: 'bg-move-weak' },
  { name: 'move-solid', className: 'bg-move-solid' },
  { name: 'move-deep', className: 'bg-move-deep' },
  { name: 'focus', className: 'bg-focus' },
  { name: 'focus-soft', className: 'bg-focus-soft' },
  { name: 'focus-weak', className: 'bg-focus-weak' },
  { name: 'focus-solid', className: 'bg-focus-solid' },
  { name: 'focus-deep', className: 'bg-focus-deep' },
];

function Swatches() {
  return (
    <Section title="Colour tokens">
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {SWATCHES.map((swatch) => (
          <li key={swatch.name} className="flex flex-col gap-1.5">
            <span className={cn('h-14 rounded-[14px] border border-divider', swatch.className)} />
            <span className="text-xs font-semibold">{swatch.name}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Typography() {
  return (
    <Section title="Typography">
      <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
        <span className="font-display text-[56px] leading-none font-bold tabular-nums">
          1.250 ml
        </span>
        <div className="flex flex-col gap-1">
          <span className="font-display text-lg font-semibold">Sora para títulos e números</span>
          <span className="text-ink-2">Inter para textos e botões</span>
        </div>
      </div>
    </Section>
  );
}

const TONE_LIST: Tone[] = ['water', 'move', 'focus'];

function Buttons() {
  return (
    <Section title="Buttons">
      <div className="flex flex-wrap gap-2">
        <Button tone="water" size="lg" shortcut="W">
          + 250 ml de água
        </Button>
        <Button variant="outline" size="lg" shortcut="P">
          Fiz uma pausa
        </Button>
        <Button variant="outline" size="lg" shortcut="M">
          Em reunião
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {TONE_LIST.map((tone) => (
          <Button key={tone} tone={tone}>
            {tone}
          </Button>
        ))}
        <Button>neutral</Button>
        <Button variant="outline">outline</Button>
        <Button variant="ghost">ghost</Button>
        <Button tone="water" disabled>
          disabled
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button tone="move" size="md">
          md · 44px
        </Button>
        <Button tone="move" size="lg">
          lg · 48px
        </Button>
        <Button tone="move" size="xl">
          xl · 54px
        </Button>
      </div>
    </Section>
  );
}

function Progress() {
  const [water, setWater] = useState(1250);
  return (
    <Section title="Progress">
      <Card className="flex flex-col gap-5 px-7 py-6">
        <Bar label="Água" tone="water" value={water} max={2000} text={`${water} de 2.000 ml`} />
        <Bar label="Pausas" tone="move" value={3} max={6} text="3 de 6" />
        <Bar label="Foco" tone="focus" value={175} max={240} text="2h55 de 4h" />
        <div className="flex gap-2">
          <Button tone="water" onClick={() => setWater((v) => Math.min(v + 250, 2000))}>
            + 250 ml
          </Button>
          <Button variant="ghost" onClick={() => setWater(0)}>
            Reset
          </Button>
        </div>
      </Card>
    </Section>
  );
}

function Bar(props: { label: string; tone: Tone; value: number; max: number; text: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between text-[15px]">
        <span className="font-semibold">{props.label}</span>
        <span className="text-ink-2 tabular-nums">{props.text}</span>
      </div>
      <ProgressBar
        size="md"
        tone={props.tone}
        value={props.value}
        max={props.max}
        label={props.label}
        valueText={props.text}
      />
    </div>
  );
}

function Cards() {
  return (
    <Section title="Cards">
      <div className="grid gap-6 sm:grid-cols-2">
        <Card variant="solid" tone="focus" radius="lg" className="flex flex-col gap-4 px-7 py-6">
          <p className={cn('text-sm font-semibold', TONES.focus.solidMuted)}>
            Agora · foco, bloco 2 de 4
          </p>
          <p className="font-display text-[64px] leading-none font-bold tabular-nums">18:42</p>
          <ProgressBar onSolid tone="focus" value={63} max={100} label="Bloco de foco" />
          <div className="flex flex-wrap gap-2">
            <Button variant="inverse" tone="focus" size="lg" shortcut="F">
              Pausar
            </Button>
            <Button variant="inverse-outline" tone="focus" size="lg">
              Encerrar
            </Button>
          </div>
        </Card>

        <Card variant="soft" tone="move" radius="lg" className="flex flex-col gap-3 px-7 py-6">
          <p className="text-sm font-semibold text-move-ink">A seguir · pausa em 12 min</p>
          <p className="font-display text-[26px] leading-[1.15] font-bold">Caminhar 5 minutos</p>
          <p className="text-[15px] leading-[1.45] text-move-ink-2">
            Levanta, vai até a janela ou pega mais água.
          </p>
          <div className="mt-auto flex flex-wrap gap-2 pt-1">
            <Button tone="move" size="lg">
              Fazer agora
            </Button>
            <Button variant="outline" tone="move" size="lg">
              Adiar 10 min
            </Button>
          </div>
        </Card>

        <Card variant="solid" tone="water" radius="lg" className="flex flex-col gap-3 px-7 py-6">
          <p className={cn('text-sm font-semibold', TONES.water.solidMuted)}>Água</p>
          <p className="font-display text-[34px] leading-none font-bold tabular-nums">1.250</p>
          <ProgressBar onSolid tone="water" value={62} max={100} label="Água" />
        </Card>

        <Card variant="soft" tone="water" radius="notice" className="px-4 py-3.5 text-[13px]">
          O HealthyWork não substitui orientação médica. As metas são sugestões e você pode ajustar
          todas.
        </Card>
      </div>
    </Section>
  );
}

function Timeline() {
  return (
    <Section title="Timeline rows">
      <Card className="px-6 py-5">
        <h4 className="pb-2 font-display text-[17px] font-semibold">Seu dia</h4>
        <TimelineList>
          <TimelineRow upcoming time="15:45" tone="water" text="Lembrete de água" />
          <TimelineRow upcoming time="15:30" tone="move" text="Pausa · caminhar 5 minutos" />
          <TimelineRow time="15:02" tone="water" text="Água · 250 ml" />
          <TimelineRow time="14:40" tone="move" text="Pausa · alongar ombros" />
          <TimelineRow time="13:50" tone="focus" text="Foco · 50 minutos" />
        </TimelineList>
      </Card>
    </Section>
  );
}

function Controls() {
  const [range, setRange] = useState<'7' | '30'>('7');
  return (
    <Section title="Segmented control and navigation">
      <div className="flex flex-wrap items-center gap-4">
        <SegmentedControl
          label="Período"
          value={range}
          onChange={setRange}
          options={[
            { value: '7', label: '7 dias' },
            { value: '30', label: '30 dias' },
          ]}
        />
        <div className="flex gap-1">
          {(['Hoje', 'Foco', 'Histórico', 'Ajustes'] as const).map((label, index) => (
            <span
              key={label}
              className={cn(
                'flex min-h-11 items-center rounded-control px-3.5 text-[13px]',
                index === 0 && 'bg-water-soft font-semibold text-water-ink',
                index === 1 && 'bg-focus-soft font-semibold text-focus-ink',
                index > 1 && 'font-medium text-ink-2',
              )}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </Section>
  );
}

function States() {
  return (
    <Section title="Empty, loading and error">
      <div className="grid gap-6 sm:grid-cols-2">
        <EmptyState
          icon={Sprout}
          title="Seu dia começa aqui"
          body="Registre o primeiro copo de água pra começar a linha do tempo."
          action={<Button tone="water">+ 250 ml de água</Button>}
        />
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-3 px-6 py-5">
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-3 w-full rounded-full" />
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-3 w-full rounded-full" />
          </Card>
          <ErrorState
            title="Não deu pra carregar seus dados"
            body="Eles continuam salvos neste dispositivo. Tente de novo."
            retryLabel="Tentar de novo"
            onRetry={() => {}}
          />
        </div>
      </div>
    </Section>
  );
}
