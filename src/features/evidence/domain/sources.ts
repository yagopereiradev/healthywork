/**
 * The sources the app cites in its "Why?" sheets.
 *
 * docs/EVIDENCE.md is the reference: every link here must be on that page, and
 * a test checks it. The wording shown to people lives in the `evidence`
 * translations. Do not add a source without the product owner's agreement.
 */
export type EvidenceTopic = 'water' | 'breaks' | 'focus' | 'eyes' | 'microbreaks';

export interface EvidenceSource {
  /** Key under `<topic>.sources` in the evidence translations. */
  id: string;
  url: string;
}

export const EVIDENCE = {
  water: [
    {
      id: 'sciam',
      url: 'https://www.scientificamerican.com/article/fact-or-fiction-you-must-drink-8-glasses-of-water-daily/',
    },
    { id: 'efsa', url: 'https://www.efsa.europa.eu/en/press/news/nda100326' },
  ],
  breaks: [{ id: 'diaz', url: 'https://www.cuimc.columbia.edu/node/25711' }],
  eyes: [
    {
      id: 'talens',
      url: 'https://research.aston.ac.uk/en/publications/the-effects-of-breaks-on-digital-eye-strain-dry-eye-and-binocular/',
    },
  ],
  microbreaks: [
    {
      id: 'albulescu',
      url: 'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0272460',
    },
  ],
  focus: [
    {
      id: 'biwer',
      url: 'https://cris.maastrichtuniversity.nl/en/publications/understanding-effort-regulation-comparing-pomodoro-breaks-and-sel',
    },
  ],
} as const satisfies Record<EvidenceTopic, readonly EvidenceSource[]>;
