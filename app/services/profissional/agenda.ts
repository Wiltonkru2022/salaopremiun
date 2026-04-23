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
  hora_inicio: string;
  hora_fim: string;
};

type AgendamentoAgendaRow = {
  id: string;
  cliente_id: string | null;
  servico_id: string | null;
  hora_inicio: string;
  hora_fim: string;
  status: string;
  id_comanda: string | null;
};

type NomeRow = {
  id: string;
  nome: string;
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
      if (!data) throw new Error("Profissional nao encontrado.");

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
        .select("id, nome, duracao_minutos, preco, preco_padrao")
        .eq("id", idServico)
        .eq("id_salao", idSalao)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) throw new Error("Servico nao encontrado.");

      return data;
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
      if (!data) throw new Error("Servico nao vinculado ao profissional.");

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

  if (!regra?.ativo) throw new Error("Nao atende neste dia.");

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
  data?: string
) {
  const dataSelecionada = data || hojeLocal();

  const { agendamentos, clientesMap, servicosMap } = await runAdminOperation({
    action: "profissional_agenda_buscar_agenda",
    actorId: idProfissional,
    idSalao,
    run: async (supabase) => {
      const { data: agendamentosData, error } = await supabase
        .from("agendamentos")
        .select(SELECT_AGENDAMENTOS)
        .eq("id_salao", idSalao)
        .eq("profissional_id", idProfissional)
        .eq("data", dataSelecionada);

      if (error) throw new Error(error.message);

      const rows = (agendamentosData ?? []) as AgendamentoAgendaRow[];
      const clienteIds = Array.from(
        new Set(rows.map((item) => item.cliente_id).filter(Boolean))
      ) as string[];
      const servicoIds = Array.from(
        new Set(rows.map((item) => item.servico_id).filter(Boolean))
      ) as string[];

      const [clientesResult, servicosResult] = await Promise.all([
        clienteIds.length
          ? supabase.from("clientes").select("id, nome").in("id", clienteIds)
          : Promise.resolve({ data: [], error: null }),
        servicoIds.length
          ? supabase.from("servicos").select("id, nome").in("id", servicoIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (clientesResult.error) throw new Error(clientesResult.error.message);
      if (servicosResult.error) throw new Error(servicosResult.error.message);

      return {
        agendamentos: rows,
        clientesMap: new Map(
          ((clientesResult.data ?? []) as NomeRow[]).map((cliente) => [
            cliente.id,
            cliente.nome,
          ])
        ),
        servicosMap: new Map(
          ((servicosResult.data ?? []) as NomeRow[]).map((servico) => [
            servico.id,
            servico.nome,
          ])
        ),
      };
    },
  });

  const pixelsPorMinuto = 2;
  const inicioMinutos =
    agendamentos.length > 0
      ? Math.min(8 * 60, ...agendamentos.map((item) => timeToMinutes(item.hora_inicio)))
      : 8 * 60;
  const fimMinutos =
    agendamentos.length > 0
      ? Math.max(18 * 60, ...agendamentos.map((item) => timeToMinutes(item.hora_fim)))
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

  const cards = agendamentos.map((item) => {
    const inicio = timeToMinutes(item.hora_inicio);
    const fim = timeToMinutes(item.hora_fim);

    return {
      id: item.id,
      idComanda: item.id_comanda,
      horario: item.hora_inicio.slice(0, 5),
      horaFim: item.hora_fim.slice(0, 5),
      cliente: item.cliente_id
        ? clientesMap.get(item.cliente_id) ?? "Cliente"
        : "Cliente",
      servico: item.servico_id
        ? servicosMap.get(item.servico_id) ?? "Servico"
        : "Servico",
      status: item.status,
      top: Math.max((inicio - inicioMinutos) * pixelsPorMinuto, 0),
      height: Math.max((fim - inicio) * pixelsPorMinuto, 88),
    };
  });

  return {
    profissional: { id: idProfissional, nome: "Profissional" },
    dataSelecionada,
    dataLabel: toDateLabel(dataSelecionada),
    expedienteAtivo: true,
    horaInicioExpediente: minutesToTime(inicioMinutos),
    horaFimExpediente: minutesToTime(fimMinutos),
    totalAtendimentos: agendamentos.length,
    totalPrevisto: 0,
    cards,
    labels,
    pausas: [],
    timelineHeight,
  };
}
