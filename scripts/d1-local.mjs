import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
export function localDatabase(path = ':memory:') {
  const sqlite = new DatabaseSync(path);
  sqlite.exec(readFileSync(new URL('../backend/migrations/0001_messages.sql', import.meta.url), 'utf8'));
  return {
    sqlite,
    prepare(sql) {
      return { bind(...values) {
        return {
          async first() { return sqlite.prepare(sql).get(...values) || null; },
          async run() { return {meta:sqlite.prepare(sql).run(...values)}; },
        };
      }};
    },
  };
}
