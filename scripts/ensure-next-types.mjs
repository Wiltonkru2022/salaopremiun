import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const source = path.join(process.cwd(), ".next", "dev", "types", "cache-life.d.ts");
const fallback = path.join(
  process.cwd(),
  "node_modules",
  "next",
  "dist",
  "server",
  "use-cache",
  "cache-life.d.ts"
);
const target = path.join(process.cwd(), ".next", "types", "cache-life.d.ts");

const origin = fs.existsSync(source) ? source : fallback;

if (fs.existsSync(origin) && !fs.existsSync(target)) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(origin, target);
}
