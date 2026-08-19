import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Car,
  Clock,
  ImageIcon,
  MapPin,
  MessageCircle,
  Phone,
  Star,
} from "lucide-react";
import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import ClientAppDrawerNav from "@/components/client-app/ClientAppDrawerNav";
import { getClientAppSalonDetail } from "@/lib/client-app/queries";

export const metadata = { title: "Detalhes do salão" };

const DIAS_LABEL: Record<string, string> = { domingo: "Domingo", segunda: "Segunda", terca: "Terça", quarta: "Quarta", quinta: "Quinta", sexta: "Sexta", sabado: "Sábado" };
const DIAS_BY_INDEX = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
function normalizePhone(value?: string | null) { const d = String(value || "").replace(/\D/g, ""); return d ? (d.startsWith("55") ? d : `55${d}`) : null; }
function normalizeDia(value: string) { return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
function formatDiasFuncionamento(dias: string[]) { const n = dias.map(normalizeDia).filter(Boolean); return n.length ? n.map((d) => DIAS_LABEL[d] || d).join(", ") : "Dias em atualização"; }
function formatPhone(value?: string | null) { const digits = String(value || "").replace(/\D/g, ""); if (digits.length < 10) return value || null; const local = digits.startsWith("55") ? digits.slice(2) : digits; return `(${local.slice(0,2)}) ${local.slice(2,7)}-${local.slice(7,11)}`; }

export default async function ClienteSalonDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const salao = await getClientAppSalonDetail(id);
    const phone = normalizePhone(salao.whatsapp || salao.telefone);
    const mapsUrl = salao.enderecoCompleto ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(salao.enderecoCompleto)}` : null;
    const hojeKey = DIAS_BY_INDEX[new Date().getDay()];
    const diasFuncionamento = salao.horarioFuncionamento.diasFuncionamento.map(normalizeDia);
    const abertoHoje = diasFuncionamento.includes(hojeKey);
    const horarioLabel = `${salao.horarioFuncionamento.horaAbertura} - ${salao.horarioFuncionamento.horaFechamento}`;
    const diasLabel = formatDiasFuncionamento(salao.horarioFuncionamento.diasFuncionamento);
    const reviews = salao.avaliacoes.filter((item) => Number(item.nota) > 0);
    const notaMedia = reviews.length ? reviews.reduce((sum, item) => sum + item.nota, 0) / reviews.length : null;
    const hasPortfolio = salao.portfolio.length > 0;
    const photos = salao.portfolio.map((foto) => foto.imagemUrl);
    const formattedPhone = formatPhone(salao.telefone || salao.whatsapp);
    const amenities: Array<{ label: string; icon: typeof Car }> = [];
    if (salao.estacionamento) amenities.push({ label: "Estacionamento", icon: Car });
    if (salao.formasPagamento.some((item) => item.toLowerCase().includes("pix"))) amenities.push({ label: "Pagamento Pix", icon: Star });

    return <ClientAppFrame title={salao.nome} subtitle="Contato e funcionamento">
      <section className="min-h-dvh bg-[#050505] pb-36 text-white">
        <div className="relative min-h-[390px] overflow-hidden px-5 pb-6 pt-[calc(env(safe-area-inset-top)+1rem)]">
          {salao.fotoCapaUrl ? <img src={salao.fotoCapaUrl} alt={`Capa de ${salao.nome}`} className="absolute inset-0 h-full w-full object-cover opacity-60" /> : <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-800 to-[#6d531d]" />}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/45 to-[#050505]" />
          <div className="relative z-10 flex items-center justify-between"><Link href={`/app-cliente/salao/${id}`} className="flex h-12 w-12 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur" aria-label="Voltar"><ArrowLeft size={25} /></Link><div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/45"><ClientAppDrawerNav isDark /></div></div>
          <div className="relative z-10 mt-12 flex items-end gap-4">
            <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-3xl border border-white/15 bg-black/50 text-2xl font-black shadow-xl">{salao.logoUrl ? <img src={salao.logoUrl} alt={`Logo de ${salao.nome}`} className="h-full w-full object-cover" /> : salao.nome.slice(0,2).toUpperCase()}</div>
            <div className="min-w-0 flex-1"><h1 className="text-[1.9rem] font-black leading-tight tracking-[-0.04em]">{salao.nome}</h1><div className="mt-2 flex items-center gap-2 text-sm text-zinc-100">{notaMedia !== null ? <><Star size={17} className="text-[#f6b93f]" fill="currentColor" /><span className="font-bold">{notaMedia.toFixed(1)}</span><span>· {reviews.length} {reviews.length === 1 ? "avaliação" : "avaliações"}</span></> : <span className="text-zinc-300">Ainda sem avaliações</span>}</div>{salao.enderecoCompleto ? <div className="mt-2 flex items-start gap-2 text-sm leading-5 text-zinc-200"><MapPin size={17} className="mt-0.5 shrink-0" /><span>{salao.enderecoCompleto}</span></div> : null}</div>
          </div>
          <div className="relative z-10 mt-7 grid grid-cols-2 gap-3">{mapsUrl ? <a href={mapsUrl} target="_blank" rel="noreferrer" className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-white/25 bg-black/25 text-sm font-black backdrop-blur"><MapPin size={20} />Ver no mapa</a> : <div className="flex h-14 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-sm text-zinc-400">Endereço não informado</div>}{phone ? <a href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer" className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#22c55e] text-sm font-black"><MessageCircle size={21} />WhatsApp</a> : <div className="flex h-14 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-sm text-zinc-400">WhatsApp indisponível</div>}</div>
        </div>

        <div className="mx-auto max-w-md space-y-4 px-5">
          <section className="overflow-hidden rounded-[1.4rem] border border-white/8 bg-[#171819]">
            <div className="grid grid-cols-[50px_1fr] items-center gap-3 border-b border-white/8 px-4 py-4"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white/8"><Clock size={21} /></span><div><p className={`font-black ${abertoHoje ? "text-[#22c55e]" : "text-zinc-300"}`}>{abertoHoje ? "Aberto hoje" : "Fechado hoje"}</p><p className="mt-1 text-sm text-zinc-300">{abertoHoje ? horarioLabel : diasLabel}</p></div></div>
            <div className="grid grid-cols-[50px_1fr] items-center gap-3 border-b border-white/8 px-4 py-4"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white/8"><CalendarDays size={21} /></span><div><p className="font-bold">Funcionamento</p><p className="mt-1 text-sm text-zinc-300">{diasLabel} · {horarioLabel}</p></div></div>
            {formattedPhone ? <div className="grid grid-cols-[50px_1fr_auto] items-center gap-3 px-4 py-4"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white/8"><Phone size={21} /></span><div><p className="font-bold">Telefone</p><p className="mt-1 text-sm text-zinc-300">{formattedPhone}</p></div><a href={phone ? `tel:+${phone}` : undefined} className="grid h-10 w-10 place-items-center rounded-xl bg-white/10" aria-label="Ligar"><Phone size={19} /></a></div> : null}
          </section>

          <section className="rounded-[1.4rem] border border-white/8 bg-[#171819] p-5"><h2 className="text-xl font-black">Sobre o salão</h2><p className="mt-3 text-sm leading-6 text-zinc-300">{salao.descricaoPublica || "Este salão ainda não publicou uma descrição."}</p>{amenities.length ? <div className="mt-5 grid grid-cols-2 gap-2 text-sm font-semibold">{amenities.map((item) => { const Icon = item.icon; return <div key={item.label} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-3"><Icon size={18} className="text-[#f6b93f]" /><span>{item.label}</span></div>; })}</div> : null}</section>

          <section className="rounded-[1.4rem] border border-white/8 bg-[#171819] p-5"><div className="flex items-center justify-between"><h2 className="text-xl font-black">Fotos do salão</h2>{hasPortfolio ? <Link href={`/app-cliente/salao/${id}/portfolio`} className="text-sm font-black text-[#f6b93f]">Ver todas</Link> : null}</div>{hasPortfolio ? <div className="mt-4 flex gap-3 overflow-x-auto pb-1">{photos.slice(0,6).map((photo,index) => <img key={`${photo}-${index}`} src={photo} alt="" className="h-28 w-36 shrink-0 rounded-2xl object-cover" />)}</div> : <div className="mt-4 rounded-xl border border-dashed border-white/20 p-5 text-center text-sm text-zinc-400"><ImageIcon className="mx-auto mb-2 h-7 w-7" />Este salão ainda não publicou fotos.</div>}</section>
        </div>
      </section>
    </ClientAppFrame>;
  } catch { notFound(); }
}
