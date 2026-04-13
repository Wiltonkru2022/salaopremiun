import Link from "next/link";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import { createClient } from "@/lib/supabase/server";
import { getProfissionalSessionFromCookie } from "@/lib/profissional-auth.server";
import { redirect } from "next/navigation";
import { sairProfissionalAction } from "./actions";

function formatCpf(value: string | null | undefined) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length !== 11) return value || "Não informado";

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

  if (partes.length === 1) {
    return partes[0].slice(0, 2).toUpperCase();
  }

  return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
}

export default async function PerfilProfissionalPage() {
  const session = await getProfissionalSessionFromCookie();

  if (!session) {
    redirect("/app-profissional/login");
  }

  const supabase = await createClient();

  const { data: profissional, error } = await supabase
    .from("profissionais")
    .select(`
      id,
      nome,
      nome_social,
      nome_exibicao,
      categoria,
      cargo,
      telefone,
      whatsapp,
      email,
      cpf,
      foto_url,
      bio,
      pix_tipo,
      pix_chave
    `)
    .eq("id", session.idProfissional)
    .eq("id_salao", session.idSalao)
    .maybeSingle();

  if (error || !profissional) {
    return (
      <ProfissionalShell title="Meu Perfil" subtitle="Dados do profissional">
        <div className="rounded-[1.25rem] border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          Não foi possível carregar os dados do profissional.
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

  return (
    <ProfissionalShell
      title="Meu Perfil"
      subtitle="Dados do profissional"
    >
      <div className="space-y-4">
        <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-4">
            {profissional.foto_url ? (
              <img
                src={profissional.foto_url}
                alt={nomeExibido}
                className="h-16 w-16 rounded-full object-cover border border-zinc-200"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 text-lg font-semibold text-zinc-700 border border-zinc-200">
                {getInitials(nomeExibido)}
              </div>
            )}

            <div className="min-w-0">
              <div className="truncate text-lg font-semibold text-zinc-950">
                {nomeExibido}
              </div>
              <div className="mt-1 text-sm text-[#b07b19]">
                {categoria}
              </div>
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
            Informações
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-zinc-400">
                Telefone
              </div>
              <div className="mt-1 text-sm font-medium text-zinc-900">
                {profissional.telefone || "Não informado"}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-zinc-400">
                WhatsApp
              </div>
              <div className="mt-1 text-sm font-medium text-zinc-900">
                {profissional.whatsapp || "Não informado"}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-zinc-400">
                E-mail
              </div>
              <div className="mt-1 break-all text-sm font-medium text-zinc-900">
                {profissional.email || "Não informado"}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-zinc-400">
                CPF
              </div>
              <div className="mt-1 text-sm font-medium text-zinc-900">
                {formatCpf(profissional.cpf)}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Recebimento
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-zinc-400">
                Tipo de chave Pix
              </div>
              <div className="mt-1 text-sm font-medium text-zinc-900">
                {profissional.pix_tipo || "Não informado"}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-zinc-400">
                Chave Pix
              </div>
              <div className="mt-1 break-all text-sm font-medium text-zinc-900">
                {profissional.pix_chave || "Não informado"}
              </div>
            </div>
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