import { SELECT_AGENDAMENTOS } from "@/lib/db/selects";
import { runAdminOperation } from "@/lib/supabase/admin-ops";
import { parseDiasTrabalho, parsePausas } from "@/lib/utils/agenda";

/* ---------------- TYPES ---------------- */

type DiaTrabalho = {
  dia: string;
  ativo: boolean;
  inicio: string;
  fim: string;
};

type Pausa = {
  inicio: string;
  fim: string;
  descricao?: string | null;
};

type ValidarHorarioParams = {
  dataISO: string;
  horaInicio: string;
  duracaoMinutos: number;
  diasTrabalho: DiaTrabalho[];
  pausas: Pausa[];
};

type BuscarConflitosParams = {
  idSalao: string;
  idProfissional: string;
  dataISO: string;
  horaInicio: string;
  horaFim: string;
};

type AgendamentoConflitoRow = {
  id: string;
  hora_inicio: string;
  hora_fim: string;
};

type AgendamentoAgendaRow = {
  id: string;
  profissional_id?: string | null;
  cliente_id: string | null;
  servico_id: string | null;
  hora_inicio: string;
  hora_fim: string;
  status: string;
  id_comanda: string | null;
  sinal_status?: string | null;
  sinal_valor?: number | string | null;
  sinal_comprovante_path?: string | null;
  sinal_confirmacao_responsavel?: string | null;
};

type BloqueioAgendaRow = {
  id: string;
  profissional_id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  motivo: string | null;
};

type NomeRow = {
  id: string;
  nome: string;
};

type ServicoResumoRow = {
  id: string;
  nome: string;
  preco?: number | string | null;
  preco_padrao?: number | string | null;
};

type BuscarAgendaProfissionalOptions = {
  verTodos?: boolean;
};

/* ---------------- UTILS ---------------- */

function hojeLocal() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function toDateLabel(dateISO: string) {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(new Date(y, m - 1, d));
}

function monthRange(dateISO: string) {
  const [y, m] = dateISO.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0);
  const format = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  return {
    inicio: format(start),
    fim: format(end),
  };
}

function dayNamePt(dateISO: string) {
  const [y, m, d] = dateISO.split("-").map(Number);

  return new Intl.DateTimeFormat("pt-BR", { weekday: "long" })
    .format(new Date(y, m - 1, d))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace("-feira", "")
    .toLowerCase()
    .trim();
}

function normalizeDia(v: string) {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace("-feira", "")
    .toLowerCase()
    .trim();
}

