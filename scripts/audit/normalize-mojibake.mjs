import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const roots = ["app", "components", "lib", "core", "services", "types", "docs", "scripts"];
const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".md", ".css", ".json"]);

const replacements = [
  ["\u00c3\u00a1", "\u00e1"],
  ["\u00c3\u00a0", "\u00e0"],
  ["\u00c3\u00a2", "\u00e2"],
  ["\u00c3\u00a3", "\u00e3"],
  ["\u00c3\u00a4", "\u00e4"],
  ["\u00c3\u00a9", "\u00e9"],
  ["\u00c3\u00a8", "\u00e8"],
  ["\u00c3\u00aa", "\u00ea"],
  ["\u00c3\u00ab", "\u00eb"],
  ["\u00c3\u00ad", "\u00ed"],
  ["\u00c3\u00ac", "\u00ec"],
  ["\u00c3\u00ae", "\u00ee"],
  ["\u00c3\u00af", "\u00ef"],
  ["\u00c3\u00b3", "\u00f3"],
  ["\u00c3\u00b2", "\u00f2"],
  ["\u00c3\u00b4", "\u00f4"],
  ["\u00c3\u00b5", "\u00f5"],
  ["\u00c3\u00b6", "\u00f6"],
  ["\u00c3\u00ba", "\u00fa"],
  ["\u00c3\u00b9", "\u00f9"],
  ["\u00c3\u00bb", "\u00fb"],
  ["\u00c3\u00bc", "\u00fc"],
  ["\u00c3\u00a7", "\u00e7"],
  ["\u00c3\u0081", "\u00c1"],
  ["\u00c3\u0080", "\u00c0"],
  ["\u00c3\u0082", "\u00c2"],
  ["\u00c3\u0083", "\u00c3"],
  ["\u00c3\u0089", "\u00c9"],
  ["\u00c3\u008a", "\u00ca"],
  ["\u00c3\u008d", "\u00cd"],
  ["\u00c3\u0093", "\u00d3"],
  ["\u00c3\u0095", "\u00d5"],
  ["\u00c3\u009a", "\u00da"],
  ["\u00c3\u0087", "\u00c7"],
  ["\u00e2\u20ac\u00a2", "\u2022"],
  ["\u00e2\u20ac\u201c", "-"],
  ["\u00e2\u20ac\u201d", "-"],
  ["\u00e2\u20ac\u0153", "\""],
  ["\u00e2\u20ac\u009d", "\""],
  ["\u00e2\u20ac\u02dc", "'"],
  ["\u00e2\u20ac\u2122", "'"],
  ["\u00c2\u00ba", "\u00ba"],
  ["\u00c2\u00aa", "\u00aa"],
  ["\u00c2\u00b7", "\u00b7"],
  ["\u00c2\u00a0", " "],
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") {
      return [];
    }
    if (entry.isDirectory()) return walk(full);
    return extensions.has(path.extname(entry.name)) ? [full] : [];
  });
}

let changed = 0;

for (const root of roots) {
  for (const file of walk(path.join(cwd, root))) {
    const source = fs.readFileSync(file, "utf8");
    let next = source;

    for (const [from, to] of replacements) {
      next = next.split(from).join(to);
    }

    if (next !== source) {
      fs.writeFileSync(file, next, "utf8");
      changed += 1;
    }
  }
}

console.log(JSON.stringify({ ok: true, changed }, null, 2));
