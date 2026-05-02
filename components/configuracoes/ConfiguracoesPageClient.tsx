"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getUsuarioLogado } from "@/lib/auth/getUsuarioLogado";
import { hasPermission } from "@/lib/auth/permissions";
import type { UserNivel } from "@/lib/permissions";
import { ComissaoHelpPanel } from "@/components/comissoes/ComissaoHelpPanel";
import {
  Building2,
  CalendarClock,
  CreditCard,
  MonitorCog,
  Save,
  Loader2,
  Phone,
  Mail,
  MapPin,
  Clock3,
  CalendarDays,
  Percent,
  Palette,
  ShieldAlert,
  Users,
  Plus,
  Pencil,
  X,
  UserCog,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Lock,
} from "lucide-react";
import {
  DIAS_SEMANA,
  EMPTY_CONFIG,
  EMPTY_SALAO,
  EMPTY_USUARIO_FORM,
  NIVEIS_USUARIO,
} from "@/components/configuracoes/constants";
import type {
  ConfigSalaoForm,
  SalaoForm,
  UsuarioForm,
  UsuarioSistema,
} from "@/components/configuracoes/types";
import {
  getNivelBadgeClass,
  normalizeTime,
  parseNumber,
} from "@/components/configuracoes/utils";
import {
  Field,
  SectionCard,
  SelectInput,
  TextInput,
  Toggle,
} from "@/components/configuracoes/ui";
import PlanoLimiteNotice from "@/components/plans/PlanoLimiteNotice";
import { usePlanoAccessSnapshot } from "@/components/plans/usePlanoAccessSnapshot";

export type ConfiguracoesSecao =
  | "agenda"
  | "caixa"
  | "sistema"
  | "usuarios";

const sectionMeta: Record<
  ConfiguracoesSecao,
  { title: string; description: string }
> = {
  agenda: {
    title: "Agenda e horários",
    description: "Dias de funcionamento, horários e intervalo da agenda.",
  },
  caixa: {
    title: "Caixa e taxas",
    description: "Taxas de maquininha, repasses e regras financeiras.",
  },
  sistema: {
    title: "Sistema",
    description: "Preferências visuais e regras gerais do sistema.",
  },
  usuarios: {
    title: "Usuários do sistema",
    description: "Equipe administrativa, acessos, perfis e limite do plano.",
  },
};

