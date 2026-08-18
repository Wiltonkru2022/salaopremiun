import { spawn } from "node:child_process";
import process from "node:process";

function mergeNodeOptions(...parts) {
  return parts
    .flatMap((part) => String(part || "").trim().split(/\s+/))
    .filter(Boolean)
    .join(" ");
}

function run(command, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: "inherit",
      shell: false,
      env: {
        ...process.env,
        ...extraEnv,
      },
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `Command failed: ${command} ${args.join(" ")} (${signal || code || "unknown"})`
        )
      );
    });
  });
}

const nodeBin = process.execPath;
const npmBin = process.platform === "win32" ? "npm.cmd" : "npm";
const nextBin = "./node_modules/next/dist/bin/next";
const typecheckScript = "./scripts/run-typecheck.mjs";
const professionalAppDir = "apps/app-profissional-vite";

// O app profissional e um Vite/PWA independente servido a partir de
// public/app-profissional. Sempre gere esse bundle antes do Next build para
// impedir que a Vercel publique fontes novos com assets antigos ja commitados.
if (process.env.SKIP_PROFESSIONAL_BUILD !== "1") {
  await run(npmBin, [
    "ci",
    "--prefix",
    professionalAppDir,
    "--include=dev",
    "--no-audit",
    "--no-fund",
  ]);
  await run(npmBin, ["--prefix", professionalAppDir, "run", "build"]);
}

if (process.env.SKIP_PREBUILD_TYPECHECK !== "1") {
  await run(nodeBin, [typecheckScript], {
    NODE_OPTIONS: mergeNodeOptions(
      process.env.NODE_OPTIONS,
      "--max-old-space-size=6144"
    ),
  });
}

await run(nodeBin, [nextBin, "build"], {
  NODE_OPTIONS: mergeNodeOptions(
    process.env.NODE_OPTIONS,
    "--max-old-space-size=12288",
    "--max-semi-space-size=512"
  ),
});
