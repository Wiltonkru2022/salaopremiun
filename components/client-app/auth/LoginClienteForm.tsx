"use client";

import Link from "next/link";
import {
  FormEvent,
  useState,
} from "react";

function digits(value: string) {
  return value.replace(/\D/g, "");
}

function maskCpf(value: string) {
  const d = digits(value).slice(0, 11);

  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(
      /^(\d{3})\.(\d{3})(\d)/,
      "$1.$2.$3"
    )
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function maskDate(value: string) {
  const d = digits(value).slice(0, 8);

  if (d.length <= 2) return d;
  if (d.length <= 4) {
    return `${d.slice(0, 2)}/${d.slice(2)}`;
  }

  return `${d.slice(0, 2)}/${d.slice(
    2,
    4
  )}/${d.slice(4)}`;
}

type LoginResponse = {
  ok?: boolean;
  error?: string;
  next?: string;
  redirectTo?: string | null;
};

async function postJson(
  url: string,
  body: Record<string, unknown>
) {
  const response = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response
    .json()
    .catch(() => null)) as LoginResponse | null;

  return {
    response,
    payload,
  };
}

export default function LoginClienteForm({
  salaoId,
  salaoNome,
  oauthError,
  next,
}: {
  salaoId?: string | null;
  salaoNome?: string | null;
  oauthError?: string | null;
  next?: string | null;
}) {
  const [cpf, setCpf] = useState("");
  const [birth, setBirth] = useState("");
  const [error, setError] =
    useState<string | null>(null);
  const [legacyError, setLegacyError] =
    useState<string | null>(null);
  const [pending, setPending] =
    useState(false);
  const [legacyPending, setLegacyPending] =
    useState(false);

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (pending || legacyPending) return;

    setError(null);
    setPending(true);

    try {
      const { response, payload } =
        await postJson(
          "/api/app-cliente/auth/login",
          {
            cpf,
            dataNascimento: birth,
            salao: salaoId || null,
            next: next || null,
          }
        );

      if (
        !response.ok ||
        !payload?.ok
      ) {
        if (payload?.redirectTo) {
          window.location.assign(
            payload.redirectTo
          );
          return;
        }

        setError(
          payload?.error ||
            "Não foi possível entrar agora."
        );
        setPending(false);
        return;
      }

      /*
       * A própria resposta acima já trouxe Set-Cookie.
       * Fazemos navegação completa para a primeira página
       * autenticada já receber a sessão.
       */
      window.location.assign(
        payload.next ||
          next ||
          "/app-cliente/inicio"
      );
    } catch {
      setError(
        "Não foi possível entrar agora. Tente novamente."
      );
      setPending(false);
    }
  }

  async function handleLegacyLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (pending || legacyPending) return;

    const formData = new FormData(
      event.currentTarget
    );

    setLegacyError(null);
    setLegacyPending(true);

    try {
      const { response, payload } =
        await postJson(
          "/api/app-cliente/auth/login-legado",
          {
            identidade: String(
              formData.get("identidade") || ""
            ),
            senha: String(
              formData.get("senha") || ""
            ),
            salao: salaoId || null,
            next: next || null,
          }
        );

      if (
        !response.ok ||
        !payload?.ok
      ) {
        if (payload?.redirectTo) {
          window.location.assign(
            payload.redirectTo
          );
          return;
        }

        setLegacyError(
          payload?.error ||
            "Não foi possível entrar com o acesso antigo."
        );
        setLegacyPending(false);
        return;
      }

      window.location.assign(
        payload.next ||
          next ||
          "/app-cliente/inicio"
      );
    } catch {
      setLegacyError(
        "Não foi possível entrar com o acesso antigo."
      );
      setLegacyPending(false);
    }
  }

  const blocked =
    pending || legacyPending;

  return (
    <div className="space-y-3">
      <form
        onSubmit={handleLogin}
        className="overflow-hidden rounded-[1.55rem] border border-zinc-100 bg-white p-5 shadow-[0_16px_38px_rgba(15,23,42,0.07)]"
      >
        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-700">
          Acesso da cliente
        </div>

        <h2 className="mt-1 text-[1.5rem] font-black tracking-[-0.035em] text-zinc-950">
          Entre no App Cliente
        </h2>

        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Use seu CPF e sua data de
          nascimento. Não é necessário
          lembrar uma senha.
        </p>

        {salaoNome ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Depois do login, você volta
            para{" "}
            <strong>{salaoNome}</strong>.
          </div>
        ) : null}

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-bold text-zinc-700">
              CPF
            </label>

            <input
              name="cpf"
              value={cpf}
              onChange={(event) =>
                setCpf(
                  maskCpf(event.target.value)
                )
              }
              type="text"
              inputMode="numeric"
              autoComplete="username"
              placeholder="000.000.000-00"
              required
              maxLength={14}
              disabled={blocked}
              className="h-12 w-full rounded-xl border border-zinc-200 px-4 text-base outline-none focus:border-amber-400 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-zinc-700">
              Data de nascimento
            </label>

            <input
              name="dataNascimento"
              value={birth}
              onChange={(event) =>
                setBirth(
                  maskDate(
                    event.target.value
                  )
                )
              }
              type="text"
              inputMode="numeric"
              autoComplete="bday"
              placeholder="DD/MM/AAAA"
              required
              maxLength={10}
              disabled={blocked}
              className="h-12 w-full rounded-xl border border-zinc-200 px-4 text-base outline-none focus:border-amber-400 disabled:opacity-60"
            />
          </div>

          {oauthError ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {oauthError}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={blocked}
            className="h-12 w-full rounded-2xl bg-zinc-950 text-sm font-black text-white transition disabled:opacity-60"
          >
            {pending
              ? "Entrando..."
              : "Entrar"}
          </button>

          <div className="grid grid-cols-2 gap-2 text-center text-sm">
            <Link
              href="/app-cliente/recuperar-acesso"
              className="rounded-xl bg-zinc-50 px-3 py-3 font-bold text-zinc-700"
            >
              Problemas para acessar?
            </Link>

            <Link
              href={
                salaoId
                  ? `/app-cliente/cadastro?salao=${encodeURIComponent(
                      salaoId
                    )}${
                      next
                        ? `&next=${encodeURIComponent(
                            next
                          )}`
                        : ""
                    }`
                  : next
                    ? `/app-cliente/cadastro?next=${encodeURIComponent(
                        next
                      )}`
                    : "/app-cliente/cadastro"
              }
              className="rounded-xl bg-amber-50 px-3 py-3 font-bold text-amber-800"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </form>

      <details className="rounded-[1.35rem] border border-zinc-200 bg-zinc-50 p-4 text-zinc-700">
        <summary className="cursor-pointer text-sm font-black">
          Ainda uso o acesso antigo
        </summary>

        <p className="mt-2 text-xs leading-5 text-zinc-500">
          Use esta opção somente para
          entrar e completar CPF e data de
          nascimento.
        </p>

        <form
          onSubmit={handleLegacyLogin}
          className="mt-4 space-y-3"
        >
          <input
            name="identidade"
            type="text"
            placeholder="Telefone ou e-mail antigo"
            required
            disabled={blocked}
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none disabled:opacity-60"
          />

          <input
            name="senha"
            type="password"
            placeholder="Senha antiga"
            required
            disabled={blocked}
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none disabled:opacity-60"
          />

          {legacyError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {legacyError}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={blocked}
            className="h-12 w-full rounded-2xl bg-zinc-950 text-sm font-black text-white transition disabled:opacity-60"
          >
            {legacyPending
              ? "Entrando..."
              : "Entrar com acesso antigo"}
          </button>
        </form>
      </details>
    </div>
  );
}
