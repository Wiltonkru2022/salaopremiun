import type { RateioConfig } from "@/components/configuracoes/types";

export type ConfiguracoesSecao =
  | "agenda"
  | "caixa"
  | "rateio"
  | "usuarios";

export const sectionMeta: Record<
  ConfiguracoesSecao,
  { title: string; description: string }
> = {
  agenda: {
    title: "Agenda e horários",
    description:
      "Dias de funcionamento, fuso horário, horários e intervalo da agenda.",
  },
  caixa: {
    title: "Caixa e taxas",
    description: "Taxas de maquininha, repasses e regras financeiras.",
  },
  rateio: {
    title: "Rateio e impressão",
    description: "Campos exibidos na impressão das comissões dos profissionais.",
  },
  usuarios: {
    title: "Usuários do sistema",
    description: "Equipe administrativa, acessos, perfis e limite do plano.",
  },
};

export const sectionHref: Record<ConfiguracoesSecao, string> = {
  agenda: "/configuracoes/agenda-horarios",
  caixa: "/configuracoes/caixa-taxas",
  rateio: "/configuracoes/rateio",
  usuarios: "/configuracoes/usuarios",
};

export const RATEIO_OPTIONS: Array<{
  key: keyof RateioConfig;
  label: string;
  description: string;
}> = [
  { key: "mostrar_cliente", label: "Mostrar cliente", description: "Exibe cliente da comanda quando existir." },
  { key: "mostrar_data", label: "Mostrar data", description: "Exibe data da venda ou competência." },
  { key: "mostrar_servicos", label: "Mostrar serviços", description: "Mantém a descrição do serviço/produto vendido." },
  { key: "mostrar_custo_produtos", label: "Mostrar custo de produtos", description: "Mostra custo do item só para conferência, sem virar faturamento." },
  { key: "mostrar_taxa_maquininha", label: "Mostrar taxa maquininha", description: "Mostra taxa rateada/descontada quando existir." },
  { key: "mostrar_acrescimo_desconto", label: "Mostrar acréscimo/desconto", description: "Mostra ajustes rateados na base da comissão." },
  { key: "mostrar_assistente", label: "Mostrar assistente", description: "Mostra assistente vinculado ao lançamento." },
  { key: "mostrar_pessoa", label: "Pessoa", description: "Coluna com profissional ou assistente." },
  { key: "mostrar_descricao", label: "Descrição", description: "Coluna do item ou regra lançada." },
  { key: "mostrar_competencia", label: "Competência", description: "Coluna de competência do rateio." },
  { key: "mostrar_base", label: "Base", description: "Coluna da base usada no cálculo." },
  { key: "mostrar_percentual", label: "% aplicada", description: "Coluna do percentual calculado." },
  { key: "mostrar_origem", label: "Origem", description: "Coluna da regra de origem." },
  { key: "mostrar_comissao", label: "Comissão", description: "Coluna do valor final da comissão." },
  { key: "mostrar_status", label: "Status", description: "Coluna do status do lançamento." },
  { key: "mostrar_pago_em", label: "Pago em", description: "Coluna da data de pagamento." },
];

export const TAXAS_CREDITO_KEYS = [
  "taxa_credito_1x",
  "taxa_credito_2x",
  "taxa_credito_3x",
  "taxa_credito_4x",
  "taxa_credito_5x",
  "taxa_credito_6x",
  "taxa_credito_7x",
  "taxa_credito_8x",
  "taxa_credito_9x",
  "taxa_credito_10x",
  "taxa_credito_11x",
  "taxa_credito_12x",
] as const;

export const CONFIG_SELECT =
  "cor_primaria, created_at, desconta_taxa_profissional, dias_funcionamento, exigir_cliente_na_venda, fuso_horario, hora_abertura, hora_fechamento, id, id_salao, intervalo_minutos, modo_compacto, permitir_reabrir_venda, rateio_config, repassa_taxa_cliente, sinal_agendamento_ativo, sinal_agendamento_percentual, sinal_pix_chave, sinal_pix_recebedor, sinal_pix_cidade, sinal_whatsapp, sinal_reserva_minutos, sinal_mensagem_comprovante, taxa_credito_10x, taxa_credito_11x, taxa_credito_12x, taxa_credito_1x, taxa_credito_2x, taxa_credito_3x, taxa_credito_4x, taxa_credito_5x, taxa_credito_6x, taxa_credito_7x, taxa_credito_8x, taxa_credito_9x, taxa_maquininha_boleto, taxa_maquininha_credito, taxa_maquininha_debito, taxa_maquininha_outro, taxa_maquininha_pix, taxa_maquininha_transferencia, updated_at";
