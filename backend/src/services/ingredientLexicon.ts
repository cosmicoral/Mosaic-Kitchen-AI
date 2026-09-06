import type { SupportedLocale } from '../utils/locale.ts';

// A hand-curated bilingual ingredient table, checked before anything is sent
// to a model.
//
// Ingredient names are the bulk of a meal plan by count — well over half the
// translatable strings — and they repeat relentlessly across plans and across
// users. Garlic is garlic. Paying a model to rediscover that every time a
// household switches language is the most obviously wasteful call this product
// makes, and the answer never varies, so a lookup is not only cheaper but more
// consistent than the model would be.
//
// Deliberately EXACT-MATCH only. Substring matching would turn 青葱 into
// "green pepper" via 青椒, and a shopping list that sends someone home with
// the wrong vegetable is worse than one written in the other language. A miss
// falls through to the model, which is the safe direction.

interface Entry {
  en: string;
  zh: string;
  // Other spellings that should resolve to the same pair. Regional names,
  // British/American variants, and the traditional-character forms a user is
  // as likely to type as the simplified ones.
  also?: string[];
}

export const LEXICON_ENTRIES: Entry[] = [
  // Alliums and aromatics
  { en: 'Garlic', zh: '大蒜', also: ['蒜', '蒜头', '蒜瓣'] },
  { en: 'Ginger', zh: '姜', also: ['生姜', '薑'] },
  { en: 'Spring onion', zh: '葱', also: ['小葱', '青葱', '大葱', '蔥', 'Scallion', 'Green onion'] },
  { en: 'Onion', zh: '洋葱', also: ['洋蔥'] },
  { en: 'Red onion', zh: '红洋葱' },
  { en: 'Shallot', zh: '红葱头', also: ['干葱'] },
  { en: 'Leek', zh: '韭葱' },
  { en: 'Chives', zh: '韭菜', also: ['细香葱'] },
  { en: 'Coriander', zh: '香菜', also: ['芫荽', 'Cilantro'] },

  // Chillies and peppers
  { en: 'Red chilli', zh: '红辣椒' },
  { en: 'Green chilli', zh: '青辣椒' },
  { en: 'Dried chilli', zh: '干辣椒', also: ['乾辣椒'] },
  { en: 'Green pepper', zh: '青椒', also: ['Green bell pepper'] },
  { en: 'Red pepper', zh: '红椒', also: ['红甜椒', 'Red bell pepper'] },
  { en: 'Bell pepper', zh: '甜椒', also: ['彩椒', '灯笼椒'] },
  { en: 'Sichuan pepper', zh: '花椒', also: ['川椒'] },
  { en: 'White pepper', zh: '白胡椒', also: ['白胡椒粉'] },
  { en: 'Black pepper', zh: '黑胡椒', also: ['黑胡椒粉'] },
  { en: 'Chilli flakes', zh: '辣椒碎', also: ['辣椒面', '辣椒粉'] },
  { en: 'Chilli oil', zh: '辣椒油', also: ['红油'] },
  { en: 'Chopped salted chilli', zh: '剁椒' },

  // Leafy and stem vegetables
  { en: 'Pak choi', zh: '小白菜', also: ['青江菜', 'Bok choy'] },
  { en: 'Chinese cabbage', zh: '大白菜', also: ['白菜', 'Napa cabbage'] },
  { en: 'Cabbage', zh: '卷心菜', also: ['圆白菜', '包菜', '高丽菜'] },
  { en: 'Choi sum', zh: '菜心' },
  { en: 'Chinese broccoli', zh: '芥兰', also: ['芥蓝', 'Gai lan'] },
  { en: 'Water spinach', zh: '空心菜', also: ['通菜'] },
  { en: 'Spinach', zh: '菠菜' },
  { en: 'Lettuce', zh: '生菜', also: ['莴苣'] },
  { en: 'Chrysanthemum greens', zh: '茼蒿' },
  { en: 'Amaranth greens', zh: '苋菜' },
  { en: 'Celery', zh: '芹菜', also: ['西芹'] },
  { en: 'Broccoli', zh: '西兰花', also: ['西蘭花'] },
  { en: 'Cauliflower', zh: '花椰菜', also: ['菜花'] },
  { en: 'Asparagus', zh: '芦笋' },
  { en: 'Bean sprouts', zh: '豆芽', also: ['绿豆芽', '黄豆芽'] },
  { en: 'Bamboo shoots', zh: '竹笋', also: ['笋'] },
  { en: 'Lotus root', zh: '莲藕', also: ['藕'] },
  { en: 'Kale', zh: '羽衣甘蓝' },

  // Root and fruiting vegetables
  { en: 'Potato', zh: '土豆', also: ['马铃薯', '洋芋'] },
  { en: 'Sweet potato', zh: '红薯', also: ['地瓜', '番薯'] },
  { en: 'Carrot', zh: '胡萝卜', also: ['紅蘿蔔'] },
  { en: 'White radish', zh: '白萝卜', also: ['萝卜', 'Daikon', 'Mooli'] },
  { en: 'Tomato', zh: '番茄', also: ['西红柿'] },
  { en: 'Cherry tomatoes', zh: '圣女果', also: ['小番茄'] },
  { en: 'Cucumber', zh: '黄瓜', also: ['小黄瓜'] },
  { en: 'Courgette', zh: '西葫芦', also: ['Zucchini'] },
  { en: 'Aubergine', zh: '茄子', also: ['Eggplant'] },
  { en: 'Pumpkin', zh: '南瓜' },
  { en: 'Winter melon', zh: '冬瓜' },
  { en: 'Bitter melon', zh: '苦瓜' },
  { en: 'Loofah', zh: '丝瓜' },
  { en: 'Yam', zh: '山药' },
  { en: 'Taro', zh: '芋头' },
  { en: 'Sweetcorn', zh: '玉米', also: ['甜玉米'] },
  { en: 'Peas', zh: '豌豆' },
  { en: 'Green beans', zh: '四季豆', also: ['豆角', '青豆角'] },
  { en: 'Long beans', zh: '豇豆' },
  { en: 'Edamame', zh: '毛豆' },

  // Mushrooms
  { en: 'Shiitake mushrooms', zh: '香菇', also: ['冬菇'] },
  { en: 'Dried shiitake mushrooms', zh: '干香菇' },
  { en: 'Oyster mushrooms', zh: '平菇' },
  { en: 'Enoki mushrooms', zh: '金针菇' },
  { en: 'King oyster mushrooms', zh: '杏鲍菇' },
  { en: 'Button mushrooms', zh: '口蘑', also: ['蘑菇'] },
  { en: 'Wood ear fungus', zh: '木耳', also: ['黑木耳'] },
  { en: 'Silver ear fungus', zh: '银耳' },

  // Meat and poultry
  { en: 'Pork', zh: '猪肉' },
  { en: 'Pork belly', zh: '五花肉' },
  { en: 'Pork mince', zh: '猪肉末', also: ['猪绞肉', '肉末'] },
  { en: 'Pork loin', zh: '里脊肉', also: ['猪里脊'] },
  { en: 'Pork ribs', zh: '排骨' },
  { en: 'Beef', zh: '牛肉' },
  { en: 'Beef mince', zh: '牛肉末', also: ['牛绞肉'] },
  { en: 'Beef brisket', zh: '牛腩' },
  { en: 'Beef steak', zh: '牛排' },
  { en: 'Lamb', zh: '羊肉' },
  { en: 'Chicken', zh: '鸡肉' },
  { en: 'Chicken breast', zh: '鸡胸肉' },
  { en: 'Chicken thigh', zh: '鸡腿肉', also: ['鸡腿'] },
  { en: 'Chicken wings', zh: '鸡翅' },
  { en: 'Whole chicken', zh: '整鸡' },
  { en: 'Duck', zh: '鸭肉' },
  { en: 'Bacon', zh: '培根' },
  { en: 'Sausage', zh: '香肠' },
  { en: 'Chinese cured sausage', zh: '腊肠' },
  { en: 'Cured pork', zh: '腊肉' },
  { en: 'Ham', zh: '火腿' },

  // Fish and seafood
  { en: 'Fish', zh: '鱼' },
  { en: 'Sea bass', zh: '鲈鱼' },
  { en: 'Sea bream', zh: '鲷鱼' },
  { en: 'Salmon', zh: '三文鱼', also: ['鲑鱼'] },
  { en: 'Cod', zh: '鳕鱼' },
  { en: 'Mackerel', zh: '鲭鱼' },
  { en: 'Grass carp', zh: '草鱼' },
  { en: 'Fish head', zh: '鱼头' },
  { en: 'Prawns', zh: '虾', also: ['大虾', 'Shrimp'] },
  { en: 'Dried shrimp', zh: '虾米', also: ['海米'] },
  { en: 'Squid', zh: '鱿鱼' },
  { en: 'Clams', zh: '蛤蜊', also: ['花蛤'] },
  { en: 'Mussels', zh: '青口', also: ['贻贝'] },
  { en: 'Scallops', zh: '扇贝' },
  { en: 'Dried anchovies', zh: '小鱼干' },

  // Eggs, dairy and soy
  { en: 'Egg', zh: '鸡蛋', also: ['蛋'] },
  { en: 'Salted duck egg', zh: '咸鸭蛋' },
  { en: 'Century egg', zh: '皮蛋' },
  { en: 'Milk', zh: '牛奶' },
  { en: 'Condensed milk', zh: '炼乳' },
  { en: 'Butter', zh: '黄油' },
  { en: 'Cheese', zh: '奶酪', also: ['芝士'] },
  { en: 'Yoghurt', zh: '酸奶' },
  { en: 'Double cream', zh: '淡奶油', also: ['鲜奶油'] },
  { en: 'Tofu', zh: '豆腐' },
  { en: 'Firm tofu', zh: '老豆腐', also: ['北豆腐'] },
  { en: 'Silken tofu', zh: '嫩豆腐', also: ['南豆腐'] },
  { en: 'Dried tofu', zh: '豆干', also: ['香干'] },
  { en: 'Tofu skin', zh: '腐竹', also: ['豆皮'] },
  { en: 'Soy milk', zh: '豆浆' },

  // Grains, noodles and starches
  { en: 'Rice', zh: '大米', also: ['米'] },
  { en: 'Cooked rice', zh: '米饭' },
  { en: 'Brown rice', zh: '糙米' },
  { en: 'Glutinous rice', zh: '糯米' },
  { en: 'Jasmine rice', zh: '香米' },
  { en: 'Rice noodles', zh: '米粉', also: ['米线'] },
  { en: 'Wheat noodles', zh: '面条', also: ['麵條'] },
  { en: 'Egg noodles', zh: '鸡蛋面' },
  { en: 'Udon noodles', zh: '乌冬面' },
  { en: 'Glass noodles', zh: '粉丝', also: ['冬粉'] },
  { en: 'Sweet potato noodles', zh: '红薯粉' },
  { en: 'Wheat flour', zh: '面粉' },
  { en: 'Cornflour', zh: '玉米淀粉', also: ['生粉', '淀粉', 'Cornstarch'] },
  { en: 'Bread', zh: '面包' },
  { en: 'Dumpling wrappers', zh: '饺子皮' },
  { en: 'Wonton wrappers', zh: '馄饨皮' },
  { en: 'Rice cake slices', zh: '年糕' },
  { en: 'Oats', zh: '燕麦' },
  { en: 'Quinoa', zh: '藜麦' },

  // Pulses and nuts
  { en: 'Chickpeas', zh: '鹰嘴豆' },
  { en: 'Lentils', zh: '扁豆' },
  { en: 'Red kidney beans', zh: '红腰豆' },
  { en: 'Mung beans', zh: '绿豆' },
  { en: 'Red beans', zh: '红豆' },
  { en: 'Black beans', zh: '黑豆' },
  { en: 'Peanuts', zh: '花生' },
  { en: 'Cashews', zh: '腰果' },
  { en: 'Walnuts', zh: '核桃' },
  { en: 'Almonds', zh: '杏仁' },
  { en: 'Sesame seeds', zh: '芝麻' },
  { en: 'Pine nuts', zh: '松子' },

  // Sauces and seasonings
  { en: 'Light soy sauce', zh: '生抽' },
  { en: 'Dark soy sauce', zh: '老抽' },
  { en: 'Soy sauce', zh: '酱油' },
  { en: 'Oyster sauce', zh: '蚝油' },
  { en: 'Shaoxing wine', zh: '料酒', also: ['绍兴酒', '黄酒'] },
  { en: 'Rice vinegar', zh: '米醋' },
  { en: 'Black vinegar', zh: '香醋', also: ['陈醋', '镇江醋'] },
  { en: 'Sesame oil', zh: '香油', also: ['芝麻油'] },
  { en: 'Vegetable oil', zh: '植物油', also: ['食用油', '油'] },
  { en: 'Rapeseed oil', zh: '菜籽油' },
  { en: 'Olive oil', zh: '橄榄油' },
  { en: 'Doubanjiang chilli bean paste', zh: '豆瓣酱' },
  { en: 'Fermented black beans', zh: '豆豉' },
  { en: 'Sweet bean sauce', zh: '甜面酱' },
  { en: 'Hoisin sauce', zh: '海鲜酱' },
  { en: 'Fish sauce', zh: '鱼露' },
  { en: 'Gochujang', zh: '韩式辣椒酱', also: ['苦椒酱'] },
  { en: 'Doenjang soybean paste', zh: '韩式大酱' },
  { en: 'Miso paste', zh: '味噌' },
  { en: 'Mirin', zh: '味醂' },
  { en: 'Sesame paste', zh: '芝麻酱' },
  { en: 'Tomato paste', zh: '番茄酱' },
  { en: 'Salt', zh: '盐' },
  { en: 'Sugar', zh: '糖', also: ['白糖'] },
  { en: 'Rock sugar', zh: '冰糖' },
  { en: 'Brown sugar', zh: '红糖' },
  { en: 'Honey', zh: '蜂蜜' },
  { en: 'Cumin', zh: '孜然' },
  { en: 'Five-spice powder', zh: '五香粉' },
  { en: 'Star anise', zh: '八角' },
  { en: 'Cinnamon', zh: '桂皮', also: ['肉桂'] },
  { en: 'Bay leaves', zh: '香叶', also: ['月桂叶'] },
  { en: 'Curry powder', zh: '咖喱粉' },
  { en: 'Turmeric', zh: '姜黄' },
  { en: 'Paprika', zh: '甜椒粉' },
  { en: 'Cornmeal', zh: '玉米面' },
  { en: 'Stock cube', zh: '浓汤宝', also: ['高汤块'] },
  { en: 'Chicken stock', zh: '鸡汤' },
  { en: 'Baking powder', zh: '泡打粉' },
  { en: 'Yeast', zh: '酵母' },
  { en: 'Seaweed', zh: '紫菜', also: ['海苔'] },
  { en: 'Kelp', zh: '海带' },
  { en: 'Kimchi', zh: '泡菜', also: ['韩式泡菜'] },
  { en: 'Pickled mustard greens', zh: '酸菜' },
  { en: 'Preserved vegetable', zh: '榨菜' },

  // Fruit
  { en: 'Apple', zh: '苹果' },
  { en: 'Pear', zh: '梨' },
  { en: 'Banana', zh: '香蕉' },
  { en: 'Orange', zh: '橙子', also: ['橙'] },
  { en: 'Mandarin', zh: '橘子' },
  { en: 'Lemon', zh: '柠檬' },
  { en: 'Lime', zh: '青柠' },
  { en: 'Grapes', zh: '葡萄' },
  { en: 'Strawberries', zh: '草莓' },
  { en: 'Blueberries', zh: '蓝莓' },
  { en: 'Peach', zh: '桃子', also: ['水蜜桃'] },
  { en: 'Mango', zh: '芒果' },
  { en: 'Pineapple', zh: '菠萝' },
  { en: 'Watermelon', zh: '西瓜' },
  { en: 'Kiwi', zh: '猕猴桃' },
  { en: 'Avocado', zh: '牛油果' },
  { en: 'Dates', zh: '红枣' },
  { en: 'Goji berries', zh: '枸杞' },
];

