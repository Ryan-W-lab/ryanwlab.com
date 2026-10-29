-- Human-friendly read-only view for Cloudflare Studio.
CREATE VIEW IF NOT EXISTS inbox AS
SELECT datetime(created_at, 'unixepoch', '+8 hours') AS beijing_time,
       nickname,
       message
FROM messages
ORDER BY created_at DESC;
