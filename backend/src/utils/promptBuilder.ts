import type { PantryItem, UserProfile } from '../types/index.ts';
import type { SupportedLocale } from './locale.ts';

const PORTION_WEIGHTS = {
  adults: 1, teenagers: 1.2, children: 0.6, toddlers: 0.4,
} as const;

export function calculateServings(profile: UserProfile): number {
  const total =
    profile.adults * PORTION_WEIGHTS.adults +
    profile.teenagers * PORTION_WEIGHTS.teenagers +
    profile.children * PORTION_WEIGHTS.children +
    profile.toddlers * PORTION_WEIGHTS.toddlers;
  return Math.max(1, Math.round(total * 2) / 2);
}

function describeHousehold(profile: UserProfile): string {
  const parts: string[] = [];
  if (profile.adults) parts.push(`${profile.adults} adult(s)`);
  if (profile.teenagers) parts.push(`${profile.teenagers} teenager(s)`);
  if (profile.children) parts.push(`${profile.children} child(ren) aged 5-12`);
  if (profile.toddlers) parts.push(`${profile.toddlers} toddler(s) aged 1-4`);
  return parts.join(', ');
}

// "Chinese" on its own is not a cuisine, it is fourteen of them, and a model
// asked for it with no further steer returns the airport-lounge version:
// stir-fry, fried rice, sweet and sour. Naming regions, real household dishes
// and the actual store-cupboard shifts the output from what the model thinks
// the cuisine looks like to what people in it cook on a Tuesday.
// Only the user's selected entries are injected, so this map can be long
// without costing tokens on every request.
interface CuisineProfile {
  // Rotated per generation. Naming two or three regions steers the model into
  // a corner of the cuisine it would not otherwise visit, and rotating them
  // means two plans a week apart do not come back the same.
  regions: string[];
  techniques: string[];
  storeCupboard: string;
  note?: string;
}