// Units are stored as the generating model wrote them, so a plan generated in
// Chinese fills the pantry and the shopping list with 克 and 个. They are a
// tiny closed set — exactly what a lookup is for — and unlike ingredient names
// there is no judgement involved: a gram is a gram.
export const UNIT_ENTRIES: Entry[] = [
  { en: 'g', zh: '克' },
  { en: 'kg', zh: '千克', also: ['公斤'] },
  { en: 'ml', zh: '毫升' },
  { en: 'l', zh: '升' },
  { en: 'tsp', zh: '茶匙', also: ['小勺'] },
  { en: 'tbsp', zh: '汤匙', also: ['大勺', '汤勺'] },
  { en: 'piece', zh: '个', also: ['只'] },
  { en: 'pieces', zh: '个' },
  { en: 'clove', zh: '瓣' },
  { en: 'cloves', zh: '瓣' },
  { en: 'slice', zh: '片' },
  { en: 'slices', zh: '片' },
  { en: 'bunch', zh: '把', also: ['束'] },
  { en: 'pack', zh: '包', also: ['袋'] },
  { en: 'tin', zh: '罐', also: ['听'] },
  { en: 'bottle', zh: '瓶' },
  { en: 'stalk', zh: '根' },
  { en: 'stalks', zh: '根' },
  { en: 'handful', zh: '一把' },
  { en: 'pinch', zh: '少许', also: ['一撮'] },
  { en: 'cup', zh: '杯' },
  { en: 'cups', zh: '杯' },
];

