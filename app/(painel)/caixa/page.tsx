"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import CaixaHeader from "@/components/caixa/CaixaHeader";
import CaixaFila from "@/components/caixa/CaixaFila";
import CaixaDetalhe from "@/components/caixa/CaixaDetalhe";
import CaixaResumo from "@/components/caixa/CaixaResumo";
import CaixaPagamentos from "@/components/caixa/CaixaPagamentos";
import {
  buscarVinculoProfissionalServico,
  resolverRegraComissaoServico,
} from "@/lib/comissoes/regrasServico";
import {
  AbaCaixa,
  AgendamentoFila,
  CatalogoExtra,
  CatalogoProduto,
  CatalogoServico,
  ComandaDetalhe,
  ComandaFila,
  ComandaItem,
  ComandaPagamento,
  ConfigCaixaSalao,
  ProfissionalResumo,
  TipoItemComanda,
} from "@/components/caixa/types";
import {
  agendamentosFiltradosBase,
  getJoinedName,
  parseMoney,
  getExtraPrice,
  getProdutoPrice,
  getServicoPrice,
  obterTaxaConfigurada,
} from "@/components/caixa/utils";
import {
  buildPermissoesByNivel,
  sanitizePermissoesDb,
  type Permissoes,
} from "@/components/caixa/permissions";
import { MOTIVOS_CANCELAMENTO_PADRAO } from "@/components/caixa/constants";

type ModalItemState = {
  open: boolean;
  mode: "create" | "edit";
  itemId: string | null;
  tipoItem: TipoItemComanda;
  catalogoId: string;
  descricao: string;
  quantidade: string;
  valorUnitario: string;
  idProfissional: string;
  idAssistente: string;
};

