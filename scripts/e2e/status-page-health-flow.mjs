import process from "node:process";

const baseUrl = String(process.env.E2E_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
if (!baseUrl) {
  console.error("E2E_BASE_URL ou NEXT_PUBLIC_SITE_URL é obrigatório para e2e:status.");
  process.exit(1);
}

async function get(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: "manual",
    headers: { "User-Agent": "SalaoPremium-Status-E2E/1.0" },
  });
  const text = await response.text();
  return { response, text };
}

const api = await get("/api/status");
if (![200, 503].includes(api.response.status)) {
  throw new Error(`/api/status retornou HTTP ${api.response.status}`);
}
const payload = JSON.parse(api.text);
if (!payload?.overall?.state) throw new Error("/api/status sem estado geral.");

const status = await get("/status");
if (status.response.status !== 200) throw new Error(`/status retornou HTTP ${status.response.status}`);
if (payload.overall.state !== "operational" && status.text.includes("Todos os sistemas estão operacionais")) {
  throw new Error("Status page declarou operacional sem evidência agregada.");
}
if (payload.overall.state === "unknown" && !status.text.includes("Estado desconhecido")) {
  throw new Error("Estado unknown não foi refletido na interface pública.");
}

const history = await get("/status/history");
if (history.response.status !== 200) throw new Error(`/status/history retornou HTTP ${history.response.status}`);
if (/NEON_DATABASE_URL|CLERK_SECRET_KEY|CLOUDINARY_API_SECRET|PROFISSIONAL_SESSION_SECRET|select \*|stack_resumida|authorization/i.test(history.text)) {
  throw new Error("Histórico público contém possível detalhe interno sensível.");
}

console.log(`PASS status page: state=${payload.overall.state} api=${api.response.status}`);
