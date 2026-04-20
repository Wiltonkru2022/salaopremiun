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
const nextTypesDir = path.join(process.cwd(), ".next", "types");
const routesDeclaration = path.join(nextTypesDir, "routes.d.ts");
const routesRuntimeShim = path.join(nextTypesDir, "routes.js");

const origin = fs.existsSync(source) ? source : fallback;

if (fs.existsSync(origin) && !fs.existsSync(target)) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(origin, target);
}

if (fs.existsSync(routesDeclaration) && !fs.existsSync(routesRuntimeShim)) {
  fs.mkdirSync(nextTypesDir, { recursive: true });
  fs.writeFileSync(
    routesRuntimeShim,
    [
      "// Generated shim for Next.js type validation.",
      "// Keeps TypeScript happy when validator.ts imports ./routes.js",
      "export {};",
      "",
    ].join("\n")
  );
}
