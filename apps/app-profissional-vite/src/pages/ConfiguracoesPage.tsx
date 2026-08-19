import { FormEvent, useState } from "react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Field, Input, Select } from "../components/ui/Input";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import type { HorarioDia } from "../types/database";

const dias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function ConfiguracoesPage() {
  const { profissional, refreshProfissional } = useAuth();
  const [nome, setNome] = useState(profissional?.nome || "");
  const [telefone, setTelefone] = useState(profissional?.telefone || "");
  const [intervalo, setIntervalo] = useState(profissional?.intervalo_agenda_minutos || 30);
  const [horarios, setHorarios] = useState<HorarioDia[]>(profissional?.horario_funcionamento || []);
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState("");
  const [error, setError] = useState("");

  function updateHorario(index: number, patch: Partial<HorarioDia>) {
    setHorarios((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!profissional || loading) return;

    if (!nome.trim()) {
      setError("Informe o nome do profissional.");
      return;
    }

    const horarioInvalido = horarios.find(
      (horario) => horario.ativo && (!horario.inicio || !horario.fim || horario.fim <= horario.inicio)
    );
    if (horarioInvalido) {
      setError(`Revise o horário de ${dias[horarioInvalido.dia] || "funcionamento"}: o fim precisa ser depois do início.`);
      return;
    }

    setLoading(true);
    setOk("");
    setError("");
    try {
      const { error: saveError } = await supabase
        .from("profissionais")
        .update({
          nome: nome.trim(),
          telefone: telefone.trim(),
          intervalo_agenda_minutos: intervalo,
          horario_funcionamento: horarios
        })
        .eq("id", profissional.id);

      if (saveError) throw new Error(saveError.message);
      await refreshProfissional();
      setOk("Configurações salvas com sucesso.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Não foi possível salvar as configurações.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card>
        <h2 className="text-xl font-black tracking-[-0.04em]">Perfil</h2>
        <div className="mt-4 grid gap-3">
          <Field label="Nome"><Input required value={nome} onChange={(event) => setNome(event.target.value)} /></Field>
          <Field label="Telefone"><Input inputMode="tel" value={telefone} onChange={(event) => setTelefone(event.target.value)} /></Field>
          <Field label="Intervalo da agenda">
            <Select value={intervalo} onChange={(event) => setIntervalo(Number(event.target.value))}>
              <option value={30}>A cada 30 minutos</option>
              <option value={60}>A cada 1 hora</option>
              <option value={120}>A cada 2 horas</option>
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-black tracking-[-0.04em]">Horário de funcionamento</h2>
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
                <Field label="Início"><Input type="time" disabled={!horario.ativo} value={horario.inicio} onChange={(event) => updateHorario(index, { inicio: event.target.value })} /></Field>
                <Field label="Fim"><Input type="time" disabled={!horario.ativo} value={horario.fim} onChange={(event) => updateHorario(index, { fim: event.target.value })} /></Field>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {ok ? <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{ok}</div> : null}
      {error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div> : null}
      <Button type="submit" loading={loading} className="w-full">Salvar configurações</Button>
    </form>
  );
}
