/**
 * Art direction briefs for storefront editorial imagery.
 *
 * Every entry describes one image the KELE storefront expects but does not yet
 * own. While the file is absent the interface renders the brief in place of the
 * picture, so the exact prompt, aspect ratio and destination path stay visible
 * to whoever produces the asset. Dropping the file at `file` retires the brief
 * automatically.
 *
 * Generated imagery is a prototype input only. DES-003 remains open and no
 * brief here approves final campaign photography.
 */

export type ArtDirectionBrief = Readonly<{
  /** Public-relative destination, matching the `src` the interface requests. */
  file: string;
  /** Persian slot name shown in the placeholder. */
  label: string;
  width: number;
  height: number;
  /** Generation prompt, written in English for image models. */
  prompt: string;
  /** Why this crop exists, so a replacement keeps the composition working. */
  composition: string;
}>;

const PALETTE =
  'Warm ivory and oat neutrals, soft terracotta accents, espresso brown depth. ' +
  'Natural directional daylight, gentle shadows, no colour cast, no cool blue tones.';

const SUBJECT =
  'Iranian boy aged 6 to 10, natural relaxed posture, calm confident expression, ' +
  'never a stiff catalogue pose.';

const QUALITY =
  'Editorial fashion photography, medium format look, shallow but controlled depth of field, ' +
  'fine natural fabric texture visible, photorealistic, no text, no logo, no watermark, ' +
  'no distorted hands or faces.';

function brief(entry: ArtDirectionBrief): ArtDirectionBrief {
  return entry;
}

