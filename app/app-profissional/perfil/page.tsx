import Link from "next/link";
import {
  Bell,
  ChevronRight,
  FileText,
  HelpCircle,
  Info,
  KeyRound,
  LogOut,
  MessageCircle,
  Settings,
  ShieldCheck,
  Star,
  UserRound,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import AppVersionBadge from "@/components/app-mobile/AppVersionBadge";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import ProfissionalNotificationSettings from "@/components/profissional/ProfissionalNotificationSettings";
import { runAdminOperation } from "@/lib/supabase/admin-ops";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
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
  notificacoes_ativas?: boolean | null;
  notificacao_app_ativa?: boolean | null;
  notificacao_email_ativa?: boolean | null;
};

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
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();

  return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
}

function ProfileRow({
  href,
  label,
  icon: Icon,
  muted,
  prefetch,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  muted?: boolean;
  prefetch?: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={`flex min-h-16 items-center justify-between border-b border-zinc-100 px-1 text-lg ${
        muted ? "text-zinc-400" : "text-zinc-950"
      }`}
    >
      <span className="inline-flex min-w-0 items-center gap-3">
        <Icon size={22} className="shrink-0 text-zinc-400" />
        <span className="truncate">{label}</span>
      </span>
      <ChevronRight size={26} className="shrink-0 text-zinc-300" />
    </Link>
  );
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
      const select =
        "id, nome, nome_social, nome_exibicao, categoria, cargo, telefone, whatsapp, email, cpf, foto_url, bio, pix_tipo, pix_chave, notificacoes_ativas, notificacao_app_ativa, notificacao_email_ativa";
      const { data, error } = await supabase
        .from("profissionais")
        .select(select)
        .eq("id", params.idProfissional)
        .eq("id_salao", params.idSalao)
        .maybeSingle();

      if (error) {
        const message = String(error.message || "");
        if (
          message.includes("notificacoes_ativas") ||
          message.includes("notificacao_app_ativa") ||
          message.includes("notificacao_email_ativa")
        ) {
          const fallback = await supabase
            .from("profissionais")
            .select(
              "id, nome, nome_social, nome_exibicao, categoria, cargo, telefone, whatsapp, email, cpf, foto_url, bio, pix_tipo, pix_chave"
            )
            .eq("id", params.idProfissional)
            .eq("id_salao", params.idSalao)
            .maybeSingle();

          if (fallback.error) {
            throw new Error(fallback.error.message || "Erro ao carregar perfil.");
          }

          return (fallback.data ?? null) as ProfissionalPerfilRow | null;
        }

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
      <ProfissionalShell title="Perfil" subtitle="Sua conta profissional.">
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
  const notice = getPerfilNotice(params);
  const notificationSettings = {
    notificacoes_ativas: profissional.notificacoes_ativas !== false,
    notificacao_app_ativa: profissional.notificacao_app_ativa !== false,
    notificacao_email_ativa: profissional.notificacao_email_ativa !== false,
  };
  return (
    <ProfissionalShell title="Perfil" subtitle="Sua conta no Salão Premium.">
      <section className="mx-auto max-w-3xl py-2">
        <div className="flex items-center gap-5 py-6">
          {profissional.foto_url ? (
            <img
              src={profissional.foto_url}
              alt={nomeExibido}
              className="h-24 w-24 shrink-0 rounded-full border-4 border-zinc-900 object-cover"
            />
          ) : (
            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-zinc-900 bg-zinc-100 text-3xl font-black text-zinc-900">
              {getInitials(nomeExibido)}
              <span className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full border-4 border-white bg-zinc-100 text-zinc-700">
                <UserRound size={20} />
              </span>
            </div>
          )}

          <div className="min-w-0">
            <h1 className="break-words text-3xl font-black tracking-[-0.04em] text-zinc-800">
              {nomeExibido}
            </h1>
            <p className="mt-2 text-lg text-zinc-500">
              {profissional.telefone || profissional.email || categoria}
            </p>
          </div>
        </div>

        {notice ? (
          <div
            className={
              notice.type === "success"
                ? "mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
                : "mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
            }
          >
            {notice.message}
          </div>
        ) : null}

        {profissional.bio ? (
          <div className="mb-5 rounded-2xl bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">
            {profissional.bio}
          </div>
        ) : null}

        <div className="rounded-[1.5rem] bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <ProfileRow
            href="/app-profissional/perfil/detalhes"
            label="Detalhes da conta"
            icon={UserRound}
          />
          <ProfileRow
            href="/app-profissional/avaliacoes"
            label="Avaliações recebidas"
            icon={Star}
          />
          <ProfileRow
            href="/app-profissional/notificacoes"
            label="Notificações"
            icon={Bell}
          />
          <ProfileRow
            href="/app-profissional/perfil/configuracoes"
            label="Configurações"
            icon={Settings}
          />
          <ProfileRow
            href="/app-profissional/recuperar-senha"
            label="Alterar senha"
            icon={KeyRound}
          />
          <ProfileRow
            href="/app-profissional/suporte"
            label="Comentários e suporte"
            icon={HelpCircle}
          />
          <ProfileRow
            href="/app-profissional/duvidas"
            label="Dúvidas do app"
            icon={Info}
          />
          <ProfileRow
            href="/app-profissional/termos"
            label="Termos de uso"
            icon={FileText}
          />
          <ProfileRow
            href="/app-profissional/privacidade"
            label="Privacidade"
            icon={ShieldCheck}
          />
        </div>

        <div
          id="dados"
          className="hidden"
        >
          <div className="mb-3 bg-zinc-50 px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">
            Dados profissionais
          </div>
          {[
            ["Telefone", profissional.telefone || "Não informado"],
            ["WhatsApp", profissional.whatsapp || "Não informado"],
            ["E-mail", profissional.email || "Não informado"],
            ["CPF", formatCpf(profissional.cpf)],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex min-h-16 flex-col justify-center border-b border-zinc-100 px-1"
            >
              <span className="text-sm text-zinc-500">{label}</span>
              <span className="break-all text-lg text-zinc-950">{value}</span>
            </div>
          ))}

          <div className="mb-3 mt-6 bg-zinc-50 px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">
            Recebimento
          </div>
          {[
            ["Tipo de chave Pix", profissional.pix_tipo || "Não informado"],
            ["Chave Pix", profissional.pix_chave || "Não informado"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex min-h-16 flex-col justify-center border-b border-zinc-100 px-1"
            >
              <span className="text-sm text-zinc-500">{label}</span>
              <span className="break-all text-lg text-zinc-950">{value}</span>
            </div>
          ))}
        </div>

        <div className="hidden">
          <ProfissionalNotificationSettings
            initialSettings={notificationSettings}
          />
        </div>

        <div className="mt-5 rounded-[1.5rem] bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <Link
            href="/app-profissional/comissao"
            className="flex min-h-16 items-center justify-between border-b border-zinc-100 px-1 text-lg text-zinc-950"
          >
            <span className="inline-flex items-center gap-3">
              <WalletCards size={22} className="text-zinc-400" />
              Comissões e repasses
            </span>
            <ChevronRight size={26} className="text-zinc-300" />
          </Link>
          <form action={sairProfissionalAction}>
            <button className="flex min-h-16 w-full items-center justify-between px-1 text-left text-lg text-zinc-400">
              <span className="inline-flex items-center gap-3">
                <LogOut size={22} className="text-zinc-300" />
                Sair
              </span>
              <ChevronRight size={26} className="text-zinc-300" />
            </button>
          </form>
        </div>

        <div className="mt-5 rounded-2xl bg-zinc-50 p-4 text-sm leading-6 text-zinc-500">
          <div className="flex items-center gap-2 font-bold text-zinc-800">
            <MessageCircle size={18} />
            Precisa alterar dados?
          </div>
          <p className="mt-1">
            Fale com o salão para atualizar informações profissionais, Pix ou
            foto de perfil.
          </p>
        </div>

        <div className="mt-5">
          <AppVersionBadge label="App Profissional" />
        </div>
      </section>
    </ProfissionalShell>
  );
}
