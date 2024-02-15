import { InferInsertModel, InferSelectModel, relations } from "drizzle-orm"
import { text, integer, sqliteTable, index } from "drizzle-orm/sqlite-core"

export { users, userAuths, userAuthRelations }
export type { UserModel, UserInsertModel, UserAuthModel, UserAuthInsertModel }

const users = sqliteTable(
  "user",
  {
    id: integer("id").primaryKey(),
    name: text("name").notNull(),
    avatarUrl: text("avatar_url"),
    isAdmin: integer("is_admin", { mode: "boolean" }),
  },
  (table) => ({ idIdx: index("id_idx").on(table.name) })
)

type UserModel = InferSelectModel<typeof users>
type UserInsertModel = InferInsertModel<typeof users>

// const userRelations = relations(users, ({ many }) => ({

// }))

const userAuths = sqliteTable(
  "user_auth",
  {
    id: integer("id").primaryKey(),
    email: text("email"),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    provider: text("provider").notNull(),
    providerId: text("provider_id").notNull(),
  },
  (table) => ({
    emailIdx: index("user_auth_email_idx").on(table.email),
    userIdIdx: index("user_auth_user_id_idx").on(table.userId),
    providerIdIdx: index("user_auth_provider_id_idx").on(table.providerId),
  })
)

const userAuthRelations = relations(userAuths, ({ one }) => ({
  user: one(users, {
    fields: [userAuths.userId],
    references: [users.id],
  }),
}))

type UserAuthModel = InferSelectModel<typeof userAuths>
type UserAuthInsertModel = InferInsertModel<typeof userAuths>