export const artDirectionBriefs: readonly ArtDirectionBrief[] = [
  brief({
    file: '/media/editorial/home-hero-wide.webp',
    label: 'قاب سرتاسری صفحه خانه',
    width: 3200,
    height: 1400,
    composition:
      'Full-bleed hero, edge to edge at every viewport. The boy sits in the left third so the ' +
      'right third stays open for Persian headline copy. Nothing important within 12% of any edge.',
    prompt:
      `Ultra-wide cinematic editorial hero photograph, 3200x1400, aspect ratio 16:7. ${SUBJECT} ` +
      'He wears a soft oat linen suit with an open-collar cream shirt, standing in a sunlit ' +
      'travertine courtyard with tall plain walls and a single soft shaft of afternoon light. ' +
      'He is placed in the LEFT THIRD of the frame, full body, small in a large architectural ' +
      'space. The RIGHT THIRD is deliberately empty wall so headline text can sit over it. ' +
      `Generous negative space, quiet and spacious, unhurried mood. ${PALETTE} ${QUALITY}`,
  }),
  brief({
    file: '/media/editorial/styling-duo.webp',
    label: 'روایت ست‌ها',
    width: 1800,
    height: 1350,
    composition:
      'Landscape 4:3 image beside the styling copy column. Two subjects read as one styled pair.',
    prompt:
      'Editorial lifestyle photograph, 1800x1350, aspect ratio 4:3. Two Iranian boys aged 6 to 10 ' +
      'standing together in complementary but not identical outfits: one in an oat linen suit, ' +
      'one in a knitted vest over a cream shirt with tailored shorts. They stand on a warm stone ' +
      'terrace with soft greenery blurred behind them, mid-conversation, natural and unposed. ' +
      `Full body, generous headroom, calm composition. ${PALETTE} ${QUALITY}`,
  }),
  brief({
    file: '/media/editorial/craft-fabric.webp',
    label: 'جزئیات — پارچه',
    width: 1100,
    height: 1375,
    composition: 'Portrait 4:5 detail, first of a three-part craft triptych. No human face.',
    prompt:
      'Extreme close-up still-life photograph, 1100x1375, aspect ratio 4:5. Folded natural oat ' +
      'linen and soft cream cotton fabric stacked on a warm pale surface, raking side light ' +
      'revealing the weave and fibre texture. No people, no faces. Tactile, quiet, tangible. ' +
      `${PALETTE} ${QUALITY}`,
  }),
  brief({
    file: '/media/editorial/craft-stitch.webp',
    label: 'جزئیات — دوخت',
    width: 1100,
    height: 1375,
    composition:
      'Portrait 4:5 detail, second of the craft triptych. Sits slightly lower than its neighbours.',
    prompt:
      'Extreme close-up detail photograph, 1100x1375, aspect ratio 4:5. The lapel and buttonhole ' +
      'of a small oat linen child jacket, showing precise hand stitching, a natural corozo button ' +
      'and a clean seam. Shallow depth of field, warm daylight. No people, no faces. ' +
      `${PALETTE} ${QUALITY}`,
  }),
  brief({
    file: '/media/editorial/craft-movement.webp',
    label: 'جزئیات — آزادی حرکت',
    width: 1100,
    height: 1375,
    composition: 'Portrait 4:5 detail, third of the craft triptych. The only one showing motion.',
    prompt:
      `Editorial motion photograph, 1100x1375, aspect ratio 4:5. ${SUBJECT} ` +
      'Cropped from the shoulders down, mid-stride and turning, an unbuttoned oat linen jacket ' +
      'swinging with the movement, showing that the garment allows the child to move freely. ' +
      `Slight natural motion blur in the fabric only, the body sharp. Warm daylight. ${PALETTE} ${QUALITY}`,
  }),
  brief({
    file: '/media/editorial/home-closing.webp',
    label: 'قاب پایانی صفحه خانه',
    width: 3200,
    height: 1200,
    composition:
      'Full-bleed closing band behind an inverse espresso scrim. Copy sits centred, so keep the ' +
      'centre of the frame calm and push detail to the outer thirds.',
    prompt:
      'Ultra-wide atmospheric photograph, 3200x1200, aspect ratio 8:3. A quiet warm interior ' +
      'after a family celebration: a linen jacket resting over a dark wooden chair, soft evening ' +
      'light across a plaster wall, a few blurred chairs receding into the background. ' +
      'No people. The CENTRE of the frame is calm and uncluttered so overlaid text stays readable; ' +
      `visual interest sits in the outer thirds. Nostalgic, warm, restful. ${PALETTE} ${QUALITY}`,
  }),
  ...(
    [
      ['set', 'ست', 'a complete oat linen suit with a cream shirt, jacket and trousers'],
      ['jackets', 'کت', 'a single tailored linen jacket in warm oat, shown on its own'],
      ['trousers', 'شلوار', 'tailored child trousers in warm sand linen, cuffed at the ankle'],
      ['shirts', 'پیراهن', 'a soft cream cotton shirt with a rounded collar'],
      ['t-shirts', 'تیشرت', 'a plain ribbed cotton t-shirt in warm off-white'],
      ['vests', 'وست', 'a knitted or linen vest in soft camel worn over a cream shirt'],
      ['shorts', 'شلوارک', 'tailored linen shorts in warm oat with a soft turn-up'],
      ['shoes', 'کفش', 'a pair of small brown leather loafers'],
    ] as const
  ).map(([slug, label, garment]) =>
    brief({
      file: `/media/editorial/category-${slug}.webp`,
      label: `دسته — ${label}`,
      width: 900,
      height: 1200,
      composition:
        'Portrait 3:4 category tile in a horizontal rail. The garment must read instantly at ' +
        'roughly 260px wide, so keep one subject, centred, against a plain ground.',
      prompt:
        `Editorial product photograph, 900x1200, aspect ratio 3:4. A category image showing ${garment}. ` +
        'Presented cleanly against a plain warm ivory plaster background with soft directional ' +
        'daylight and a gentle natural shadow. Single subject, centred, generous margins, ' +
        'nothing else in frame. Must remain legible when displayed small. ' +
        `${PALETTE} ${QUALITY}`,
    }),
  ),
];

const briefsByFile = new Map(artDirectionBriefs.map((entry) => [entry.file, entry]));

/** Finds the brief registered for a media URL, if the storefront authored one. */
export function findArtDirectionBrief(src: string): ArtDirectionBrief | null {
  return briefsByFile.get(src) ?? null;
}
