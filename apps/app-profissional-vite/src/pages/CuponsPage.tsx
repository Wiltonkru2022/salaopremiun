import { Gift, MessageCircle, Search, TicketPercent, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Field, Input, Select } from "../components/ui/Input";
import { Modal, ModalActionBar } from "../components/ui/Modal";
import type { Cliente } from "../types/database";

type Coupon = { id:string; codigo:string; nome:string; descricao?:string|null; tipo_desconto:string; valor_desconto:number; valido_ate?:string|null; limite_uso_total?:number|null; ativo:boolean; enviados:number; resgatados:number; usados:number };
type Recipient = { id:string; nome:string; whatsapp:string; token:string };

function digits(v?: string | null) { return String(v || "").replace(/\D/g, ""); }
function waNumber(v: string) { const d = digits(v); return d.length <= 11 ? `55${d}` : d; }
function discountLabel(c: Coupon) { return c.tipo_desconto === "valor_fixo" ? new Intl.NumberFormat("pt-BR", { style:"currency", currency:"BRL" }).format(Number(c.valor_desconto || 0)) : `${Number(c.valor_desconto || 0)}%`; }

export function CuponsPage({ clientes }: { clientes: Cliente[] }) {
  const [items, setItems] = useState<Coupon[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState("percentual");
  const [valor, setValor] = useState("10");
  const [validade, setValidade] = useState("");
  const [limite, setLimite] = useState("1");
  const [selected, setSelected] = useState<string[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);

  const available = useMemo(() => clientes.filter((c) => digits(c.whatsapp || c.telefone).length >= 10 && c.nome.toLowerCase().includes(search.toLowerCase())), [clientes, search]);

  async function load() {
    const r = await fetch("/api/app-profissional/cupons", { credentials:"same-origin", cache:"no-store" });
    const p = await r.json().catch(() => ({}));
    if (r.ok && p.ok) setItems(p.cupons || []);
  }
  useEffect(() => { void load(); }, []);

  function toggle(id:string) { setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s,id]); }

  async function create() {
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/app-profissional/cupons", { method:"POST", credentials:"same-origin", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ nome, descricao, tipoDesconto:tipo, valorDesconto:Number(valor), validoAte:validade, limiteTotal:Number(limite), clienteIds:selected }) });
      const p = await r.json().catch(() => ({}));
      if (!r.ok || !p.ok) throw new Error(String(p.error || "Não foi possível criar o cupom."));
      setRecipients(p.destinatarios || []); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível criar o cupom."); }
    finally { setLoading(false); }
  }

  function openWhatsapp(r: Recipient) {
    const base = window.location.origin;
    const link = `${base}/resgatar-cupom/${encodeURIComponent(r.token)}`;
    const first = r.nome.split(/\s+/)[0] || r.nome;
    const benefit = tipo === "valor_fixo" ? `${new Intl.NumberFormat("pt-BR", {style:"currency",currency:"BRL"}).format(Number(valor || 0))} de desconto` : `${Number(valor || 0)}% de desconto`;
    const msg = `Oi, ${first}! 🎁 Você ganhou um cupom especial: ${nome}. Benefício: ${benefit}. Válido até ${validade.split("-").reverse().join("/")}. Resgate pelo seu link exclusivo: ${link}`;
    window.open(`https://wa.me/${waNumber(r.whatsapp)}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  }

  return <div className="space-y-4">
    <Card className="overflow-hidden border-amber-100 bg-gradient-to-br from-amber-50 to-white">
      <div className="flex items-start justify-between gap-4"><div><div className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">Relacionamento</div><h2 className="mt-1 text-2xl font-black tracking-[-0.05em]">Cupons privados</h2><p className="mt-1 text-sm font-bold text-zinc-500">Crie benefícios e envie um link exclusivo pelo WhatsApp.</p></div><div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-amber-800"><TicketPercent size={24}/></div></div>
      <Button className="mt-4 w-full" onClick={() => { setOpen(true); setRecipients([]); }}>+ Criar cupom</Button>
    </Card>
    <div className="grid gap-3">{items.map((c) => <Card key={c.id}><div className="flex items-start justify-between gap-3"><div><div className="text-lg font-black">{c.nome}</div><div className="text-sm font-bold text-zinc-500">{discountLabel(c)} · até {c.valido_ate ? c.valido_ate.split("-").reverse().join("/") : "sem validade"}</div></div><span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black">{c.ativo ? "Ativo" : "Pausado"}</span></div><div className="mt-4 grid grid-cols-3 gap-2"><Stat label="Enviados" value={c.enviados}/><Stat label="Resgatados" value={c.resgatados}/><Stat label="Usados" value={c.usados}/></div></Card>)}</div>

    <Modal title="Novo cupom" subtitle="Escolha o benefício e quem vai receber." open={open} onClose={() => !loading && setOpen(false)}>
      {!recipients.length ? <div className="space-y-4">
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4"><div className="flex items-center gap-2 font-black text-amber-900"><Gift size={18}/> Cupom exclusivo por cliente</div><p className="mt-1 text-xs font-bold leading-5 text-amber-800/80">Só quem receber o link poderá resgatar. Cada cliente recebe um token próprio.</p></div>
        <Field label="Nome do cupom"><Input value={nome} onChange={(e)=>setNome(e.target.value)} placeholder="Ex.: Volte e ganhe 15%" /></Field>
        <Field label="Descrição"><Input value={descricao} onChange={(e)=>setDescricao(e.target.value)} placeholder="Mensagem curta do benefício" /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Tipo"><Select value={tipo} onChange={(e)=>setTipo(e.target.value)}><option value="percentual">Percentual</option><option value="valor_fixo">Valor em R$</option></Select></Field><Field label="Desconto"><Input type="number" min="1" value={valor} onChange={(e)=>setValor(e.target.value)} /></Field></div>
        <div className="grid grid-cols-2 gap-3"><Field label="Validade"><Input type="date" value={validade} onChange={(e)=>setValidade(e.target.value)} /></Field><Field label="Limite total"><Input type="number" min="1" value={limite} onChange={(e)=>setLimite(e.target.value)} /></Field></div>
        <div><div className="mb-2 flex items-center justify-between"><div className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">Clientes com WhatsApp</div><button type="button" onClick={()=>setSelected(available.map(c=>c.id))} className="text-xs font-black text-amber-700">Selecionar todas</button></div><div className="relative"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"/><Input className="pl-10" value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Buscar cliente"/></div><div className="mt-2 max-h-64 space-y-2 overflow-auto">{available.map((c)=><button type="button" key={c.id} onClick={()=>toggle(c.id)} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left ${selected.includes(c.id)?"border-amber-300 bg-amber-50":"border-zinc-200 bg-white"}`}><div className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-100"><Users size={18}/></div><div className="min-w-0 flex-1"><div className="truncate font-black">{c.nome}</div><div className="text-xs font-bold text-zinc-500">{c.whatsapp || c.telefone}</div></div><span className="text-xs font-black">{selected.includes(c.id)?"Selecionada":""}</span></button>)}</div></div>
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div> : null}
        <ModalActionBar><Button loading={loading} onClick={create}>Criar e preparar envios</Button></ModalActionBar>
      </div> : <div className="space-y-3"><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="font-black text-emerald-800">Cupom criado com sucesso</div><p className="mt-1 text-sm font-bold text-emerald-700">Abra o WhatsApp de cada cliente. O link é exclusivo e não deve ser compartilhado.</p></div>{recipients.map((r)=><button key={r.id} onClick={()=>openWhatsapp(r)} className="flex w-full items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-left"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><MessageCircle size={21}/></div><div className="min-w-0 flex-1"><div className="truncate font-black">{r.nome}</div><div className="text-xs font-bold text-zinc-500">Abrir WhatsApp com mensagem pronta</div></div></button>)}<Button variant="secondary" className="w-full" onClick={()=>setOpen(false)}>Concluir</Button></div>}
    </Modal>
  </div>;
}
function Stat({label,value}:{label:string;value:number}) { return <div className="rounded-2xl bg-zinc-50 p-3 text-center"><div className="text-xl font-black">{value||0}</div><div className="text-[10px] font-black uppercase tracking-wider text-zinc-400">{label}</div></div>; }
