"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  CircleAlert,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  PencilLine,
  Phone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import AppLoading from "@/components/ui/AppLoading";
import AppModal from "@/components/ui/AppModal";
import { Field, SectionCard, TextInput } from "@/components/configuracoes/ui";
import { EMPTY_SALAO } from "@/components/configuracoes/constants";
import type { SalaoForm } from "@/components/configuracoes/types";
import { getUsuarioLogado } from "@/lib/auth/getUsuarioLogado";
import { hasPermission } from "@/lib/auth/permissions";
import type { UserNivel } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/client";

type PasswordForm = {
  novaSenha: string;
  confirmarSenha: string;
  codigoTotp: string;
  backupCode: string;
};

type ModalKey = "comercial" | "endereco" | "senha" | "autenticador" | null;

type TotpFactor = {
  id: string;
  factor_type?: string;
  friendly_name?: string | null;
  status?: string;
};

type MfaSnapshot = {
  factorActive: boolean;
  currentLevel: "aal1" | "aal2" | null;
  backupCodesRemaining: number;
  backupCodesLockedUntil: string | null;
  backupCodesGeneratedAt: string | null;
  backupCodesLastUsedAt: string | null;
};

type TotpSetupState = {
  factorId: string;
  qrCode: string;
  secret: string;
};

const EMPTY_PASSWORD: PasswordForm = {
  novaSenha: "",
  confirmarSenha: "",
  codigoTotp: "",
  backupCode: "",
};

const EMPTY_MFA_SNAPSHOT: MfaSnapshot = {
  factorActive: false,
  currentLevel: null,
  backupCodesRemaining: 0,
  backupCodesLockedUntil: null,
  backupCodesGeneratedAt: null,
  backupCodesLastUsedAt: null,
};

