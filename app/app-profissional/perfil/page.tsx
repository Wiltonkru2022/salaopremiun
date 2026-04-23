import Link from "next/link";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { runAdminOperation } from "@/lib/supabase/admin-ops";
import { sairProfissionalAction } from "./actions";

type ProfissionalPerfilRow = {
  id: string;
  nome?: string | null;
  nome_social?: string | null;
  nome_exibicao?: string | null;
  categoria?: string | null;
  cargo?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  cpf?: string | null;
  foto_url?: string | null;
  bio?: string | null;
  pix_tipo?: string | null;
  pix_chave?: string | null;
};

function formatCpf(value: string | null | undefined) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length !== 11) return value || "Nao informado";

  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function getInitials(nome: string | null | undefined) {
  const partes = String(nome || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!partes.length) return "SP";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();

  return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
}

async function carregarPerfil(params: {
  idSalao: string;
  idProfissional: string;
}) {
  return runAdminOperation({
    action: "profissional_perfil_carregar",
    actorId: params.idProfissional,
    idSalao: params.idSalao,
    run: async (supabase) => {
      const { data, error } = await supabase
        .from("profissionais")
        .select(
          "id, nome, nome_social, nome_exibicao, categoria, cargo, telefone, whatsapp, email, cpf, foto_url, bio, pix_tipo, pix_chave"
        )
        .eq("id", params.idProfissional)
        .eq("id_salao", params.idSalao)
        .maybeSingle();

      if (error) {
        throw new Error(error.message || "Erro ao carregar perfil.");
      }

      return (data ?? null) as ProfissionalPerfilRow | null;
    },
  });
}

function getPerfilNotice(params: {
  google?: string | string[];
  erro?: string | string[];
}) {
  const googleStatus = Array.isArray(params.google)
    ? params.google[0]
    : params.google;
  const erro = Array.isArray(params.erro) ? params.erro[0] : params.erro;

  if (googleStatus === "conectado") {
    return {
      type: "success" as const,
      message: "Conta Google conectada com sucesso.",
    };
  }

  if (erro) {
    return {
      type: "error" as const,
      message: erro,
    };
  }

  return null;
}

export default async function PerfilProfissionalPage({
  searchParams,
}: {
  searchParams: Promise<{
    google?: string | string[];
    erro?: string | string[];
  }>;
}) {
  const session = await requireProfissionalAppContext();
  const params = await searchParams;

  let profissional: ProfissionalPerfilRow | null = null;

  try {
    profissional = await carregarPerfil({
      idSalao: session.idSalao,
      idProfissional: session.idProfissional,
    });
  } catch {
    profissional = null;
  }

  if (!profissional) {
    return (
      <ProfissionalShell title="Meu Perfil" subtitle="Dados do profissional">
        <div className="rounded-[1.25rem] border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          Nao foi possivel carregar os dados do profissional.
        </div>
      </ProfissionalShell>
    );
  }

  const nomeExibido =
    profissional.nome_exibicao ||
    profissional.nome_social ||
    profissional.nome ||
    "Profissional";
  const categoria =
    profissional.categoria || profissional.cargo || "Profissional";
  const notice = getPerfilNotice(params);

  return (
    <ProfissionalShell title="Meu Perfil" subtitle="Dados do profissional">
      <div className="space-y-4">
        {notice ? (
          <div
            className={
              notice.type === "success"
                ? "rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 shadow-sm"
                : "rounded-[1.25rem] border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm"
            }
          >
            {notice.message}
          </div>
        ) : null}

        <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-4">
            {profissional.foto_url ? (
              <img
                src={profissional.foto_url}
                alt={nomeExibido}
                className="h-16 w-16 rounded-full border border-zinc-200 object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-lg font-semibold text-zinc-700">
                {getInitials(nomeExibido)}
              </div>
            )}

            <div className="min-w-0">
              <div className="truncate text-lg font-semibold text-zinc-950">
                {nomeExibido}
              </div>
              <div className="mt-1 text-sm text-[#b07b19]">{categoria}</div>
            </div>
          </div>

          {profissional.bio ? (
            <div className="mt-4 rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
              {profissional.bio}
            </div>
          ) : null}
        </div>

        <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Informacoes
          </div>

          <div className="space-y-3">
            {[
              ["Telefone", profissional.telefone || "Nao informado"],
              ["WhatsApp", profissional.whatsapp || "Nao informado"],
              ["E-mail", profissional.email || "Nao informado"],
              ["CPF", formatCpf(profissional.cpf)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3"
              >
                <div className="text-xs uppercase tracking-[0.16em] text-zinc-400">
                  {label}
                </div>
                <div className="mt-1 break-all text-sm font-medium text-zinc-900">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Recebimento
          </div>

          <div className="space-y-3">
            {[
              ["Tipo de chave Pix", profissional.pix_tipo || "Nao informado"],
              ["Chave Pix", profissional.pix_chave || "Nao informado"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3"
              >
                <div className="text-xs uppercase tracking-[0.16em] text-zinc-400">
                  {label}
                </div>
                <div className="mt-1 break-all text-sm font-medium text-zinc-900">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Link
          href="/app-profissional/suporte"
          className="flex h-12 w-full items-center justify-center rounded-2xl border border-[#d8b36b] bg-white text-sm font-semibold text-[#b07b19]"
        >
          Suporte
        </Link>

        <form action={sairProfissionalAction}>
          <button className="h-12 w-full rounded-2xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600">
            Sair da conta
          </button>
        </form>
      </div>
    </ProfissionalShell>
  );
}