// Deliberately lists no dish names. An earlier version named seven example
// dishes per cuisine and the model simply returned those seven — 生姜焼き,
// 肉じゃが, きんぴらごぼう, 麻婆豆腐 came back verbatim, plan after plan.
// Examples in a prompt do not read as "this register"; they read as "this
// menu". The model already knows thousands of these dishes, so the useful
// input is the axes to search along — region, technique, store cupboard —
// not a shortlist to pick from.
const CUISINE_GUIDANCE: Record<string, CuisineProfile> = {
  chinese: {
    regions: ['Sichuan', 'Cantonese', 'Hunan', 'Jiangnan and Shanghai', 'Northern and Shandong', 'Dongbei', 'Fujian', 'Yunnan', 'Xinjiang', 'Hakka'],
    techniques: ['爆炒 fast wok-frying', '红烧 red-braising', '清蒸 steaming', '凉拌 cold dressing', '炖 slow stewing', '干煸 dry-frying', '焖 covered braising'],
    storeCupboard:
      'light and dark soy sauce (not interchangeable), Shaoxing wine, doubanjiang, ' +
      'fermented black beans, dried shiitake, Chinkiang black vinegar, white pepper, ' +
      'sesame oil, cornflour slurry',
    note: 'Home cooking, not restaurant banquet dishes. A weeknight table is usually one meat or tofu dish, one vegetable, rice.',
  },
  japanese: {
    regions: ['Kanto', 'Kansai', 'Kyushu', 'Hokkaido', 'Tohoku', 'Okinawa'],
    techniques: ['焼き grilling', '煮物 simmering in dashi', '炒め stir-frying', '揚げ frying', '和え dressing', '蒸し steaming'],
    storeCupboard: 'dashi, mirin, sake, white and red miso, soy sauce, rice vinegar, kombu, katsuobushi',
    note: 'Everyday 家庭料理, not sushi or ramen. Build as 一汁三菜 where it fits: rice, a soup, a main, small sides.',
  },
  korean: {
    regions: ['Seoul and Gyeonggi', 'Jeolla', 'Gyeongsang', 'Gangwon', 'Jeju'],
    techniques: ['찌개 stew', '볶음 stir-fry', '구이 grilling', '무침 seasoned salad', '조림 braising', '전 pan-fried batter'],
    storeCupboard: 'gochujang, gochugaru (coarse, not cayenne), doenjang, ganjang, sesame oil, toasted sesame, plenty of garlic',
    note: 'Rice plus banchan. Name the banchan you expect alongside the main.',
  },
  indian: {
    regions: ['Punjabi', 'Gujarati', 'Bengali', 'Tamil', 'Kerala', 'Maharashtrian', 'Rajasthani', 'Hyderabadi'],
    techniques: ['tadka tempering', 'dry sabzi', 'slow bhuna', 'steaming', 'tawa griddle', 'dum'],
    storeCupboard: 'whole and ground spices, ghee, mustard oil, curry leaves, tamarind, asafoetida, fresh ginger and green chilli',
    note: 'Real household food — dal, sabzi, roti — not curry-house dishes. Say when spices are bloomed.',
  },
  pakistani: {
    regions: ['Punjabi', 'Karachi and Sindhi', 'Pashtun', 'Kashmiri'],
    techniques: ['bhunai', 'karahi', 'dum', 'tawa', 'slow stewing'],
    storeCupboard: 'ghee, whole garam masala, ginger-garlic paste, tomato-onion masala base, dried pomegranate seeds',
  },
  'middle-eastern': {
    regions: ['Levantine', 'Iraqi', 'Persian', 'Egyptian', 'Yemeni', 'Palestinian'],
    techniques: ['slow stewing', 'stuffing vegetables', 'grilling', 'layered rice', 'preserving'],
    storeCupboard: 'sumac, pomegranate molasses, tahini, dried limes, seven spice, bulgur, freekeh',
  },
  thai: {
    regions: ['Central', 'Isan', 'Northern Lanna', 'Southern'],
    techniques: ['pounding pastes', 'stir-frying', 'grilling', 'sour soups', 'salads'],
    storeCupboard: 'fish sauce, palm sugar, galangal, makrut lime leaf, shrimp paste, fresh curry paste',
    note: 'Balance hot, sour, salty and sweet in each dish.',
  },
  vietnamese: {
    regions: ['Northern', 'Central Hue', 'Southern Mekong'],
    techniques: ['kho caramel braising', 'canh clear soup', 'grilling', 'fresh herb salads', 'quick stir-fry'],
    storeCupboard: 'fish sauce, rice vinegar, palm sugar, herbs served raw and generous',
  },
  british: {
    regions: ['English', 'Scottish', 'Welsh', 'Northern Irish', 'Northern English'],
    techniques: ['roasting', 'slow braising', 'pastry', 'pie making', 'griddling'],
    storeCupboard: 'stock, mustard, Worcestershire sauce, suet, seasonal root vegetables',
    note: 'Everyday home cooking, not gastropub plating.',
  },
  italian: {
    regions: ['Roman', 'Neapolitan', 'Sicilian', 'Emilian', 'Ligurian', 'Tuscan', 'Puglian'],
    techniques: ['soffritto', 'braising', 'pasta from the pan sauce', 'roasting', 'grilling'],
    storeCupboard: 'good olive oil, tinned tomatoes, anchovies, capers, pecorino and parmesan, dried pulses',
    note: 'Few ingredients, correct pasta shape, no cream in a carbonara.',
  },
  mexican: {
    regions: ['Oaxacan', 'Yucatecan', 'Poblano', 'Norteño', 'Veracruz'],
    techniques: ['toasting dried chillies', 'comal charring', 'slow braising', 'salsa making', 'nixtamal'],
    storeCupboard: 'dried chillies, masa harina, lime, Mexican oregano, epazote',
    note: 'Regional home food, not Tex-Mex.',
  },
  caribbean: {
    regions: ['Jamaican', 'Trinidadian', 'Bajan', 'Guyanese', 'Haitian'],
    techniques: ['browning', 'stewing', 'jerk grilling', 'one-pot rice', 'escovitch'],
    storeCupboard: 'green seasoning, scotch bonnet, allspice, thyme, coconut milk, browning sauce',
  },
  'west-african': {
    regions: ['Nigerian', 'Ghanaian', 'Senegalese', 'Ivorian', 'Sierra Leonean'],
    techniques: ['one-pot rice', 'slow stewing', 'pounding', 'grilling', 'frying'],
    storeCupboard: 'palm oil, scotch bonnet, crayfish, locust bean (iru), egusi, smoked fish',
  },
  mediterranean: {
    regions: ['Greek', 'Turkish', 'Levantine', 'Spanish', 'Cypriot', 'Maltese'],
    techniques: ['slow oven baking', 'braising in olive oil', 'grilling', 'pulses', 'stuffed vegetables'],
    storeCupboard: 'olive oil, lemon, dried oregano, pulses, tomato paste, yoghurt',
  },
};

