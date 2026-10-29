-- No public read API. View messages only through the authenticated D1 dashboard.
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  ip_key TEXT NOT NULL,
  day TEXT NOT NULL,
  nickname TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  CHECK(length(nickname) <= 20),
  CHECK(length(message) BETWEEN 1 AND 500)
);
CREATE INDEX IF NOT EXISTS messages_quota ON messages(ip_key, day, created_at);
CREATE INDEX IF NOT EXISTS messages_retention ON messages(created_at);
-- SQLite serializes writes. Quota checks and the insertion are one atomic write.
-- Retries with the same request id skip limits, then ON CONFLICT does nothing.
CREATE TRIGGER IF NOT EXISTS messages_daily_limit
BEFORE INSERT ON messages
WHEN NOT EXISTS (SELECT 1 FROM messages WHERE id = NEW.id)
BEGIN
  SELECT CASE WHEN (
    SELECT COUNT(*) FROM messages WHERE ip_key = NEW.ip_key AND day = NEW.day
  ) >= 3 THEN RAISE(ABORT, 'MESSAGE_DAILY_LIMIT') END;
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM messages WHERE ip_key = NEW.ip_key AND day = NEW.day
      AND created_at > NEW.created_at - 60
  ) THEN RAISE(ABORT, 'MESSAGE_COOLDOWN') END;
END;
