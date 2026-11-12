/**
 * The weekly summary image: 1080 x 1350, drawn by hand on a canvas, entirely on
 * the device. Nothing is uploaded to make it.
 *
 * The drawing only receives finished strings (see SummaryCard), so this file
 * knows nothing about languages or data. The image always uses the brand's
 * water palette, whatever theme the app is in.
 */
export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

/** The water colours of the light theme. A test keeps them equal to the tokens. */
export const CARD_COLORS = {
  background: '#17707c',
  deep: '#0f525b',
  muted: '#cdebee',
  white: '#ffffff',
} as const;

const SORA = '"Sora Variable", "Sora", system-ui, sans-serif';
const INTER = '"Inter Variable", "Inter", system-ui, sans-serif';
const MARGIN = 80;
const INNER = CARD_WIDTH - MARGIN * 2;

export interface SummaryCard {
  /** "9 a 13 de novembro" */
  period: string;
  /** "Minha semana no trabalho" */
  heading: string;
  /** "9,4 L" */
  liters: string;
  /** "de água" */
  waterLabel: string;
  /** "24" and "pausas pra me mexer" */
  breaks: string;
  breaksLabel: string;
  /** "14h20" and "de foco" */
  focus: string;
  focusLabel: string;
  /** "5 dias na meta de água" */
  daysLine: string;
  days: { letter: string; state: 'reached' | 'missed' | 'ahead' }[];
  /** "Gratuito e open source · seus dados ficam no seu dispositivo" */
  footer: string;
}

type Context = CanvasRenderingContext2D;

const font = (weight: number, size: number, family: string) => `${weight} ${size}px ${family}`;

/**
 * The largest font size, from `size` down to `min`, at which the text fits in
 * `maxWidth`. Long numbers ("100h05") shrink instead of spilling out.
 */
export function fitFontSize(
  measure: (size: number) => number,
  size: number,
  maxWidth: number,
  min = 24,
): number {
  let current = size;
  while (current > min && measure(current) > maxWidth) current -= 2;
  return current;
}