// Fresh randomness per call rather than a seeded shuffle: the point is that
// two generations minutes apart differ, and there is nothing to reproduce.
function sample<T>(items: readonly T[], count: number): T[] {
  const pool = [...items];
  const picked: T[] = [];
  while (picked.length < count && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(index, 1)[0]!);
  }
  return picked;
}

// Turns 'chinese:sichuan' into the label the prompt wants. Falls back to the
// slug rather than dropping the region, because an unlabelled "hakka" still
// steers the model correctly.
const REGION_LABELS: Record<string, string> = {
  sichuan: 'Sichuan', cantonese: 'Cantonese', hunan: 'Hunan',
  jiangnan: 'Jiangnan and Shanghai', northern: 'Northern', dongbei: 'Dongbei',
  fujian: 'Fujian', yunnan: 'Yunnan', xinjiang: 'Xinjiang', hakka: 'Hakka',
  kanto: 'Kanto', kansai: 'Kansai', kyushu: 'Kyushu', hokkaido: 'Hokkaido',
  tohoku: 'Tohoku', okinawa: 'Okinawa',
  seoul: 'Seoul and Gyeonggi', jeolla: 'Jeolla', gyeongsang: 'Gyeongsang',
  gangwon: 'Gangwon', jeju: 'Jeju',
  punjabi: 'Punjabi', gujarati: 'Gujarati', bengali: 'Bengali', tamil: 'Tamil',
  kerala: 'Kerala', maharashtrian: 'Maharashtrian', rajasthani: 'Rajasthani',
  hyderabadi: 'Hyderabadi', sindhi: 'Karachi and Sindhi', pashtun: 'Pashtun',
  kashmiri: 'Kashmiri',
  levantine: 'Levantine', iraqi: 'Iraqi', persian: 'Persian', egyptian: 'Egyptian',
  yemeni: 'Yemeni', palestinian: 'Palestinian',
  central: 'Central', isan: 'Isan', lanna: 'Northern Lanna', southern: 'Southern',
  hue: 'Central Hue', mekong: 'Southern Mekong',
  english: 'English', scottish: 'Scottish', welsh: 'Welsh',
  'northern-irish': 'Northern Irish',
  roman: 'Roman', neapolitan: 'Neapolitan', sicilian: 'Sicilian',
  emilian: 'Emilian', ligurian: 'Ligurian', tuscan: 'Tuscan', puglian: 'Puglian',
  oaxacan: 'Oaxacan', yucatecan: 'Yucatecan', poblano: 'Poblano',
  norteno: 'Norteño', veracruz: 'Veracruz',
  jamaican: 'Jamaican', trinidadian: 'Trinidadian', bajan: 'Bajan',
  guyanese: 'Guyanese', haitian: 'Haitian',
  nigerian: 'Nigerian', ghanaian: 'Ghanaian', senegalese: 'Senegalese',
  ivorian: 'Ivorian', 'sierra-leonean': 'Sierra Leonean',
  greek: 'Greek', turkish: 'Turkish', spanish: 'Spanish', cypriot: 'Cypriot',
  maltese: 'Maltese',
};

