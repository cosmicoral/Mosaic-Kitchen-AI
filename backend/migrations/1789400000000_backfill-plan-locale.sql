-- Up Migration

-- The previous migration defaulted every existing plan to 'en'. That was wrong,
-- and wrong in the way that hides itself: a Chinese plan labelled English is
-- never a mismatch, so it is never translated, so switching the interface to
-- English leaves the plan in Chinese with nothing reporting a problem.
--
-- The plan's own text is the evidence. If the summary contains Han characters
-- it was written in Chinese, whatever the column claimed. Checked against the
-- summary rather than a dish name because native_name is Chinese even in an
-- English plan — reading that would relabel every plan as Chinese.
UPDATE meal_plans
   SET locale = 'zh'
 WHERE locale = 'en'
   AND plan->>'summary' ~ '[一-鿿぀-ヿ가-힯]';

-- Down Migration

-- Nothing to undo: this only corrects a column to what the stored text already
-- said it was, and putting the wrong value back would be restoring a bug.
SELECT 1;
