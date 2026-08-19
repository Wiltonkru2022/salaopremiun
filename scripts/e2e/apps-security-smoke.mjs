const baseUrl = (process.env.E2E_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

const checks = [];

function check(name, ok, detail = "") {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "OK" : "FAIL"} ${name}${detail ? ` - ${detail}` : ""}`);
  if (!ok) process.exitCode = 1;
}

async function expectProtected(path, options) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: "manual",
    ...options,
  });
  check(
    `${path} exige sessao profissional`,
    !response.ok || response.status === 204,
    `status=${response.status}`
  );
}

async function run() {
  await expectProtected("/api/app-profissional/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "criar_cliente", nome: "Nao deve criar" }),
  });
  await expectProtected("/api/app-profissional/comandas", { method: "GET" });
  await expectProtected("/api/app-profissional/comissoes", { method: "GET" });
  await expectProtected("/api/app-profissional/avaliacoes", { method: "GET" });

  const logout = await fetch(
    `${baseUrl}/app-cliente/logout?destino=${encodeURIComponent("//evil.example/phishing")}`,
    { redirect: "manual" }
  );
  const location = logout.headers.get("location") || "";
  const resolved = location ? new URL(location, baseUrl) : null;
  check(
    "logout cliente bloqueia open redirect",
    Boolean(resolved && resolved.origin === new URL(baseUrl).origin),
    location
  );

  const professionalLogout = await fetch(
    `${baseUrl}/app-profissional/logout?destino=${encodeURIComponent("//evil.example/phishing")}`,
    { redirect: "manual" }
  );
  const professionalLocation = professionalLogout.headers.get("location") || "";
  const professionalResolved = professionalLocation
    ? new URL(professionalLocation, baseUrl)
    : null;
  check(
    "logout profissional bloqueia open redirect",
    Boolean(professionalResolved && professionalResolved.origin === new URL(baseUrl).origin),
    professionalLocation
  );

  if (checks.some((item) => !item.ok)) {
    throw new Error("Falha no smoke E2E de seguranca dos apps.");
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
