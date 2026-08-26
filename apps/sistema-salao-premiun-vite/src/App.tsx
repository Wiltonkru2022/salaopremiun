import { useEffect } from "react";

const PAINEL_URL =
  (import.meta.env.VITE_PAINEL_URL as string | undefined)?.trim() ||
  "https://painel.salaopremiun.com.br/dashboard";

export default function App() {
  useEffect(() => {
    window.location.replace(PAINEL_URL);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 text-zinc-950">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-black">Abrindo SalãoPremium</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Este aplicativo agora usa o painel principal com autenticação Clerk e banco Neon.
        </p>
        <a
          href={PAINEL_URL}
          className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-bold text-white"
        >
          Abrir painel
        </a>
      </div>
    </main>
  );
}
