import { NextResponse } from "next/server";
import { getClientAppSalonDetail } from "@/lib/client-app/queries";
import {
  mobileJson,
  mobileOptions,
  requireMobileClientAccess,
} from "../../_cors";

export const OPTIONS = mobileOptions;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const denied = requireMobileClientAccess(_request);
  if (denied) return denied;

  const { id } = await context.params;

  try {
    const salao = await getClientAppSalonDetail(id);
    return mobileJson({ ok: true, salao });
  } catch (error) {
    return mobileJson(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Salao indisponivel no app cliente agora.",
      },
      { status: 404 }
    );
  }
}
