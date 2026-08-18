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
const uiAuditScript = "./scripts/audit/ui-quality-audit.mjs";
const professionalAppDir = "apps/app-profissional-vite";

const supabasePublicKey = String(
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
).trim();

// O Next e o Vite podem compartilhar a publishable key do Supabase. Mantemos
// VITE_SUPABASE_ANON_KEY como alias durante a migracao para nao quebrar bundles
// antigos, mas o valor preferido e VITE_SUPABASE_PUBLISHABLE_KEY.
const professionalAppEnv = {
  VITE_SUPABASE_URL: String(
    process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  ).trim(),
  VITE_SUPABASE_PUBLISHABLE_KEY: supabasePublicKey,
  VITE_SUPABASE_ANON_KEY: supabasePublicKey,
};

// Corrige somente textos que chegam a interface e depois valida as tres
// superficies oficiais. Identificadores, rotas, tabelas e colunas nao sao
// alterados pelo corretor AST.
if (process.env.SKIP_UI_AUDIT !== "1") {
  await run(nodeBin, [uiAuditScript, "--fix"]);
  await run(nodeBin, [uiAuditScript]);
}

// O app profissional e um Vite/PWA independente servido a partir de
// public/app-profissional. Sempre gere esse bundle antes do Next build para
// impedir que a Vercel publique fontes novos com assets antigos ja commitados.
if (process.env.SKIP_PROFESSIONAL_BUILD !== "1") {
  if (!professionalAppEnv.VITE_SUPABASE_URL || !supabasePublicKey) {
    throw new Error(
      "Build do app profissional exige NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ou os aliases VITE_SUPABASE_* / *_ANON_KEY)."
    );
  }

  await run(npmBin, [
    "ci",
    "--prefix",
    professionalAppDir,
    "--include=dev",
    "--no-audit",
    "--no-fund",
  ]);
  await run(
    npmBin,
    ["--prefix", professionalAppDir, "run", "build"],
    professionalAppEnv
  );
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
