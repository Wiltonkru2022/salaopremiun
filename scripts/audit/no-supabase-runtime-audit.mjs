import { execFileSync } from "node:child_process";

const forbidden = ["@supabase/", "SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", ".supabase.co"];
const paths = ["app", "apps", "components", "core", "lib", "services", "scripts", ":(exclude)scripts/audit/no-supabase-runtime-audit.mjs"];
let failed = false;
for (const term of forbidden) {
  try {
    const out = execFileSync("git", ["grep", "-n", "-I", term, "--", ...paths], { encoding: "utf8" }).trim();
    if (out) { console.error(`Forbidden legacy backend reference: ${term}\n${out}`); failed = true; }
  } catch (error) {
    if (error?.status !== 1) throw error;
  }
}
if (failed) process.exit(1);
console.log("OK: runtime sem SDK, URL ou credenciais Supabase.");