function chosenRegionsFor(cuisine: string, cuisineRegions: readonly string[]): string[] {
  return cuisineRegions
    .filter((entry) => entry.startsWith(`${cuisine}:`))
    .map((entry) => {
      const slug = entry.slice(cuisine.length + 1);
      return REGION_LABELS[slug] ?? slug;
    });
}

function describeCuisines(
  cuisines: readonly string[],
  meals: number,
  recentDishes: readonly string[],
  cuisineRegions: readonly string[] = []
): string {
  if (cuisines.length === 0) return 'No cuisine preference stated.';

  // The distribution is computed rather than described, because "a good mix"
  // is exactly the instruction that produced seven unrelated cuisines.
  const perCuisine = Math.floor(meals / cuisines.length);
  const distribution =
    perCuisine >= 1
      ? `Every one of these must appear at least ${perCuisine} time(s) across the ${meals} meals.`
      : `Use as many of these as fit into ${meals} meals.`;

  const guidance = cuisines
    .map((cuisine) => {
      const profile = CUISINE_GUIDANCE[cuisine];
      if (!profile) return `## ${cuisine}`;

      // An explicit choice beats the rotation. Someone who ticked Cantonese
      // and Hakka has told us something the random sampler can only guess at,
      // and quietly overriding them with "this week try Xinjiang" is the app
      // ignoring the one preference they bothered to state.
      const chosen = chosenRegionsFor(cuisine, cuisineRegions);
      const regions =
        chosen.length > 0
          ? chosen
          : sample(profile.regions, Math.min(3, profile.regions.length));

      const techniques = sample(profile.techniques, Math.min(3, profile.techniques.length));
      const heading = chosen.length > 0 ? 'Only cook from' : 'This week draw from';

      return `## ${cuisine}
${heading}: ${regions.join(', ')}.
Lean on these methods: ${techniques.join(', ')}.
Store cupboard: ${profile.storeCupboard}.${profile.note ? `\n${profile.note}` : ''}`;
    })
    .join('\n\n');

  // Only the dishes this household has already been given. A model left to
  // itself returns the most famous dish of each cuisine every time, which is
  // what makes a meal planner feel like a search engine with one result.
  const repeats =
    recentDishes.length > 0
      ? `\n\nALREADY COOKED — DO NOT REPEAT ANY OF THESE\n${recentDishes.join(', ')}\nChoose different dishes, including different dishes from the same regions.`
      : '';

  return `${distribution}
No dish may belong to any cuisine outside this list.
Name the specific region of each dish in the region field before you name the dish.

${guidance}${repeats}`;
}

const FLAVOUR_LABELS: Record<string, string> = {
  sour: 'sour (酸)',
  sweet: 'sweet (甜)',
  bitter: 'bitter (苦)',
  spicy: 'chilli heat (辣)',
  umami: 'savoury depth (鲜)',
  numbing: 'Sichuan pepper numbing (麻)',
  aromatic: 'aromatic (香)',
  smoky: 'smoky and charred',
};

const INTENSITY_GUIDANCE: Record<string, string> = {
  light: 'Season lightly. Let the main ingredient taste of itself; go easy on sauce, sugar and oil.',
  balanced: 'Season normally for the cuisine.',
  bold: 'Season boldly. Fuller sauces, more aromatics, more chilli and pickles where the cuisine calls for them.',
};

