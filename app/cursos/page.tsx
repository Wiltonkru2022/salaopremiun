import Link from "next/link";
import { Award, BookOpen, CalendarDays, CheckCircle2, MapPin, Users } from "lucide-react";
import { listarCursosAbertos } from "@/lib/cursos/data";

export const dynamic = "force-dynamic";
const money = (centavos: number) => centavos ? (centavos/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}) : "Consulte";
const date = (value: string) => new Intl.DateTimeFormat("pt-BR",{dateStyle:"long",timeStyle:"short",timeZone:"America/Sao_Paulo"}).format(new Date(value));

export default async function CursosPage(){
  const cursos = await listarCursosAbertos();
  return <main className="cursos-main"><div className="cursos-wrap">
    <section className="cursos-hero"><span className="cursos-eyebrow"><Award size={15}/> Formação que transforma</span><h1>Aprenda na prática. Evolua com confiança.</h1><p>Cursos presenciais para profissionais da beleza que querem aperfeiçoar a técnica, encantar clientes e crescer com segurança.</p><div className="cursos-actions"><Link className="cursos-button light" href="/cursos/cadastro">Quero começar</Link><Link className="cursos-button outline" href="/cursos/login">Já sou aluna</Link></div></section>
    <section className="cursos-section"><span className="cursos-eyebrow" style={{background:"#f2e8ef",color:"#6d235f"}}><BookOpen size={15}/> Próximas formações</span><h2 className="cursos-section-title">Escolha seu próximo passo</h2><p className="cursos-muted">Turmas reduzidas, conteúdo organizado e acesso aos materiais pelo portal.</p>
      <div className="cursos-grid">{cursos.length ? cursos.map(curso => <article className="cursos-card cursos-card-accent" key={curso.id}><h2>{curso.nome}</h2><p className="cursos-muted">{curso.resumo}</p><div className="cursos-meta"><span className="cursos-chip">{curso.carga_horaria}h de formação</span><span className="cursos-chip">{money(curso.valor_centavos)}</span></div>{curso.cursos_turmas?.map(turma=><div key={turma.id} style={{marginTop:16}}><p><CalendarDays size={15} style={{verticalAlign:"middle"}}/> {date(turma.inicio_em)}</p><p><MapPin size={15} style={{verticalAlign:"middle"}}/> {turma.local}</p><p><Users size={15} style={{verticalAlign:"middle"}}/> Até {turma.vagas} alunas</p></div>)}<Link className="cursos-button" href="/cursos/cadastro" style={{marginTop:14}}>Criar conta e matricular</Link></article>) : <article className="cursos-card" style={{gridColumn:"1/-1"}}><h2>Novas turmas em preparação</h2><p className="cursos-muted">Crie sua conta para acompanhar as próximas datas.</p><Link className="cursos-button" href="/cursos/cadastro">Criar minha conta</Link></article>}</div>
    </section>
    <section className="cursos-section"><div className="cursos-grid">{[[CheckCircle2,"Prática acompanhada","Orientação próxima durante todo o encontro."],[BookOpen,"Material completo","Apostila e conteúdos organizados no seu painel."],[Award,"Certificado verificável","Certificado digital após aprovação e conclusão."]].map(([Icon,t,d],i)=>{const I=Icon as typeof Award; return <article className="cursos-card" key={i}><I color="#7a2b69"/><h3 style={{marginTop:16}}>{String(t)}</h3><p className="cursos-muted">{String(d)}</p></article>})}</div></section>
  </div></main>;
}
