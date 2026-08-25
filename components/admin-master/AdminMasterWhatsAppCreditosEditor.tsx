"use client";

import { useState, type ReactNode } from "react";
import { Coins, Pencil, SlidersHorizontal, Wallet, X } from "lucide-react";
import type {
  AdminWhatsappSaldoRow,
  AdminWhatsappSalaoOption,
  AdminWhatsappTarifaRow,
} from "@/lib/admin-master/whatsapp-creditos";

type ServerAction = (formData: FormData) => Promise<void>;

function money(valueCentavos: number) {
  return (valueCentavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function Dialog({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-3 backdrop-blur-sm sm:p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-4 shadow-2xl sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Admin Master</div>
            <h2 className="mt-2 text-xl font-black text-zinc-950 sm:text-2xl">{title}</h2>
            <p className="mt-1.5 text-sm leading-6 text-zinc-500">{description}</p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 text-zinc-500 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700" aria-label="Fechar modal"><X size={18} /></button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, name, defaultValue, type = "text", required }: { label: string; name: string; defaultValue?: string | number | null; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.14em] text-zinc-500">{label}</span>
      <input name={name} type={type} required={required} defaultValue={defaultValue ?? ""} step={type === "number" ? "0.01" : undefined} className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100" />
    </label>
  );
}

function TextArea({ label, name, defaultValue, required }: { label: string; name: string; defaultValue?: string | null; required?: boolean }) {
  return (
    <label className="block md:col-span-2">
      <span className="text-xs font-black uppercase tracking-[0.14em] text-zinc-500">{label}</span>
      <textarea name={name} required={required} defaultValue={defaultValue ?? ""} rows={4} className="mt-2 w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100" />
    </label>
  );
}

function FormActions({ onCancel, label }: { onCancel: () => void; label: string }) {
  return (
    <div className="flex gap-2 md:col-span-2">
      <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-zinc-200 px-4 py-3 text-sm font-black text-zinc-700 transition hover:bg-zinc-50">Cancelar</button>
      <button type="submit" className="flex-1 rounded-xl bg-violet-700 px-4 py-3 text-sm font-black text-white transition hover:bg-violet-800">{label}</button>
    </div>
  );
}

export default function AdminMasterWhatsAppCreditosEditor({ tarifas, saldos, saloesOptions, salvarTarifa, ajustarSaldo }: { tarifas: AdminWhatsappTarifaRow[]; saldos: AdminWhatsappSaldoRow[]; saloesOptions: AdminWhatsappSalaoOption[]; salvarTarifa: ServerAction; ajustarSaldo: ServerAction }) {
  const [editingTarifa, setEditingTarifa] = useState<AdminWhatsappTarifaRow | null>(null);

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AdminMetric label="Saldo em salões" value={money(saldos.reduce((sum, item) => sum + item.saldoCentavos, 0))} />
        <AdminMetric label="Créditos vendidos" value={money(saldos.reduce((sum, item) => sum + item.totalRecarregadoCentavos, 0))} />
        <AdminMetric label="Consumido" value={money(saldos.reduce((sum, item) => sum + item.totalConsumidoCentavos, 0))} />
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-violet-600"><SlidersHorizontal size={15} />Tarifas</div>
        <h2 className="mt-2 text-xl font-black text-zinc-950 sm:text-2xl">Créditos e tarifas do WhatsApp</h2>
        <p className="mt-1 text-sm leading-6 text-zinc-500">O painel do salão lê estes valores diretamente do banco.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {tarifas.map((tarifa) => (
            <article key={tarifa.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-[11px] font-black uppercase tracking-[0.14em] text-zinc-400">{tarifa.categoriaMeta}</div>
              <h3 className="mt-2 text-base font-black text-zinc-950">{tarifa.nome}</h3>
              <div className="mt-3 text-2xl font-black text-zinc-950">{money(tarifa.precoVendaCentavos)}</div>
              <p className="mt-1 text-xs leading-5 text-zinc-500">Custo ref. {money(tarifa.custoBaseMetaCentavos)} · margem {money(tarifa.margemCentavos)}</p>
              <button type="button" onClick={() => setEditingTarifa(tarifa)} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 text-sm font-black text-violet-700 transition hover:bg-violet-100"><Pencil size={15} />Editar</button>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <form action={ajustarSaldo} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-violet-600"><Coins size={15} />Ajuste manual</div>
          <h2 className="mt-2 text-xl font-black text-zinc-950">Ajustar saldo de salão</h2>
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-zinc-500">Salão</span>
              <select name="id_salao" required className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100">
                <option value="">Escolha</option>
                {saloesOptions.map((salao) => <option key={salao.id} value={salao.id}>{salao.nome}</option>)}
              </select>
            </label>
            <Field label="Valor do ajuste" name="valor" type="number" required />
            <TextArea label="Motivo" name="motivo" required />
            <button type="submit" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 text-sm font-black text-white transition hover:bg-violet-800"><Wallet size={16} />Registrar ajuste</button>
          </div>
        </form>

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 p-4 sm:p-5"><h2 className="text-xl font-black text-zinc-950">Saldos por salão</h2><p className="mt-1 text-xs text-zinc-500">Visão operacional dos créditos disponíveis.</p></div>

          <div className="grid gap-3 p-3 md:hidden">
            {saldos.length ? saldos.map((saldo) => (
              <article key={saldo.idSalao} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate font-black text-zinc-950">{saldo.salaoNome}</div><div className="mt-1 text-xs font-semibold text-zinc-500">Plano {saldo.plano}</div></div><span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-black text-zinc-600">{saldo.status}</span></div>
                <div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl bg-violet-50 p-3"><div className="text-[10px] font-black uppercase tracking-[0.12em] text-violet-500">Saldo</div><div className="mt-1 font-black text-violet-950">{money(saldo.saldoCentavos)}</div></div><div className="rounded-xl bg-zinc-50 p-3"><div className="text-[10px] font-black uppercase tracking-[0.12em] text-zinc-400">Consumido</div><div className="mt-1 font-black text-zinc-900">{money(saldo.totalConsumidoCentavos)}</div></div></div>
              </article>
            )) : <div className="rounded-2xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-500">Nenhum saldo criado ainda.</div>}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-[11px] font-black uppercase tracking-[0.12em] text-zinc-400"><tr><th className="px-4 py-3">Salão</th><th className="px-4 py-3">Plano</th><th className="px-4 py-3">Saldo</th><th className="px-4 py-3">Consumido</th><th className="px-4 py-3">Status</th></tr></thead>
              <tbody className="divide-y divide-zinc-100">
                {saldos.length ? saldos.map((saldo) => <tr key={saldo.idSalao}><td className="px-4 py-3 font-black text-zinc-950">{saldo.salaoNome}</td><td className="px-4 py-3 text-zinc-600">{saldo.plano}</td><td className="px-4 py-3 font-black text-zinc-950">{money(saldo.saldoCentavos)}</td><td className="px-4 py-3 text-zinc-600">{money(saldo.totalConsumidoCentavos)}</td><td className="px-4 py-3 text-zinc-600">{saldo.status}</td></tr>) : <tr><td colSpan={5} className="px-4 py-8 text-sm text-zinc-500">Nenhum saldo criado ainda.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {editingTarifa ? (
        <Dialog title={`Editar ${editingTarifa.nome}`} description="Atualize custo de referência e preço de venda sem alterar o código." onClose={() => setEditingTarifa(null)}>
          <form action={salvarTarifa} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="id" value={editingTarifa.id} />
            <Field label="Nome" name="nome" defaultValue={editingTarifa.nome} required />
            <Field label="Tipo interno" name="tipo_interno" defaultValue={editingTarifa.tipoInterno} required />
            <Field label="Categoria Meta" name="categoria_meta" defaultValue={editingTarifa.categoriaMeta} required />
            <Field label="Custo base Meta" name="custo_base_meta" type="number" defaultValue={editingTarifa.custoBaseMetaCentavos / 100} required />
            <Field label="Preço de venda" name="preco_venda" type="number" defaultValue={editingTarifa.precoVendaCentavos / 100} required />
            <label className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3"><span className="text-sm font-black text-zinc-800">Ativa</span><input name="ativo" type="checkbox" defaultChecked={editingTarifa.ativo} className="h-5 w-5 accent-violet-700" /></label>
            <TextArea label="Descrição" name="descricao" defaultValue={editingTarifa.descricao} required />
            <FormActions label="Salvar tarifa" onCancel={() => setEditingTarifa(null)} />
          </form>
        </Dialog>
      ) : null}
    </div>
  );
}

function AdminMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5"><div className="text-xs font-black uppercase tracking-[0.14em] text-zinc-500">{label}</div><div className="mt-2 text-2xl font-black text-zinc-950">{value}</div></div>;
}