// Cuts and preparations. The model does not write 鸡腿, it writes 带骨鸡腿;
// not 牛肉 but 牛肉薄片. Every one of those is a base ingredient the table
// already knows wearing a modifier it does not, and adding a row for each
// combination is a losing race — the combinations multiply, the bases do not.
//
// So the modifier is peeled off, the base is looked up, and the modifier is
// put back in the target language. Still deterministic, still exact: a
// modifier not on this list means no decomposition is attempted and the name
// goes to the model unchanged, which is the safe direction.
interface Modifier {
  zh: string;
  // Where it sits in Chinese. 带骨鸡腿 is a prefix, 牛肉薄片 a suffix.
  at: 'prefix' | 'suffix';
  // How the English reads. `${'{'}base${'}'}` is substituted with the translated base,
  // because English puts these in different places than Chinese does.
  // A template rather than a function, so the generated client copy can carry
  // it. `{base}` is replaced with the translated base ingredient.
  en: string;
}

export const MODIFIER_ENTRIES: Modifier[] = [
  { zh: '带骨', at: 'prefix', en: 'Bone-in {base:lower}' },
  { zh: '去骨', at: 'prefix', en: 'Boneless {base:lower}' },
  { zh: '熟', at: 'prefix', en: 'Cooked {base:lower}' },
  { zh: '生', at: 'prefix', en: 'Raw {base:lower}' },
  { zh: '冷冻', at: 'prefix', en: 'Frozen {base:lower}' },
  { zh: '新鲜', at: 'prefix', en: 'Fresh {base:lower}' },
  { zh: '薄片', at: 'suffix', en: '{base}, thinly sliced' },
  { zh: '切片', at: 'suffix', en: '{base}, sliced' },
  { zh: '切丝', at: 'suffix', en: '{base}, shredded' },
  { zh: '切丁', at: 'suffix', en: '{base}, diced' },
  { zh: '切块', at: 'suffix', en: '{base}, in chunks' },
  { zh: '末', at: 'suffix', en: '{base}, minced' },
  { zh: '碎', at: 'suffix', en: '{base}, chopped' },
  { zh: '丝', at: 'suffix', en: '{base}, shredded' },
  { zh: '鱼柳', at: 'suffix', en: '{base} fillet' },
  { zh: '柳', at: 'suffix', en: '{base} fillet' },
  { zh: '肉', at: 'suffix', en: 'b' },
  { zh: '粉', at: 'suffix', en: '{base} powder' },
  { zh: '干', at: 'suffix', en: 'Dried {base:lower}' },
];

