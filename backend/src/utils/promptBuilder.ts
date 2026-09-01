import type { PantryItem, UserProfile } from '../types/index.ts';

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
const CUISINE_GUIDANCE: Record<string, string> = {
  chinese: `Chinese is regional — pick a region per dish, never generic "Chinese".
Sichuan (麻婆豆腐, 鱼香肉丝, 干煸四季豆), Cantonese (蒸鱼, 白切鸡, 豉油王炒面),
Jiangnan/Shanghai (红烧肉, 油焖笋, 葱油拌面), Northern (西红柿炒蛋, 打卤面, 饺子),
Hunan, Dongbei. Everyday home cooking, not restaurant banquet dishes.
Store cupboard: light and dark soy sauce (they are not interchangeable),
Shaoxing wine, doubanjiang, dried shiitake, black vinegar, white pepper,
sesame oil, cornflour slurry. Methods: 炒 / 红烧 / 蒸 / 凉拌.`,

  japanese: `Everyday Japanese home food (家庭料理), not sushi or ramen.
生姜焼き, 肉じゃが, 親子丼, 鮭の塩焼き, きんぴらごぼう, 豚汁, 冷奴.
Build meals as 一汁三菜 where it fits: rice, a soup, a main, small sides.
Store cupboard: dashi, mirin, sake, light and dark miso, soy sauce, rice vinegar.`,

  korean: `Everyday Korean home food, rice plus banchan.
김치찌개, 된장찌개, 제육볶음, 잡채, 콩나물국, 계란말이, 비빔밥.
Store cupboard: gochujang, gochugaru (coarse, not cayenne), doenjang, sesame oil,
toasted sesame seeds, plenty of garlic. Name the banchan you expect alongside.`,

  indian: `Name the region: Punjabi, Gujarati, Bengali, South Indian (Tamil, Kerala).
Real household food — dal, sabzi, roti — not curry-house dishes.
Tempering (tadka) and whole spices matter; say when spices are bloomed.`,

  pakistani: `Punjabi and Karachi home cooking: daal chawal, aloo gosht, keema,
karahi, roti. Ghee, whole garam masala, ginger-garlic paste, tomato-onion masala.`,

  'middle-eastern': `Name the country: Levantine, Iraqi, Persian, Egyptian.
Home food such as mujadara, koshari, khoresh, maqluba, fattoush.
Sumac, pomegranate molasses, tahini, dried limes, seven spice.`,

  thai: `Regional: Central, Isan, Northern. Home dishes such as gaeng som,
pad kra pao, larb, tom kha. Fish sauce, palm sugar, galangal, makrut lime leaf,
fresh curry paste. Balance hot, sour, salty and sweet in each dish.`,

  vietnamese: `Northern, Central or Southern. Everyday food: thịt kho, canh chua,
cá kho tộ, bún chả, rau muống xào tỏi. Fish sauce, herbs served raw and generous.`,

  british: `Everyday British home cooking, not gastropub: shepherd's pie,
toad in the hole, fish pie, bubble and squeak, a proper roast, jacket potatoes.`,

  italian: `Name the region: Roman, Neapolitan, Sicilian, Emilian.
Home cooking — few ingredients, correct pasta shape, no cream in a carbonara.`,

  mexican: `Regional Mexican home food, not Tex-Mex: tinga, chiles rellenos,
sopa de fideo, frijoles de la olla, salsa verde. Dried chillies, masa, lime.`,

  caribbean: `Name the island: Jamaican, Trinidadian, Bajan. Home food such as
rice and peas, brown stew chicken, callaloo, curry goat, doubles.
Green seasoning, scotch bonnet, allspice, thyme.`,

  'west-african': `Name the country: Nigerian, Ghanaian, Senegalese.
Jollof, egusi, thieboudienne, waakye, groundnut stew. Palm oil, scotch bonnet,
crayfish, locust bean (iru).`,

  mediterranean: `Name the country: Greek, Turkish, Levantine, Spanish.
Home cooking such as fasolada, imam bayildi, briam, lentil soup.`,
};

function describeCuisines(cuisines: readonly string[], meals: number): string {
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
      const notes = CUISINE_GUIDANCE[cuisine];
      return notes ? `## ${cuisine}\n${notes}` : `## ${cuisine}`;
    })
    .join('\n\n');

  return `${distribution}
No dish may belong to any cuisine outside this list.

${guidance}`;
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

export function buildMealPlanPrompt(profile: UserProfile, pantry: PantryItem[]): string {
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

  return `Plan ${profile.meals_per_week} meals.

HOUSEHOLD
${describeHousehold(profile)}
Cook each recipe for ${servings} servings.

${avoid}

CUISINES — THIS IS THE POINT OF THE PRODUCT
${describeCuisines(profile.cuisines, profile.meals_per_week)}

BUDGET
Weekly total: ${budget}

TIME
${profile.cooking_style ? timeGuidance[profile.cooking_style] : 'No strong preference.'}

WHAT MATTERS MOST
${profile.priorities.length > 0 ? profile.priorities.join(', ') : 'balanced'}

ALREADY IN THE KITCHEN
${describePantry(pantry)}

Mark every ingredient the household already has with from_pantry: true.
Spread the meals across days, starting at day_index 0.`;
}