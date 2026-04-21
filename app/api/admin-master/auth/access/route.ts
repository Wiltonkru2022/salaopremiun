import { NextResponse } from "next/server";
import { obterAdminMasterAccessUseCase } from "@/core/use-cases/admin-master/auth";
import { createAdminMasterAuthService } from "@/services/adminMasterAuthService";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const result = await obterAdminMasterAccessUseCase({
    nextPath: requestUrl.searchParams.get("next"),
    service: createAdminMasterAuthService(),
  });

  return NextResponse.json(result.body, {
    status: result.status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
