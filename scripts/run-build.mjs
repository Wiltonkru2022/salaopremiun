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
const npmExecPath = String(process.env.npm_execpath || "").trim();
const nextBin = "./node_modules/next/dist/bin/next";
const typecheckScript = "./scripts/run-typecheck.mjs";
const prepareClientHeroScript = "./scripts/prepare-client-hero-video.mjs";
const professionalAppDir = "apps/app-profissional-vite";

async function runNpm(args) {
  // Quando este script e iniciado por `npm run`, o npm disponibiliza o caminho
  // do seu CLI em npm_execpath. Executa-lo pelo mesmo Node evita o `spawn EINVAL`
  // de arquivos .cmd no Windows sem habilitar shell:true.
  if (npmExecPath) {
    await run(nodeBin, [npmExecPath, ...args]);
    return;
  }

  if (process.platform === "win32") {
    await run(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", "npm", ...args]);
    return;
  }

  await run("npm", args);
}

// Reconstrua o vídeo estático do hero antes do Next build. O arquivo final fica
// em public/ e é servido diretamente pelo app cliente.
await run(nodeBin, [prepareClientHeroScript]);

// O app profissional e um Vite/PWA independente servido a partir de
// public/app-profissional. Dados e autenticacao passam pelas APIs do produto;
// o bundle nao recebe credenciais de banco.
if (process.env.SKIP_PROFESSIONAL_BUILD !== "1") {
  await runNpm([
    "ci",
    "--prefix",
    professionalAppDir,
    "--include=dev",
    "--no-audit",
    "--no-fund",
  ]);
  await runNpm(["--prefix", professionalAppDir, "run", "build"]);
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
