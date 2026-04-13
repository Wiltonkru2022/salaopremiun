"use server";

import { redirect } from "next/navigation";
import { clearProfissionalSession } from "@/lib/profissional-auth.server";

export async function sairProfissionalAction() {
  await clearProfissionalSession();
  redirect("/app-profissional/login");
}