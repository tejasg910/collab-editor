import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import * as schema from "./schema"

const sql = neon(process.env.DATABASE_URL!)

export const db = drizzle(sql, { schema })

// Call this at the top of every Server Action / API route before querying.
// Sets the RLS context so policies can check current_setting('app.current_user_id').
export async function withRLS(userId: string) {
  await sql`SELECT set_config('app.current_user_id', ${userId}, true)`
}
