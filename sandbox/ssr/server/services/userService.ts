import { eq } from "drizzle-orm"
import { db } from "./db"
import { UserInsertModel, UserModel, users } from "$/drizzle/schema"

export const userService = {
  pageSize: 100,
  async getById(id: number): Promise<UserModel | undefined> {
    try {
      return db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, id),
      })
    } catch (error) {
      console.error(error)
      return
    }
  },
  async upsert(user: UserInsertModel): Promise<UserModel | undefined> {
    try {
      if (!user.id) {
        return (await db.insert(users).values(user).returning()).at(0)
      }
      return (
        await db
          .update(users)
          .set(user)
          .where(eq(users.id, user.id))
          .returning()
      ).at(0)
    } catch (error) {
      console.error(error)
      return
    }
  },
}
