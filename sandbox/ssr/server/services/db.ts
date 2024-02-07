import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import * as schema from "$/drizzle/schema"

const databaseTables = [
  `user (id INTEGER PRIMARY KEY, name TEXT, avatar_url TEXT, is_admin INTEGER)`,
  `user_auth (id INTEGER PRIMARY KEY, email TEXT, user_id INTEGER, provider TEXT, provider_id TEXT)`,
]
const sqlite = new Database(":memory:")
for (const tableCreationStatement of databaseTables) {
  sqlite.exec(`CREATE TABLE IF NOT EXISTS ${tableCreationStatement}`)
}
export const db = drizzle(sqlite, { schema })
