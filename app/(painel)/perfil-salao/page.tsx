"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
} from "lucide-react";
import AppLoading from "@/components/ui/AppLoading";
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
};

const EMPTY_PASSWORD: PasswordForm = {
  novaSenha: "",
  confirmarSenha: "",
};

export default function PerfilSalaoPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [semPermissao, setSemPermissao] = useState(false);
  const [savingPerfil, setSavingPerfil] = useState(false);
  const [savingSenha, setSavingSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [idSalao, setIdSalao] = useState("");
  const [perfilForm, setPerfilForm] = useState<SalaoForm>(EMPTY_SALAO);
  const [passwordForm, setPasswordForm] =
    useState<PasswordForm>(EMPTY_PASSWORD);

  const carregarPerfil = useCallback(async () => {
    try {
      setLoading(true);
      setErro("");
      setMsg("");
      setSemPermissao(false);

      const usuario = await getUsuarioLogado();

      if (!usuario?.idSalao) {
        setErro("Não foi possível identificar o salão da conta atual.");
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
        setPerfilForm({
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
        });
      }
    } catch (error: unknown) {
      setErro(
        error instanceof Error ? error.message : "Erro ao carregar perfil."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void carregarPerfil();
  }, [carregarPerfil]);

  async function salvarPerfil() {
    if (!idSalao) return;

    try {
      setSavingPerfil(true);
      setErro("");
      setMsg("");

      const { error } = await supabase
        .from("saloes")
        .update({
          nome: perfilForm.nome,
          responsavel: perfilForm.responsavel || null,
          email: perfilForm.email || null,
          telefone: perfilForm.telefone || null,
          cpf_cnpj: perfilForm.cpf_cnpj || null,
          endereco: perfilForm.endereco || null,
          numero: perfilForm.numero || null,
          bairro: perfilForm.bairro || null,
          cidade: perfilForm.cidade || null,
          estado: perfilForm.estado || null,
          cep: perfilForm.cep || null,
          logo_url: perfilForm.logo_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", idSalao);

      if (error) throw error;

      setMsg("Perfil do salão atualizado com sucesso.");
      router.refresh();
    } catch (error: unknown) {
      setErro(error instanceof Error ? error.message : "Erro ao salvar perfil.");
    } finally {
      setSavingPerfil(false);
    }
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
        setErro("A confirmação da senha não confere.");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordForm.novaSenha,
      });

      if (error) throw error;

      setPasswordForm(EMPTY_PASSWORD);
      setMsg("Senha da conta administradora atualizada com sucesso.");
    } catch (error: unknown) {
      setErro(error instanceof Error ? error.message : "Erro ao trocar senha.");
    } finally {
      setSavingSenha(false);
    }
  }

  if (loading) {
    return (
      <AppLoading
        title="Carregando perfil do salão"
        message="Aguarde enquanto reunimos identidade do negócio, contatos e configurações da conta."
        fullHeight={false}
      />
    );
  }

  if (semPermissao) {
    return (
      <div className="rounded-[30px] border border-amber-200 bg-amber-50 p-6 text-amber-800">
        Apenas administradores podem editar o perfil do salão.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[34px] border border-zinc-200 bg-white p-6 text-zinc-950 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-zinc-600">
              <Building2 size={13} />
              Identidade do negócio
            </div>
            <h1 className="mt-4 font-display text-3xl font-bold tracking-[-0.05em] sm:text-4xl">
              Perfil do salão
            </h1>
            <p className="mt-3 text-sm text-zinc-500 sm:text-base">
              Edite dados comerciais, contato, endereço, logo e a senha da conta
              administradora sem misturar com as regras internas do sistema.
            </p>
          </div>

          <div className="rounded-[26px] border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200">
                {perfilForm.logo_url ? (
                  <img
                    src={perfilForm.logo_url}
                    alt={perfilForm.nome || "Salão"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="font-display text-lg font-bold uppercase">
                    {(perfilForm.nome || "SP").slice(0, 2)}
                  </span>
                )}
              </div>
              <div>
                <div className="font-display text-xl font-bold">
                  {perfilForm.nome || "SalaoPremium"}
                </div>
                <div className="text-sm text-zinc-500">
                  {String(perfilForm.plano || "sem plano").toUpperCase()} • 
                  {perfilForm.status || "status não definido"}
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

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
        <SectionCard
          icon={<Building2 size={18} />}
          title="Dados comerciais"
          description="Informacoes que aparecem no painel, cobrancas e comunicacoes."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Nome do salão">
              <TextInput
                value={perfilForm.nome}
                onChange={(event) =>
                  setPerfilForm((prev) => ({
                    ...prev,
                    nome: event.target.value,
                  }))
                }
                placeholder="Ex.: Salão Premium"
              />
            </Field>

            <Field label="Responsavel">
              <TextInput
                value={perfilForm.responsavel}
                onChange={(event) =>
                  setPerfilForm((prev) => ({
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
                  value={perfilForm.email}
                  onChange={(event) =>
                    setPerfilForm((prev) => ({
                      ...prev,
                      email: event.target.value,
                    }))
                  }
                  placeholder="email@exemplo.com"
                  className="pl-11"
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
                  value={perfilForm.telefone}
                  onChange={(event) =>
                    setPerfilForm((prev) => ({
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
                value={perfilForm.cpf_cnpj}
                onChange={(event) =>
                  setPerfilForm((prev) => ({
                    ...prev,
                    cpf_cnpj: event.target.value,
                  }))
                }
                placeholder="Documento"
              />
            </Field>

            <Field label="Logo URL">
              <TextInput
                value={perfilForm.logo_url}
                onChange={(event) =>
                  setPerfilForm((prev) => ({
                    ...prev,
                    logo_url: event.target.value,
                  }))
                }
                placeholder="https://..."
              />
            </Field>
          </div>

          <div className="mt-6 border-t border-zinc-100 pt-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Field label="Endereço">
                  <div className="relative">
                    <TextInput
                      value={perfilForm.endereco}
                      onChange={(event) =>
                        setPerfilForm((prev) => ({
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
                  value={perfilForm.numero}
                  onChange={(event) =>
                    setPerfilForm((prev) => ({
                      ...prev,
                      numero: event.target.value,
                    }))
                  }
                  placeholder="Numero"
                />
              </Field>

              <Field label="Bairro">
                <TextInput
                  value={perfilForm.bairro}
                  onChange={(event) =>
                    setPerfilForm((prev) => ({
                      ...prev,
                      bairro: event.target.value,
                    }))
                  }
                  placeholder="Bairro"
                />
              </Field>

              <Field label="Cidade">
                <TextInput
                  value={perfilForm.cidade}
                  onChange={(event) =>
                    setPerfilForm((prev) => ({
                      ...prev,
                      cidade: event.target.value,
                    }))
                  }
                  placeholder="Cidade"
                />
              </Field>

              <Field label="Estado">
                <TextInput
                  value={perfilForm.estado}
                  onChange={(event) =>
                    setPerfilForm((prev) => ({
                      ...prev,
                      estado: event.target.value,
                    }))
                  }
                  placeholder="UF"
                />
              </Field>

              <Field label="CEP">
                <TextInput
                  value={perfilForm.cep}
                  onChange={(event) =>
                    setPerfilForm((prev) => ({
                      ...prev,
                      cep: event.target.value,
                    }))
                  }
                  placeholder="00000-000"
                />
              </Field>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={salvarPerfil}
              disabled={savingPerfil}
              className="inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {savingPerfil ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Save size={16} />
              )}
              Salvar perfil
            </button>
          </div>
        </SectionCard>

        <div className="space-y-5">
          <SectionCard
            icon={<KeyRound size={18} />}
            title="Senha do administrador"
            description="Troca a senha da conta logada no Supabase Auth."
          >
            <div className="space-y-4">
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

              <button
                type="button"
                onClick={trocarSenha}
                disabled={savingSenha}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-950 px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-60"
              >
                {savingSenha ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <ShieldCheck size={16} />
                )}
                Atualizar senha
              </button>
            </div>
          </SectionCard>

          <section className="rounded-[28px] border border-[rgba(199,162,92,0.28)] bg-[rgba(199,162,92,0.10)] p-5">
            <div className="text-sm font-bold text-zinc-950">
              Separacao organizada
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Este perfil fica para dados do salão e segurança. Configurações
              fica para agenda, caixa, usuarios, permissoes e regras internas.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}


