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
const nextBin = "./node_modules/next/dist/bin/next";
const typecheckScript = "./scripts/run-typecheck.mjs";

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