// Phrased as ingredient choices throughout. "Favour good sources of iron" is
// something a meal planner can act on and be judged on; "help with your iron
// levels" is a claim about a person's body that this app has no nutrient data
// behind and no business making.
const NUTRITION_GUIDANCE: Record<string, string> = {
  protein:
    'Put a generous protein at the centre of most meals — meat, fish, eggs, tofu, ' +
    'pulses — rather than treating it as a garnish.',
  vegetables:
    'Make vegetables at least half of what is on the plate, and vary them across the week.',
  fibre:
    'Favour wholegrains, pulses, and vegetables eaten with their skins.',
  iron:
    'Favour ingredients that are good sources of iron — red meat, liver, lentils, ' +
    'tofu, dark leafy greens — and pair the plant ones with something sharp or ' +
    'citrus in the same meal, which helps absorption.',
  calcium:
    'Favour good sources of calcium: dairy, calcium-set tofu, tinned fish with the ' +
    'bones, sesame, leafy greens.',
  omega3:
    'Include oily fish twice in the week where the cuisines allow, and use walnuts, ' +
    'flax or rapeseed oil elsewhere.',
  light:
    'Keep meals light and easy to digest: steamed, poached or simmered rather than ' +
    'deep-fried, and go easy on very rich or heavy dishes.',
};

function describeFlavour(profile: UserProfile): string {
  const lines: string[] = [];

  if (profile.nutrition_focus.length > 0) {
    for (const focus of profile.nutrition_focus) {
      const line = NUTRITION_GUIDANCE[focus];
      if (line) lines.push(line);
    }
    lines.push(
      'These are preferences about which ingredients to favour. Do not make ' +
        'nutritional claims, state quantities of nutrients, or describe a dish as ' +
        'treating or preventing anything.'
    );
  }

  if (profile.seasoning_intensity) {
    lines.push(INTENSITY_GUIDANCE[profile.seasoning_intensity] ?? '');
  }

  if (profile.flavour_notes.length > 0) {
    const labels = profile.flavour_notes.map((note) => FLAVOUR_LABELS[note] ?? note);
    lines.push(`Lean into: ${labels.join(', ')}.`);
  }

  // Stated as constraints rather than as part of the taste description,
  // because these are usually blood pressure or blood sugar rather than
  // preference, and a model reads "MUST" differently from "prefers".
  if (profile.low_salt) {
    lines.push(
      'LOW SALT: keep added salt to a minimum, and reach for aromatics, acid, ' +
        'herbs and toasted spices to carry the dish instead. Watch hidden salt in ' +
        'soy sauce, stock, miso, doenjang, cured meat and shop-bought pastes, and ' +
        'say in the step where a low-salt version should be used.'
    );
  }

  if (profile.low_sugar) {
    lines.push(
      'LOW SUGAR: do not add sugar unless the dish is structurally impossible ' +
        'without it, and say so when it is. Sweetness from vegetables, mirin ' +
        'used sparingly or fruit is fine.'
    );
  }

  return lines.filter(Boolean).join('\n') || 'No particular flavour preference stated.';
}

const EXTRA_GUIDANCE: Record<string, string> = {
  fruit:
    'fruit — whole or barely prepared, seasonal and available in a UK supermarket ' +
    'that week, and the fruit that culture actually eats after a meal',
  snack:
    'a snack — something small between meals, from the same cuisines as the ' +
    'meals rather than crisps and cereal bars',
  dessert:
    'a dessert — the everyday kind a household makes or buys on a weeknight, ' +
    'not a restaurant plated pudding',
};

function describeExtras(profile: UserProfile): string {
  if (profile.include_extras.length === 0) {
    return 'Plan meals only. Do not add fruit, snacks or desserts — return an empty extras array for every day.';
  }

  const wanted = profile.include_extras
    .map((kind) => EXTRA_GUIDANCE[kind] ?? kind)
    .join('; ');

  const FREQUENCY_GUIDANCE: Record<string, string> = {
    few: 'Keep these sparse: at most two days in the week carry any extra at all.',
    some: 'Three or four days in the week carry an extra. The rest are meals only.',
    plenty: 'Most days carry an extra, and some days more than one.',
  };

  const frequency =
    FREQUENCY_GUIDANCE[profile.extras_frequency] ?? FREQUENCY_GUIDANCE.some!;

  // Low sugar overrides whatever frequency was chosen, for desserts only.
  // Someone who asked for plenty of extras and also flagged low sugar wants
  // more fruit and snacks, not more pudding — reading the two settings
  // independently would give them the opposite of what they asked for.
  const sugarOverride =
    profile.low_sugar && profile.include_extras.includes('dessert')
      ? '\nThis household is keeping sugar down, so desserts specifically appear on ' +
        'at most two days regardless of the frequency above, and fruit fills the rest.'
      : '';

  return `Alongside the meals, add: ${wanted}.
Put them in each day's extras array, never in meals — the meal count is a promise about meals.
Give every extra its ingredients so they reach the shopping list, and include their cost in estimated_total_gbp.
${frequency}${sugarOverride}`;
}

