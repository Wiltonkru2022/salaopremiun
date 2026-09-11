import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const backupDir = path.join(root, "backups", "database");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const output = path.join(backupDir, `salaopremium-schema-${stamp}.sql`);

fs.mkdirSync(backupDir, { recursive: true });

try {
  execFileSync(process.platform === "win32" ? "npx" : "npx", [
    "supabase",
    "db",
    "dump",
    "--linked",
    "--schema",
    "public",
    "--file",
    output,
  ], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
} catch (error) {
  if (fs.existsSync(output) && fs.statSync(output).size === 0) {
    fs.unlinkSync(output);
  }

  console.error(
    "Nao foi possivel criar o dump do schema. Verifique se Docker Desktop esta instalado/ativo ou rode o dump em um ambiente com Docker."
  );
  throw error;
}

console.log(`Backup do schema Supabase criado em: ${output}`);
