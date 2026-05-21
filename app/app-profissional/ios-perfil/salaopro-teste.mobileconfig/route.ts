import { NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest) {
  return NextResponse.redirect(
    new URL(
      "/app-profissional/ios-perfil/app-profissional.mobileconfig",
      request.url
    )
  );
}
