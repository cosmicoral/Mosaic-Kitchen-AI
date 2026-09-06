import assert from 'node:assert/strict';
import test from 'node:test';
import { lexiconSize, lookupIngredient, lookupUnit } from '../src/services/ingredientLexicon.ts';

test('translates in both directions', () => {
  assert.equal(lookupIngredient('生抽', 'en'), 'Light soy sauce');
  assert.equal(lookupIngredient('Light soy sauce', 'zh'), '生抽');
});

test('aliases resolve to the same pair', () => {
  // Regional and traditional-character spellings a household is as likely to
  // type as the canonical one.
  for (const alias of ['蒜', '蒜头', '蒜瓣', '大蒜']) {
    assert.equal(lookupIngredient(alias, 'en'), 'Garlic', alias);
  }
  assert.equal(lookupIngredient('Cilantro', 'zh'), '香菜');
  assert.equal(lookupIngredient('Scallion', 'zh'), '葱');
});

test('case and surrounding whitespace do not matter', () => {
  assert.equal(lookupIngredient('  light soy sauce ', 'zh'), '生抽');
  assert.equal(lookupIngredient('GARLIC', 'zh'), '大蒜');
});

test('an unknown name returns null rather than a guess', () => {
  // Null is the signal to fall through to the model. A table that guesses is
  // worse than a table with holes in it.
  assert.equal(lookupIngredient('剁椒鱼头', 'en'), null);
  assert.equal(lookupIngredient('some invented thing', 'zh'), null);
});

test('matching is exact, never by substring', () => {
  // The reason this rule exists: 青葱 contains none of 青椒's characters in the
  // same order, but 青椒 is a substring of nothing safe either way, and a
  // looser matcher is how a shopping list sends someone home with the wrong
  // vegetable. Distinct entries must stay distinct.
  assert.equal(lookupIngredient('青椒', 'en'), 'Green pepper');
  assert.equal(lookupIngredient('青葱', 'en'), 'Spring onion');
  assert.equal(lookupIngredient('青辣椒', 'en'), 'Green chilli');

  // A name that merely contains a known one is not that ingredient.
  assert.equal(lookupIngredient('青椒炒肉丝', 'en'), null);
  assert.equal(lookupIngredient('Garlic bread', 'zh'), null);
});

test('dried and fresh are separate entries', () => {
  // 干 and 乾 are listed separately on purpose: character folding is its own
  // problem, and getting it subtly wrong is how 干 (dried) meets 幹.
  assert.equal(lookupIngredient('辣椒', 'en'), null);
  assert.equal(lookupIngredient('干辣椒', 'en'), 'Dried chilli');
  assert.equal(lookupIngredient('乾辣椒', 'en'), 'Dried chilli');
  assert.equal(lookupIngredient('香菇', 'en'), 'Shiitake mushrooms');
  assert.equal(lookupIngredient('干香菇', 'en'), 'Dried shiitake mushrooms');
});

test('the soy sauces are not collapsed into one', () => {
  // 生抽 and 老抽 are not interchangeable in a recipe, and a table that
  // flattened them would silently change what a dish tastes like.
  assert.equal(lookupIngredient('生抽', 'en'), 'Light soy sauce');
  assert.equal(lookupIngredient('老抽', 'en'), 'Dark soy sauce');
  assert.equal(lookupIngredient('酱油', 'en'), 'Soy sauce');
});

test('every entry round-trips', () => {
  // zh -> en -> zh has to land back where it started, or the two maps disagree
  // and a plan translated twice would drift.
  const samples = ['大蒜', '姜', '猪肉', '鸡蛋', '米饭', '香菇', '番茄', '豆腐'];
  for (const zh of samples) {
    const en = lookupIngredient(zh, 'en');
    assert.ok(en, zh);
    assert.equal(lookupIngredient(en, 'zh'), zh, `${zh} -> ${en} -> ?`);
  }
});

test('the table is large enough to be worth consulting', () => {
  // Below roughly this size the lookup stops covering the common case and the
  // saving it exists for disappears.
  assert.ok(lexiconSize() > 180, `only ${lexiconSize()} entries`);
});

test('a qualified name is decomposed rather than sent to the model', () => {
  // The shopping list showed 带骨鸡腿 and 牛肉薄片 in English mode while
  // Pork mince and Egg beside them translated fine. The bases were all in the
  // table; the modifiers were not, and adding a row per combination is a race
  // the combinations win.
  assert.equal(lookupIngredient('带骨鸡腿', 'en'), 'Bone-in chicken thigh');
  assert.equal(lookupIngredient('牛肉薄片', 'en'), 'Beef, thinly sliced');
  assert.equal(lookupIngredient('熟蛤蜊', 'en'), 'Cooked clams');
  assert.equal(lookupIngredient('鲭鱼鱼柳', 'en'), 'Mackerel fillet');
  assert.equal(lookupIngredient('猪肉末', 'en'), 'Pork mince');
});

test('decomposition never invents a base it does not know', () => {
  // A modifier on an unknown base is still unknown. Guessing here would put a
  // confident wrong name on a shopping list.
  assert.equal(lookupIngredient('带骨云南酸菜', 'en'), null);
  assert.equal(lookupIngredient('薄片', 'en'), null);
  assert.equal(lookupIngredient('带骨', 'en'), null);
});

test('decomposition is English-only', () => {
  // The modifier phrasings are English sentences. Building Chinese ones from
  // an English base is a different problem: 带骨 leads and so does "bone-in",
  // but 薄片 and "thinly sliced" agree on neither position nor grammar.
  assert.equal(lookupIngredient('Bone-in chicken thigh', 'zh'), null);
});

test('an exact match still wins over decomposition', () => {
  // 猪肉末 is in the table outright. It must not come back as "Pork, minced"
  // via the 末 modifier when the curated answer is "Pork mince".
  assert.equal(lookupIngredient('猪肉末', 'en'), 'Pork mince');
});

test('units translate both ways', () => {
  assert.equal(lookupUnit('克', 'en'), 'g');
  assert.equal(lookupUnit('个', 'en'), 'piece');
  assert.equal(lookupUnit('毫升', 'en'), 'ml');
  assert.equal(lookupUnit('g', 'zh'), '克');
  assert.equal(lookupUnit('unknown-unit', 'en'), null);
});