function describePantry(items: PantryItem[]): string {
  if (items.length === 0) {
    return 'The pantry is empty. Assume everything has to be bought.';
  }
  const sorted = [...items].sort((a, b) => {
    if (a.expires_on && b.expires_on) return a.expires_on.localeCompare(b.expires_on);
    if (a.expires_on) return -1;
    if (b.expires_on) return 1;
    return 0;
  });
  return sorted
    .map((item) => {
      const amount =
        item.quantity && item.unit
          ? ` (${Number(item.quantity)}${item.unit})`
          : item.quantity ? ` (${Number(item.quantity)})` : '';
      const expiry = item.expires_on ? `, use by ${item.expires_on}` : '';
      return `- ${item.name}${amount}${expiry}`;
    })
    .join('\n');
}

export const MEAL_PLAN_SYSTEM_PROMPT = `You are a meal planner for multicultural
households in the UK. The people using you cook the food of their own culture at
home and are tired of being offered a watered-down version of it.

Absolute rules, in order of priority:
1. Never include an ingredient the household avoids, in any form, including as
   an oil, sauce, stock, garnish or trace. Some of these are allergies. If a
   dish would normally contain one, either substitute it explicitly or choose a
   different dish.
2. If the household includes toddlers, avoid whole nuts, whole grapes, popcorn
   and large hard chunks, and keep chilli heat mild.
3. Every dish must be a real, named dish from one of the requested cuisines —
   something a household in that culture actually cooks on a weeknight. Give its
   name in its own language and script in native_name. Never invent a dish, never
   produce fusion, and never fall back to the generic international repertoire
   (shakshuka, minestrone, Greek salad, traybakes, wraps) unless that cuisine was
   explicitly requested.
   Reach past the two or three dishes each cuisine is famous for abroad. If a
   dish is the one a British newspaper would name in an article about that
   cuisine, choose a different one that a household there would cook more often.
4. Use ingredients the household already has before suggesting new ones, and
   prioritise the ones expiring soonest.
5. Stay within the weekly budget when one is given. Prices are UK supermarket
   prices in GBP.
6. Cook only within the stated time preference.

Assume UK availability. Most of these ingredients are in Tesco, Sainsbury's or
Morrisons; where one is only in a Chinese, Korean, Japanese, South Asian or
African-Caribbean grocer, still use it — say so in the step that needs it, and
give a supermarket substitute only if the dish survives one.

Steps should be concise and practical, written for someone cooking after work.`;

