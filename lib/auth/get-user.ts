import { createClient } from "@/lib/db/server";

export async function getUser() {
  const database = await createClient();
  const {
    data: { user },
  } = await database.auth.getUser();

  return user;
}
