-- Up Migration
CREATE TABLE pantry_items(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity NUMERIC(10,2),
    unit TEXT,
    expires_on DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT pantry_items_name_length
            CHECK (char_length(name) BETWEEN 1 AND 100),
    CONSTRAINT pantry_items_quantity_positive
            CHECK (quantity IS NULL OR quantity > 0),
    CONSTRAINT pantry_items_category_valid
            CHECK (category IN ('vegetables', 'protein', 'grains', 'condiments', 'frozen', 'dairy', 'other'))
);
    CREATE INDEX idx_pantry_items_user_id ON pantry_items(user_id);
    CREATE INDEX idx_pantry_items_user_expiry ON pantry_items(user_id, expires_on);

-- Down Migration
DROP TABLE pantry_items;