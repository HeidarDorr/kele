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

const SET_LOOK_COMPOSITION =
  'Portrait 4:5 lead frame of a Homepage set spread, also the featured image on the set page. ' +
  'One child, full body, centred, feet visible, generous headroom. Keep the face near 42% from ' +
  'the top and nothing essential within 8% of any edge.';

const SET_DETAIL_COMPOSITION =
  'Portrait 4:5 companion frame that sits beside the lead image on tablet and desktop and is ' +
  'hidden on mobile. Tactile detail only, never a face, so it reads at about 280px wide.';

const SET_SCENE_COMPOSITION =
  'Landscape 5:4 third frame stacked under the detail on tablet and desktop and hidden on ' +
  'mobile. A wider moment of the set being worn; keep the child in the central 60% and ' +
  'readable at about 280px wide.';

/**
 * Each Homepage set spread pairs a full look with a close detail. The files are
 * named after the Outfit slug and referenced by the development seed.
 */
const setBriefs = [
  {
    slug: 'evening-velvet-set',
    label: 'ست مخمل شب',
    look:
      'He wears a single-breasted charcoal velvet jacket, an ivory linen shirt with the top button ' +
      'open, hazelnut brown cotton trousers and honey-brown leather loafers. Early evening at a ' +
      'family celebration: a softly lit terrace with warm lamp light and out-of-focus string lights ' +
      'far behind him, one hand in his pocket, a quiet proud half-smile. Warm evening light, deep ' +
      'espresso shadows, ivory and honey highlights, no cool blue tones.',
    detail:
      'Close-up still life of the same outfit laid on a dark walnut chair: the charcoal velvet ' +
      'jacket lapel folded over the ivory linen shirt collar, one honey-brown leather loafer at the ' +
      'lower edge. Warm lamp light raking across the velvet pile so its texture reads clearly. ' +
      'Deep espresso shadows, ivory and honey highlights.',
  },
  {
    slug: 'camel-vest-set',
    label: 'ست وست شتری',
    look:
      'He wears a camel wool vest buttoned over an ivory linen shirt with rolled sleeves, hazelnut ' +
      'brown cotton trousers and honey-brown leather loafers. Late afternoon at a family gathering ' +
      'in a Persian courtyard with a shallow tiled pool and potted citrus trees softly blurred ' +
      `behind him, caught mid-step as if walking towards someone. ${PALETTE}`,
    detail:
      'Close-up of a child standing, cropped from chest to waist: the knitted texture and ' +
      'buttons of the camel wool vest over the ivory linen shirt, a rolled linen sleeve at the ' +
      `frame edge. No face. Soft golden-hour side light revealing the knit. ${PALETTE}`,
    scene:
      'Use the attached photograph (the lead look of this set) as the identity, wardrobe and location ' +
      'reference: the same Iranian boy (same face, hair, age and build) in exactly the same ' +
      'outfit, a buttoned camel wool vest over an ivory linen shirt with rolled sleeves, hazelnut ' +
      'brown cotton trousers and honey-brown leather loafers, in the same Persian courtyard with ' +
      'its shallow tiled pool, potted citrus trees and family gathering. A quieter moment later ' +
      'the same afternoon: he sits on the stone edge of the pool beside his white-haired ' +
      'grandfather, who leans in to tell him something; the boy listens with a small smile, ' +
      'hands resting on his knees. Seen from a few metres away at seated eye level, both figures ' +
      'in the central part of the frame, the guests and trees softly blurred behind them. Late ' +
      `afternoon golden light. ${PALETTE}`,
  },
  {
    slug: 'olive-summer-set',
    label: 'ست تابستان زیتونی',
    look:
      'He wears a plain khaki-sand cotton t-shirt, tailored olive linen shorts with a soft turn-up ' +
      'and honey-brown leather shoes. A summer garden party under old trees with dappled shade on ' +
      'the grass, he is turning mid-movement with a relaxed laugh, energetic but still composed. ' +
      PALETTE,
    detail:
      'Close-up of the olive linen shorts hem and the honey-brown leather shoes of a child standing ' +
      'on sunlit stone with a few fallen leaves. No face. Dappled summer light showing the linen ' +
      `weave and the leather grain. ${PALETTE}`,
  },
] as const;

