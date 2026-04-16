import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const source = path.join(process.cwd(), ".next", "dev", "types", "cache-life.d.ts");
const target = path.join(process.cwd(), ".next", "types", "cache-life.d.ts");

if (fs.existsSync(source) && !fs.existsSync(target)) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}
