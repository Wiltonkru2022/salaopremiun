"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
};

type ModalKey = "comercial" | "endereco" | "senha" | "autenticador" | null;

type TotpFactor = {
  id: string;
  factor_type?: string;
  friendly_name?: string | null;
  status?: string;
};

const EMPTY_PASSWORD: PasswordForm = {
  novaSenha: "",
  confirmarSenha: "",
  codigoTotp: "",
};

function formatAddress(form: SalaoForm) {
  const linha1 = [form.endereco, form.numero].filter(Boolean).join(", ");
  const linha2 = [form.bairro, form.cidade, form.estado, form.cep]
    .filter(Boolean)
    .join(" • ");

  return [linha1, linha2].filter(Boolean);
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
  icon: React.ReactNode;
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
  const [authLevel, setAuthLevel] = useState<"aal1" | "aal2" | null>(null);

  const carregarMfa = useCallback(async () => {
    try {
      setLoadingMfa(true);

      const [{ data: factorData, error: factorError }, { data: aalData }] =
        await Promise.all([
          supabase.auth.mfa.listFactors(),
          supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        ]);

      if (factorError) throw factorError;

      const fator = (factorData?.totp?.[0] ?? null) as TotpFactor | null;
      setTotpFactor(fator);
      setAuthLevel((aalData?.currentLevel as "aal1" | "aal2" | null) ?? null);
    } catch (error) {
      console.warn("Nao foi possivel carregar status do autenticador:", error);
      setTotpFactor(null);
      setAuthLevel(null);
    } finally {
      setLoadingMfa(false);
    }
  }, [supabase]);

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

  const linhasEndereco = useMemo(() => formatAddress(perfilForm), [perfilForm]);
  const autenticadorAtivo = Boolean(totpFactor?.id);

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

      const { error } = await supabase.from("saloes").update(payload).eq("id", idSalao);

      if (error) throw error;

      const nextForm = {
        ...perfilForm,
        ...patch,
      };

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

  async function verificarTotpAntesDaSenha() {
    if (!totpFactor?.id) return true;

    if (!passwordForm.codigoTotp.trim()) {
      setErro("Informe o codigo do autenticador para trocar a senha.");
      return false;
    }

    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });

    if (challengeError) {
      throw challengeError;
    }

    const challengeId =
      (challengeData as { id?: string } | null)?.id || "";

    if (!challengeId) {
      throw new Error("Nao foi possivel iniciar a verificacao do autenticador.");
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: totpFactor.id,
      challengeId,
      code: passwordForm.codigoTotp.trim(),
    });

    if (verifyError) {
      throw verifyError;
    }

    return true;
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

      const podeSeguir = await verificarTotpAntesDaSenha();

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
                    {String(perfilForm.plano || "sem plano").toUpperCase()} •{" "}
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
                      ? "Exige codigo do autenticador antes de salvar."
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
                        ? `Ativo em ${authLevel === "aal2" ? "nivel reforcado" : "conta protegida"}`
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
                  description="Quando houver autenticador ativo, este fluxo exige o codigo antes de alterar."
                  onClick={() => abrirModal("senha")}
                  tone="security"
                />

                <SidebarAction
                  icon={<ShieldCheck size={16} />}
                  title="Autenticador"
                  description="Veja o status da protecao em dois fatores e o que falta para liberar a ativacao completa."
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
                    Seguranca sem maquiagem
                  </div>
                  <p className="mt-1.5 text-sm leading-5 text-zinc-600">
                    O painel ja consegue exigir codigo TOTP se houver fator ativo.
                    A ativacao guiada so entra quando o fluxo de backup, recuperacao
                    e desativacao segura estiver completo.
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
                voce precisa informar o codigo do app antes de salvar.
              </p>
            ) : (
              <p className="leading-6">
                No momento a troca ainda depende da sessao autenticada atual.
                Quando a ativacao completa do autenticador entrar, este modal
                passa a exigir o codigo de verificacao automaticamente.
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
          ) : null}
        </div>
      </AppModal>

      <AppModal
        open={activeModal === "autenticador"}
        onClose={() => setActiveModal(null)}
        title="Autenticador do administrador"
        description="Preparacao da protecao em dois fatores antes de liberar ativacao guiada na conta."
        eyebrow="Seguranca"
        maxWidthClassName="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="rounded-[22px] border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-zinc-950">
              <ShieldCheck size={16} />
              Status atual
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {loadingMfa
                ? "Verificando status do autenticador..."
                : autenticadorAtivo
                  ? "Existe um fator TOTP validado nesta conta. A troca de senha no perfil ja passa a pedir o codigo do app."
                  : "Ainda nao existe fator TOTP ativo nesta conta. A ativacao guiada fica retida ate o fluxo de recuperacao ficar redondo."}
            </p>
          </div>

          <div className="rounded-[22px] border border-[rgba(199,162,92,0.35)] bg-[rgba(199,162,92,0.10)] p-4">
            <div className="text-sm font-bold text-zinc-950">
              Cuidados obrigatorios antes de liberar ativacao
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-700">
              <li>• Sempre oferecer backup codes.</li>
              <li>• Permitir desativacao de 2FA com fluxo seguro.</li>
              <li>• Proteger contra brute force com limite de tentativas.</li>
              <li>• Guardar o segredo de forma criptografada no provedor de auth.</li>
            </ul>
          </div>

          <div className="rounded-[22px] border border-zinc-200 bg-white p-4">
            <div className="text-sm font-bold text-zinc-950">
              Como a tela passa a se comportar
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Com fator TOTP ativo, a troca de senha neste perfil exige o codigo
              do autenticador antes de salvar. A ativacao self-service vai entrar
              depois, junto com recuperacao por backup codes e desativacao segura.
            </p>
          </div>
        </div>
      </AppModal>
    </>
  );
}