export default function ConfiguracoesPageClient({
  secao,
}: {
  secao: ConfiguracoesSecao;
}) {
  const supabase = createClient();
  const { planoAccess, upgradeTarget } = usePlanoAccessSnapshot(
    secao === "usuarios"
  );
  const mostrarAtalhoPerfilEmConfiguracoes = false;
  const mostrarDadosSalaoEmConfiguracoes = false;
  const meta = sectionMeta[secao];
  const mostrarAgenda = secao === "agenda";
  const mostrarCaixa = secao === "caixa";
  const mostrarSistema = secao === "sistema";
  const mostrarUsuarios = secao === "usuarios";

  const [loading, setLoading] = useState(true);
  const [semPermissao, setSemPermissao] = useState(false);

  const [savingSalao, setSavingSalao] = useState(false);
  const [savingAgenda, setSavingAgenda] = useState(false);
  const [savingFinanceiro, setSavingFinanceiro] = useState(false);
  const [savingSistema, setSavingSistema] = useState(false);
  const [savingUsuario, setSavingUsuario] = useState(false);
  const [deletingUsuario, setDeletingUsuario] = useState(false);

  const [erroTela, setErroTela] = useState("");
  const [msg, setMsg] = useState("");
  const [idSalao, setIdSalao] = useState("");

  const [salaoForm, setSalaoForm] = useState<SalaoForm>(EMPTY_SALAO);
  const [configForm, setConfigForm] = useState<ConfigSalaoForm>(EMPTY_CONFIG);

  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [limiteUsuarios, setLimiteUsuarios] = useState(0);

  const [usuarioModalOpen, setUsuarioModalOpen] = useState(false);
  const [usuarioForm, setUsuarioForm] = useState<UsuarioForm>(EMPTY_USUARIO_FORM);
  const [usuarioEditandoId, setUsuarioEditandoId] = useState<string | null>(null);

  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackModalType, setFeedbackModalType] = useState<"erro" | "sucesso">("erro");
  const [feedbackModalTitle, setFeedbackModalTitle] = useState("");
  const [feedbackModalMessage, setFeedbackModalMessage] = useState("");

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [usuarioExcluir, setUsuarioExcluir] = useState<UsuarioSistema | null>(null);

  const abrirFeedbackModal = useCallback(
    (type: "erro" | "sucesso", title: string, message: string) => {
      setFeedbackModalType(type);
      setFeedbackModalTitle(title);
      setFeedbackModalMessage(message);
      setFeedbackModalOpen(true);
    },
    []
  );

  const fecharFeedbackModal = useCallback(() => {
    setFeedbackModalOpen(false);
  }, []);

  const carregarUsuarios = useCallback(
    async (salaoIdParam?: string) => {
      const salaoIdFinal = salaoIdParam || idSalao;
      if (!salaoIdFinal) return;

      const { data, error } = await supabase
        .from("usuarios")
        .select("id, id_salao, nome, email, nivel, status, auth_user_id, created_at")
        .eq("id_salao", salaoIdFinal)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Erro ao carregar usuários:", error);
        throw error;
      }

      setUsuarios((data as UsuarioSistema[]) || []);
    },
    [supabase, idSalao]
  );

  const carregarLimiteUsuarios = useCallback(
    async (plano: string | null | undefined, statusSalao: string | null | undefined) => {
      try {
        if (statusSalao === "teste_gratis") {
          setLimiteUsuarios(1);
          return;
        }

        if (!plano) {
          setLimiteUsuarios(0);
          return;
        }

        const planoNormalizado = String(plano).trim().toLowerCase();

const { data, error } = await supabase
  .from("planos_saas")
  .select("id, codigo, nome, limite_usuarios, ativo")
  .eq("codigo", planoNormalizado)
  .limit(1);

        if (error) {
          console.error("Erro ao buscar plano por código:", error);
        }

        let planoRow = Array.isArray(data) && data.length > 0 ? data[0] : null;

        if (!planoRow) {
          const tentativaNome = await supabase
            .from("planos_saas")
            .select("id, codigo, nome, limite_usuarios, ativo")
            .ilike("nome", planoNormalizado)
            .eq("ativo", true)
            .limit(1);

          if (tentativaNome.error) {
            console.error("Erro ao buscar plano por nome:", tentativaNome.error);
          }

          planoRow =
            Array.isArray(tentativaNome.data) && tentativaNome.data.length > 0
              ? tentativaNome.data[0]
              : null;
        }

        setLimiteUsuarios(Number(planoRow?.limite_usuarios || 0));
      } catch (err) {
        console.error("Erro geral ao carregar limite de usuários:", err);
        setLimiteUsuarios(0);
      }
    },
    [supabase]
  );

  const init = useCallback(async () => {
    try {
      setLoading(true);
      setErroTela("");
      setMsg("");
      setSemPermissao(false);

      const usuario = await getUsuarioLogado();

      if (!usuario?.idSalao) {
        setErroTela("Não foi possível identificar o salão do usuário.");
        return;
      }

      const nivelUsuario = usuario?.perfil?.nivel as UserNivel | undefined;

      if (!hasPermission(nivelUsuario, "configuracoes_ver")) {
        setSemPermissao(true);
        return;
      }

      setIdSalao(usuario.idSalao);

      const [
        { data: salaoData, error: salaoError },
        { data: configData, error: configError },
      ] = await Promise.all([
        supabase.from("saloes").select("bairro, cep, cidade, complemento, cpf_cnpj, created_at, email, endereco, estado, id, inscricao_estadual, limite_profissionais, limite_usuarios, logo_url, nome, nome_fantasia, numero, plano, razao_social, renovacao_automatica, responsavel, status, telefone, tipo_pessoa, trial_ativo, trial_fim_em, trial_inicio_em, updated_at, whatsapp").eq("id", usuario.idSalao).maybeSingle(),
        supabase
          .from("configuracoes_salao")
          .select("cor_primaria, created_at, desconta_taxa_profissional, dias_funcionamento, exigir_cliente_na_venda, hora_abertura, hora_fechamento, id, id_salao, intervalo_minutos, modo_compacto, permitir_reabrir_venda, repassa_taxa_cliente, taxa_credito_10x, taxa_credito_11x, taxa_credito_12x, taxa_credito_1x, taxa_credito_2x, taxa_credito_3x, taxa_credito_4x, taxa_credito_5x, taxa_credito_6x, taxa_credito_7x, taxa_credito_8x, taxa_credito_9x, taxa_maquininha_boleto, taxa_maquininha_credito, taxa_maquininha_debito, taxa_maquininha_outro, taxa_maquininha_pix, taxa_maquininha_transferencia, updated_at")
          .eq("id_salao", usuario.idSalao)
          .maybeSingle(),
      ]);

      if (salaoError) {
        console.error("Erro ao carregar salão:", salaoError);
        setErroTela("Erro ao carregar dados do salão.");
        return;
      }

      if (configError && configError.code !== "PGRST116") {
        console.error("Erro ao carregar configurações:", configError);
      }

      if (salaoData) {
        setSalaoForm({
          id: salaoData.id || "",
          nome: salaoData.nome || "",
          responsavel: salaoData.responsavel || "",
          email: salaoData.email || "",
          telefone: salaoData.telefone || "",
          cpf_cnpj: salaoData.cpf_cnpj || "",
          endereco: salaoData.endereco || "",
          numero: salaoData.numero || "",
          bairro: salaoData.bairro || "",
          cidade: salaoData.cidade || "",
          estado: salaoData.estado || "",
          cep: salaoData.cep || "",
          logo_url: salaoData.logo_url || "",
          plano: salaoData.plano || "",
          status: salaoData.status || "",
        });

        await carregarLimiteUsuarios(salaoData.plano, salaoData.status);
      }

      if (configData) {
        setConfigForm({
          id: configData.id || "",
          id_salao: configData.id_salao || usuario.idSalao,
          hora_abertura: normalizeTime(configData.hora_abertura) || "08:00",
          hora_fechamento: normalizeTime(configData.hora_fechamento) || "19:00",
          intervalo_minutos: parseNumber(configData.intervalo_minutos || 15),
          dias_funcionamento:
            Array.isArray(configData.dias_funcionamento) && configData.dias_funcionamento.length > 0
              ? configData.dias_funcionamento.filter(
                  (dia): dia is string => typeof dia === "string"
                )
              : EMPTY_CONFIG.dias_funcionamento,
          taxa_maquininha_credito: parseNumber(configData.taxa_maquininha_credito),
          taxa_maquininha_debito: parseNumber(configData.taxa_maquininha_debito),
          taxa_maquininha_pix: parseNumber(configData.taxa_maquininha_pix),
          repassa_taxa_cliente: Boolean(configData.repassa_taxa_cliente),
          desconta_taxa_profissional: Boolean(configData.desconta_taxa_profissional),
          permitir_reabrir_venda:
            configData.permitir_reabrir_venda === null ||
            configData.permitir_reabrir_venda === undefined
              ? true
              : Boolean(configData.permitir_reabrir_venda),
          exigir_cliente_na_venda: Boolean(configData.exigir_cliente_na_venda),
          cor_primaria: configData.cor_primaria || "#18181b",
          modo_compacto: Boolean(configData.modo_compacto),
        });
      } else {
        setConfigForm((prev) => ({
          ...prev,
          id_salao: usuario.idSalao,
        }));
      }

      await carregarUsuarios(usuario.idSalao);
    } catch (error: unknown) {
      console.error(error);
      setErroTela(
        error instanceof Error ? error.message : "Erro ao carregar configurações."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase, carregarUsuarios, carregarLimiteUsuarios]);

  useEffect(() => {
    void init();
  }, [init]);

  async function upsertConfiguracoes(payload: Partial<ConfigSalaoForm>) {
    const salaoIdFinal = idSalao || configForm.id_salao || salaoForm.id;

    if (!salaoIdFinal) {
      throw new Error("id_salao não está definido.");
    }

    const dataToSave = {
      ...(configForm.id ? { id: configForm.id } : {}),
      id_salao: salaoIdFinal,
      hora_abertura: payload.hora_abertura ?? configForm.hora_abertura,
      hora_fechamento: payload.hora_fechamento ?? configForm.hora_fechamento,
      intervalo_minutos: payload.intervalo_minutos ?? configForm.intervalo_minutos,
      dias_funcionamento: payload.dias_funcionamento ?? configForm.dias_funcionamento,
      taxa_maquininha_credito:
        payload.taxa_maquininha_credito ?? configForm.taxa_maquininha_credito,
      taxa_maquininha_debito:
        payload.taxa_maquininha_debito ?? configForm.taxa_maquininha_debito,
      taxa_maquininha_pix:
        payload.taxa_maquininha_pix ?? configForm.taxa_maquininha_pix,
      repassa_taxa_cliente:
        payload.repassa_taxa_cliente ?? configForm.repassa_taxa_cliente,
      desconta_taxa_profissional:
        payload.desconta_taxa_profissional ?? configForm.desconta_taxa_profissional,
      permitir_reabrir_venda:
        payload.permitir_reabrir_venda ?? configForm.permitir_reabrir_venda,
      exigir_cliente_na_venda:
        payload.exigir_cliente_na_venda ?? configForm.exigir_cliente_na_venda,
      cor_primaria: payload.cor_primaria ?? configForm.cor_primaria,
      modo_compacto: payload.modo_compacto ?? configForm.modo_compacto,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("configuracoes_salao")
      .upsert(dataToSave, { onConflict: "id_salao" })
      .select("cor_primaria, created_at, desconta_taxa_profissional, dias_funcionamento, exigir_cliente_na_venda, hora_abertura, hora_fechamento, id, id_salao, intervalo_minutos, modo_compacto, permitir_reabrir_venda, repassa_taxa_cliente, taxa_credito_10x, taxa_credito_11x, taxa_credito_12x, taxa_credito_1x, taxa_credito_2x, taxa_credito_3x, taxa_credito_4x, taxa_credito_5x, taxa_credito_6x, taxa_credito_7x, taxa_credito_8x, taxa_credito_9x, taxa_maquininha_boleto, taxa_maquininha_credito, taxa_maquininha_debito, taxa_maquininha_outro, taxa_maquininha_pix, taxa_maquininha_transferencia, updated_at")
      .maybeSingle();

    if (error) throw error;

    if (data) {
      setConfigForm({
        id: data.id || configForm.id,
        id_salao: data.id_salao || salaoIdFinal,
        hora_abertura: normalizeTime(data.hora_abertura) || "08:00",
        hora_fechamento: normalizeTime(data.hora_fechamento) || "19:00",
        intervalo_minutos: parseNumber(data.intervalo_minutos || 15),
        dias_funcionamento:
          Array.isArray(data.dias_funcionamento) && data.dias_funcionamento.length > 0
            ? data.dias_funcionamento.filter(
                (dia): dia is string => typeof dia === "string"
              )
            : EMPTY_CONFIG.dias_funcionamento,
        taxa_maquininha_credito: parseNumber(data.taxa_maquininha_credito),
        taxa_maquininha_debito: parseNumber(data.taxa_maquininha_debito),
        taxa_maquininha_pix: parseNumber(data.taxa_maquininha_pix),
        repassa_taxa_cliente: Boolean(data.repassa_taxa_cliente),
        desconta_taxa_profissional: Boolean(data.desconta_taxa_profissional),
        permitir_reabrir_venda:
          data.permitir_reabrir_venda === null || data.permitir_reabrir_venda === undefined
            ? true
            : Boolean(data.permitir_reabrir_venda),
        exigir_cliente_na_venda: Boolean(data.exigir_cliente_na_venda),
        cor_primaria: data.cor_primaria || "#18181b",
        modo_compacto: Boolean(data.modo_compacto),
      });
    }
  }

  async function salvarDadosSalao() {
    if (!idSalao) return;

    try {
      setSavingSalao(true);
      setErroTela("");
      setMsg("");

      const { error } = await supabase
        .from("saloes")
        .update({
          nome: salaoForm.nome,
          responsavel: salaoForm.responsavel || null,
          email: salaoForm.email || null,
          telefone: salaoForm.telefone || null,
          cpf_cnpj: salaoForm.cpf_cnpj || null,
          endereco: salaoForm.endereco || null,
          numero: salaoForm.numero || null,
          bairro: salaoForm.bairro || null,
          cidade: salaoForm.cidade || null,
          estado: salaoForm.estado || null,
          cep: salaoForm.cep || null,
          logo_url: salaoForm.logo_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", idSalao);

      if (error) throw error;

      setMsg("Dados do salão atualizados com sucesso.");
      abrirFeedbackModal("sucesso", "Dados salvos", "Os dados do salão foram atualizados com sucesso.");
    } catch (error: unknown) {
      console.error(error);
      const mensagem =
        error instanceof Error ? error.message : "Erro ao salvar dados do salão.";
      setErroTela(mensagem);
      abrirFeedbackModal("erro", "Erro ao salvar", mensagem);
    } finally {
      setSavingSalao(false);
    }
  }

  async function salvarAgenda() {
    try {
      setSavingAgenda(true);
      setErroTela("");
      setMsg("");

      await upsertConfiguracoes({
        hora_abertura: configForm.hora_abertura,
        hora_fechamento: configForm.hora_fechamento,
        intervalo_minutos: configForm.intervalo_minutos,
        dias_funcionamento: configForm.dias_funcionamento,
      });

      setMsg("Configurações da agenda salvas com sucesso.");
      abrirFeedbackModal("sucesso", "Agenda salva", "As configurações da agenda foram salvas com sucesso.");
    } catch (error: unknown) {
      console.error(error);
      const mensagem =
        error instanceof Error ? error.message : "Erro ao salvar agenda.";
      setErroTela(mensagem);
      abrirFeedbackModal("erro", "Erro ao salvar agenda", mensagem);
    } finally {
      setSavingAgenda(false);
    }
  }

  async function salvarFinanceiro() {
    try {
      setSavingFinanceiro(true);
      setErroTela("");
      setMsg("");

      await upsertConfiguracoes({
        taxa_maquininha_credito: configForm.taxa_maquininha_credito,
        taxa_maquininha_debito: configForm.taxa_maquininha_debito,
        taxa_maquininha_pix: configForm.taxa_maquininha_pix,
        repassa_taxa_cliente: configForm.repassa_taxa_cliente,
        desconta_taxa_profissional: configForm.desconta_taxa_profissional,
      });

      setMsg("Configurações de caixa e taxas salvas com sucesso.");
      abrirFeedbackModal("sucesso", "Caixa salvo", "As configurações de caixa e taxas foram salvas com sucesso.");
    } catch (error: unknown) {
      console.error(error);
      const mensagem =
        error instanceof Error ? error.message : "Erro ao salvar caixa e taxas.";
      setErroTela(mensagem);
      abrirFeedbackModal("erro", "Erro ao salvar caixa", mensagem);
    } finally {
      setSavingFinanceiro(false);
    }
  }

  async function salvarSistema() {
    try {
      setSavingSistema(true);
      setErroTela("");
      setMsg("");

      await upsertConfiguracoes({
        permitir_reabrir_venda: configForm.permitir_reabrir_venda,
        exigir_cliente_na_venda: configForm.exigir_cliente_na_venda,
        cor_primaria: configForm.cor_primaria,
        modo_compacto: configForm.modo_compacto,
      });

      setMsg("Preferências do sistema salvas com sucesso.");
      abrirFeedbackModal("sucesso", "Sistema salvo", "As preferências do sistema foram salvas com sucesso.");
    } catch (error: unknown) {
      console.error(error);
      const mensagem =
        error instanceof Error ? error.message : "Erro ao salvar preferências do sistema.";
      setErroTela(mensagem);
      abrirFeedbackModal("erro", "Erro ao salvar sistema", mensagem);
    } finally {
      setSavingSistema(false);
    }
  }

  function toggleDiaFuncionamento(dia: string) {
    setConfigForm((prev) => {
      const exists = prev.dias_funcionamento.includes(dia);

      return {
        ...prev,
        dias_funcionamento: exists
          ? prev.dias_funcionamento.filter((item) => item !== dia)
          : [...prev.dias_funcionamento, dia],
      };
    });
  }

  function abrirNovoUsuario() {
    setUsuarioEditandoId(null);
    setUsuarioForm(EMPTY_USUARIO_FORM);
    setUsuarioModalOpen(true);
  }

  function abrirEditarUsuario(usuario: UsuarioSistema) {
    setUsuarioEditandoId(usuario.id);
    setUsuarioForm({
      id: usuario.id,
      nome: usuario.nome || "",
      email: usuario.email || "",
      nivel: (usuario.nivel as UserNivel) || "recepcao",
      senha: "",
      status: usuario.status || "ativo",
    });
    setUsuarioModalOpen(true);
  }

  function fecharModalUsuario() {
    if (savingUsuario) return;
    setUsuarioModalOpen(false);
    setUsuarioEditandoId(null);
    setUsuarioForm(EMPTY_USUARIO_FORM);
  }

  function abrirExcluirUsuario(usuario: UsuarioSistema) {
    setUsuarioExcluir(usuario);
    setDeleteModalOpen(true);
  }

  function fecharExcluirUsuario() {
    if (deletingUsuario) return;
    setDeleteModalOpen(false);
    setUsuarioExcluir(null);
  }

  const usuariosAtivosCount = useMemo(() => {
    return usuarios.filter((u) => u.status === "ativo").length;
  }, [usuarios]);

  const podeCriarUsuario = useMemo(() => {
    if (limiteUsuarios <= 0) return false;
    return usuariosAtivosCount < limiteUsuarios;
  }, [usuariosAtivosCount, limiteUsuarios]);

  const limiteUsuariosPlano = planoAccess?.limites?.usuarios ?? limiteUsuarios;
  const usoUsuariosPlano = planoAccess?.uso?.usuarios ?? usuariosAtivosCount;
  const atingiuLimiteUsuarios =
    !usuarioEditandoId &&
    limiteUsuariosPlano != null &&
    usoUsuariosPlano >= limiteUsuariosPlano;

  async function salvarUsuario() {
    if (!idSalao) return;

    try {
      setSavingUsuario(true);
      setErroTela("");
      setMsg("");

      if (!usuarioForm.nome.trim()) {
        throw new Error("Informe o nome do usuário.");
      }

      if (!usuarioForm.email.trim()) {
        throw new Error("Informe o e-mail do usuário.");
      }

      if (!usuarioEditandoId && !usuarioForm.senha.trim()) {
        throw new Error("Informe a senha do usuário.");
      }

      if (!usuarioEditandoId && usuarioForm.senha.trim().length < 6) {
        throw new Error("A senha deve ter pelo menos 6 caracteres.");
      }

      if (usuarioEditandoId && usuarioForm.senha.trim() && usuarioForm.senha.trim().length < 6) {
        throw new Error("A nova senha deve ter pelo menos 6 caracteres.");
      }

      if (atingiuLimiteUsuarios) {
        throw new Error(
          `Limite de usuários atingido para o plano atual. Limite: ${limiteUsuariosPlano}.`
        );
      }

      if (usuarioEditandoId) {
        const response = await fetch("/api/usuarios/atualizar", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            idUsuario: usuarioEditandoId,
            idSalao,
            nome: usuarioForm.nome.trim(),
            email: usuarioForm.email.trim().toLowerCase(),
            nivel: usuarioForm.nivel,
            senha: usuarioForm.senha.trim() || undefined,
            status: usuarioForm.status,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error || "Erro ao atualizar usuário.");
        }

        setMsg("Usuário atualizado com sucesso.");
        abrirFeedbackModal("sucesso", "Usuário atualizado", "As alterações do usuário foram salvas com sucesso.");
      } else {
        const response = await fetch("/api/usuarios/criar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            idSalao,
            nome: usuarioForm.nome.trim(),
            email: usuarioForm.email.trim().toLowerCase(),
            nivel: usuarioForm.nivel,
            senha: usuarioForm.senha.trim(),
            status: usuarioForm.status || "ativo",
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error || "Erro ao criar usuário.");
        }

        setMsg("Usuário criado com sucesso.");
        abrirFeedbackModal("sucesso", "Usuário criado", "O novo usuário foi criado com sucesso.");
      }

      await carregarUsuarios(idSalao);
      fecharModalUsuario();
    } catch (error: unknown) {
      console.error(error);
      const mensagem =
        error instanceof Error ? error.message : "Erro ao salvar usuário.";
      setErroTela(mensagem);
      abrirFeedbackModal("erro", "Erro no usuário", mensagem);
    } finally {
      setSavingUsuario(false);
    }
  }

  async function excluirUsuario() {
    if (!idSalao || !usuarioExcluir) return;

    try {
      setDeletingUsuario(true);
      setErroTela("");
      setMsg("");

      const response = await fetch("/api/usuarios/excluir", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idUsuario: usuarioExcluir.id,
          idSalao,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Erro ao excluir usuário.");
      }

      await carregarUsuarios(idSalao);
      setMsg("Usuário excluído com sucesso.");
      fecharExcluirUsuario();
      abrirFeedbackModal("sucesso", "Usuário excluído", "O usuário foi removido com sucesso.");
    } catch (error: unknown) {
      console.error(error);
      const mensagem =
        error instanceof Error ? error.message : "Erro ao excluir usuário.";
      setErroTela(mensagem);
      abrirFeedbackModal("erro", "Erro ao excluir", mensagem);
    } finally {
      setDeletingUsuario(false);
    }
  }

  const resumoDias = useMemo(() => {
    if (!configForm.dias_funcionamento.length) return "Nenhum dia selecionado";

    return DIAS_SEMANA.filter((d) => configForm.dias_funcionamento.includes(d.value))
      .map((d) => d.label)
      .join(", ");
  }, [configForm.dias_funcionamento]);

  const textoPlanoUsuarios = useMemo(() => {
    if (salaoForm.status === "teste_gratis") {
      return "Teste grátis: limite máximo de 1 usuário.";
    }

    if (limiteUsuarios <= 0) {
      return "Plano sem limite configurado ou não encontrado.";
    }

    return `Plano ${String(salaoForm.plano || "-").toUpperCase()} • Limite de ${limiteUsuarios} usuário(s).`;
  }, [salaoForm.status, salaoForm.plano, limiteUsuarios]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
          <Loader2 className="animate-spin text-zinc-700" size={18} />
          <span className="text-sm font-medium text-zinc-700">
            Carregando configurações...
          </span>
        </div>
      </div>
    );
  }

  if (semPermissao) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
              <ShieldAlert size={22} />
            </div>

            <div>
              <h1 className="text-xl font-bold text-amber-900">Sem permissão</h1>
              <p className="mt-2 text-sm text-amber-800">
                Seu usuário não tem acesso para visualizar esta página de configurações.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5">
        <section className="rounded-[32px] border border-zinc-200 bg-white px-6 py-7 text-zinc-950 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
            Configurações
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">{meta.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500">
            {meta.description}
          </p>
        </section>

        {erroTela ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {erroTela}
          </div>
        ) : null}

        {msg ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {msg}
          </div>
        ) : null}

        <div className="grid gap-5">
          {mostrarAtalhoPerfilEmConfiguracoes ? (
          <SectionCard
            icon={<Building2 size={18} />}
            title="Perfil do salão"
            description="Dados comerciais, endereço, logo e senha agora ficam em uma página própria."
          >
            <p className="text-sm leading-6 text-zinc-600">
              Para manter as configurações mais leves, a edição do salão foi
              separada do cadastro de regras internas.
            </p>

            <div className="mt-5">
              <Link
                href="/perfil-salao"
                className="inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5"
              >
                <Building2 size={16} />
                Abrir perfil do salão
              </Link>
            </div>
          </SectionCard>
          ) : null}

          {mostrarDadosSalaoEmConfiguracoes ? (
          <SectionCard
            icon={<Building2 size={18} />}
            title="Dados do salão"
            description="Nome, contato, endereço, logo e informações gerais."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Nome do salão">
                <TextInput
                  value={salaoForm.nome}
                  onChange={(e) => setSalaoForm((prev) => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex.: Salão Premium"
                />
              </Field>

              <Field label="Responsável">
                <TextInput
                  value={salaoForm.responsavel}
                  onChange={(e) =>
                    setSalaoForm((prev) => ({ ...prev, responsavel: e.target.value }))
                  }
                  placeholder="Nome do responsável"
                />
              </Field>

              <Field label="E-mail">
                <div className="relative">
                  <TextInput
                    value={salaoForm.email}
                    onChange={(e) => setSalaoForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="email@exemplo.com"
                    className="pl-11"
                  />
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                </div>
              </Field>

              <Field label="Telefone">
                <div className="relative">
                  <TextInput
                    value={salaoForm.telefone}
                    onChange={(e) =>
                      setSalaoForm((prev) => ({ ...prev, telefone: e.target.value }))
                    }
                    placeholder="(00) 00000-0000"
                    className="pl-11"
                  />
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                </div>
              </Field>

              <Field label="CPF/CNPJ">
                <TextInput
                  value={salaoForm.cpf_cnpj}
                  onChange={(e) =>
                    setSalaoForm((prev) => ({ ...prev, cpf_cnpj: e.target.value }))
                  }
                  placeholder="Documento"
                />
              </Field>

              <Field label="CEP">
                <TextInput
                  value={salaoForm.cep}
                  onChange={(e) => setSalaoForm((prev) => ({ ...prev, cep: e.target.value }))}
                  placeholder="00000-000"
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Endereço">
                  <div className="relative">
                    <TextInput
                      value={salaoForm.endereco}
                      onChange={(e) =>
                        setSalaoForm((prev) => ({ ...prev, endereco: e.target.value }))
                      }
                      placeholder="Rua / Avenida"
                      className="pl-11"
                    />
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  </div>
                </Field>
              </div>

              <Field label="Número">
                <TextInput
                  value={salaoForm.numero}
                  onChange={(e) => setSalaoForm((prev) => ({ ...prev, numero: e.target.value }))}
                  placeholder="Número"
                />
              </Field>

              <Field label="Bairro">
                <TextInput
                  value={salaoForm.bairro}
                  onChange={(e) => setSalaoForm((prev) => ({ ...prev, bairro: e.target.value }))}
                  placeholder="Bairro"
                />
              </Field>

              <Field label="Cidade">
                <TextInput
                  value={salaoForm.cidade}
                  onChange={(e) => setSalaoForm((prev) => ({ ...prev, cidade: e.target.value }))}
                  placeholder="Cidade"
                />
              </Field>

              <Field label="Estado">
                <TextInput
                  value={salaoForm.estado}
                  onChange={(e) => setSalaoForm((prev) => ({ ...prev, estado: e.target.value }))}
                  placeholder="UF"
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Logo URL">
                  <TextInput
                    value={salaoForm.logo_url}
                    onChange={(e) =>
                      setSalaoForm((prev) => ({ ...prev, logo_url: e.target.value }))
                    }
                    placeholder="https://..."
                  />
                </Field>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={salvarDadosSalao}
                disabled={savingSalao}
                className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white transition hover:opacity-95 disabled:opacity-60"
              >
                {savingSalao ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                Salvar dados do salão
              </button>
            </div>
          </SectionCard>
          ) : null}

          {mostrarAgenda ? (
          <SectionCard
            icon={<CalendarClock size={18} />}
            title="Agenda e horários"
            description="Dias de funcionamento, abertura, fechamento e intervalo."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Hora de abertura">
                <div className="relative">
                  <TextInput
                    type="time"
                    value={configForm.hora_abertura}
                    onChange={(e) =>
                      setConfigForm((prev) => ({ ...prev, hora_abertura: e.target.value }))
                    }
                    className="pl-11"
                  />
                  <Clock3 className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                </div>
              </Field>

              <Field label="Hora de fechamento">
                <div className="relative">
                  <TextInput
                    type="time"
                    value={configForm.hora_fechamento}
                    onChange={(e) =>
                      setConfigForm((prev) => ({ ...prev, hora_fechamento: e.target.value }))
                    }
                    className="pl-11"
                  />
                  <Clock3 className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                </div>
              </Field>

              <Field label="Intervalo da agenda (min)">
                <TextInput
                  type="number"
                  min={5}
                  step={5}
                  value={configForm.intervalo_minutos}
                  onChange={(e) =>
                    setConfigForm((prev) => ({
                      ...prev,
                      intervalo_minutos: parseNumber(e.target.value),
                    }))
                  }
                />
              </Field>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-700">
                <CalendarDays size={16} />
                Dias de funcionamento
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {DIAS_SEMANA.map((dia) => {
                  const active = configForm.dias_funcionamento.includes(dia.value);

                  return (
                    <button
                      key={dia.value}
                      type="button"
                      onClick={() => toggleDiaFuncionamento(dia.value)}
                      className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                        active
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                      }`}
                    >
                      {dia.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                <strong className="text-zinc-800">Resumo:</strong> {resumoDias}
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={salvarAgenda}
                disabled={savingAgenda}
                className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white transition hover:opacity-95 disabled:opacity-60"
              >
                {savingAgenda ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                Salvar agenda
              </button>
            </div>
          </SectionCard>

          ) : null}

          {mostrarCaixa ? (
          <SectionCard
            icon={<CreditCard size={18} />}
            title="Caixa e taxas"
            description="Taxa de maquininha, repasse, desconto e regras financeiras."
          >
            <ComissaoHelpPanel
              eyebrow="Como funciona"
              title="Essas taxas são gerais do salão"
              description="Aqui você define o comportamento financeiro da maquininha. A comissão só é afetada quando o serviço ou a exceção do profissional estiver marcado para descontar taxa."
              steps={[
                {
                  title: "Cadastre as taxas da operadora",
                  description: "Crédito, débito e PIX servem como base para o caixa inteiro.",
                },
                {
                  title: "Decida quem absorve a taxa",
                  description:
                    "Você pode repassar para o cliente, descontar do profissional ou não repassar para ninguém.",
                },
                {
                  title: "Ligue isso ao serviço",
                  description:
                    "A opção de descontar taxa na comissão precisa estar marcada no serviço ou na exceção do profissional.",
                },
              ]}
            >
              <div className="flex flex-wrap gap-2 text-xs font-medium text-zinc-600">
                <span className="rounded-full bg-white px-3 py-1 ring-1 ring-zinc-200">
                  Cliente absorve: {configForm.repassa_taxa_cliente ? "Sim" : "Não"}
                </span>
                <span className="rounded-full bg-white px-3 py-1 ring-1 ring-zinc-200">
                  Profissional absorve: {configForm.desconta_taxa_profissional ? "Sim" : "Não"}
                </span>
                <span className="rounded-full bg-white px-3 py-1 ring-1 ring-zinc-200">
                  Crédito: {configForm.taxa_maquininha_credito.toLocaleString("pt-BR")}%
                </span>
                <span className="rounded-full bg-white px-3 py-1 ring-1 ring-zinc-200">
                  Débito: {configForm.taxa_maquininha_debito.toLocaleString("pt-BR")}%
                </span>
                <span className="rounded-full bg-white px-3 py-1 ring-1 ring-zinc-200">
                  PIX: {configForm.taxa_maquininha_pix.toLocaleString("pt-BR")}%
                </span>
              </div>
            </ComissaoHelpPanel>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Taxa crédito (%)">
                <div className="relative">
                  <TextInput
                    type="number"
                    min={0}
                    step="0.01"
                    value={configForm.taxa_maquininha_credito}
                    onChange={(e) =>
                      setConfigForm((prev) => ({
                        ...prev,
                        taxa_maquininha_credito: parseNumber(e.target.value),
                      }))
                    }
                    className="pl-11"
                  />
                  <Percent className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                </div>
              </Field>

              <Field label="Taxa débito (%)">
                <div className="relative">
                  <TextInput
                    type="number"
                    min={0}
                    step="0.01"
                    value={configForm.taxa_maquininha_debito}
                    onChange={(e) =>
                      setConfigForm((prev) => ({
                        ...prev,
                        taxa_maquininha_debito: parseNumber(e.target.value),
                      }))
                    }
                    className="pl-11"
                  />
                  <Percent className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                </div>
              </Field>

              <Field label="Taxa PIX (%)">
                <div className="relative">
                  <TextInput
                    type="number"
                    min={0}
                    step="0.01"
                    value={configForm.taxa_maquininha_pix}
                    onChange={(e) =>
                      setConfigForm((prev) => ({
                        ...prev,
                        taxa_maquininha_pix: parseNumber(e.target.value),
                      }))
                    }
                    className="pl-11"
                  />
                  <Percent className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                </div>
              </Field>
            </div>

            <div className="mt-5 space-y-3">
              <Toggle
                checked={configForm.repassa_taxa_cliente}
                onChange={(checked) =>
                  setConfigForm((prev) => ({ ...prev, repassa_taxa_cliente: checked }))
                }
                label="Repassar taxa para o cliente"
                description="Quando ativo, a taxa da maquininha pode ser repassada ao cliente."
              />

              <Toggle
                checked={configForm.desconta_taxa_profissional}
                onChange={(checked) =>
                  setConfigForm((prev) => ({
                    ...prev,
                    desconta_taxa_profissional: checked,
                  }))
                }
                label="Descontar taxa do profissional"
                description="Quando ativo, a taxa pode impactar no cálculo da comissão do profissional."
              />
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={salvarFinanceiro}
                disabled={savingFinanceiro}
                className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white transition hover:opacity-95 disabled:opacity-60"
              >
                {savingFinanceiro ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Save size={16} />
                )}
                Salvar caixa e taxas
              </button>
            </div>
          </SectionCard>

          ) : null}

          {mostrarSistema ? (
          <SectionCard
            icon={<MonitorCog size={18} />}
            title="Sistema"
            description="Ajustes gerais, permissões e preferências visuais."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Cor principal">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={configForm.cor_primaria}
                    onChange={(e) =>
                      setConfigForm((prev) => ({ ...prev, cor_primaria: e.target.value }))
                    }
                    className="h-12 w-16 cursor-pointer rounded-xl border border-zinc-300 bg-white"
                  />
                  <div className="flex-1">
                    <div className="relative">
                      <TextInput
                        value={configForm.cor_primaria}
                        onChange={(e) =>
                          setConfigForm((prev) => ({ ...prev, cor_primaria: e.target.value }))
                        }
                        className="pl-11"
                      />
                      <Palette className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                    </div>
                  </div>
                </div>
              </Field>

              <Field label="Layout">
                <SelectInput
                  value={configForm.modo_compacto ? "compacto" : "normal"}
                  onChange={(e) =>
                    setConfigForm((prev) => ({
                      ...prev,
                      modo_compacto: e.target.value === "compacto",
                    }))
                  }
                >
                  <option value="normal">Normal</option>
                  <option value="compacto">Compacto</option>
                </SelectInput>
              </Field>
            </div>

            <div className="mt-5 space-y-3">
              <Toggle
                checked={configForm.permitir_reabrir_venda}
                onChange={(checked) =>
                  setConfigForm((prev) => ({
                    ...prev,
                    permitir_reabrir_venda: checked,
                  }))
                }
                label="Permitir reabrir venda"
                description="Ativa a ação de mandar venda fechada novamente para o caixa."
              />

              <Toggle
                checked={configForm.exigir_cliente_na_venda}
                onChange={(checked) =>
                  setConfigForm((prev) => ({
                    ...prev,
                    exigir_cliente_na_venda: checked,
                  }))
                }
                label="Exigir cliente na venda"
                description="Quando ativo, o sistema exige cliente vinculado antes de finalizar operações."
              />
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={salvarSistema}
                disabled={savingSistema}
                className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white transition hover:opacity-95 disabled:opacity-60"
              >
                {savingSistema ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                Salvar sistema
              </button>
            </div>
          </SectionCard>
          ) : null}
        </div>

        {mostrarUsuarios ? (
        <SectionCard
          icon={<Users size={18} />}
          title="Usuários do sistema"
          description="Crie, edite e exclua usuários de acordo com o limite do plano e o perfil de acesso."
        >
          {limiteUsuariosPlano != null ? (
            <PlanoLimiteNotice
              titulo="Equipe administrativa controlada pelo plano"
              descricao="Os acessos atuais continuam salvos. O upgrade libera novos usuários sem mexer no que já está configurado."
              usado={usoUsuariosPlano}
              limite={limiteUsuariosPlano}
              planoNome={planoAccess?.planoNome}
              upgradeTarget={upgradeTarget}
              disabled={atingiuLimiteUsuarios}
              className="mb-5"
            />
          ) : null}

          <div className="mb-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Plano atual
              </div>
              <div className="mt-2 text-xl font-bold text-zinc-900">
                {String(salaoForm.plano || "-").toUpperCase()}
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                {salaoForm.status === "teste_gratis" ? "Teste grátis" : "Plano SaaS"}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Limite de usuários
              </div>
              <div className="mt-2 text-xl font-bold text-zinc-900">
                {limiteUsuariosPlano ?? "-"}
              </div>
              <div className="mt-1 text-xs text-zinc-500">{textoPlanoUsuarios}</div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Cadastrados
              </div>
              <div className="mt-2 text-xl font-bold text-zinc-900">
                {usuarios.length}
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                Ativos: {usoUsuariosPlano}
              </div>
            </div>
          </div>

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-zinc-500">
              Perfis disponíveis: Admin, Gerente, Recepção e Profissional.
            </div>

            <button
              type="button"
              onClick={abrirNovoUsuario}
              disabled={!podeCriarUsuario || atingiuLimiteUsuarios}
              className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={16} />
              Novo usuário
            </button>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-zinc-200">
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Nome
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      E-mail
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Nível
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-200 bg-white">
                  {usuarios.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-500">
                        Nenhum usuário cadastrado.
                      </td>
                    </tr>
                  ) : (
                    usuarios.map((usuario) => (
                      <tr key={usuario.id}>
                        <td className="px-4 py-4">
                          <div className="font-semibold text-zinc-900">{usuario.nome}</div>
                        </td>

                        <td className="px-4 py-4 text-sm text-zinc-700">{usuario.email}</td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getNivelBadgeClass(
                              String(usuario.nivel)
                            )}`}
                          >
                            {String(usuario.nivel)}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              usuario.status === "ativo"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-zinc-200 text-zinc-700"
                            }`}
                          >
                            {usuario.status === "ativo" ? "Ativo" : "Inativo"}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => abrirEditarUsuario(usuario)}
                              className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                            >
                              <Pencil size={14} />
                              Editar
                            </button>

                            <button
                              type="button"
                              onClick={() => abrirExcluirUsuario(usuario)}
                              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                            >
                              <Trash2 size={14} />
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </SectionCard>
        ) : null}
      </div>

      {usuarioModalOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-4 backdrop-blur-md">
          <div className="w-full max-w-xl overflow-hidden rounded-[32px] border border-white/10 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.25)]">
            <div className="border-b border-zinc-200 bg-white px-6 py-5 text-zinc-950">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600">
                    <UserCog size={14} />
                    Usuário
                  </div>

                  <h2 className="mt-3 text-2xl font-bold">
                    {usuarioEditandoId ? "Editar usuário" : "Novo usuário"}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Cadastro de usuários <strong>e permissões</strong>.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fecharModalUsuario}
                  className="rounded-2xl border border-zinc-200 bg-white p-2 text-zinc-700 transition hover:bg-zinc-50"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-4 px-6 py-6">
              <Field label="Nome">
                <TextInput
                  value={usuarioForm.nome}
                  onChange={(e) =>
                    setUsuarioForm((prev) => ({ ...prev, nome: e.target.value }))
                  }
                  placeholder="Nome completo"
                />
              </Field>

              <Field label="E-mail">
                <div className="relative">
                  <TextInput
                    type="email"
                    value={usuarioForm.email}
                    onChange={(e) =>
                      setUsuarioForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="email@exemplo.com"
                    className="pl-11"
                  />
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                </div>
              </Field>

              <Field label={usuarioEditandoId ? "Nova senha (opcional)" : "Senha"}>
                <div className="relative">
                  <TextInput
                    type="password"
                    value={usuarioForm.senha}
                    onChange={(e) =>
                      setUsuarioForm((prev) => ({ ...prev, senha: e.target.value }))
                    }
                    placeholder={
                      usuarioEditandoId
                        ? "Preencha apenas se quiser trocar a senha"
                        : "Digite a senha do usuário"
                    }
                    className="pl-11"
                  />
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                </div>
              </Field>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Nível">
                  <div className="relative">
                    <SelectInput
                      value={usuarioForm.nivel}
                      onChange={(e) =>
                        setUsuarioForm((prev) => ({
                          ...prev,
                          nivel: e.target.value as UserNivel,
                        }))
                      }
                      className="pl-11"
                    >
                      {NIVEIS_USUARIO.map((nivel) => (
                        <option key={nivel.value} value={nivel.value}>
                          {nivel.label}
                        </option>
                      ))}
                    </SelectInput>
                    <UserCog className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  </div>
                </Field>

                <Field label="Status">
                  <SelectInput
                    value={usuarioForm.status}
                    onChange={(e) =>
                      setUsuarioForm((prev) => ({ ...prev, status: e.target.value }))
                    }
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </SelectInput>
                </Field>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4">
                <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  Limite do plano
                </div>
                <div className="mt-2 text-lg font-bold text-zinc-900">
                  {limiteUsuariosPlano ?? "-"} usuario(s)
                </div>
                <div className="mt-1 text-sm text-zinc-500">
                  Cadastrados ativos: {usoUsuariosPlano}
                  {!usuarioEditandoId && limiteUsuariosPlano != null
                    ? ` • Restantes: ${Math.max(limiteUsuariosPlano - usoUsuariosPlano, 0)}`
                    : ""}
                </div>
              </div>

              {!usuarioEditandoId && atingiuLimiteUsuarios ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                  O limite de usuários do plano atual foi atingido. Compare os planos ou faça upgrade para liberar novos acessos.
                </div>
              ) : null}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={fecharModalUsuario}
                disabled={savingUsuario}
                className="rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={salvarUsuario}
                disabled={savingUsuario || (!usuarioEditandoId && atingiuLimiteUsuarios)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white transition hover:opacity-95 disabled:opacity-60"
              >
                {savingUsuario ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                {usuarioEditandoId ? "Salvar alterações" : "Criar usuário"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteModalOpen ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/55 p-4 backdrop-blur-md">
          <div className="w-full max-w-md overflow-hidden rounded-[30px] border border-white/10 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.25)]">
            <div className="border-b border-rose-200 bg-rose-50 px-6 py-5 text-rose-800">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white p-3 ring-1 ring-rose-200">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Excluir usuário</h2>
                  <p className="text-sm text-rose-600">
                    Esta ação não pode ser desfeita.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-6">
              <p className="text-sm text-zinc-700">
                Deseja realmente excluir o usuário{" "}
                <strong>{usuarioExcluir?.nome || "-"}</strong>?
              </p>
              <p className="mt-2 text-sm text-zinc-500">
                E-mail: {usuarioExcluir?.email || "-"}
              </p>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={fecharExcluirUsuario}
                disabled={deletingUsuario}
                className="rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={excluirUsuario}
                disabled={deletingUsuario}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-bold text-white transition hover:opacity-95 disabled:opacity-60"
              >
                {deletingUsuario ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                Excluir usuário
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {feedbackModalOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
          <div className="w-full max-w-md overflow-hidden rounded-[30px] border border-white/10 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.3)]">
            <div
              className={`border-b px-6 py-5 ${
                feedbackModalType === "erro"
                  ? "border-rose-200 bg-rose-50 text-rose-800"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white p-3 ring-1 ring-current/20">
                  {feedbackModalType === "erro" ? (
                    <AlertTriangle size={20} />
                  ) : (
                    <CheckCircle2 size={20} />
                  )}
                </div>

                <div>
                  <h2 className="text-xl font-bold">{feedbackModalTitle}</h2>
                  <p className="text-sm opacity-80">
                    {feedbackModalType === "erro" ? "Revise as informações abaixo." : "Operação concluída com sucesso."}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-6">
              <p className="text-sm leading-6 text-zinc-700">{feedbackModalMessage}</p>
            </div>

            <div className="flex justify-end border-t border-zinc-200 bg-zinc-50 px-6 py-5">
              <button
                type="button"
                onClick={fecharFeedbackModal}
                className={`rounded-2xl px-5 py-3 text-sm font-bold text-white transition hover:opacity-95 ${
                  feedbackModalType === "erro" ? "bg-rose-600" : "bg-zinc-900"
                }`}
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
