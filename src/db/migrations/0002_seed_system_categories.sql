-- Data Migration: Seed System Categories
-- Inserts 8 predefined expense categories for all trips

INSERT INTO expense_categories (id, name, emoji, trip_id, is_system, sort_order, created_at, updated_at)
VALUES
  ('cat-travel', 'Travel & Transportation', '✈️', NULL, 1, 100, datetime('now'), datetime('now')),
  ('cat-food', 'Food & Drinks', '🍔', NULL, 1, 200, datetime('now'), datetime('now')),
  ('cat-leisure', 'Leisure & Entertainment', '🎭', NULL, 1, 300, datetime('now'), datetime('now')),
  ('cat-lodging', 'Lodging', '🏨', NULL, 1, 400, datetime('now'), datetime('now')),
  ('cat-groceries', 'Groceries', '🛒', NULL, 1, 500, datetime('now'), datetime('now')),
  ('cat-insurance', 'Insurance', '🛡️', NULL, 1, 600, datetime('now'), datetime('now')),
  ('cat-shopping', 'Shopping', '🛍️', NULL, 1, 700, datetime('now'), datetime('now')),
  ('cat-other', 'Other', '📌', NULL, 1, 999, datetime('now'), datetime('now'))
ON CONFLICT(id) DO NOTHING;
