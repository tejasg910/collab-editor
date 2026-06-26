import postgres from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import * as schema from "./schema"

const client = postgres(process.env.DATABASE_URL!)

export const db = drizzle(client, { schema })

export async function withRLS(userId: string) {
  await client`SELECT set_config('app.current_user_id', ${userId}, true)`
}
