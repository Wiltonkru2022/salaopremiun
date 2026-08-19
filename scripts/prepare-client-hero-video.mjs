import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const sourceDir = path.join(root, "scripts", "assets", "app-cliente-hero");
const outputPath = path.join(root, "public", "app-cliente-hero-video.mp4");

const partNames = [
  "part-01.txt",
  "part-02.txt",
  "part-03.txt",
  "part-04.txt",
  "part-05a.txt",
  "part-05b.txt",
  "part-06.txt",
  "part-07.txt",
  "part-08a.txt",
  "part-08b.txt",
];

const parts = await Promise.all(
  partNames.map(async (partName) =>
    (await readFile(path.join(sourceDir, partName), "utf8")).trim()
  )
);

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, Buffer.from(parts.join(""), "base64"));

console.log(`Hero do App Cliente preparado em ${outputPath}`);
