export type CategoriaServico = {
  id: string | null;
  nome: string;
  ordem?: number | null;
};

export type Servico = {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: CategoriaServico;
  preco: number | null;
  duracaoMinutos: number | null;
  exigeAvaliacao: boolean;
  profissionaisPermitidos: string[];
};

export type Profissional = {
  id: string;
  nome: string;
  especialidade: string | null;
  fotoUrl: string | null;
};

export type ServicoSelecionado = {
  idServico: string;
  nome: string;
  preco: number | null;
  duracaoMinutos: number | null;
};

export type PessoaAgendada =
  | {
      tipo: "mim";
      nome: null;
      whatsapp: null;
      observacao: null;
    }
  | {
      tipo: "outra_pessoa";
      nome: string;
      whatsapp: string;
      observacao: string | null;
    };

export type HorarioDisponivel = {
  data: string;
  horaInicio: string;
  horaFim: string;
};

export type ResumoAgendamento = {
  servicos: ServicoSelecionado[];
  profissionalId: string;
  profissionalNome: string;
  pessoa: PessoaAgendada;
  data: string;
  horaInicio: string;
  horaFim: string;
  duracaoTotalMinutos: number;
  valorTotal: number | null;
};

export type ReservaOnline = {
  idSalao: string;
  servicos: ServicoSelecionado[];
  pessoa: PessoaAgendada;
  profissionalId: string;
  data: string;
  horaInicio: string;
  reservaTemporariaId?: string | null;
};
