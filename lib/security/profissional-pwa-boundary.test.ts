import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const PWA_ROOT = path.join(process.cwd(), "apps", "app-profissional-vite", "src");
const FORBIDDEN_RPC = /\.rpc\s*\(\s*["'`]app_profissional_/;
const FORBIDDEN_CREDIT_RPC = /\.rpc\s*\(\s*["'`]fn_cliente_registrar_credito_manual/;

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return /\.(ts|tsx|js|jsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

describe("fronteira de segurança do App Profissional", () => {
  it("não chama RPCs app_profissional_* diretamente do navegador", () => {
    const offenders = walk(PWA_ROOT).filter((file) => {
      const source = fs.readFileSync(file, "utf8");
      return FORBIDDEN_RPC.test(source) || FORBIDDEN_CREDIT_RPC.test(source);
    });

    expect(offenders).toEqual([]);
  });
});
