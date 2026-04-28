import { spawn } from "node:child_process";
import process from "node:process";

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
const tscBin = "./node_modules/typescript/lib/tsc.js";
const heapEnv = { NODE_OPTIONS: "--max-old-space-size=4096" };

await run(nodeBin, [nextBin, "typegen"], heapEnv);
await run(nodeBin, ["scripts/ensure-next-types.mjs"]);
await run(
  nodeBin,
  [tscBin, "-p", "tsconfig.typecheck.json", "--noEmit", "--incremental", "false"],
  heapEnv
);