export default function CaixaPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erroTela, setErroTela] = useState("");
  const [msg, setMsg] = useState("");
  const [idSalao, setIdSalao] = useState("");

  const [permissoes, setPermissoes] = useState<Permissoes | null>(null);
  const [acessoCarregado, setAcessoCarregado] = useState(false);

  const [configCaixa, setConfigCaixa] = useState<ConfigCaixaSalao | null>(null);

  const [aba, setAba] = useState<AbaCaixa>("fila");
  const [busca, setBusca] = useState("");

  const [comandasFila, setComandasFila] = useState<ComandaFila[]>([]);
  const [agendamentosFila, setAgendamentosFila] = useState<AgendamentoFila[]>([]);
  const [comandasFechadas, setComandasFechadas] = useState<ComandaFila[]>([]);
  const [comandasCanceladas, setComandasCanceladas] = useState<ComandaFila[]>([]);

  const [comandaSelecionada, setComandaSelecionada] = useState<ComandaDetalhe | null>(null);
  const [itens, setItens] = useState<ComandaItem[]>([]);
  const [pagamentos, setPagamentos] = useState<ComandaPagamento[]>([]);

  const [descontoInput, setDescontoInput] = useState("0,00");
  const [acrescimoInput, setAcrescimoInput] = useState("0,00");

  const [formaPagamento, setFormaPagamento] = useState("pix");
  const [valorPagamento, setValorPagamento] = useState("");
  const [parcelas, setParcelas] = useState("1");
  const [taxaPercentual, setTaxaPercentual] = useState("0,00");
  const [observacaoPagamento, setObservacaoPagamento] = useState("");

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const [tipoMotivoCancelamento, setTipoMotivoCancelamento] = useState("");

  const [servicosCatalogo, setServicosCatalogo] = useState<CatalogoServico[]>([]);
  const [produtosCatalogo, setProdutosCatalogo] = useState<CatalogoProduto[]>([]);
  const [extrasCatalogo, setExtrasCatalogo] = useState<CatalogoExtra[]>([]);
  const [profissionaisCatalogo, setProfissionaisCatalogo] = useState<ProfissionalResumo[]>([]);

  const [itemModal, setItemModal] = useState<ModalItemState>({
    open: false,
    mode: "create",
    itemId: null,
    tipoItem: "servico",
    catalogoId: "",
    descricao: "",
    quantidade: "1",
    valorUnitario: "0,00",
    idProfissional: "",
    idAssistente: "",
  });

  const [buscaCatalogo, setBuscaCatalogo] = useState("");
  const [dropdownCatalogoOpen, setDropdownCatalogoOpen] = useState(false);

  const [buscaProfissional, setBuscaProfissional] = useState("");
  const [dropdownProfissionalOpen, setDropdownProfissionalOpen] = useState(false);

  const [buscaAssistente, setBuscaAssistente] = useState("");
  const [dropdownAssistenteOpen, setDropdownAssistenteOpen] = useState(false);

  const podeVerCaixa = !!permissoes?.caixa_ver;

  const podeOperarCaixa =
    !!permissoes?.caixa_editar ||
    !!permissoes?.caixa_operar ||
    !!permissoes?.caixa_pagamentos ||
    !!permissoes?.caixa_finalizar;

  const podeEditarCaixa =
    !!permissoes?.caixa_editar || !!permissoes?.caixa_operar;

  const podeGerenciarPagamentos =
    !!permissoes?.caixa_editar || !!permissoes?.caixa_pagamentos;

  const podeFinalizarCaixa =
    !!permissoes?.caixa_editar || !!permissoes?.caixa_finalizar;

  useEffect(() => {
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!configCaixa) {
      setTaxaPercentual("0,00");
      return;
    }

    const numeroParcelas = Math.max(Number(parcelas || 1), 1);
    const taxa = obterTaxaConfigurada(formaPagamento, numeroParcelas, configCaixa);

    setTaxaPercentual(
      Number(taxa || 0).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }, [formaPagamento, parcelas, configCaixa]);

  async function carregarAcesso() {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      router.replace("/login");
      return null;
    }

    const { data: usuario, error: usuarioError } = await supabase
      .from("usuarios")
      .select("id, id_salao, nivel, status")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (usuarioError || !usuario?.id || !usuario?.id_salao) {
      throw new Error("Não foi possível identificar o salão do usuário.");
    }

    if (usuario.status && usuario.status !== "ativo") {
      throw new Error("Usuário inativo.");
    }

    const { data: permissoesDb } = await supabase
      .from("usuarios_permissoes")
      .select("*")
      .eq("id_usuario", usuario.id)
      .eq("id_salao", usuario.id_salao)
      .maybeSingle();

    const nivelNormalizado = String(usuario.nivel || "").toLowerCase();
    const permissoesBase = buildPermissoesByNivel(nivelNormalizado);
    const permissoesSobrescritas = sanitizePermissoesDb(
      (permissoesDb as Record<string, unknown> | null) || null
    );

    const permissoesFinal: Permissoes = {
      ...permissoesBase,
      ...permissoesSobrescritas,
    };

    setPermissoes(permissoesFinal);
    setAcessoCarregado(true);

    if (!permissoesFinal.caixa_ver) {
      router.replace("/dashboard");
      return null;
    }

    return {
      user,
      usuario,
      permissoes: permissoesFinal,
    };
  }

  async function init() {
    try {
      setLoading(true);
      setErroTela("");
      setMsg("");

      const acesso = await carregarAcesso();
      if (!acesso) return;

      const salaoId = acesso.usuario.id_salao;
      setIdSalao(salaoId);

      await Promise.all([
        carregarTudo(salaoId),
        carregarCatalogos(salaoId),
        carregarConfiguracoesCaixa(salaoId),
      ]);
    } catch (error: any) {
      console.error(error);
      setErroTela(error?.message || "Erro ao carregar caixa.");
    } finally {
      setLoading(false);
    }
  }

  async function carregarConfiguracoesCaixa(salaoIdParam?: string) {
    const salaoId = salaoIdParam || idSalao;
    if (!salaoId) return;

    const { data, error } = await supabase
      .from("configuracoes_salao")
      .select(`
        id_salao,
        exigir_cliente_na_venda,
        repassa_taxa_cliente,
        taxa_maquininha_credito,
        taxa_maquininha_debito,
        taxa_maquininha_pix,
        taxa_maquininha_transferencia,
        taxa_maquininha_boleto,
        taxa_maquininha_outro,
        taxa_credito_1x,
        taxa_credito_2x,
        taxa_credito_3x,
        taxa_credito_4x,
        taxa_credito_5x,
        taxa_credito_6x,
        taxa_credito_7x,
        taxa_credito_8x,
        taxa_credito_9x,
        taxa_credito_10x,
        taxa_credito_11x,
        taxa_credito_12x
      `)
      .eq("id_salao", salaoId)
      .maybeSingle();

    if (error) {
      console.error("Erro ao carregar configurações do caixa:", error);
      setConfigCaixa(null);
      return;
    }

    setConfigCaixa((data as ConfigCaixaSalao) || null);
  }

  async function carregarCatalogos(salaoIdParam?: string) {
    const salaoId = salaoIdParam || idSalao;
    if (!salaoId) return;

    const [servicosRes, produtosRes, extrasRes, profissionaisRes] = await Promise.all([
      supabase
        .from("servicos")
        .select("*")
        .eq("id_salao", salaoId)
        .eq("status", "ativo")
        .order("nome", { ascending: true }),

      supabase
        .from("produtos")
        .select("*")
        .eq("id_salao", salaoId)
        .eq("status", "ativo")
        .order("nome", { ascending: true }),

      supabase
        .from("itens_extras")
        .select("*")
        .eq("id_salao", salaoId)
        .order("nome", { ascending: true }),

      supabase
        .from("profissionais")
        .select("id, nome, comissao_percentual")
        .eq("id_salao", salaoId)
        .eq("status", "ativo")
        .order("nome", { ascending: true }),
    ]);

    if (servicosRes.error) {
      console.error("Erro ao carregar serviços do caixa:", servicosRes.error);
    } else {
      setServicosCatalogo((servicosRes.data as CatalogoServico[]) || []);
    }

    if (produtosRes.error) {
      console.error("Erro ao carregar produtos do caixa:", produtosRes.error);
      setProdutosCatalogo([]);
    } else {
      setProdutosCatalogo((produtosRes.data as CatalogoProduto[]) || []);
    }

    if (extrasRes.error) {
      console.error("Erro ao carregar extras do caixa:", extrasRes.error);
      setExtrasCatalogo([]);
    } else {
      setExtrasCatalogo((extrasRes.data as CatalogoExtra[]) || []);
    }

    if (profissionaisRes.error) {
      console.error("Erro ao carregar profissionais do caixa:", profissionaisRes.error);
      setProfissionaisCatalogo([]);
    } else {
      setProfissionaisCatalogo((profissionaisRes.data as ProfissionalResumo[]) || []);
    }
  }

  async function carregarTudo(salaoIdParam?: string) {
    const salaoId = salaoIdParam || idSalao;
    if (!salaoId) return;

    await Promise.all([
      carregarFilaComandas(salaoId),
      carregarAgendamentosSemComanda(salaoId),
      carregarFechadasHoje(salaoId),
      carregarCanceladas(salaoId),
    ]);
  }

  async function carregarFilaComandas(salaoIdParam?: string) {
    const salaoId = salaoIdParam || idSalao;
    if (!salaoId) return;

    const { data, error } = await supabase
      .from("comandas")
      .select(`
        id,
        numero,
        status,
        aberta_em,
        subtotal,
        desconto,
        acrescimo,
        total,
        id_cliente,
        clientes (
          nome
        )
      `)
      .eq("id_salao", salaoId)
      .in("status", ["aberta", "em_atendimento", "aguardando_pagamento"])
      .order("aberta_em", { ascending: true });

    if (error) {
      console.error(error);
      setErroTela("Erro ao carregar fila de comandas.");
      return;
    }

    const sorted = ((data as ComandaFila[]) || []).sort((a, b) => {
      const peso = (status: string) => {
        if (status === "aguardando_pagamento") return 1;
        if (status === "em_atendimento") return 2;
        if (status === "aberta") return 3;
        return 4;
      };

      return peso(a.status) - peso(b.status);
    });

    setComandasFila(sorted);
  }

  async function carregarAgendamentosSemComanda(salaoIdParam?: string) {
    const salaoId = salaoIdParam || idSalao;
    if (!salaoId) return;

    const { data, error } = await supabase
      .from("agendamentos")
      .select(`
        id,
        data,
        hora_inicio,
        hora_fim,
        status,
        id_comanda,
        cliente_id,
        profissional_id,
        servico_id
      `)
      .eq("id_salao", salaoId)
      .is("id_comanda", null)
      .eq("status", "aguardando_pagamento")
      .order("data", { ascending: true })
      .order("hora_inicio", { ascending: true });

    if (error) {
      console.error("Erro Supabase agendamentos sem comanda:", error);
      setErroTela("Erro ao carregar agendamentos sem comanda.");
      return;
    }

    const agendamentosBase = (data as AgendamentoFila[]) || [];

    const clienteIds = Array.from(
      new Set(agendamentosBase.map((item) => item.cliente_id).filter(Boolean))
    ) as string[];

    const profissionalIds = Array.from(
      new Set(agendamentosBase.map((item) => item.profissional_id).filter(Boolean))
    ) as string[];

    const servicoIds = Array.from(
      new Set(agendamentosBase.map((item) => item.servico_id).filter(Boolean))
    ) as string[];

    let mapaClientes = new Map<string, { id: string; nome: string }>();
    let mapaProfissionais = new Map<string, { id: string; nome: string }>();
    let mapaServicos = new Map<string, { id: string; nome: string; preco?: number | null }>();

    if (clienteIds.length > 0) {
      const { data: clientesData, error: clientesError } = await supabase
        .from("clientes")
        .select("id, nome")
        .in("id", clienteIds);

      if (clientesError) {
        console.error("Erro ao buscar clientes dos agendamentos:", clientesError);
        setErroTela("Erro ao carregar clientes dos agendamentos.");
        return;
      }

      mapaClientes = new Map(
        (((clientesData as { id: string; nome: string }[]) || [])).map((item) => [
          item.id,
          item,
        ])
      );
    }

    if (profissionalIds.length > 0) {
      const { data: profissionaisData, error: profissionaisError } = await supabase
        .from("profissionais")
        .select("id, nome")
        .in("id", profissionalIds);

      if (profissionaisError) {
        console.error("Erro ao buscar profissionais dos agendamentos:", profissionaisError);
        setErroTela("Erro ao carregar profissionais dos agendamentos.");
        return;
      }

      mapaProfissionais = new Map(
        (((profissionaisData as { id: string; nome: string }[]) || [])).map((item) => [
          item.id,
          item,
        ])
      );
    }

    if (servicoIds.length > 0) {
      const { data: servicosData, error: servicosError } = await supabase
        .from("servicos")
        .select("id, nome, preco")
        .in("id", servicoIds);

      if (servicosError) {
        console.error("Erro ao buscar serviços dos agendamentos:", servicosError);
        setErroTela("Erro ao carregar serviços dos agendamentos.");
        return;
      }

      mapaServicos = new Map(
        (((servicosData as { id: string; nome: string; preco?: number | null }[]) || [])).map(
          (item) => [item.id, item]
        )
      );
    }

    const agendamentosFormatados: AgendamentoFila[] = agendamentosBase.map((item) => ({
      ...item,
      clientes: item.cliente_id
        ? { nome: mapaClientes.get(item.cliente_id)?.nome || "Sem cliente" }
        : null,
      profissionais: item.profissional_id
        ? { nome: mapaProfissionais.get(item.profissional_id)?.nome || "Sem profissional" }
        : null,
      servicos: item.servico_id
        ? {
            nome: mapaServicos.get(item.servico_id)?.nome || "Serviço",
            preco: mapaServicos.get(item.servico_id)?.preco || 0,
          }
        : null,
    }));

    setAgendamentosFila(agendamentosFormatados);
  }

  async function carregarFechadasHoje(salaoIdParam?: string) {
    const salaoId = salaoIdParam || idSalao;
    if (!salaoId) return;

    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date();
    fim.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("comandas")
      .select(`
        id,
        numero,
        status,
        fechada_em,
        total,
        id_cliente,
        clientes (
          nome
        )
      `)
      .eq("id_salao", salaoId)
      .eq("status", "fechada")
      .gte("fechada_em", inicio.toISOString())
      .lte("fechada_em", fim.toISOString())
      .order("fechada_em", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setComandasFechadas((data as ComandaFila[]) || []);
  }

  async function carregarCanceladas(salaoIdParam?: string) {
    const salaoId = salaoIdParam || idSalao;
    if (!salaoId) return;

    const { data, error } = await supabase
      .from("comandas")
      .select(`
        id,
        numero,
        status,
        cancelada_em,
        total,
        id_cliente,
        clientes (
          nome
        )
      `)
      .eq("id_salao", salaoId)
      .eq("status", "cancelada")
      .order("cancelada_em", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setComandasCanceladas((data as ComandaFila[]) || []);
  }

  async function abrirComanda(idComanda: string) {
    if (!podeOperarCaixa) {
      setErroTela("Você não tem permissão para operar o caixa.");
      return;
    }

    try {
      setSaving(true);
      setErroTela("");
      setMsg("");

      const { data: comandaData, error: comandaError } = await supabase
        .from("comandas")
        .select(`
          *,
          clientes (
            nome
          )
        `)
        .eq("id", idComanda)
        .maybeSingle();

      if (comandaError || !comandaData) {
        throw new Error("Não foi possível abrir a comanda.");
      }

      const { data: itensData, error: itensError } = await supabase
        .from("comanda_itens")
        .select("*")
        .eq("id_comanda", idComanda)
        .eq("ativo", true);

      if (itensError) {
        console.error("Erro Supabase comanda_itens:", itensError);
        throw new Error("Erro ao carregar itens da comanda.");
      }

      const { data: pagamentosData, error: pagamentosError } = await supabase
        .from("comanda_pagamentos")
        .select("*")
        .eq("id_comanda", idComanda);

      if (pagamentosError) {
        console.error("Erro Supabase comanda_pagamentos:", pagamentosError);
        throw new Error("Erro ao carregar pagamentos da comanda.");
      }

      const itensBase = (itensData as ComandaItem[]) || [];

      const idsProfissionais = Array.from(
        new Set(
          itensBase
            .flatMap((item) => [item.id_profissional, item.id_assistente])
            .filter(Boolean)
        )
      ) as string[];

      let mapaProfissionais = new Map<string, { id: string; nome: string }>();

      if (idsProfissionais.length > 0) {
        const { data: profissionaisData, error: profissionaisError } = await supabase
          .from("profissionais")
          .select("id, nome")
          .in("id", idsProfissionais);

        if (profissionaisError) {
          console.error("Erro Supabase profissionais:", profissionaisError);
          throw new Error("Erro ao carregar profissionais da comanda.");
        }

        mapaProfissionais = new Map(
          ((profissionaisData as { id: string; nome: string }[]) || []).map((prof) => [
            prof.id,
            prof,
          ])
        );
      }

      const itensFormatados: ComandaItem[] = itensBase.map((item) => ({
        ...item,
        profissionais: item.id_profissional
          ? { nome: mapaProfissionais.get(item.id_profissional)?.nome || "-" }
          : null,
        assistente_ref: item.id_assistente
          ? { nome: mapaProfissionais.get(item.id_assistente)?.nome || "-" }
          : null,
      }));

      const detalhe = comandaData as ComandaDetalhe;

      setComandaSelecionada(detalhe);
      setItens(itensFormatados);
      setPagamentos((pagamentosData as ComandaPagamento[]) || []);
      setDescontoInput(
        Number(detalhe.desconto || 0).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      );
      setAcrescimoInput(
        Number(detalhe.acrescimo || 0).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      );
    } catch (error: any) {
      console.error(error);
      setErroTela(error?.message || "Erro ao abrir comanda.");
    } finally {
      setSaving(false);
    }
  }

  async function abrirAgendamentoSemComanda(agendamentoId: string) {
    if (!podeOperarCaixa) {
      setErroTela("Você não tem permissão para operar o caixa.");
      return;
    }

    try {
      setSaving(true);
      setErroTela("");
      setMsg("");

      const { data, error } = await supabase.rpc("fn_criar_comanda_por_agendamento", {
        p_id_agendamento: agendamentoId,
      });

      if (error) {
        throw new Error(error.message || "Erro ao criar comanda do agendamento.");
      }

      const idComanda = data?.id_comanda;
      if (!idComanda) {
        throw new Error("Não foi possível obter a comanda criada.");
      }

      await carregarTudo();
      await abrirComanda(idComanda);
      setMsg(
        data?.ja_existia
          ? "Comanda existente aberta com sucesso."
          : "Comanda criada a partir do agendamento."
      );
    } catch (error: any) {
      console.error(error);
      setErroTela(error?.message || "Erro ao abrir agendamento no caixa.");
    } finally {
      setSaving(false);
    }
  }

  async function salvarDescontoAcrescimo() {
    if (!comandaSelecionada) return;
    if (!podeEditarCaixa) {
      setErroTela("Você não tem permissão para editar o caixa.");
      return;
    }

    try {
      setSaving(true);
      setErroTela("");
      setMsg("");

      const desconto = parseMoney(descontoInput);
      const acrescimo = parseMoney(acrescimoInput);

      const { error } = await supabase
        .from("comandas")
        .update({
          desconto,
          acrescimo,
        })
        .eq("id", comandaSelecionada.id);

      if (error) {
        throw new Error("Erro ao atualizar desconto/acréscimo.");
      }

      await supabase.rpc("fn_recalcular_total_comanda", {
        p_id_comanda: comandaSelecionada.id,
      });

      await abrirComanda(comandaSelecionada.id);
      await carregarTudo();
      setMsg("Resumo financeiro atualizado.");
    } catch (error: any) {
      console.error(error);
      setErroTela(error?.message || "Erro ao atualizar resumo.");
    } finally {
      setSaving(false);
    }
  }

  async function adicionarPagamento() {
    if (!comandaSelecionada) return;
    if (!podeGerenciarPagamentos) {
      setErroTela("Você não tem permissão para lançar pagamentos.");
      return;
    }

    try {
      setSaving(true);
      setErroTela("");
      setMsg("");

      const valorBase = parseMoney(valorPagamento);
      const numeroParcelas = Math.max(Number(parcelas || 1), 1);

      if (valorBase <= 0) {
        throw new Error("Informe um valor de pagamento válido.");
      }

      const taxa = obterTaxaConfigurada(formaPagamento, numeroParcelas, configCaixa);
      const taxaValor = Number(((valorBase * taxa) / 100).toFixed(2));

      const repassaTaxaCliente = Boolean(configCaixa?.repassa_taxa_cliente);
      const valorFinalCobrado = repassaTaxaCliente
        ? Number((valorBase + taxaValor).toFixed(2))
        : valorBase;

      const { error } = await supabase.from("comanda_pagamentos").insert({
        id_salao: idSalao,
        id_comanda: comandaSelecionada.id,
        forma_pagamento: formaPagamento,
        valor: valorFinalCobrado,
        parcelas: numeroParcelas,
        taxa_maquininha_percentual: taxa,
        taxa_maquininha_valor: taxaValor,
        observacoes: observacaoPagamento || null,
      });

      if (error) {
        throw new Error(error.message || "Erro ao adicionar pagamento.");
      }

      setValorPagamento("");
      setParcelas("1");
      setObservacaoPagamento("");

      const taxaAuto = obterTaxaConfigurada(formaPagamento, 1, configCaixa);
      setTaxaPercentual(
        Number(taxaAuto || 0).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      );

      await abrirComanda(comandaSelecionada.id);
      setMsg(
        repassaTaxaCliente && taxaValor > 0
          ? `Pagamento adicionado com taxa repassada ao cliente (${taxaValor.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}).`
          : "Pagamento adicionado."
      );
    } catch (error: any) {
      console.error(error);
      setErroTela(error?.message || "Erro ao adicionar pagamento.");
    } finally {
      setSaving(false);
    }
  }

  async function removerPagamento(idPagamento: string) {
    if (!comandaSelecionada) return;
    if (!podeGerenciarPagamentos) {
      setErroTela("Você não tem permissão para remover pagamentos.");
      return;
    }

    try {
      setSaving(true);
      setErroTela("");
      setMsg("");

      const { error } = await supabase
        .from("comanda_pagamentos")
        .delete()
        .eq("id", idPagamento)
        .eq("id_comanda", comandaSelecionada.id);

      if (error) {
        throw new Error("Erro ao remover pagamento.");
      }

      await abrirComanda(comandaSelecionada.id);
      setMsg("Pagamento removido.");
    } catch (error: any) {
      console.error(error);
      setErroTela(error?.message || "Erro ao remover pagamento.");
    } finally {
      setSaving(false);
    }
  }

  async function recalcularTaxaProfissionalAposFechamento(idComanda: string) {
    const response = await fetch("/api/comissoes/recalcular-taxa-profissional", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idSalao,
        idComanda,
      }),
    });

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      throw new Error(
        result?.error || "não foi possível recalcular a taxa da comissão."
      );
    }
  }

  async function finalizarComanda() {
    if (!comandaSelecionada) return;
    if (!podeFinalizarCaixa) {
      setErroTela("Você não tem permissão para finalizar vendas.");
      return;
    }

    try {
      setSaving(true);
      setErroTela("");
      setMsg("");

      if (configCaixa?.exigir_cliente_na_venda && !comandaSelecionada.id_cliente) {
        throw new Error("Esta venda exige cliente vinculado antes da finalização.");
      }

      const numeroAtual = comandaSelecionada.numero;

      const { error } = await supabase.rpc("fn_fechar_comanda", {
        p_id_comanda: comandaSelecionada.id,
      });

      if (error) {
        throw new Error(error.message || "Erro ao finalizar comanda.");
      }

      let avisoRecalculo = "";

      try {
        await recalcularTaxaProfissionalAposFechamento(comandaSelecionada.id);
      } catch (recalculoError: any) {
        avisoRecalculo =
          recalculoError?.message || "não foi possível recalcular a taxa da comissão.";
      }

      await carregarTudo();
      setComandaSelecionada(null);
      setItens([]);
      setPagamentos([]);
      setMsg(
        avisoRecalculo
          ? `Comanda #${numeroAtual} finalizada, mas ${avisoRecalculo}`
          : `Comanda #${numeroAtual} finalizada com sucesso.`
      );
    } catch (error: any) {
      console.error(error);
      setErroTela(error?.message || "Erro ao finalizar comanda.");
    } finally {
      setSaving(false);
    }
  }

  function abrirModalCancelamento() {
    if (!comandaSelecionada) return;
    if (!podeFinalizarCaixa) {
      setErroTela("Você não tem permissão para cancelar comandas.");
      return;
    }
    setTipoMotivoCancelamento("");
    setMotivoCancelamento("");
    setCancelModalOpen(true);
  }

  function fecharModalCancelamento() {
    if (saving) return;
    setCancelModalOpen(false);
    setTipoMotivoCancelamento("");
    setMotivoCancelamento("");
  }

  async function confirmarCancelamentoComanda() {
    if (!comandaSelecionada) return;
    if (!podeFinalizarCaixa) {
      setErroTela("Você não tem permissão para cancelar comandas.");
      return;
    }

    try {
      setSaving(true);
      setErroTela("");
      setMsg("");

      const motivoFinal = [tipoMotivoCancelamento, motivoCancelamento.trim()]
        .filter(Boolean)
        .join(" - ");

      const { error } = await supabase.rpc("fn_cancelar_comanda", {
        p_id_comanda: comandaSelecionada.id,
        p_motivo: motivoFinal || null,
      });

      if (error) {
        throw new Error(error.message || "Erro ao cancelar comanda.");
      }

      await carregarTudo();
      setComandaSelecionada(null);
      setItens([]);
      setPagamentos([]);
      setCancelModalOpen(false);
      setTipoMotivoCancelamento("");
      setMotivoCancelamento("");
      setMsg("Comanda cancelada com sucesso.");
    } catch (error: any) {
      console.error(error);
      setErroTela(error?.message || "Erro ao cancelar comanda.");
    } finally {
      setSaving(false);
    }
  }

  function abrirModalNovoItem(tipo: TipoItemComanda) {
    if (!comandaSelecionada) return;
    if (!podeEditarCaixa) {
      setErroTela("Você não tem permissão para adicionar itens.");
      return;
    }

    setBuscaCatalogo("");
    setBuscaProfissional("");
    setBuscaAssistente("");
    setDropdownCatalogoOpen(false);
    setDropdownProfissionalOpen(false);
    setDropdownAssistenteOpen(false);

    setItemModal({
      open: true,
      mode: "create",
      itemId: null,
      tipoItem: tipo,
      catalogoId: "",
      descricao: "",
      quantidade: "1",
      valorUnitario: "0,00",
      idProfissional: "",
      idAssistente: "",
    });
  }

  function abrirModalEditarItem(item: ComandaItem) {
    if (!podeEditarCaixa) {
      setErroTela("Você não tem permissão para editar itens.");
      return;
    }

    const profissionalAtual = profissionaisCatalogo.find((p) => p.id === item.id_profissional);
    const assistenteAtual = profissionaisCatalogo.find((p) => p.id === item.id_assistente);

    setBuscaCatalogo(item.descricao || "");
    setBuscaProfissional(profissionalAtual?.nome || "");
    setBuscaAssistente(assistenteAtual?.nome || "");
    setDropdownCatalogoOpen(false);
    setDropdownProfissionalOpen(false);
    setDropdownAssistenteOpen(false);

    setItemModal({
      open: true,
      mode: "edit",
      itemId: item.id,
      tipoItem: item.tipo_item,
      catalogoId: "",
      descricao: item.descricao || "",
      quantidade: String(Number(item.quantidade || 1)),
      valorUnitario: Number(item.valor_unitario || 0).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      idProfissional: item.id_profissional || "",
      idAssistente: item.id_assistente || "",
    });
  }

  function fecharModalItem() {
    if (saving) return;

    setBuscaCatalogo("");
    setBuscaProfissional("");
    setBuscaAssistente("");
    setDropdownCatalogoOpen(false);
    setDropdownProfissionalOpen(false);
    setDropdownAssistenteOpen(false);

    setItemModal({
      open: false,
      mode: "create",
      itemId: null,
      tipoItem: "servico",
      catalogoId: "",
      descricao: "",
      quantidade: "1",
      valorUnitario: "0,00",
      idProfissional: "",
      idAssistente: "",
    });
  }

  function preencherPorCatalogo(tipo: TipoItemComanda, id: string) {
    if (!id) {
      setItemModal((prev) => ({
        ...prev,
        catalogoId: "",
      }));
      return;
    }

    if (tipo === "servico") {
      const servico = servicosCatalogo.find((item) => item.id === id);
      if (!servico) return;

      setItemModal((prev) => ({
        ...prev,
        catalogoId: id,
        descricao: servico.nome || "",
        valorUnitario: getServicoPrice(servico).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      }));

      setBuscaCatalogo(servico.nome || "");
      setDropdownCatalogoOpen(false);
      return;
    }

    if (tipo === "produto") {
      const produto = produtosCatalogo.find((item) => item.id === id);
      if (!produto) return;

      setItemModal((prev) => ({
        ...prev,
        catalogoId: id,
        descricao: produto.nome || "",
        valorUnitario: getProdutoPrice(produto).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      }));

      setBuscaCatalogo(produto.nome || "");
      setDropdownCatalogoOpen(false);
      return;
    }

    if (tipo === "extra") {
      const extra = extrasCatalogo.find((item) => item.id === id);
      if (!extra) return;

      setItemModal((prev) => ({
        ...prev,
        catalogoId: id,
        descricao: extra.nome || "",
        valorUnitario: getExtraPrice(extra).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      }));

      setBuscaCatalogo(extra.nome || "");
      setDropdownCatalogoOpen(false);
      return;
    }
  }

  async function salvarItemComanda() {
    if (!comandaSelecionada) return;
    if (!podeEditarCaixa) {
      setErroTela("Você não tem permissão para editar itens.");
      return;
    }

    try {
      setSaving(true);
      setErroTela("");
      setMsg("");

      const quantidade = Math.max(Number(itemModal.quantidade || 1), 1);
      const valorUnitario = parseMoney(itemModal.valorUnitario);
      const valorTotal = Number((quantidade * valorUnitario).toFixed(2));

      if (!itemModal.descricao.trim()) {
        throw new Error("Informe a descrição do item.");
      }

      if (valorUnitario < 0) {
        throw new Error("Informe um valor unitário válido.");
      }

      let payloadBase: Record<string, any> = {
        id_salao: idSalao,
        id_comanda: comandaSelecionada.id,
        tipo_item: itemModal.tipoItem,
        descricao: itemModal.descricao.trim(),
        quantidade,
        valor_unitario: valorUnitario,
        valor_total: valorTotal,
        custo_total: 0,
        id_profissional: itemModal.idProfissional || null,
        id_assistente: itemModal.idAssistente || null,
        origem: "caixa_manual",
        ativo: true,
      };

      if (itemModal.tipoItem === "servico") {
        const servico = servicosCatalogo.find((item) => item.id === itemModal.catalogoId);
        const profissional = profissionaisCatalogo.find(
          (item) => item.id === itemModal.idProfissional
        );
        const vinculo =
          servico?.id && itemModal.idProfissional
            ? await buscarVinculoProfissionalServico({
                supabase,
                idProfissional: itemModal.idProfissional,
                idServico: servico.id,
              })
            : null;
        const regraServico = resolverRegraComissaoServico({
          servico,
          profissional,
          vinculo,
        });

        payloadBase = {
          ...payloadBase,
          id_servico: servico?.id || null,
          comissao_percentual_aplicada: regraServico.comissaoPercentual,
          comissao_valor_aplicado: 0,
          comissao_assistente_percentual_aplicada:
            regraServico.comissaoAssistentePercentual,
          comissao_assistente_valor_aplicado: 0,
          base_calculo_aplicada: regraServico.baseCalculo,
          desconta_taxa_maquininha_aplicada: regraServico.descontaTaxaMaquininha,
        };
      } else {
        payloadBase = {
          ...payloadBase,
          comissao_percentual_aplicada: 0,
          comissao_valor_aplicado: 0,
          comissao_assistente_percentual_aplicada: 0,
          comissao_assistente_valor_aplicado: 0,
          base_calculo_aplicada: "bruto",
          desconta_taxa_maquininha_aplicada: false,
        };
      }

      if (itemModal.mode === "edit" && itemModal.itemId) {
        const { error } = await supabase
          .from("comanda_itens")
          .update({
            ...payloadBase,
            updated_at: new Date().toISOString(),
          })
          .eq("id", itemModal.itemId)
          .eq("id_comanda", comandaSelecionada.id);

        if (error) {
          console.error(error);
          throw new Error(error.message || "Erro ao atualizar item.");
        }

        await supabase.rpc("fn_recalcular_total_comanda", {
          p_id_comanda: comandaSelecionada.id,
        });

        await abrirComanda(comandaSelecionada.id);
        await carregarTudo();
        fecharModalItem();
        setMsg("Item atualizado com sucesso.");
        return;
      }

      const { error } = await supabase.from("comanda_itens").insert(payloadBase);

      if (error) {
        console.error(error);
        throw new Error(error.message || "Erro ao adicionar item.");
      }

      await supabase.rpc("fn_recalcular_total_comanda", {
        p_id_comanda: comandaSelecionada.id,
      });

      await abrirComanda(comandaSelecionada.id);
      await carregarTudo();
      fecharModalItem();
      setMsg("Item adicionado com sucesso.");
    } catch (error: any) {
      console.error(error);
      setErroTela(error?.message || "Erro ao salvar item da comanda.");
    } finally {
      setSaving(false);
    }
  }

  async function removerItemComanda(idItem: string) {
    if (!comandaSelecionada) return;
    if (!podeEditarCaixa) {
      setErroTela("Você não tem permissão para remover itens.");
      return;
    }

    const confirmar = window.confirm("Deseja remover este item da comanda?");
    if (!confirmar) return;

    try {
      setSaving(true);
      setErroTela("");
      setMsg("");

      const { error } = await supabase
        .from("comanda_itens")
        .delete()
        .eq("id", idItem)
        .eq("id_comanda", comandaSelecionada.id);

      if (error) {
        throw new Error(error.message || "Erro ao remover item.");
      }

      await supabase.rpc("fn_recalcular_total_comanda", {
        p_id_comanda: comandaSelecionada.id,
      });

      await abrirComanda(comandaSelecionada.id);
      await carregarTudo();
      setMsg("Item removido com sucesso.");
    } catch (error: any) {
      console.error(error);
      setErroTela(error?.message || "Erro ao remover item da comanda.");
    } finally {
      setSaving(false);
    }
  }

  const totalPago = useMemo(
    () => pagamentos.reduce((acc, item) => acc + Number(item.valor || 0), 0),
    [pagamentos]
  );

  const totalComanda = Number(comandaSelecionada?.total || 0);
  const faltaReceber = Math.max(totalComanda - totalPago, 0);
  const troco = Math.max(totalPago - totalComanda, 0);

  const comandasFiltradas = useMemo(() => {
    const term = busca.trim().toLowerCase();
    if (!term) return comandasFila;

    return comandasFila.filter((item) => {
      const cliente = getJoinedName(item.clientes, "").toLowerCase();
      return String(item.numero).includes(term) || cliente.includes(term);
    });
  }, [busca, comandasFila]);

  const agendamentosFiltrados = useMemo(() => {
    const term = busca.trim().toLowerCase();
    if (!term) return agendamentosFila;

    return agendamentosFiltradosBase(agendamentosFila, term);
  }, [busca, agendamentosFila]);

  const totalPreviewItem = useMemo(() => {
    const quantidade = Math.max(Number(itemModal.quantidade || 1), 1);
    const valorUnitario = parseMoney(itemModal.valorUnitario);
    return quantidade * valorUnitario;
  }, [itemModal.quantidade, itemModal.valorUnitario]);

  const opcoesCatalogoFiltradas = useMemo(() => {
    const termo = buscaCatalogo.trim().toLowerCase();

    const lista =
      itemModal.tipoItem === "servico"
        ? servicosCatalogo
        : itemModal.tipoItem === "produto"
        ? produtosCatalogo
        : itemModal.tipoItem === "extra"
        ? extrasCatalogo
        : [];

    if (!termo) return lista.slice(0, 8);

    return lista
      .filter((item: any) => String(item.nome || "").toLowerCase().includes(termo))
      .slice(0, 8);
  }, [buscaCatalogo, itemModal.tipoItem, servicosCatalogo, produtosCatalogo, extrasCatalogo]);

  const profissionaisFiltrados = useMemo(() => {
    const termo = buscaProfissional.trim().toLowerCase();
    if (!termo) return profissionaisCatalogo.slice(0, 8);

    return profissionaisCatalogo
      .filter((item) => String(item.nome || "").toLowerCase().includes(termo))
      .slice(0, 8);
  }, [buscaProfissional, profissionaisCatalogo]);

  const assistentesFiltrados = useMemo(() => {
    const termo = buscaAssistente.trim().toLowerCase();
    if (!termo) return profissionaisCatalogo.slice(0, 8);

    return profissionaisCatalogo
      .filter((item) => String(item.nome || "").toLowerCase().includes(termo))
      .slice(0, 8);
  }, [buscaAssistente, profissionaisCatalogo]);

  if (loading || !acessoCarregado) {
    return <div className="p-6">Carregando caixa...</div>;
  }

  if (!podeVerCaixa) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          Você não tem permissão para acessar o caixa.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-zinc-50 p-4 md:p-6">
        <div className="mx-auto max-w-[1700px] space-y-5">
          <CaixaHeader totalEmAberto={comandasFila.length + agendamentosFila.length} />

          {!podeOperarCaixa ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
              Você está em modo de <strong>somente leitura</strong> no caixa.
            </div>
          ) : null}

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

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)_380px]">
            <CaixaFila
              aba={aba}
              setAba={setAba}
              busca={busca}
              setBusca={setBusca}
              comandasFiltradas={comandasFiltradas}
              agendamentosFiltrados={agendamentosFiltrados}
              comandasFechadas={comandasFechadas}
              comandasCanceladas={comandasCanceladas}
              comandaSelecionada={comandaSelecionada}
              onAbrirComanda={abrirComanda}
              onAbrirAgendamentoSemComanda={abrirAgendamentoSemComanda}
            />

            <CaixaDetalhe
              comandaSelecionada={comandaSelecionada}
              itens={itens}
              saving={saving || !podeEditarCaixa}
              faltaReceber={faltaReceber}
              onCancelarComanda={abrirModalCancelamento}
              onFinalizarComanda={finalizarComanda}
              onNovoServico={() => abrirModalNovoItem("servico")}
              onNovoProduto={() => abrirModalNovoItem("produto")}
              onNovoExtra={() => abrirModalNovoItem("extra")}
              onNovoAjuste={() => abrirModalNovoItem("ajuste")}
              onEditarItem={abrirModalEditarItem}
              onRemoverItem={removerItemComanda}
            />

            <div className="space-y-5">
              <CaixaResumo
                comandaSelecionada={comandaSelecionada}
                descontoInput={descontoInput}
                acrescimoInput={acrescimoInput}
                setDescontoInput={setDescontoInput}
                setAcrescimoInput={setAcrescimoInput}
                onSalvar={salvarDescontoAcrescimo}
                saving={saving || !podeEditarCaixa}
              />

              <CaixaPagamentos
                comandaSelecionada={comandaSelecionada}
                pagamentos={pagamentos}
                formaPagamento={formaPagamento}
                setFormaPagamento={setFormaPagamento}
                valorPagamento={valorPagamento}
                setValorPagamento={setValorPagamento}
                parcelas={parcelas}
                setParcelas={setParcelas}
                taxaPercentual={taxaPercentual}
                setTaxaPercentual={setTaxaPercentual}
                observacaoPagamento={observacaoPagamento}
                setObservacaoPagamento={setObservacaoPagamento}
                totalPago={totalPago}
                faltaReceber={faltaReceber}
                troco={troco}
                saving={saving || !podeGerenciarPagamentos}
                onAdicionarPagamento={adicionarPagamento}
                onRemoverPagamento={removerPagamento}
              />
            </div>
          </div>
        </div>
      </div>

      {cancelModalOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] border border-zinc-200 bg-white shadow-2xl">
            <div className="border-b border-zinc-200 px-6 py-5">
              <h2 className="text-xl font-bold text-zinc-900">Cancelar comanda</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Informe o motivo do cancelamento da comanda
                {comandaSelecionada?.numero ? ` #${comandaSelecionada.numero}` : ""}.
              </p>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700">
                  Motivo padrão
                </label>

                <select
                  value={tipoMotivoCancelamento}
                  onChange={(e) => setTipoMotivoCancelamento(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
                >
                  <option value="">Selecione</option>
                  {MOTIVOS_CANCELAMENTO_PADRAO.map((motivo) => (
                    <option key={motivo} value={motivo}>
                      {motivo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700">
                  Observação
                </label>

                <textarea
                  rows={4}
                  value={motivoCancelamento}
                  onChange={(e) => setMotivoCancelamento(e.target.value)}
                  placeholder="Descreva o motivo do cancelamento..."
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-zinc-200 px-6 py-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={fecharModalCancelamento}
                disabled={saving}
                className="rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={confirmarCancelamentoComanda}
                disabled={saving || !podeFinalizarCaixa}
                className="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-bold text-white transition hover:opacity-95 disabled:opacity-60"
              >
                {saving ? "Cancelando..." : "Confirmar cancelamento"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {itemModal.open ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[28px] border border-zinc-200 bg-white shadow-2xl">
            <div className="border-b border-zinc-200 px-6 py-5">
              <h2 className="text-xl font-bold text-zinc-900">
                {itemModal.mode === "edit" ? "Editar item da comanda" : "Adicionar item na comanda"}
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Escolha o tipo do item e preencha os dados da cobrança.
              </p>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {(["servico", "produto", "extra", "ajuste"] as TipoItemComanda[]).map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => {
                      setBuscaCatalogo("");
                      setDropdownCatalogoOpen(false);

                      setItemModal((prev) => ({
                        ...prev,
                        tipoItem: tipo,
                        catalogoId: "",
                        descricao: tipo === "ajuste" ? prev.descricao : "",
                        valorUnitario: tipo === "ajuste" ? prev.valorUnitario : "0,00",
                      }));
                    }}
                    className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                      itemModal.tipoItem === tipo
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    {tipo === "servico"
                      ? "Serviço"
                      : tipo === "produto"
                      ? "Produto"
                      : tipo === "extra"
                      ? "Extra"
                      : "Ajuste"}
                  </button>
                ))}
              </div>

              {itemModal.tipoItem !== "ajuste" ? (
                <div className="relative">
                  <label className="mb-2 block text-sm font-semibold text-zinc-700">
                    Buscar{" "}
                    {itemModal.tipoItem === "servico"
                      ? "serviço"
                      : itemModal.tipoItem === "produto"
                      ? "produto"
                      : "extra"}
                  </label>

                  <input
                    value={buscaCatalogo}
                    onChange={(e) => {
                      setBuscaCatalogo(e.target.value);
                      setDropdownCatalogoOpen(true);
                      setItemModal((prev) => ({
                        ...prev,
                        catalogoId: "",
                        descricao: e.target.value,
                      }));
                    }}
                    onFocus={() => setDropdownCatalogoOpen(true)}
                    placeholder={
                      itemModal.tipoItem === "servico"
                        ? "Digite o nome do serviço"
                        : itemModal.tipoItem === "produto"
                        ? "Digite o nome do produto"
                        : "Digite o nome do extra"
                    }
                    className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
                  />

                  {dropdownCatalogoOpen && opcoesCatalogoFiltradas.length > 0 ? (
                    <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl">
                      {opcoesCatalogoFiltradas.map((item: any) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => preencherPorCatalogo(itemModal.tipoItem, item.id)}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition hover:bg-zinc-50"
                        >
                          <div className="font-medium text-zinc-900">{item.nome}</div>
                          <div className="text-sm font-semibold text-zinc-600">
                            {(itemModal.tipoItem === "servico"
                              ? getServicoPrice(item)
                              : itemModal.tipoItem === "produto"
                              ? getProdutoPrice(item)
                              : getExtraPrice(item)
                            ).toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-zinc-700">
                    Descrição
                  </label>
                  <input
                    value={itemModal.descricao}
                    onChange={(e) =>
                      setItemModal((prev) => ({
                        ...prev,
                        descricao: e.target.value,
                      }))
                    }
                    placeholder="Descrição do item"
                    className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-zinc-700">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={itemModal.quantidade}
                    onChange={(e) =>
                      setItemModal((prev) => ({
                        ...prev,
                        quantidade: e.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-zinc-700">
                    Valor unitário
                  </label>
                  <input
                    value={itemModal.valorUnitario}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      const number = Number(digits || "0") / 100;

                      setItemModal((prev) => ({
                        ...prev,
                        valorUnitario: number.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }),
                      }));
                    }}
                    placeholder="0,00"
                    className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
                  />
                </div>

                <div className="relative">
                  <label className="mb-2 block text-sm font-semibold text-zinc-700">
                    Profissional
                  </label>

                  <input
                    value={buscaProfissional}
                    onChange={(e) => {
                      setBuscaProfissional(e.target.value);
                      setDropdownProfissionalOpen(true);
                      setItemModal((prev) => ({
                        ...prev,
                        idProfissional: "",
                      }));
                    }}
                    onFocus={() => setDropdownProfissionalOpen(true)}
                    placeholder="Digite o nome do profissional"
                    className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
                  />

                  {dropdownProfissionalOpen ? (
                    <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setBuscaProfissional("");
                          setItemModal((prev) => ({
                            ...prev,
                            idProfissional: "",
                          }));
                          setDropdownProfissionalOpen(false);
                        }}
                        className="w-full rounded-xl px-3 py-3 text-left text-sm text-zinc-600 transition hover:bg-zinc-50"
                      >
                        Sem profissional
                      </button>

                      {profissionaisFiltrados.map((prof) => (
                        <button
                          key={prof.id}
                          type="button"
                          onClick={() => {
                            setBuscaProfissional(prof.nome || "");
                            setItemModal((prev) => ({
                              ...prev,
                              idProfissional: prof.id,
                            }));
                            setDropdownProfissionalOpen(false);
                          }}
                          className="w-full rounded-xl px-3 py-3 text-left transition hover:bg-zinc-50"
                        >
                          <div className="font-medium text-zinc-900">{prof.nome}</div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="relative">
                  <label className="mb-2 block text-sm font-semibold text-zinc-700">
                    Assistente
                  </label>

                  <input
                    value={buscaAssistente}
                    onChange={(e) => {
                      setBuscaAssistente(e.target.value);
                      setDropdownAssistenteOpen(true);
                      setItemModal((prev) => ({
                        ...prev,
                        idAssistente: "",
                      }));
                    }}
                    onFocus={() => setDropdownAssistenteOpen(true)}
                    placeholder="Digite o nome do assistente"
                    className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
                  />

                  {dropdownAssistenteOpen ? (
                    <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setBuscaAssistente("");
                          setItemModal((prev) => ({
                            ...prev,
                            idAssistente: "",
                          }));
                          setDropdownAssistenteOpen(false);
                        }}
                        className="w-full rounded-xl px-3 py-3 text-left text-sm text-zinc-600 transition hover:bg-zinc-50"
                      >
                        Sem assistente
                      </button>

                      {assistentesFiltrados.map((prof) => (
                        <button
                          key={prof.id}
                          type="button"
                          onClick={() => {
                            setBuscaAssistente(prof.nome || "");
                            setItemModal((prev) => ({
                              ...prev,
                              idAssistente: prof.id,
                            }));
                            setDropdownAssistenteOpen(false);
                          }}
                          className="w-full rounded-xl px-3 py-3 text-left transition hover:bg-zinc-50"
                        >
                          <div className="font-medium text-zinc-900">{prof.nome}</div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4">
                <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  Total do item
                </div>
                <div className="mt-1 text-2xl font-bold text-zinc-900">
                  {totalPreviewItem.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-zinc-200 px-6 py-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={fecharModalItem}
                disabled={saving}
                className="rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
              >
                Fechar
              </button>

              <button
                type="button"
                onClick={salvarItemComanda}
                disabled={saving || !comandaSelecionada || !podeEditarCaixa}
                className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white transition hover:opacity-95 disabled:opacity-60"
              >
                {saving
                  ? "Salvando..."
                  : itemModal.mode === "edit"
                  ? "Salvar alterações"
                  : "Adicionar item"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