// A different question from the weekly plan, so a different prompt rather
// than the weekly one with a note bolted on. The household's cuisines,
// regions, flavour, allergens and budget still apply — what changes is that
// the starting point is a specific handful of ingredients that need using,
// and the answer is two or three dishes rather than a week.
export function buildPantryCookPrompt(
  profile: UserProfile,
  selected: PantryItem[],
  dishes: number,
  locale: SupportedLocale = 'en',
  recentDishes: readonly string[] = []
): string {
  const servings = calculateServings(profile);

  const avoid =
    profile.avoid_ingredients.length > 0
      ? `MUST NOT APPEAR ANYWHERE: ${profile.avoid_ingredients.join(', ')}`
      : 'No ingredient restrictions.';

  const languageInstruction =
    locale === 'zh'
      ? 'OUTPUT LANGUAGE\nUse natural Simplified Chinese for every user-facing value. Preserve authentic dish names in native_name. Keep JSON keys and schema enum values in English.'
      : 'OUTPUT LANGUAGE\nUse British English for user-facing values. Some ingredient names below are written in Chinese; translate them into English rather than copying them through. Preserve authentic dish names in native_name.';

  const mustUse = selected
    .map((item) => {
      const amount =
        item.quantity && item.unit
          ? ` (${Number(item.quantity)}${item.unit})`
          : item.quantity
            ? ` (${Number(item.quantity)})`
            : '';
      const expiry = item.expires_on ? `, use by ${item.expires_on}` : '';
      return `- ${item.name}${amount}${expiry}`;
    })
    .join('\n');

  const repeats =
    recentDishes.length > 0
      ? `\n\nALREADY COOKED — DO NOT REPEAT\n${recentDishes.join(', ')}`
      : '';

  return `${languageInstruction}

The household has these ingredients in the kitchen and wants to use them up.
Suggest ${dishes} dishes, all on day_index 0.

MUST USE — build the dishes around these
${mustUse}

Between them the dishes should use as much of the above as possible. Adding a
few cheap, common extras is fine and expected; say so by leaving from_pantry
false on anything that has to be bought. Mark everything from the list above
with from_pantry: true.

HOUSEHOLD
${describeHousehold(profile)}
Cook each dish for ${servings} servings.

${avoid}

CUISINES
${describeCuisines(profile.cuisines, dishes, recentDishes, profile.cuisine_regions)}

FLAVOUR
${describeFlavour(profile)}

TIME
${profile.cooking_style ? 'Keep to the household\'s usual cooking time.' : 'No strong preference.'}

Return an empty extras array for every day: this is about using up what is
already here, not adding a pudding to the shop.${repeats}

${languageInstruction}`;
}

export function buildMealPlanPrompt(
  profile: UserProfile,
  pantry: PantryItem[],
  locale: SupportedLocale = 'en',
  recentDishes: readonly string[] = []
): string {
  const servings = calculateServings(profile);
  const budget = profile.weekly_budget
    ? `£${Number(profile.weekly_budget).toFixed(2)}`
    : 'not specified';

  const timeGuidance: Record<string, string> = {
    quick: 'Under 25 minutes per meal.',
    balanced: '30 to 45 minutes per meal.',
    batch: 'Favour dishes that cook once and reheat well for several meals.',
    relaxed: 'Up to an hour is fine.',
  };

  const avoid =
    profile.avoid_ingredients.length > 0
      ? `MUST NOT APPEAR ANYWHERE: ${profile.avoid_ingredients.join(', ')}`
      : 'No ingredient restrictions.';

  const languageInstruction = locale === 'zh'
    ? `OUTPUT LANGUAGE
Use natural Simplified Chinese for every user-facing value, including summary, meal names, ingredient names, steps and tips. Preserve authentic dish names in native_name. Keep JSON keys and schema enum values in English.`
    : `OUTPUT LANGUAGE
Use British English for user-facing values. Some ingredient and region names below are written in Chinese; translate them into English rather than copying them through. Preserve authentic dish names in native_name.`;

  return `${languageInstruction}

Plan ${profile.meals_per_week} meals.

HOUSEHOLD
${describeHousehold(profile)}
Cook each recipe for ${servings} servings.

${avoid}

CUISINES — THIS IS THE POINT OF THE PRODUCT
${describeCuisines(profile.cuisines, profile.meals_per_week, recentDishes, profile.cuisine_regions)}

FLAVOUR
${describeFlavour(profile)}

FRUIT, SNACKS AND DESSERT
${describeExtras(profile)}

BUDGET
Weekly total: ${budget}

TIME
${profile.cooking_style ? timeGuidance[profile.cooking_style] : 'No strong preference.'}

WHAT MATTERS MOST
${profile.priorities.length > 0 ? profile.priorities.join(', ') : 'balanced'}

ALREADY IN THE KITCHEN
${describePantry(pantry)}

Mark every ingredient the household already has with from_pantry: true.
Spread the meals across days, starting at day_index 0.

${languageInstruction}`;
}
