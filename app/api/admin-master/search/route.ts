import { NextRequest, NextResponse } from "next/server";
import {
  AdminMasterSearchUseCaseError,
  buscarAdminMasterUseCase,
} from "@/core/use-cases/admin-master/search";
import { createAdminMasterSearchService } from "@/services/adminMasterSearchService";

export async function GET(req: NextRequest) {
  try {
    const result = await buscarAdminMasterUseCase({
      rawQuery: req.nextUrl.searchParams.get("q") || "",
      service: createAdminMasterSearchService(),
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof AdminMasterSearchUseCaseError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status }
      );
    }

    const message =
      error instanceof Error ? error.message : "Erro ao buscar no AdminMaster.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
