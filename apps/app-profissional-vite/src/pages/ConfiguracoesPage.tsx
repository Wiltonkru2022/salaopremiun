import { FormEvent, useMemo, useState } from "react";
import { BellRing, Check, Clock3, UserRound } from "lucide-react";
import { PushPermissionButton } from "../components/PushPermissionButton";
import { Button } from "../components/ui/Button";
import { Field, Input, Select } from "../components/ui/Input";
import { useAuth } from "../contexts/AuthContext";
import type { HorarioDia } from "../types/database";

const nomesDias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function diaIndex(value: number | string) {
  if (typeof value === "number") return value;
  const normalized = String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return nomesDias.findIndex(
    (d) =>
      d
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase() === normalized
  );
}

export function ConfiguracoesPage() {
  const { profissional, refreshProfissional } = useAuth();
  const [nome, setNome] = useState(profissional?.nome || "");
  const [telefone, setTelefone] = useState(
    profissional?.telefone || profissional?.whatsapp || ""
  );
  const [intervalo, setIntervalo] = useState(
    profissional?.intervalo_agenda_minutos || 30
  );
  const iniciais = useMemo<HorarioDia[]>(
    () =>
      nomesDias.map((dia, index) => {
        const found = (
          profissional?.dias_trabalho ||
          profissional?.horario_funcionamento ||
          []
        ).find((item) => diaIndex(item.dia) === index);
        return found
          ? { ...found, dia }
          : {
              dia,
              ativo: index > 0 && index < 7,
              inicio: "09:00",
              fim: "18:00",
            };
      }),
    [profissional]
  );
  const [horarios, setHorarios] = useState(iniciais);
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState("");
  const [erro, setErro] = useState("");

  function updateHorario(index: number, patch: Partial<HorarioDia>) {
    setHorarios((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setOk("");
    setErro("");
    try {
      const response = await fetch("/api/app-profissional/configuracoes", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          telefone,
          intervalo,
          diasTrabalho: horarios,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Não foi possível salvar.");
      }
      await refreshProfissional();
      setOk("Configurações salvas com sucesso.");
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Não foi possível salvar."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 pb-6">
      <section className="rounded-[1.35rem] border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-zinc-950 text-[#f5bd42]">
            <BellRing size={22} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-black tracking-[-0.04em] text-zinc-950">
              Notificações no celular
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-zinc-500">
              Receba novos agendamentos, alterações da agenda e avisos importantes mesmo com o App Profissional fechado.
            </p>
          </div>
        </div>
        <PushPermissionButton expanded />
        <p className="mt-3 text-xs font-semibold leading-5 text-zinc-500">
          Se estiver bloqueado, libere as notificações nas permissões do navegador ou do aplicativo instalado.
        </p>
      </section>

      <section className="rounded-[1.35rem] border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-50 text-amber-800">
            <UserRound size={22} />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-[-0.04em]">Seu perfil</h2>
            <p className="text-sm font-semibold text-zinc-500">Dados usados no App Profissional</p>
          </div>
        </div>
        <div className="grid gap-3">
          <Field label="Nome">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </Field>
          <Field label="Telefone / WhatsApp">
            <Input
              inputMode="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
          </Field>
          <Field label="Intervalo da agenda">
            <Select value={intervalo} onChange={(e) => setIntervalo(Number(e.target.value))}>
              <option value={15}>15 em 15 minutos</option>
              <option value={30}>30 em 30 minutos</option>
              <option value={60}>1h em 1h</option>
              <option value={120}>2h em 2h</option>
            </Select>
          </Field>
        </div>
      </section>

      <section className="rounded-[1.35rem] border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Clock3 size={22} />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-[-0.04em]">Horário de funcionamento</h2>
            <p className="text-sm font-semibold text-zinc-500">Defina seus dias e expediente</p>
          </div>
        </div>
        <div className="divide-y divide-zinc-100">
          {horarios.map((horario, index) => (
            <div key={String(horario.dia)} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-black text-zinc-900">{nomesDias[index]}</div>
                  <div className="text-xs font-bold text-zinc-400">
                    {horario.ativo
                      ? `${horario.inicio} às ${horario.fim}`
                      : "Não atende"}
                  </div>
                </div>
                <button
                  type="button"
                  aria-pressed={horario.ativo}
                  onClick={() => updateHorario(index, { ativo: !horario.ativo })}
                  className={`relative h-8 w-14 rounded-full transition ${
                    horario.ativo ? "bg-zinc-950" : "bg-zinc-200"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition ${
                      horario.ativo ? "left-7" : "left-1"
                    }`}
                  />
                </button>
              </div>
              {horario.ativo ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Field label="Início">
                    <Input
                      type="time"
                      value={horario.inicio}
                      onChange={(e) => updateHorario(index, { inicio: e.target.value })}
                    />
                  </Field>
                  <Field label="Fim">
                    <Input
                      type="time"
                      value={horario.fim}
                      onChange={(e) => updateHorario(index, { fim: e.target.value })}
                    />
                  </Field>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {ok ? (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          <Check size={18} />
          {ok}
        </div>
      ) : null}
      {erro ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {erro}
        </div>
      ) : null}
      <Button loading={loading} className="h-14 w-full rounded-[1.1rem]">
        Salvar configurações
      </Button>
    </form>
  );
}