function formatAddress(form: SalaoForm) {
  const linha1 = [form.endereco, form.numero].filter(Boolean).join(", ");
  const linha2 = [form.bairro, form.cidade, form.estado, form.cep]
    .filter(Boolean)
    .join(" | ");

  return [linha1, linha2].filter(Boolean);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Nao registrado";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Nao registrado";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function DisplayItem({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </div>
      <div
        className={`text-sm text-zinc-900 ${multiline ? "leading-6" : "break-words"}`}
      >
        {value}
      </div>
    </div>
  );
}

function SidebarAction({
  icon,
  title,
  description,
  onClick,
  tone = "default",
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  tone?: "default" | "security";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[22px] border p-4 text-left transition hover:-translate-y-0.5 ${
        tone === "security"
          ? "border-[rgba(199,162,92,0.35)] bg-[rgba(199,162,92,0.10)]"
          : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`rounded-2xl border p-2.5 ${
            tone === "security"
              ? "border-[rgba(199,162,92,0.35)] bg-white text-zinc-900"
              : "border-zinc-200 bg-white text-zinc-700"
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-zinc-950">{title}</div>
          <div className="mt-1 text-sm leading-5 text-zinc-600">
            {description}
          </div>
        </div>
      </div>
    </button>
  );
}

export default function PerfilSalaoPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [semPermissao, setSemPermissao] = useState(false);
  const [savingPerfil, setSavingPerfil] = useState(false);
  const [savingSenha, setSavingSenha] = useState(false);
  const [loadingMfa, setLoadingMfa] = useState(false);
  const [mfaBusy, setMfaBusy] = useState(false);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [idSalao, setIdSalao] = useState("");
  const [perfilForm, setPerfilForm] = useState<SalaoForm>(EMPTY_SALAO);
  const [comercialDraft, setComercialDraft] = useState<SalaoForm>(EMPTY_SALAO);
  const [enderecoDraft, setEnderecoDraft] = useState<SalaoForm>(EMPTY_SALAO);
  const [passwordForm, setPasswordForm] =
    useState<PasswordForm>(EMPTY_PASSWORD);
  const [activeModal, setActiveModal] = useState<ModalKey>(null);
  const [totpFactor, setTotpFactor] = useState<TotpFactor | null>(null);
  const [mfaSnapshot, setMfaSnapshot] = useState<MfaSnapshot>(EMPTY_MFA_SNAPSHOT);
  const [totpSetup, setTotpSetup] = useState<TotpSetupState | null>(null);
  const [setupCode, setSetupCode] = useState("");
  const [manageCode, setManageCode] = useState("");
  const [disableBackupCode, setDisableBackupCode] = useState("");
  const [revealedBackupCodes, setRevealedBackupCodes] = useState<string[]>([]);

  const linhasEndereco = useMemo(() => formatAddress(perfilForm), [perfilForm]);
  const autenticadorAtivo = Boolean(totpFactor?.id);
  const qrCodeDataUrl = useMemo(
    () =>
      totpSetup?.qrCode
        ? `data:image/svg+xml;utf8,${encodeURIComponent(totpSetup.qrCode)}`
        : "",
    [totpSetup]
  );

  const callMfaApi = useCallback(
    async (body?: Record<string, unknown>) => {
      const response = await fetch("/api/auth/mfa", {
        method: body ? "POST" : "GET",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });

      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        [key: string]: unknown;
      };

      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error || "Erro ao processar autenticador.");
      }

      return payload;
    },
    []
  );

  const carregarMfa = useCallback(async () => {
    try {
      setLoadingMfa(true);

      const [
        { data: factorData, error: factorError },
        { data: aalData },
        snapshot,
      ] = await Promise.all([
        supabase.auth.mfa.listFactors(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        callMfaApi(),
      ]);

      if (factorError) throw factorError;

      const fator = (factorData?.totp?.[0] ?? null) as TotpFactor | null;
      setTotpFactor(fator);
      setMfaSnapshot({
        factorActive: Boolean(snapshot.factorActive),
        currentLevel:
          (aalData?.currentLevel as "aal1" | "aal2" | null | undefined) ??
          null,
        backupCodesRemaining: Number(snapshot.backupCodesRemaining || 0),
        backupCodesLockedUntil:
          String(snapshot.backupCodesLockedUntil || "") || null,
        backupCodesGeneratedAt:
          String(snapshot.backupCodesGeneratedAt || "") || null,
        backupCodesLastUsedAt:
          String(snapshot.backupCodesLastUsedAt || "") || null,
      });
    } catch (error) {
      console.warn("Nao foi possivel carregar status do autenticador:", error);
      setTotpFactor(null);
      setMfaSnapshot(EMPTY_MFA_SNAPSHOT);
    } finally {
      setLoadingMfa(false);
    }
  }, [callMfaApi, supabase]);

  const carregarPerfil = useCallback(async () => {
    try {
      setLoading(true);
      setErro("");
      setMsg("");
      setSemPermissao(false);

      const usuario = await getUsuarioLogado();

      if (!usuario?.idSalao) {
        setErro("Nao foi possivel identificar o salao da conta atual.");
        return;
      }

      const nivelUsuario = usuario?.perfil?.nivel as UserNivel | undefined;

      if (!hasPermission(nivelUsuario, "perfil_salao_ver")) {
        setSemPermissao(true);
        return;
      }

      setIdSalao(usuario.idSalao);

      const { data, error } = await supabase
        .from("saloes")
        .select(
          "id, nome, responsavel, email, telefone, cpf_cnpj, endereco, numero, bairro, cidade, estado, cep, logo_url, plano, status"
        )
        .eq("id", usuario.idSalao)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const nextForm: SalaoForm = {
          id: data.id || "",
          nome: data.nome || "",
          responsavel: data.responsavel || "",
          email: data.email || "",
          telefone: data.telefone || "",
          cpf_cnpj: data.cpf_cnpj || "",
          endereco: data.endereco || "",
          numero: data.numero || "",
          bairro: data.bairro || "",
          cidade: data.cidade || "",
          estado: data.estado || "",
          cep: data.cep || "",
          logo_url: data.logo_url || "",
          plano: data.plano || "",
          status: data.status || "",
        };

        setPerfilForm(nextForm);
        setComercialDraft(nextForm);
        setEnderecoDraft(nextForm);
      }

      await carregarMfa();
    } catch (error: unknown) {
      setErro(
        error instanceof Error ? error.message : "Erro ao carregar perfil."
      );
    } finally {
      setLoading(false);
    }
  }, [carregarMfa, supabase]);

  useEffect(() => {
    void carregarPerfil();
  }, [carregarPerfil]);

  async function fecharModalAutenticador() {
    if (totpSetup?.factorId && !autenticadorAtivo) {
      try {
        await supabase.auth.mfa.unenroll({
          factorId: totpSetup.factorId,
        });
      } catch (error) {
        console.warn("Nao foi possivel limpar enrolamento pendente:", error);
      }
    }

    setTotpSetup(null);
    setSetupCode("");
    setManageCode("");
    setDisableBackupCode("");
    setRevealedBackupCodes([]);
    setActiveModal(null);
  }

  function abrirModal(modal: Exclude<ModalKey, null>) {
    setErro("");
    setMsg("");

    if (modal === "comercial") {
      setComercialDraft(perfilForm);
    }

    if (modal === "endereco") {
      setEnderecoDraft(perfilForm);
    }

    if (modal === "senha") {
      setPasswordForm(EMPTY_PASSWORD);
    }

    if (modal === "autenticador") {
      setSetupCode("");
      setManageCode("");
      setDisableBackupCode("");
      setRevealedBackupCodes([]);
    }

    setActiveModal(modal);
  }

  async function atualizarPerfil(patch: Partial<SalaoForm>, sucesso: string) {
    if (!idSalao) return false;

    try {
      setSavingPerfil(true);
      setErro("");
      setMsg("");

      const payload = {
        nome: patch.nome ?? perfilForm.nome,
        responsavel: (patch.responsavel ?? perfilForm.responsavel) || null,
        email: (patch.email ?? perfilForm.email) || null,
        telefone: (patch.telefone ?? perfilForm.telefone) || null,
        cpf_cnpj: (patch.cpf_cnpj ?? perfilForm.cpf_cnpj) || null,
        endereco: (patch.endereco ?? perfilForm.endereco) || null,
        numero: (patch.numero ?? perfilForm.numero) || null,
        bairro: (patch.bairro ?? perfilForm.bairro) || null,
        cidade: (patch.cidade ?? perfilForm.cidade) || null,
        estado: (patch.estado ?? perfilForm.estado) || null,
        cep: (patch.cep ?? perfilForm.cep) || null,
        logo_url: (patch.logo_url ?? perfilForm.logo_url) || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("saloes")
        .update(payload)
        .eq("id", idSalao);

      if (error) throw error;

      const nextForm = { ...perfilForm, ...patch };
      setPerfilForm(nextForm);
      setComercialDraft(nextForm);
      setEnderecoDraft(nextForm);
      setMsg(sucesso);
      setActiveModal(null);
      router.refresh();
      return true;
    } catch (error: unknown) {
      setErro(
        error instanceof Error ? error.message : "Erro ao salvar perfil."
      );
      return false;
    } finally {
      setSavingPerfil(false);
    }
  }

  async function salvarDadosComerciais() {
    await atualizarPerfil(
      {
        nome: comercialDraft.nome,
        responsavel: comercialDraft.responsavel,
        email: comercialDraft.email,
        telefone: comercialDraft.telefone,
        cpf_cnpj: comercialDraft.cpf_cnpj,
        logo_url: comercialDraft.logo_url,
      },
      "Dados comerciais atualizados com sucesso."
    );
  }

  async function salvarEndereco() {
    await atualizarPerfil(
      {
        endereco: enderecoDraft.endereco,
        numero: enderecoDraft.numero,
        bairro: enderecoDraft.bairro,
        cidade: enderecoDraft.cidade,
        estado: enderecoDraft.estado,
        cep: enderecoDraft.cep,
      },
      "Endereco do salao atualizado com sucesso."
    );
  }

  async function verificarTotpCode(
    code: string,
    factorId = totpFactor?.id || ""
  ) {
    if (!factorId) {
      throw new Error("Nenhum autenticador ativo foi encontrado.");
    }

    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({
        factorId,
      });

    if (challengeError) {
      throw challengeError;
    }

    const challengeId = (challengeData as { id?: string } | null)?.id || "";

    if (!challengeId) {
      throw new Error("Nao foi possivel iniciar a verificacao do autenticador.");
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code: code.trim(),
    });

    if (verifyError) {
      throw verifyError;
    }
  }

  async function validarSegundoFatorParaSenha() {
    if (!totpFactor?.id) return true;

    if (passwordForm.codigoTotp.trim()) {
      await verificarTotpCode(passwordForm.codigoTotp.trim());
      return true;
    }

    if (passwordForm.backupCode.trim()) {
      await callMfaApi({
        action: "consume_backup_code",
        backupCode: passwordForm.backupCode.trim(),
      });
      await carregarMfa();
      return true;
    }

    setErro("Informe o codigo do autenticador ou um backup code.");
    return false;
  }

  async function trocarSenha() {
    try {
      setSavingSenha(true);
      setErro("");
      setMsg("");

      if (passwordForm.novaSenha.length < 6) {
        setErro("A nova senha precisa ter pelo menos 6 caracteres.");
        return;
      }

      if (passwordForm.novaSenha !== passwordForm.confirmarSenha) {
        setErro("A confirmacao da senha nao confere.");
        return;
      }

      const podeSeguir = await validarSegundoFatorParaSenha();
      if (!podeSeguir) return;

      const { error } = await supabase.auth.updateUser({
        password: passwordForm.novaSenha,
      });

      if (error) throw error;

      setPasswordForm(EMPTY_PASSWORD);
      setMsg("Senha da conta administradora atualizada com sucesso.");
      setActiveModal(null);
      await carregarMfa();
    } catch (error: unknown) {
      setErro(error instanceof Error ? error.message : "Erro ao trocar senha.");
    } finally {
      setSavingSenha(false);
    }
  }

  async function prepararAutenticador() {
    try {
      setMfaBusy(true);
      setErro("");
      setMsg("");
      setRevealedBackupCodes([]);

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Administrador ${perfilForm.nome || "SalaoPremium"}`,
      });

      if (error) throw error;

      const payload = data as {
        id?: string;
        totp?: { qr_code?: string; secret?: string };
      } | null;

      if (!payload?.id || !payload.totp?.qr_code || !payload.totp?.secret) {
        throw new Error("Nao foi possivel preparar o autenticador.");
      }

      setTotpSetup({
        factorId: payload.id,
        qrCode: payload.totp.qr_code,
        secret: payload.totp.secret,
      });
      setSetupCode("");
    } catch (error: unknown) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao preparar o autenticador."
      );
    } finally {
      setMfaBusy(false);
    }
  }

  async function concluirAtivacaoAutenticador() {
    try {
      if (!totpSetup?.factorId) {
        setErro("Nenhum preparo de autenticador ativo foi encontrado.");
        return;
      }

      if (setupCode.trim().length < 6) {
        setErro("Informe o codigo de 6 digitos do autenticador.");
        return;
      }

      setMfaBusy(true);
      setErro("");
      setMsg("");

      await verificarTotpCode(setupCode.trim(), totpSetup.factorId);

      const response = await callMfaApi({
        action: "generate_backup_codes",
      });

      setRevealedBackupCodes(
        Array.isArray(response.codes)
          ? response.codes.map((value) => String(value))
          : []
      );
      setTotpSetup(null);
      setSetupCode("");
      setMsg("Autenticador ativado com sucesso.");
      await carregarMfa();
    } catch (error: unknown) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao ativar o autenticador."
      );
    } finally {
      setMfaBusy(false);
    }
  }

  async function regenerarBackupCodes() {
    try {
      if (!manageCode.trim()) {
        setErro("Informe o codigo atual do autenticador para gerar novos backup codes.");
        return;
      }

      setMfaBusy(true);
      setErro("");
      setMsg("");

      await verificarTotpCode(manageCode.trim());
      const response = await callMfaApi({
        action: "generate_backup_codes",
      });

      setRevealedBackupCodes(
        Array.isArray(response.codes)
          ? response.codes.map((value) => String(value))
          : []
      );
      setManageCode("");
      setMsg("Novos backup codes gerados.");
      await carregarMfa();
    } catch (error: unknown) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao gerar novos backup codes."
      );
    } finally {
      setMfaBusy(false);
    }
  }

  async function desativarAutenticadorPorTotp() {
    try {
      if (!manageCode.trim()) {
        setErro("Informe o codigo atual do autenticador para desativar.");
        return;
      }

      setMfaBusy(true);
      setErro("");
      setMsg("");

      await verificarTotpCode(manageCode.trim());
      await callMfaApi({
        action: "disable_factor",
        method: "aal2",
      });

      await supabase.auth.signOut();
      router.push("/login?motivo=autenticador_desativado");
    } catch (error: unknown) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao desativar o autenticador."
      );
    } finally {
      setMfaBusy(false);
    }
  }

  async function desativarAutenticadorPorBackupCode() {
    try {
      if (!disableBackupCode.trim()) {
        setErro("Informe um backup code valido para desativar.");
        return;
      }

      setMfaBusy(true);
      setErro("");
      setMsg("");

      await callMfaApi({
        action: "disable_factor",
        method: "backup_code",
        backupCode: disableBackupCode.trim(),
      });

      await supabase.auth.signOut();
      router.push("/login?motivo=autenticador_desativado");
    } catch (error: unknown) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao desativar o autenticador."
      );
    } finally {
      setMfaBusy(false);
    }
  }

  if (loading) {
    return (
      <AppLoading
        title="Carregando perfil do salao"
        message="Aguarde enquanto reunimos identidade do negocio, contatos e seguranca da conta."
        fullHeight={false}
      />
    );
  }

  if (semPermissao) {
    return (
      <div className="rounded-[30px] border border-amber-200 bg-amber-50 p-6 text-amber-800">
        Apenas administradores podem editar o perfil do salao.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <section className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white p-5 text-zinc-950 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-zinc-600">
                <Building2 size={13} />
                Identidade do negocio
              </div>
              <h1 className="mt-3 font-display text-3xl font-bold tracking-[-0.05em] sm:text-[2.1rem]">
                Perfil do salao
              </h1>
              <p className="mt-2 text-sm leading-6 text-zinc-500 sm:text-[15px]">
                Aqui fica so a leitura da ficha do negocio. As alteracoes
                importantes entram pela lateral, em modais separados, sem virar
                um formulario comprido no meio da tela.
              </p>
            </div>

            <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200">
                  {perfilForm.logo_url ? (
                    <img
                      src={perfilForm.logo_url}
                      alt={perfilForm.nome || "Salao"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="font-display text-lg font-bold uppercase">
                      {(perfilForm.nome || "SP").slice(0, 2)}
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-display text-lg font-bold">
                    {perfilForm.nome || "SalaoPremium"}
                  </div>
                  <div className="text-sm text-zinc-500">
                    {String(perfilForm.plano || "sem plano").toUpperCase()} |{" "}
                    {perfilForm.status || "status nao definido"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {erro ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {erro}
          </div>
        ) : null}

        {msg ? (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 size={16} />
            {msg}
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_360px]">
          <div className="space-y-4">
            <SectionCard
              icon={<Building2 size={18} />}
              title="Dados comerciais"
              description="Leitura principal da identidade do negocio e dos contatos usados no painel."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <DisplayItem
                  label="Nome do salao"
                  value={perfilForm.nome || "Nao informado"}
                />
                <DisplayItem
                  label="Responsavel"
                  value={perfilForm.responsavel || "Nao informado"}
                />
                <DisplayItem
                  label="E-mail"
                  value={perfilForm.email || "Nao informado"}
                />
                <DisplayItem
                  label="Telefone"
                  value={perfilForm.telefone || "Nao informado"}
                />
                <DisplayItem
                  label="CPF/CNPJ"
                  value={perfilForm.cpf_cnpj || "Nao informado"}
                />
                <DisplayItem
                  label="Logo"
                  value={perfilForm.logo_url || "Sem URL cadastrada"}
                />
              </div>
            </SectionCard>

            <SectionCard
              icon={<MapPin size={18} />}
              title="Endereco"
              description="Base de localizacao usada em fichas, impressos e referencias do salao."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <DisplayItem
                    label="Endereco principal"
                    value={linhasEndereco[0] || "Nao informado"}
                  />
                </div>
                <div className="md:col-span-2">
                  <DisplayItem
                    label="Complemento de localizacao"
                    value={linhasEndereco[1] || "Nao informado"}
                    multiline
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard
              icon={<ShieldCheck size={18} />}
              title="Seguranca da conta"
              description="Resumo do que protege a conta administradora que hoje controla este painel."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <DisplayItem
                  label="Troca de senha"
                  value={
                    autenticadorAtivo
                      ? "Exige codigo do autenticador ou backup code antes de salvar."
                      : "Protegida pela sessao autenticada atual."
                  }
                  multiline
                />
                <DisplayItem
                  label="Autenticador"
                  value={
                    loadingMfa
                      ? "Verificando status..."
                      : autenticadorAtivo
                        ? `Ativo com ${mfaSnapshot.backupCodesRemaining} backup code(s) restantes.`
                        : "Ainda nao ativado nesta conta."
                  }
                  multiline
                />
              </div>
            </SectionCard>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <SectionCard
              icon={<Sparkles size={18} />}
              title="Acoes do perfil"
              description="Cada ajuste abre no proprio contexto, sem poluir a leitura da ficha."
            >
              <div className="space-y-3">
                <SidebarAction
                  icon={<PencilLine size={16} />}
                  title="Editar dados comerciais"
                  description="Nome, responsavel, e-mail, telefone, documento e logo."
                  onClick={() => abrirModal("comercial")}
                />

                <SidebarAction
                  icon={<MapPin size={16} />}
                  title="Editar endereco"
                  description="Rua, numero, bairro, cidade, estado e CEP."
                  onClick={() => abrirModal("endereco")}
                />

                <SidebarAction
                  icon={<KeyRound size={16} />}
                  title="Trocar senha"
                  description="Quando houver autenticador ativo, este fluxo exige TOTP ou backup code."
                  onClick={() => abrirModal("senha")}
                  tone="security"
                />

                <SidebarAction
                  icon={<ShieldCheck size={16} />}
                  title="Autenticador"
                  description="Ative TOTP, gere backup codes e desative a protecao com criterio."
                  onClick={() => abrirModal("autenticador")}
                  tone="security"
                />
              </div>
            </SectionCard>

            <section className="rounded-[24px] border border-[rgba(199,162,92,0.28)] bg-[rgba(199,162,92,0.10)] p-4">
              <div className="flex items-start gap-3">
                <CircleAlert size={18} className="mt-0.5 text-zinc-900" />
                <div>
                  <div className="text-sm font-bold text-zinc-950">
                    Camada de recuperacao
                  </div>
                  <p className="mt-1.5 text-sm leading-5 text-zinc-600">
                    Backup codes, bloqueio por tentativas e desativacao segura
                    agora fazem parte do fluxo. O que ainda nao existe e
                    recuperacao fora da sessao logada por suporte administrado.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>

      <AppModal
        open={activeModal === "comercial"}
        onClose={() => setActiveModal(null)}
        title="Editar dados comerciais"
        description="Atualize identidade principal, contatos e logo do negocio."
        eyebrow="Perfil do salao"
        maxWidthClassName="max-w-3xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={salvarDadosComerciais}
              disabled={savingPerfil}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {savingPerfil ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <CheckCircle2 size={16} />
              )}
              Salvar dados
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Nome do salao">
            <TextInput
              value={comercialDraft.nome}
              onChange={(event) =>
                setComercialDraft((prev) => ({
                  ...prev,
                  nome: event.target.value,
                }))
              }
              placeholder="Ex.: Salao Premium"
            />
          </Field>

          <Field label="Responsavel">
            <TextInput
              value={comercialDraft.responsavel}
              onChange={(event) =>
                setComercialDraft((prev) => ({
                  ...prev,
                  responsavel: event.target.value,
                }))
              }
              placeholder="Nome do responsavel"
            />
          </Field>

          <Field label="E-mail">
            <div className="relative">
              <TextInput
                value={comercialDraft.email}
                onChange={(event) =>
                  setComercialDraft((prev) => ({
                    ...prev,
                    email: event.target.value,
                  }))
                }
                placeholder="email@exemplo.com"
                className="pl-11"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              <Mail
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                size={16}
              />
            </div>
          </Field>

          <Field label="Telefone">
            <div className="relative">
              <TextInput
                value={comercialDraft.telefone}
                onChange={(event) =>
                  setComercialDraft((prev) => ({
                    ...prev,
                    telefone: event.target.value,
                  }))
                }
                placeholder="(00) 00000-0000"
                className="pl-11"
              />
              <Phone
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                size={16}
              />
            </div>
          </Field>

          <Field label="CPF/CNPJ">
            <TextInput
              value={comercialDraft.cpf_cnpj}
              onChange={(event) =>
                setComercialDraft((prev) => ({
                  ...prev,
                  cpf_cnpj: event.target.value,
                }))
              }
              placeholder="Documento principal"
            />
          </Field>

          <Field label="Logo URL">
            <TextInput
              value={comercialDraft.logo_url}
              onChange={(event) =>
                setComercialDraft((prev) => ({
                  ...prev,
                  logo_url: event.target.value,
                }))
              }
              placeholder="https://..."
            />
          </Field>
        </div>
      </AppModal>

      <AppModal
        open={activeModal === "endereco"}
        onClose={() => setActiveModal(null)}
        title="Editar endereco"
        description="Atualize os dados de localizacao do salao."
        eyebrow="Perfil do salao"
        maxWidthClassName="max-w-3xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={salvarEndereco}
              disabled={savingPerfil}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {savingPerfil ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <CheckCircle2 size={16} />
              )}
              Salvar endereco
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Field label="Endereco">
              <div className="relative">
                <TextInput
                  value={enderecoDraft.endereco}
                  onChange={(event) =>
                    setEnderecoDraft((prev) => ({
                      ...prev,
                      endereco: event.target.value,
                    }))
                  }
                  placeholder="Rua / Avenida"
                  className="pl-11"
                />
                <MapPin
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                  size={16}
                />
              </div>
            </Field>
          </div>

          <Field label="Numero">
            <TextInput
              value={enderecoDraft.numero}
              onChange={(event) =>
                setEnderecoDraft((prev) => ({
                  ...prev,
                  numero: event.target.value,
                }))
              }
              placeholder="Numero"
            />
          </Field>

          <Field label="Bairro">
            <TextInput
              value={enderecoDraft.bairro}
              onChange={(event) =>
                setEnderecoDraft((prev) => ({
                  ...prev,
                  bairro: event.target.value,
                }))
              }
              placeholder="Bairro"
            />
          </Field>

          <Field label="Cidade">
            <TextInput
              value={enderecoDraft.cidade}
              onChange={(event) =>
                setEnderecoDraft((prev) => ({
                  ...prev,
                  cidade: event.target.value,
                }))
              }
              placeholder="Cidade"
            />
          </Field>

          <Field label="Estado">
            <TextInput
              value={enderecoDraft.estado}
              onChange={(event) =>
                setEnderecoDraft((prev) => ({
                  ...prev,
                  estado: event.target.value,
                }))
              }
              placeholder="UF"
            />
          </Field>

          <Field label="CEP">
            <TextInput
              value={enderecoDraft.cep}
              onChange={(event) =>
                setEnderecoDraft((prev) => ({
                  ...prev,
                  cep: event.target.value,
                }))
              }
              placeholder="00000-000"
            />
          </Field>
        </div>
      </AppModal>

      <AppModal
        open={activeModal === "senha"}
        onClose={() => setActiveModal(null)}
        title="Trocar senha da conta"
        description="A senha da conta administradora e atualizada no Supabase Auth."
        eyebrow="Seguranca"
        maxWidthClassName="max-w-xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={trocarSenha}
              disabled={savingSenha}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {savingSenha ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <ShieldCheck size={16} />
              )}
              Atualizar senha
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-[22px] border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
            {autenticadorAtivo ? (
              <p className="leading-6">
                Esta conta ja tem autenticador validado. Para trocar a senha,
                voce pode informar o codigo do app ou usar um backup code ainda
                nao consumido.
              </p>
            ) : (
              <p className="leading-6">
                No momento a troca depende da sessao autenticada atual. Quando
                o autenticador for ativado, este modal passa a exigir TOTP ou
                backup code.
              </p>
            )}
          </div>

          <Field label="Nova senha">
            <TextInput
              type="password"
              value={passwordForm.novaSenha}
              onChange={(event) =>
                setPasswordForm((prev) => ({
                  ...prev,
                  novaSenha: event.target.value,
                }))
              }
              placeholder="Minimo 6 caracteres"
            />
          </Field>

          <Field label="Confirmar senha">
            <TextInput
              type="password"
              value={passwordForm.confirmarSenha}
              onChange={(event) =>
                setPasswordForm((prev) => ({
                  ...prev,
                  confirmarSenha: event.target.value,
                }))
              }
              placeholder="Repita a nova senha"
            />
          </Field>

          {autenticadorAtivo ? (
            <>
              <Field label="Codigo do autenticador">
                <TextInput
                  inputMode="numeric"
                  value={passwordForm.codigoTotp}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      codigoTotp: event.target.value.replace(/\D/g, "").slice(0, 6),
                    }))
                  }
                  placeholder="Digite os 6 digitos do app"
                />
              </Field>

              <Field label="Ou use um backup code">
                <TextInput
                  value={passwordForm.backupCode}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      backupCode: event.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="XXXX-XXXX"
                />
              </Field>
            </>
          ) : null}
        </div>
      </AppModal>

      <AppModal
        open={activeModal === "autenticador"}
        onClose={fecharModalAutenticador}
        title="Autenticador do administrador"
        description="Ative TOTP com backup codes e mantenha a recuperacao da conta sob controle."
        eyebrow="Seguranca"
        maxWidthClassName="max-w-3xl"
        closeDisabled={mfaBusy}
      >
        <div className="space-y-4">
          <div className="rounded-[22px] border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-zinc-950">
              <ShieldCheck size={16} />
              Status atual
            </div>
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              <DisplayItem
                label="Protecao TOTP"
                value={
                  loadingMfa
                    ? "Verificando..."
                    : autenticadorAtivo
                      ? "Ativa"
                      : "Nao ativada"
                }
              />
              <DisplayItem
                label="Backup codes restantes"
                value={String(mfaSnapshot.backupCodesRemaining || 0)}
              />
              <DisplayItem
                label="Ultima geracao"
                value={formatDateTime(mfaSnapshot.backupCodesGeneratedAt)}
              />
              <DisplayItem
                label="Ultimo uso"
                value={formatDateTime(mfaSnapshot.backupCodesLastUsedAt)}
              />
            </div>
            {mfaSnapshot.backupCodesLockedUntil ? (
              <p className="mt-3 text-sm leading-6 text-amber-700">
                Backup codes bloqueados ate{" "}
                {formatDateTime(mfaSnapshot.backupCodesLockedUntil)} por excesso
                de tentativas.
              </p>
            ) : null}
          </div>

          {!autenticadorAtivo && !totpSetup ? (
            <div className="rounded-[22px] border border-zinc-200 bg-white p-4">
              <div className="text-sm font-bold text-zinc-950">
                Ativar autenticador
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Vamos preparar um fator TOTP para Google Authenticator ou apps
                equivalentes. Depois da verificacao, a tela gera um lote novo de
                backup codes para emergencias.
              </p>
              <button
                type="button"
                onClick={prepararAutenticador}
                disabled={mfaBusy}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-60"
              >
                {mfaBusy ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <ShieldCheck size={16} />
                )}
                Preparar autenticador
              </button>
            </div>
          ) : null}

          {totpSetup ? (
            <div className="rounded-[22px] border border-zinc-200 bg-white p-4">
              <div className="text-sm font-bold text-zinc-950">
                Confirmar ativacao
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Escaneie o QR code no app autenticador ou digite o segredo
                manualmente. Depois confirme com o codigo gerado.
              </p>

              <div className="mt-4 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="rounded-[20px] border border-zinc-200 bg-zinc-50 p-3">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="QR code do autenticador"
                      className="h-full w-full rounded-2xl bg-white object-contain p-2"
                    />
                  ) : null}
                </div>

                <div className="space-y-4">
                  <Field label="Segredo manual">
                    <TextInput
                      value={totpSetup.secret}
                      readOnly
                      className="font-mono uppercase tracking-[0.08em]"
                    />
                  </Field>

                  <Field label="Codigo do app">
                    <TextInput
                      inputMode="numeric"
                      value={setupCode}
                      onChange={(event) =>
                        setSetupCode(
                          event.target.value.replace(/\D/g, "").slice(0, 6)
                        )
                      }
                      placeholder="Digite os 6 digitos"
                    />
                  </Field>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={concluirAtivacaoAutenticador}
                      disabled={mfaBusy}
                      className="inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-60"
                    >
                      {mfaBusy ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                      Ativar e gerar backup codes
                    </button>

                    <button
                      type="button"
                      onClick={fecharModalAutenticador}
                      disabled={mfaBusy}
                      className="rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
                    >
                      Cancelar preparo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {autenticadorAtivo ? (
            <>
              <div className="rounded-[22px] border border-zinc-200 bg-white p-4">
                <div className="text-sm font-bold text-zinc-950">
                  Gerar novos backup codes
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  Gere um lote novo e invalide o anterior sempre que suspeitar
                  de exposicao ou depois de uma mudanca operacional relevante.
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                  <TextInput
                    inputMode="numeric"
                    value={manageCode}
                    onChange={(event) =>
                      setManageCode(
                        event.target.value.replace(/\D/g, "").slice(0, 6)
                      )
                    }
                    placeholder="Codigo atual do autenticador"
                  />
                  <button
                    type="button"
                    onClick={regenerarBackupCodes}
                    disabled={mfaBusy}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-60"
                  >
                    {mfaBusy ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <ShieldCheck size={16} />
                    )}
                    Gerar lote novo
                  </button>
                </div>
              </div>

              <div className="rounded-[22px] border border-[rgba(199,162,92,0.35)] bg-[rgba(199,162,92,0.10)] p-4">
                <div className="text-sm font-bold text-zinc-950">
                  Desativar 2FA com seguranca
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-700">
                  Voce pode desativar pelo codigo atual do autenticador ou por
                  um backup code valido. Depois disso, a sessao atual e
                  encerrada.
                </p>

                <div className="mt-4 space-y-3">
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                    <TextInput
                      inputMode="numeric"
                      value={manageCode}
                      onChange={(event) =>
                        setManageCode(
                          event.target.value.replace(/\D/g, "").slice(0, 6)
                        )
                      }
                      placeholder="Codigo atual do autenticador"
                    />
                    <button
                      type="button"
                      onClick={desativarAutenticadorPorTotp}
                      disabled={mfaBusy}
                      className="rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-60"
                    >
                      Desativar com TOTP
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                    <TextInput
                      value={disableBackupCode}
                      onChange={(event) =>
                        setDisableBackupCode(event.target.value.toUpperCase())
                      }
                      placeholder="Backup code de recuperacao"
                    />
                    <button
                      type="button"
                      onClick={desativarAutenticadorPorBackupCode}
                      disabled={mfaBusy}
                      className="rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-60"
                    >
                      Desativar com backup code
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {revealedBackupCodes.length > 0 ? (
            <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-4">
              <div className="text-sm font-bold text-emerald-900">
                Backup codes gerados
              </div>
              <p className="mt-2 text-sm leading-6 text-emerald-800">
                Estes codigos aparecem agora como lote atual. Guarde em local
                seguro; cada um funciona uma vez.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {revealedBackupCodes.map((code) => (
                  <div
                    key={code}
                    className="rounded-2xl border border-emerald-200 bg-white px-3 py-2 font-mono text-sm font-bold tracking-[0.08em] text-zinc-900"
                  >
                    {code}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-[22px] border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-sm font-bold text-zinc-950">
              Cuidados importantes
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-700">
              <li>- Sempre oferecer backup codes.</li>
              <li>- Permitir desativacao de 2FA com seguranca.</li>
              <li>- Proteger contra brute force com limite de tentativas.</li>
              <li>- Guardar o segredo criptografado no provedor de auth.</li>
            </ul>
          </div>
        </div>
      </AppModal>
    </>
  );
}
