import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const databaseUrl = String(
  process.env.NEON_ADMIN_DATABASE_URL || process.env.NEON_DATABASE_URL || ""
).trim();
if (!databaseUrl) {
  throw new Error("NEON_ADMIN_DATABASE_URL ou NEON_DATABASE_URL nao configurada.");
}

const root = process.cwd();
const backupDir = path.join(root, "backups", "database");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const output = path.join(backupDir, `salaopremium-neon-schema-${stamp}.sql`);
fs.mkdirSync(backupDir, { recursive: true });

try {
  execFileSync(
    "pg_dump",
    ["--schema-only", "--schema=public", "--no-owner", "--no-privileges", "--file", output, databaseUrl],
    { cwd: root, stdio: "inherit" }
  );
} catch (error) {
  if (fs.existsSync(output) && fs.statSync(output).size === 0) fs.unlinkSync(output);
  console.error("Nao foi possivel criar o dump do schema Neon. Instale pg_dump e confira a URL do banco.");
  throw error;
}

console.log(`Backup do schema Neon criado em: ${output}`);
