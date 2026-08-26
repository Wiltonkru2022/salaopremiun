import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button, Card, Field, Input, Textarea } from "../components/ui";
import { database } from "../lib/database";
import type { AppSession, AnyRow } from "../types";

export function SettingsPage({ session }: { session: AppSession }) {
  const [config, setConfig] = useState<AnyRow | null>(null);
  const [salao, setSalao] = useState<AnyRow | null>(session.salao as AnyRow | null);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [{ data: configData }, { data: salaoData }] = await Promise.all([
        database.from("configuracoes_salao").select("*").eq("id_salao", session.usuario.id_salao).maybeSingle(),
        database.from("saloes").select("id, nome, responsavel, telefone, whatsapp, endereco, plano, status, logo_url").eq("id", session.usuario.id_salao).maybeSingle()
      ]);
      setConfig((configData || {}) as AnyRow);
      setSalao((salaoData || session.salao || {}) as AnyRow);
    }
    void load();
  }, [session.salao, session.usuario.id_salao]);

  async function save() {
    setSaving(true);
    setMsg("");
    try {
      if (salao) {
        const { error } = await database.from("saloes").update({
          nome: salao.nome,
          responsavel: salao.responsavel,
          telefone: salao.telefone,
          whatsapp: salao.whatsapp,
          endereco: salao.endereco
        }).eq("id", session.usuario.id_salao);
        if (error) throw error;
      }
      if (config) {
        const { error } = await database.from("configuracoes_salao").upsert({ ...config, id_salao: session.usuario.id_salao }, { onConflict: "id_salao" });
        if (error) throw error;
      }
      setMsg("Configuracoes salvas.");
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {msg ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{msg}</div> : null}
      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div><h2 className="text-2xl font-black tracking-[-0.05em]">Configuracoes</h2><p className="text-sm font-bold text-zinc-500">Dados do salao, agenda e Pix do sinal.</p></div>
          <Button loading={saving} onClick={() => void save()}><Save size={16} />Salvar</Button>
        </div>
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <h3 className="text-lg font-black">Perfil do salao</h3>
          <div className="mt-4 grid gap-3">
            <Field label="Nome do salao"><Input value={String(salao?.nome || "")} onChange={(event) => setSalao((current) => ({ ...(current || {}), nome: event.target.value }))} /></Field>
            <Field label="Responsavel"><Input value={String(salao?.responsavel || "")} onChange={(event) => setSalao((current) => ({ ...(current || {}), responsavel: event.target.value }))} /></Field>
            <Field label="WhatsApp"><Input value={String(salao?.whatsapp || salao?.telefone || "")} onChange={(event) => setSalao((current) => ({ ...(current || {}), whatsapp: event.target.value, telefone: event.target.value }))} /></Field>
            <Field label="Endereco"><Textarea value={String(salao?.endereco || "")} onChange={(event) => setSalao((current) => ({ ...(current || {}), endereco: event.target.value }))} /></Field>
          </div>
        </Card>
        <Card>
          <h3 className="text-lg font-black">Agenda e Pix</h3>
          <div className="mt-4 grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Abertura"><Input type="time" value={String(config?.hora_abertura || "08:00").slice(0, 5)} onChange={(event) => setConfig((current) => ({ ...(current || {}), hora_abertura: event.target.value }))} /></Field>
              <Field label="Fechamento"><Input type="time" value={String(config?.hora_fechamento || "20:00").slice(0, 5)} onChange={(event) => setConfig((current) => ({ ...(current || {}), hora_fechamento: event.target.value }))} /></Field>
            </div>
            <Field label="Intervalo da agenda"><Input type="number" min={5} step={5} value={Number(config?.intervalo_minutos || 30)} onChange={(event) => setConfig((current) => ({ ...(current || {}), intervalo_minutos: Number(event.target.value) }))} /></Field>
            <Field label="Chave Pix do sinal"><Input value={String(config?.sinal_pix_chave || "")} onChange={(event) => setConfig((current) => ({ ...(current || {}), sinal_pix_chave: event.target.value }))} /></Field>
            <Field label="Nome do recebedor"><Input value={String(config?.sinal_pix_recebedor || "")} onChange={(event) => setConfig((current) => ({ ...(current || {}), sinal_pix_recebedor: event.target.value }))} /></Field>
            <Field label="Cidade do Pix"><Input value={String(config?.sinal_pix_cidade || "")} onChange={(event) => setConfig((current) => ({ ...(current || {}), sinal_pix_cidade: event.target.value }))} /></Field>
          </div>
        </Card>
      </div>
    </div>
  );
}
