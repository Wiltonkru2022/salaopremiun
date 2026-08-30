import { NextResponse } from "next/server";
import { getDatabaseAdmin } from "@/lib/db/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Not available" },
      { status: 404 }
    );
  }

  const db = getDatabaseAdmin();

  const result = await db
    .from("clientes_app_auth")
    .select(
      "id, cpf, data_nascimento, auth_version, ativo"
    )
    .eq("cpf", "06308175102")
    .limit(2);

  return NextResponse.json({
    error: result.error,
    rows: result.data,
  });
}