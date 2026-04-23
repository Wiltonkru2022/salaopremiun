import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const backupDir = path.join(root, "backups");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const output = path.join(backupDir, `salaopremium-${stamp}.bundle`);

fs.mkdirSync(backupDir, { recursive: true });

execFileSync("git", ["bundle", "create", output, "--all"], {
  cwd: root,
  stdio: "inherit",
});

console.log(`Backup Git criado em: ${output}`);
