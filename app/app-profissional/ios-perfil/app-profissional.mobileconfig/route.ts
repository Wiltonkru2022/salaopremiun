import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { DOMINIO_APP } from "@/lib/proxy/domain-config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function getIconData() {
  try {
    const icon = await readFile(
      join(process.cwd(), "public", "favicon-preview.png")
    );
    return icon.toString("base64").replace(/(.{1,68})/g, "$1\n").trim();
  } catch {
    return "";
  }
}

export async function GET() {
  const profileUuid = randomUUID().toUpperCase();
  const webClipUuid = randomUUID().toUpperCase();
  const appUrl = `https://${DOMINIO_APP}/app-profissional/inicio?origem=ios-perfil`;
  const iconData = await getIconData();
  const iconBlock = iconData
    ? `
      <key>Icon</key>
      <data>
${iconData}
      </data>`
    : "";

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>FullScreen</key>
      <true/>
      <key>IgnoreManifestScope</key>
      <false/>
      <key>IsRemovable</key>
      <true/>
      <key>Label</key>
      <string>App Profissional</string>
      <key>Precomposed</key>
      <true/>
      <key>URL</key>
      <string>${escapeXml(appUrl)}</string>${iconBlock}
      <key>PayloadDescription</key>
      <string>Atalho para o App Profissional SalãoPremium.</string>
      <key>PayloadDisplayName</key>
      <string>App Profissional</string>
      <key>PayloadIdentifier</key>
      <string>br.com.salaopremiun.profissional.webclip</string>
      <key>PayloadOrganization</key>
      <string>SalãoPremium</string>
      <key>PayloadType</key>
      <string>com.apple.webClip.managed</string>
      <key>PayloadUUID</key>
      <string>${webClipUuid}</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
    </dict>
  </array>
  <key>PayloadDescription</key>
  <string>Instala o App Profissional SalãoPremium como Web Clip no iPhone.</string>
  <key>PayloadDisplayName</key>
  <string>App Profissional</string>
  <key>PayloadIdentifier</key>
  <string>br.com.salaopremiun.profissional</string>
  <key>PayloadOrganization</key>
  <string>SalãoPremium</string>
  <key>PayloadRemovalDisallowed</key>
  <false/>
  <key>PayloadType</key>
  <string>Configuration</string>
  <key>PayloadUUID</key>
  <string>${profileUuid}</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
</dict>
</plist>
`;

  return new NextResponse(body, {
    headers: {
      "Content-Disposition":
        'attachment; filename="app-profissional.mobileconfig"',
      "Content-Type": "application/x-apple-aspen-config; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