function timeToMinutes(v: string) {
  const [h, m] = v.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(v: number) {
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(
    v % 60
  ).padStart(2, "0")}`;
}

function overlaps(a1: number, a2: number, b1: number, b2: number) {
  return a1 < b2 && a2 > b1;
}

function normalizarJsonAgenda(value: unknown) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return JSON.stringify(value);
  return null;
}

/* ---------------- SERVICES ---------------- */

export async function buscarConfiguracaoAgendaProfissional(
  idSalao: string,
  idProfissional: string
) {
  return runAdminOperation({
    action: "profissional_agenda_buscar_configuracao",
    actorId: idProfissional,
    idSalao,
    run: async (supabase) => {
      const { data, error } = await supabase
        .from("profissionais")
        .select("id, nome, nome_exibicao, ativo, dias_trabalho, pausas")
        .eq("id", idProfissional)
        .eq("id_salao", idSalao)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) throw new Error("Profissional não encontrado.");

      return {
        id: data.id,
        nome: data.nome_exibicao || data.nome,
        ativo: Boolean(data.ativo),
        diasTrabalho: parseDiasTrabalho(
          normalizarJsonAgenda(data.dias_trabalho)
        ),
        pausas: parsePausas(normalizarJsonAgenda(data.pausas)),
      };
    },
  });
}

export async function buscarServicoPorId(idSalao: string, idServico: string) {
  return runAdminOperation({
    action: "profissional_agenda_buscar_servico",
    idSalao,
    run: async (supabase) => {
      const { data, error } = await supabase
        .from("servicos")
        .select("id, nome, duracao, duracao_minutos, preco, preco_padrao")
        .eq("id", idServico)
        .eq("id_salao", idSalao)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) throw new Error("Serviço não encontrado.");

      return data;
    },
  });
}

export async function buscarServicoDoProfissional(params: {
  idSalao: string;
  idProfissional: string;
  idServico: string;
}) {
  return runAdminOperation({
    action: "profissional_agenda_buscar_servico_do_profissional",
    actorId: params.idProfissional,
    idSalao: params.idSalao,
    run: async (supabase) => {
      const [servicoResult, vinculoResult] = await Promise.all([
        supabase
          .from("servicos")
          .select("id, nome, duracao, duracao_minutos, preco, preco_padrao")
          .eq("id", params.idServico)
          .eq("id_salao", params.idSalao)
          .maybeSingle(),
        supabase
          .from("profissional_servicos")
          .select("duracao_minutos, preco_personalizado")
          .eq("id_salao", params.idSalao)
          .eq("id_profissional", params.idProfissional)
          .eq("id_servico", params.idServico)
          .eq("ativo", true)
          .maybeSingle(),
      ]);

      if (servicoResult.error) throw new Error(servicoResult.error.message);
      if (vinculoResult.error) throw new Error(vinculoResult.error.message);
      if (!servicoResult.data) throw new Error("Serviço não encontrado.");

      return {
        ...servicoResult.data,
        duracao_minutos:
          Number(vinculoResult.data?.duracao_minutos || 0) ||
          Number(servicoResult.data.duracao_minutos || 0) ||
          Number(servicoResult.data.duracao || 0) ||
          60,
        preco:
          vinculoResult.data?.preco_personalizado ??
          servicoResult.data.preco ??
          servicoResult.data.preco_padrao ??
          0,
      };
    },
  });
}

export async function validarServicoVinculadoAoProfissional(
  idSalao: string,
  idProfissional: string,
  idServico: string
) {
  return runAdminOperation({
    action: "profissional_agenda_validar_servico_vinculado",
    actorId: idProfissional,
    idSalao,
    run: async (supabase) => {
      const { data, error } = await supabase
        .from("profissional_servicos")
        .select("id")
        .eq("id_salao", idSalao)
        .eq("id_profissional", idProfissional)
        .eq("id_servico", idServico)
        .eq("ativo", true)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) throw new Error("Serviço não vinculado ao profissional.");

      return true;
    },
  });
}

export async function buscarConflitosNoHorario(params: BuscarConflitosParams) {
  return runAdminOperation({
    action: "profissional_agenda_buscar_conflitos",
    actorId: params.idProfissional,
    idSalao: params.idSalao,
    run: async (supabase) => {
      const { data, error } = await supabase
        .from("agendamentos")
        .select(SELECT_AGENDAMENTOS)
        .eq("id_salao", params.idSalao)
        .eq("profissional_id", params.idProfissional)
        .eq("data", params.dataISO)
        .not("status", "eq", "cancelado");

      if (error) throw new Error(error.message);

      const novoInicio = timeToMinutes(params.horaInicio);
      const novoFim = timeToMinutes(params.horaFim);

      return ((data ?? []) as AgendamentoConflitoRow[]).filter((i) =>
        overlaps(
          novoInicio,
          novoFim,
          timeToMinutes(i.hora_inicio),
          timeToMinutes(i.hora_fim)
        )
      );
    },
  });
}

export async function buscarConflitosBloqueioNoHorario(params: BuscarConflitosParams) {
  return runAdminOperation({
    action: "profissional_agenda_buscar_conflitos_bloqueio",
    actorId: params.idProfissional,
    idSalao: params.idSalao,
    run: async (supabase) => {
      const { data, error } = await supabase
        .from("agenda_bloqueios")
        .select("id, hora_inicio, hora_fim")
        .eq("id_salao", params.idSalao)
        .eq("profissional_id", params.idProfissional)
        .eq("data", params.dataISO);

      if (error) throw new Error(error.message);

      const novoInicio = timeToMinutes(params.horaInicio);
      const novoFim = timeToMinutes(params.horaFim);

      return ((data ?? []) as AgendamentoConflitoRow[]).filter((i) =>
        overlaps(
          novoInicio,
          novoFim,
          timeToMinutes(i.hora_inicio),
          timeToMinutes(i.hora_fim)
        )
      );
    },
  });
}

export function validarHorarioAgendamento({
  dataISO,
  horaInicio,
  duracaoMinutos,
  diasTrabalho,
  pausas,
}: ValidarHorarioParams) {
  const dia = dayNamePt(dataISO);

  const regra = diasTrabalho.find(
    (d) => normalizeDia(d.dia) === normalizeDia(dia)
  );

  if (!regra?.ativo) throw new Error("Não atende neste dia.");

  const ini = timeToMinutes(horaInicio);
  const fim = ini + duracaoMinutos;

  if (ini < timeToMinutes(regra.inicio) || fim > timeToMinutes(regra.fim)) {
    throw new Error("Fora do expediente.");
  }

  for (const p of pausas) {
    if (overlaps(ini, fim, timeToMinutes(p.inicio), timeToMinutes(p.fim))) {
      throw new Error("Horario em pausa.");
    }
  }

  return {
    horaInicio,
    horaFim: minutesToTime(fim),
  };
}

export async function buscarAgendaProfissional(
  idSalao: string,
  idProfissional: string,
  data?: string,
  options: BuscarAgendaProfissionalOptions = {}
) {
  const dataSelecionada = data || hojeLocal();
  const diaAtual = dayNamePt(dataSelecionada);
  const verTodos = Boolean(options.verTodos);

  const {
    agendamentos,
    diasComAtendimento,
    diasComAgendamentos,
    diasComBloqueios,
    clientesMap,
    servicosMap,
    profissionaisMap,
    profissionalNome,
    expedienteAtivo,
    horaInicioExpediente,
    horaFimExpediente,
    bloqueios,
  } = await runAdminOperation({
    action: "profissional_agenda_buscar_agenda",
    actorId: idProfissional,
    idSalao,
    run: async (supabase) => {
      const rangeMes = monthRange(dataSelecionada);
      const [
        { data: agendamentosData, error: agendamentosError },
        { data: agendamentosMesData, error: agendamentosMesError },
        { data: bloqueiosData, error: bloqueiosError },
        { data: bloqueiosMesData, error: bloqueiosMesError },
        { data: profissionalData, error: profissionalError },
      ] = await Promise.all([
        (() => {
          let query = supabase
          .from("agendamentos")
          .select(SELECT_AGENDAMENTOS)
          .eq("id_salao", idSalao)
          .eq("data", dataSelecionada)
          .order("hora_inicio", { ascending: true });

          if (!verTodos) {
            query = query.eq("profissional_id", idProfissional);
          }

          return query;
        })(),
        (() => {
          let query = supabase
          .from("agendamentos")
          .select("data, profissional_id")
          .eq("id_salao", idSalao)
          .gte("data", rangeMes.inicio)
          .lte("data", rangeMes.fim)
          .not("status", "eq", "cancelado")
          .limit(300);

          if (!verTodos) {
            query = query.eq("profissional_id", idProfissional);
          }

          return query;
        })(),
        (() => {
          let query = supabase
          .from("agenda_bloqueios")
          .select("id, profissional_id, data, hora_inicio, hora_fim, motivo")
          .eq("id_salao", idSalao)
          .eq("data", dataSelecionada)
          .order("hora_inicio", { ascending: true });

          if (!verTodos) {
            query = query.eq("profissional_id", idProfissional);
          }

          return query;
        })(),
        (() => {
          let query = supabase
          .from("agenda_bloqueios")
          .select("data, profissional_id")
          .eq("id_salao", idSalao)
          .gte("data", rangeMes.inicio)
          .lte("data", rangeMes.fim)
          .limit(300);

          if (!verTodos) {
            query = query.eq("profissional_id", idProfissional);
          }

          return query;
        })(),
        supabase
          .from("profissionais")
          .select("nome, nome_exibicao, dias_trabalho")
          .eq("id", idProfissional)
          .eq("id_salao", idSalao)
          .maybeSingle(),
      ]);

      if (agendamentosError) throw new Error(agendamentosError.message);
      if (agendamentosMesError) throw new Error(agendamentosMesError.message);
      if (bloqueiosError) throw new Error(bloqueiosError.message);
      if (bloqueiosMesError) throw new Error(bloqueiosMesError.message);
      if (profissionalError) throw new Error(profissionalError.message);

      const rows = (agendamentosData ?? []) as AgendamentoAgendaRow[];
      const bloqueiosRows = (bloqueiosData ?? []) as BloqueioAgendaRow[];
      const clienteIds = Array.from(
        new Set(rows.map((item) => item.cliente_id).filter(Boolean))
      ) as string[];
      const servicoIds = Array.from(
        new Set(rows.map((item) => item.servico_id).filter(Boolean))
      ) as string[];
      const profissionalIds = Array.from(
        new Set(
          [
            ...rows.map((item) => item.profissional_id),
            ...bloqueiosRows.map((item) => item.profissional_id),
          ].filter(Boolean)
        )
      ) as string[];

      const [clientesResult, servicosResult, profissionaisResult] = await Promise.all([
        clienteIds.length
          ? supabase.from("clientes").select("id, nome").in("id", clienteIds)
          : Promise.resolve({ data: [], error: null }),
        servicoIds.length
          ? supabase
              .from("servicos")
              .select("id, nome, preco, preco_padrao")
              .in("id", servicoIds)
          : Promise.resolve({ data: [], error: null }),
        profissionalIds.length
          ? supabase
              .from("profissionais")
              .select("id, nome, nome_exibicao")
              .eq("id_salao", idSalao)
              .in("id", profissionalIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (clientesResult.error) throw new Error(clientesResult.error.message);
      if (servicosResult.error) throw new Error(servicosResult.error.message);
      if (profissionaisResult.error) {
        throw new Error(profissionaisResult.error.message);
      }

      const diasTrabalho = parseDiasTrabalho(
        normalizarJsonAgenda(profissionalData?.dias_trabalho)
      );
      const regraDia = diasTrabalho.find(
        (item) => normalizeDia(item.dia) === normalizeDia(diaAtual)
      );

      const diasComAgendamentos = Array.from(
        new Set(
          ((agendamentosMesData ?? []) as Array<{ data?: string | null }>)
            .map((item) => String(item.data || "").slice(0, 10))
            .filter(Boolean)
        )
      );
      const diasComBloqueios = Array.from(
        new Set(
          ((bloqueiosMesData ?? []) as Array<{ data?: string | null }>)
            .map((item) => String(item.data || "").slice(0, 10))
            .filter(Boolean)
        )
      );

      return {
        agendamentos: rows,
        diasComAgendamentos,
        diasComBloqueios,
        diasComAtendimento: Array.from(
          new Set([...diasComAgendamentos, ...diasComBloqueios])
        ),
        bloqueios: bloqueiosRows,
        profissionalNome:
          profissionalData?.nome_exibicao || profissionalData?.nome || "Profissional",
        expedienteAtivo: Boolean(regraDia?.ativo),
        horaInicioExpediente: regraDia?.inicio || null,
        horaFimExpediente: regraDia?.fim || null,
        clientesMap: new Map(
          ((clientesResult.data ?? []) as NomeRow[]).map((cliente) => [
            cliente.id,
            cliente.nome,
          ])
        ),
        servicosMap: new Map(
          ((servicosResult.data ?? []) as ServicoResumoRow[]).map((servico) => [
            servico.id,
            {
              nome: servico.nome,
              valor: Number(servico.preco ?? servico.preco_padrao ?? 0),
            },
          ])
        ),
        profissionaisMap: new Map(
          (
            (profissionaisResult.data ?? []) as Array<{
              id: string;
              nome?: string | null;
              nome_exibicao?: string | null;
            }>
          ).map((profissional) => [
            profissional.id,
            profissional.nome_exibicao || profissional.nome || "Profissional",
          ])
        ),
      };
    },
  });

  const pixelsPorMinuto = 2;
  const itensAgenda = [
    ...agendamentos.map((item) => ({
      inicio: item.hora_inicio,
      fim: item.hora_fim,
    })),
    ...bloqueios.map((item) => ({
      inicio: item.hora_inicio,
      fim: item.hora_fim,
    })),
  ];
  const inicioMinutos =
    itensAgenda.length > 0
      ? Math.min(8 * 60, ...itensAgenda.map((item) => timeToMinutes(item.inicio)))
      : 8 * 60;
  const fimMinutos =
    itensAgenda.length > 0
      ? Math.max(18 * 60, ...itensAgenda.map((item) => timeToMinutes(item.fim)))
      : 18 * 60;
  const timelineHeight = Math.max((fimMinutos - inicioMinutos) * pixelsPorMinuto, 400);
  const primeiraHora = Math.floor(inicioMinutos / 60);
  const ultimaHora = Math.ceil(fimMinutos / 60);
  const labels = Array.from({ length: ultimaHora - primeiraHora + 1 }).map(
    (_, index) => {
      const minutos = (primeiraHora + index) * 60;
      return {
        hora: minutesToTime(minutos),
        top: Math.max((minutos - inicioMinutos) * pixelsPorMinuto, 0),
      };
    }
  );

  const cardsAgendamentos = agendamentos.map((item) => {
    const inicio = timeToMinutes(item.hora_inicio);
    const fim = timeToMinutes(item.hora_fim);
    const servico = item.servico_id ? servicosMap.get(item.servico_id) : null;

    return {
      id: item.id,
      tipo: "agendamento" as const,
      idProfissional: item.profissional_id || idProfissional,
      profissional:
        profissionaisMap.get(item.profissional_id || "") ||
        (item.profissional_id === idProfissional ? profissionalNome : "Profissional"),
      isDoProfissionalLogado: (item.profissional_id || idProfissional) === idProfissional,
      idComanda: item.id_comanda,
      horario: item.hora_inicio.slice(0, 5),
      horaFim: item.hora_fim.slice(0, 5),
      cliente: item.cliente_id
        ? clientesMap.get(item.cliente_id) ?? "Cliente"
        : "Cliente",
      servico: servico?.nome ?? "Serviço",
      valorPrevisto: servico?.valor ?? 0,
      status: item.status,
      sinalStatus: item.sinal_status || null,
      sinalValor:
        item.sinal_valor === null || item.sinal_valor === undefined
          ? null
          : Number(item.sinal_valor),
      sinalComprovantePath: item.sinal_comprovante_path || null,
      sinalConfirmacaoResponsavel: item.sinal_confirmacao_responsavel || null,
      top: Math.max((inicio - inicioMinutos) * pixelsPorMinuto, 0),
      height: Math.max((fim - inicio) * pixelsPorMinuto, 88),
    };
  });

  const cardsBloqueios = bloqueios.map((item) => {
    const inicio = timeToMinutes(item.hora_inicio);
    const fim = timeToMinutes(item.hora_fim);

    return {
      id: item.id,
      tipo: "bloqueio" as const,
      idProfissional: item.profissional_id,
      profissional:
        profissionaisMap.get(item.profissional_id) ||
        (item.profissional_id === idProfissional ? profissionalNome : "Profissional"),
      isDoProfissionalLogado: item.profissional_id === idProfissional,
      idComanda: null,
      horario: item.hora_inicio.slice(0, 5),
      horaFim: item.hora_fim.slice(0, 5),
      cliente: "Horário bloqueado",
      servico: item.motivo || "Indisponível",
      valorPrevisto: 0,
      status: "bloqueado",
      top: Math.max((inicio - inicioMinutos) * pixelsPorMinuto, 0),
      height: Math.max((fim - inicio) * pixelsPorMinuto, 72),
    };
  });

  const cards = [...cardsAgendamentos, ...cardsBloqueios].sort(
    (a, b) => timeToMinutes(a.horario) - timeToMinutes(b.horario)
  );

  const totalPrevisto = cards.reduce(
    (acc, item) => acc + Number(item.valorPrevisto || 0),
    0
  );

  return {
    profissional: { id: idProfissional, nome: profissionalNome },
    dataSelecionada,
    dataLabel: toDateLabel(dataSelecionada),
    expedienteAtivo,
    horaInicioExpediente:
      horaInicioExpediente || minutesToTime(inicioMinutos),
    horaFimExpediente:
      horaFimExpediente || minutesToTime(fimMinutos),
    totalAtendimentos: agendamentos.length,
    totalBloqueios: bloqueios.length,
    totalPrevisto,
    diasComAtendimento,
    diasComAgendamentos,
    diasComBloqueios,
    cards,
    labels,
    pausas: [],
    timelineHeight,
  };
}
