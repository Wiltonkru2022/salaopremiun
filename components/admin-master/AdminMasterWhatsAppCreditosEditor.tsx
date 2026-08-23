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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/55 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-zinc-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.24em] text-amber-600">
              AdminMaster
            </div>
            <h2 className="mt-2 text-2xl font-black text-zinc-950">{title}</h2>
            <p className="mt-1.5 text-sm leading-6 text-zinc-500">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:bg-zinc-950 hover:text-white"
            aria-label="Fechar modal"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        step={type === "number" ? "0.01" : undefined}
        className="mt-2 h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
}) {
  return (
    <label className="block md:col-span-2">
      <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </span>
      <textarea
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        rows={4}
        className="mt-2 w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10"
      />
    </label>
  );
}

function FormActions({ onCancel, label }: { onCancel: () => void; label: string }) {
  return (
    <div className="flex gap-2 md:col-span-2">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 rounded-lg border border-zinc-200 px-4 py-3 text-sm font-black text-zinc-700 transition hover:bg-zinc-50"
      >
        Cancelar
      </button>
      <button
        type="submit"
        className="flex-1 rounded-lg bg-zinc-950 px-4 py-3 text-sm font-black text-white transition hover:bg-zinc-800"
      >
        {label}
      </button>
    </div>
  );
}

export default function AdminMasterWhatsAppCreditosEditor({
  tarifas,
  saldos,
  saloesOptions,
  salvarTarifa,
  ajustarSaldo,
}: {
  tarifas: AdminWhatsappTarifaRow[];
  saldos: AdminWhatsappSaldoRow[];
  saloesOptions: AdminWhatsappSalaoOption[];
  salvarTarifa: ServerAction;
  ajustarSaldo: ServerAction;
}) {
  const [editingTarifa, setEditingTarifa] = useState<AdminWhatsappTarifaRow | null>(null);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-3">
        <AdminMetric label="Saldo em saloes" value={money(saldos.reduce((sum, item) => sum + item.saldoCentavos, 0))} />
        <AdminMetric label="Creditos vendidos" value={money(saldos.reduce((sum, item) => sum + item.totalRecarregadoCentavos, 0))} />
        <AdminMetric label="Consumido" value={money(saldos.reduce((sum, item) => sum + item.totalConsumidoCentavos, 0))} />
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
              <SlidersHorizontal size={15} />
              Tarifas
            </div>
            <h2 className="mt-2 text-2xl font-black text-zinc-950">
              Creditos e tarifas do WhatsApp
            </h2>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              O painel do salao sempre le estes valores do banco.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-4">
          {tarifas.map((tarifa) => (
            <article key={tarifa.id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                {tarifa.categoriaMeta}
              </div>
              <h3 className="mt-2 text-base font-black text-zinc-950">{tarifa.nome}</h3>
              <div className="mt-3 text-2xl font-black text-zinc-950">
                {money(tarifa.precoVendaCentavos)}
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                Custo ref. {money(tarifa.custoBaseMetaCentavos)} | margem {money(tarifa.margemCentavos)}
              </p>
              <button
                type="button"
                onClick={() => setEditingTarifa(tarifa)}
                className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-black text-zinc-800 transition hover:bg-zinc-950 hover:text-white"
              >
                <Pencil size={15} />
                Editar
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <form action={ajustarSaldo} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
            <Coins size={15} />
            Ajuste manual
          </div>
          <h2 className="mt-2 text-xl font-black text-zinc-950">Ajustar saldo de salao</h2>
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                Salao
              </span>
              <select
                name="id_salao"
                required
                className="mt-2 h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-950"
              >
                <option value="">Escolha</option>
                {saloesOptions.map((salao) => (
                  <option key={salao.id} value={salao.id}>
                    {salao.nome}
                  </option>
                ))}
              </select>
            </label>
            <Field label="Valor do ajuste" name="valor" type="number" required />
            <TextArea label="Motivo" name="motivo" required />
            <button
              type="submit"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-black text-white transition hover:bg-zinc-800"
            >
              <Wallet size={16} />
              Registrar ajuste
            </button>
          </div>
        </form>

        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 p-5">
            <h2 className="text-xl font-black text-zinc-950">Saldos por salao</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-[11px] font-black uppercase tracking-[0.14em] text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Salao</th>
                  <th className="px-4 py-3">Plano</th>
                  <th className="px-4 py-3">Saldo</th>
                  <th className="px-4 py-3">Consumido</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {saldos.length ? (
                  saldos.map((saldo) => (
                    <tr key={saldo.idSalao}>
                      <td className="px-4 py-3 font-black text-zinc-950">{saldo.salaoNome}</td>
                      <td className="px-4 py-3 text-zinc-600">{saldo.plano}</td>
                      <td className="px-4 py-3 font-black text-zinc-950">{money(saldo.saldoCentavos)}</td>
                      <td className="px-4 py-3 text-zinc-600">{money(saldo.totalConsumidoCentavos)}</td>
                      <td className="px-4 py-3 text-zinc-600">{saldo.status}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-sm text-zinc-500">
                      Nenhum saldo criado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {editingTarifa ? (
        <Dialog
          title={`Editar ${editingTarifa.nome}`}
          description="Atualize custo de referencia e preco de venda sem alterar codigo."
          onClose={() => setEditingTarifa(null)}
        >
          <form action={salvarTarifa} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="id" value={editingTarifa.id} />
            <Field label="Nome" name="nome" defaultValue={editingTarifa.nome} required />
            <Field label="Tipo interno" name="tipo_interno" defaultValue={editingTarifa.tipoInterno} required />
            <Field label="Categoria Meta" name="categoria_meta" defaultValue={editingTarifa.categoriaMeta} required />
            <Field label="Custo base Meta" name="custo_base_meta" type="number" defaultValue={editingTarifa.custoBaseMetaCentavos / 100} required />
            <Field label="Preco de venda" name="preco_venda" type="number" defaultValue={editingTarifa.precoVendaCentavos / 100} required />
            <label className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3">
              <span className="text-sm font-black text-zinc-800">Ativa</span>
              <input name="ativo" type="checkbox" defaultChecked={editingTarifa.ativo} className="h-5 w-5 accent-zinc-950" />
            </label>
            <TextArea label="Descricao" name="descricao" defaultValue={editingTarifa.descricao} required />
            <FormActions label="Salvar tarifa" onCancel={() => setEditingTarifa(null)} />
          </form>
        </Dialog>
      ) : null}
    </div>
  );
}

function AdminMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-black text-zinc-950">{value}</div>
    </div>
  );
}