/**
 * The Hero set is already pictured by the Homepage hero frame, so its two set
 * images are generated with that photograph attached as the identity and
 * wardrobe reference.
 */
const HERO_REFERENCE =
  'Use the attached photograph as the identity and wardrobe reference: the same Iranian boy ' +
  '(same face, hair, age and build) wearing exactly the same outfit, a soft oat-beige ' +
  'single-breasted linen suit with turned-up trouser hems, a cream open-collar linen shirt and ' +
  'taupe suede loafers. Keep the same sunlit travertine architecture and warm afternoon light.';

const heroSetBriefs = [
  brief({
    file: '/media/outfits/beige-linen-set-look.webp',
    label: 'ست لینن بژ — نمای کامل',
    width: 1200,
    height: 1500,
    composition: SET_LOOK_COMPOSITION,
    prompt:
      `Editorial fashion photograph, 1200x1500, aspect ratio 4:5. ${HERO_REFERENCE} ` +
      'A new moment from the same afternoon: he walks slowly towards the camera along a plain ' +
      'travertine wall, one hand in his trouser pocket, the jacket open and moving slightly, a ' +
      'calm, quietly confident expression. Full body, centred, feet visible, generous headroom. ' +
      `${PALETTE} ${QUALITY}`,
  }),
  brief({
    file: '/media/outfits/beige-linen-set-detail.webp',
    label: 'ست لینن بژ — جزئیات',
    width: 1200,
    height: 1500,
    composition: SET_DETAIL_COMPOSITION,
    prompt:
      `Editorial detail photograph, 1200x1500, aspect ratio 4:5. ${HERO_REFERENCE} ` +
      'Close-up of the child standing, cropped from chest to upper thigh: the oat-beige linen ' +
      'lapel, a single button and the welt pocket over the cream open collar, the linen slub ' +
      'and soft creases clearly visible, his hand resting in the trouser pocket at the lower ' +
      'edge. No face. Low warm side light raking across the linen weave. ' +
      `${PALETTE} ${QUALITY}`,
  }),
];

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
  ...setBriefs.flatMap((set) => [
    brief({
      file: `/media/outfits/${set.slug}-look.webp`,
      label: `${set.label} — نمای کامل`,
      width: 1200,
      height: 1500,
      composition: SET_LOOK_COMPOSITION,
      prompt:
        `Editorial fashion photograph, 1200x1500, aspect ratio 4:5. ${SUBJECT} ${set.look} ` +
        QUALITY,
    }),
    brief({
      file: `/media/outfits/${set.slug}-detail.webp`,
      label: `${set.label} — جزئیات`,
      width: 1200,
      height: 1500,
      composition: SET_DETAIL_COMPOSITION,
      prompt: `Editorial detail photograph, 1200x1500, aspect ratio 4:5. ${set.detail} ${QUALITY}`,
    }),
    ...('scene' in set
      ? [
          brief({
            file: `/media/outfits/${set.slug}-scene.webp`,
            label: `${set.label} — صحنه`,
            width: 1500,
            height: 1200,
            composition: SET_SCENE_COMPOSITION,
            prompt: `Editorial fashion photograph, 1500x1200, aspect ratio 5:4. ${set.scene} ${QUALITY}`,
          }),
        ]
      : []),
  ]),
  ...heroSetBriefs,
];

const briefsByFile = new Map(artDirectionBriefs.map((entry) => [entry.file, entry]));

/** Finds the brief registered for a media URL, if the storefront authored one. */
export function findArtDirectionBrief(src: string): ArtDirectionBrief | null {
  return briefsByFile.get(src) ?? null;
}