// Case and whitespace are the only things normalised away. Chinese is compared
// as written: 干辣椒 and 乾辣椒 are separate entries rather than folded
// together, because character folding is a whole problem of its own and
// getting it subtly wrong is how 干 (dried) meets 幹.
function normalise(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

const TO_EN = new Map<string, string>();
const TO_ZH = new Map<string, string>();

for (const entry of LEXICON_ENTRIES) {
  TO_EN.set(normalise(entry.zh), entry.en);
  TO_ZH.set(normalise(entry.en), entry.zh);

  for (const alias of entry.also ?? []) {
    const key = normalise(alias);
    // An alias in either script resolves to the pair. Which map it belongs in
    // is decided by what it is written in, not by where it was listed.
    if (/[一-鿿]/.test(alias)) TO_EN.set(key, entry.en);
    else TO_ZH.set(key, entry.zh);
  }
}

// Returns the translation, or null when the name is not in the table. Null is
// the signal to fall through to the model — a partial table is useful, a
// guessing one is not.
export function lookupIngredient(
  name: string,
  target: SupportedLocale
): string | null {
  const key = normalise(name);
  const table = target === 'en' ? TO_EN : TO_ZH;

  const exact = table.get(key);
  if (exact) return exact;

  // Only into English: the modifier phrasings above are English sentences, and
  // building Chinese ones from an English base is a different and much harder
  // problem than it looks — 带骨 goes in front, "bone-in" goes in front, but
  // "thinly sliced" and 薄片 do not agree on either position or grammar.
  if (target === 'en') return decompose(name);

  return null;
}

// Peels one known modifier off a name and looks up what is left. One, not
// several: 带骨鸡腿薄片 is rare enough not to be worth the ambiguity, and each
// extra peel is another chance to mangle a name that was readable to begin
// with.
function decompose(name: string): string | null {
  const trimmed = name.trim();

  for (const modifier of MODIFIER_ENTRIES) {
    const attached =
      modifier.at === 'prefix'
        ? trimmed.startsWith(modifier.zh)
        : trimmed.endsWith(modifier.zh);
    if (!attached) continue;

    const base =
      modifier.at === 'prefix'
        ? trimmed.slice(modifier.zh.length)
        : trimmed.slice(0, -modifier.zh.length);

    // A one-character remainder is not a word; 肉 alone is not an ingredient.
    if (base.length < 1) continue;

    const translated = TO_EN.get(normalise(base));
    if (translated) return applyModifier(modifier.en, translated);
  }

  return null;
}

const UNIT_TO_EN = new Map<string, string>();
const UNIT_TO_ZH = new Map<string, string>();

// First entry wins in both directions. 'piece' and 'pieces' both map to 个,
// and 个 has to come back as the singular — the plural is listed only so that
// a plan written with it is still recognised.
for (const entry of UNIT_ENTRIES) {
  const zhKey = normalise(entry.zh);
  const enKey = normalise(entry.en);
  if (!UNIT_TO_EN.has(zhKey)) UNIT_TO_EN.set(zhKey, entry.en);
  if (!UNIT_TO_ZH.has(enKey)) UNIT_TO_ZH.set(enKey, entry.zh);

  for (const alias of entry.also ?? []) {
    const key = normalise(alias);
    if (/[\u4e00-\u9fff]/.test(alias)) {
      if (!UNIT_TO_EN.has(key)) UNIT_TO_EN.set(key, entry.en);
    } else if (!UNIT_TO_ZH.has(key)) {
      UNIT_TO_ZH.set(key, entry.zh);
    }
  }
}

// The English phrasing is a template rather than a function so the generated
// client copy can carry it across: a function does not survive JSON.
export function applyModifier(template: string, base: string): string {
  return template
    .replace('{base:lower}', base.toLowerCase())
    .replace('{base}', base);
}

export function lookupUnit(unit: string, target: SupportedLocale): string | null {
  const table = target === 'en' ? UNIT_TO_EN : UNIT_TO_ZH;
  return table.get(normalise(unit)) ?? null;
}

export function lexiconSize(): number {
  return LEXICON_ENTRIES.length;
}
