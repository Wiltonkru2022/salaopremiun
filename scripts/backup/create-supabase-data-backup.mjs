import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

if (process.env.ALLOW_DB_DATA_BACKUP !== "1") {
  console.error(
    "Backup de dados pode conter PII. Rode com ALLOW_DB_DATA_BACKUP=1 para confirmar."
  );
  process.exit(1);
}

const root = process.cwd();
const backupDir = path.join(root, "backups", "database");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const output = path.join(backupDir, `salaopremium-data-${stamp}.sql`);

fs.mkdirSync(backupDir, { recursive: true });

try {
  execFileSync(process.platform === "win32" ? "npx" : "npx", [
    "supabase",
    "db",
    "dump",
    "--linked",
    "--data-only",
    "--use-copy",
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
    "Nao foi possivel criar o dump de dados. Verifique se Docker Desktop esta instalado/ativo ou rode o dump em um ambiente com Docker."
  );
  throw error;
}

console.log(`Backup de dados Supabase criado em: ${output}`);
