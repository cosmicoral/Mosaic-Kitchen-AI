-- Up Migration

-- Fossils of the mislabelled-locale bug. Before the backfill, a Chinese plan
-- was recorded as English; opening it in Chinese therefore looked like a
-- mismatch, so it was "translated" from Chinese into Chinese and the result
-- cached. Those rows are unreachable now that readInLocale returns early when
-- the languages match, but they cost a model call to produce and would be
-- confusing to find later.
DELETE FROM meal_plan_translations t
 USING meal_plans p
 WHERE t.meal_plan_id = p.id
   AND t.locale = p.locale;

-- Down Migration

-- Nothing to restore. These rows were never meant to exist.
SELECT 1;