function text(
  ctx: Context,
  value: string,
  x: number,
  baseline: number,
  options: {
    weight: number;
    size: number;
    family: string;
    color: string;
    maxWidth?: number;
    align?: CanvasTextAlign;
    spacing?: number;
  },
): number {
  const { weight, family, color, maxWidth, align = 'left', spacing = 0 } = options;
  const width = (size: number) => {
    ctx.font = font(weight, size, family);
    return ctx.measureText(value).width;
  };
  const size = maxWidth ? fitFontSize(width, options.size, maxWidth) : options.size;
  ctx.font = font(weight, size, family);
  // Tight tracking on the giant numeral, where the browser supports it.
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing * (size / options.size)}px`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(value, x, baseline);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  return size;
}

function roundedRect(ctx: Context, x: number, y: number, w: number, h: number, radius: number) {
  ctx.beginPath();
  if ('roundRect' in ctx) {
    ctx.roundRect(x, y, w, h, radius);
    return;
  }
  // Older browsers: the same shape, corner by corner.
  const c = ctx as Context;
  c.moveTo(x + radius, y);
  c.arcTo(x + w, y, x + w, y + h, radius);
  c.arcTo(x + w, y + h, x, y + h, radius);
  c.arcTo(x, y + h, x, y, radius);
  c.arcTo(x, y, x + w, y, radius);
  c.closePath();
}

/** The mark in negative: a white rounded square with the drop in the water colour. */
function logo(ctx: Context, x: number, y: number, size: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 64, size / 64);
  ctx.fillStyle = CARD_COLORS.white;
  roundedRect(ctx, 0, 0, 64, 64, 18);
  ctx.fill();
  ctx.fillStyle = CARD_COLORS.background;
  ctx.fill(new Path2D('M32 11 C32 11 17 27 17 38 a15 15 0 0 0 30 0 C47 27 32 11 32 11Z'));
  ctx.strokeStyle = CARD_COLORS.white;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(new Path2D('M24 39 l6 6 l11 -12'));
  ctx.restore();
}

/** Draws the whole card. The fonts must already be loaded (see renderSummaryPng). */
export function drawSummaryCard(ctx: Context, card: SummaryCard): void {
  const { background, deep, muted, white } = CARD_COLORS;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Logo and wordmark on the left, the period on the right.
  logo(ctx, MARGIN, MARGIN, 64);
  text(ctx, 'healthywork', MARGIN + 82, MARGIN + 46, {
    weight: 700,
    size: 38,
    family: SORA,
    color: white,
    spacing: -1,
  });
  text(ctx, card.period, CARD_WIDTH - MARGIN, MARGIN + 42, {
    weight: 400,
    size: 28,
    family: INTER,
    color: muted,
    align: 'right',
    maxWidth: 460,
  });

  text(ctx, card.heading, MARGIN, 228, {
    weight: 600,
    size: 36,
    family: INTER,
    color: muted,
    maxWidth: INNER,
  });

  // The giant number: water for the week.
  text(ctx, card.liters, MARGIN - 6, 432, {
    weight: 700,
    size: 190,
    family: SORA,
    color: white,
    maxWidth: INNER,
    spacing: -6,
  });
  text(ctx, card.waterLabel, MARGIN, 520, {
    weight: 600,
    size: 40,
    family: INTER,
    color: white,
    maxWidth: INNER,
  });

  // Two blocks: breaks and focus.
  const blockTop = 568;
  const blockHeight = 230;
  const blockGap = 32;
  const blockWidth = (INNER - blockGap) / 2;
  const blocks = [
    { value: card.breaks, label: card.breaksLabel },
    { value: card.focus, label: card.focusLabel },
  ];
  blocks.forEach((block, index) => {
    const x = MARGIN + index * (blockWidth + blockGap);
    ctx.fillStyle = deep;
    roundedRect(ctx, x, blockTop, blockWidth, blockHeight, 40);
    ctx.fill();
    text(ctx, block.value, x + 40, blockTop + 128, {
      weight: 700,
      size: 104,
      family: SORA,
      color: white,
      maxWidth: blockWidth - 80,
      spacing: -2,
    });
    text(ctx, block.label, x + 40, blockTop + 182, {
      weight: 400,
      size: 34,
      family: INTER,
      color: muted,
      maxWidth: blockWidth - 80,
    });
  });

  // The days of the week: a white tile for each day on goal.
  text(ctx, card.daysLine, MARGIN, 886, {
    weight: 600,
    size: 30,
    family: INTER,
    color: white,
    maxWidth: INNER,
  });
  const tileTop = 914;
  const tileHeight = 88;
  const tileGap = 16;
  const count = Math.max(card.days.length, 1);
  const tileWidth = (INNER - tileGap * (count - 1)) / count;
  card.days.forEach((day, index) => {
    const x = MARGIN + index * (tileWidth + tileGap);
    if (day.state === 'ahead') {
      // A day still to come: only its outline.
      ctx.strokeStyle = deep;
      ctx.lineWidth = 4;
      roundedRect(ctx, x + 2, tileTop + 2, tileWidth - 4, tileHeight - 4, 22);
      ctx.stroke();
    } else {
      ctx.fillStyle = day.state === 'reached' ? white : deep;
      roundedRect(ctx, x, tileTop, tileWidth, tileHeight, 24);
      ctx.fill();
    }
    text(ctx, day.letter, x + tileWidth / 2, tileTop + 55, {
      weight: 700,
      size: 30,
      family: SORA,
      color: day.state === 'reached' ? background : muted,
      align: 'center',
    });
  });

  text(ctx, card.footer, MARGIN, CARD_HEIGHT - MARGIN - 4, {
    weight: 400,
    size: 28,
    family: INTER,
    color: muted,
    maxWidth: INNER,
  });
}

/** Renders the card to a PNG, waiting for the two typefaces first. */
export async function renderSummaryPng(card: SummaryCard): Promise<Blob> {
  // Without this the first image could be drawn in a fallback font.
  await Promise.all([
    document.fonts.load(font(700, 190, SORA)),
    document.fonts.load(font(600, 40, INTER)),
    document.fonts.load(font(400, 28, INTER)),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');
  drawSummaryCard(ctx, card);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the image'))),
      'image/png',
    );
  });
}
