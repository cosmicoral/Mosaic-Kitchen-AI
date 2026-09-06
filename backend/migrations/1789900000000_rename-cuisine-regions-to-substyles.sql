-- Up Migration

-- "Region" was the wrong noun, and the wrong noun shapes the data.
--
-- It works for Chinese food, where Sichuan, Cantonese and Hunan are how people
-- actually describe what they cook. It does not work for Japanese or Korean
-- food, where the useful distinctions are as often culinary as geographic:
-- somebody wants ramen, izakaya food or home-style washoku, not "Kanto". A
-- column called cuisine_regions quietly insists that every cuisine divides
-- along a map, and the picker built on top of it inherited that claim.
--
-- 'substyle' is deliberately vague. It covers a place, a technique, a meal
-- format or a tradition, which is what the values actually are.
--
-- A rename rather than a new column: the values themselves are unchanged and
-- still valid, so copying them across would be two sources of truth for the
-- length of the migration and one of them would be stale.
ALTER TABLE user_profiles RENAME COLUMN cuisine_regions TO cuisine_substyles;

-- Down Migration

ALTER TABLE user_profiles RENAME COLUMN cuisine_substyles TO cuisine_regions;
