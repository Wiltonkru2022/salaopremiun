import { FormEvent, useState } from "react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Field, Input, Select } from "../components/ui/Input";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import type { HorarioDia } from "../types/database";

const dias = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"];

export function ConfiguracoesPage() {
  const { profissional, refreshProfissional } = useAuth();
  const [nome, setNome] = useState(profissional?.nome || "");
  const [telefone, setTelefone] = useState(profissional?.telefone || "");
  const [intervalo, setIntervalo] = useState(profissional?.intervalo_agenda_minutos || 30);
  const [horarios, setHorarios] = useState<HorarioDia[]>(profissional?.horario_funcionamento || []);
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState("");

  function updateHorario(index: number, patch: Partial<HorarioDia>) {
    setHorarios((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!profissional) return;
    setLoading(true);
    setOk("");
    const { error } = await supabase
      .from("profissionais")
      .update({
        nome,
        telefone,
        intervalo_agenda_minutos: intervalo,
        horario_funcionamento: horarios
      })
      .eq("id", profissional.id);
    setLoading(false);
    if (error) throw new Error(error.message);
    await refreshProfissional();
    setOk("Configuracoes salvas.");
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card>
        <h2 className="text-xl font-black tracking-[-0.04em]">Perfil</h2>
        <div className="mt-4 grid gap-3">
          <Field label="Nome"><Input value={nome} onChange={(event) => setNome(event.target.value)} /></Field>
          <Field label="Telefone"><Input value={telefone} onChange={(event) => setTelefone(event.target.value)} /></Field>
          <Field label="Intervalo agenda">
            <Select value={intervalo} onChange={(event) => setIntervalo(Number(event.target.value))}>
              <option value={30}>30 em 30 minutos</option>
              <option value={60}>1h em 1h</option>
              <option value={120}>2h em 2h</option>
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-black tracking-[-0.04em]">Horario de funcionamento</h2>
        <div className="mt-4 space-y-3">
          {horarios.map((horario, index) => (
            <div key={horario.dia} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="font-black">{dias[horario.dia]}</span>
                <label className="flex items-center gap-2 text-sm font-black">
                  <input type="checkbox" checked={horario.ativo} onChange={(event) => updateHorario(index, { ativo: event.target.checked })} />
                  Ativo
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Inicio"><Input type="time" value={horario.inicio} onChange={(event) => updateHorario(index, { inicio: event.target.value })} /></Field>
                <Field label="Fim"><Input type="time" value={horario.fim} onChange={(event) => updateHorario(index, { fim: event.target.value })} /></Field>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {ok ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{ok}</div> : null}
      <Button loading={loading} className="w-full">Salvar configuracoes</Button>
    </form>
  );
}
