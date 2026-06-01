import { NextResponse } from "next/server";
import {
  listNearbyClientAppSaloes,
  listVisibleClientAppSaloes,
} from "@/lib/client-app/queries";
import {
  mobileJson,
  mobileOptions,
  requireMobileClientAccess,
} from "../_cors";

export const OPTIONS = mobileOptions;

function parseCoordinate(value: string | null) {
  const numeric = Number(String(value || "").replace(",", "."));
  return Number.isFinite(numeric) ? numeric : null;
}

export async function GET(request: Request) {
  const denied = requireMobileClientAccess(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const search = String(url.searchParams.get("busca") || "").trim();
  const latitude = parseCoordinate(url.searchParams.get("lat"));
  const longitude = parseCoordinate(url.searchParams.get("lon"));

  const saloes =
    latitude !== null && longitude !== null
      ? await listNearbyClientAppSaloes({
          latitude,
          longitude,
          search,
          radiusKm: 60,
          limit: 24,
        })
      : await listVisibleClientAppSaloes({ search, limit: 24 });

  return mobileJson({ ok: true, saloes });
}
