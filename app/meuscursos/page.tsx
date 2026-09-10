import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, BookOpen, CalendarDays, MapPin } from "lucide-react";
import { buscarUsuario, listarCursosAbertos, listarMatriculasDoAluno } from "@/lib/cursos/data";
import { readCursoSession } from "@/lib/cursos/session";
import { matricularSe } from "@/app/cursos/actions";

export const dynamic="force-dynamic";
const date=(v:string)=>new Intl.DateTimeFormat("pt-BR",{dateStyle:"medium",timeStyle:"short",timeZone:"America/Sao_Paulo"}).format(new Date(v));
const statusLabel:Record<string,string>={pendente:"Contrato pendente",confirmada:"Matrícula confirmada",em_andamento:"Em andamento",concluida:"Concluído",cancelada:"Cancelado"};
export default async function MeusCursos({searchParams}:{searchParams:Promise<{erro?:string}>}){
 const session=await readCursoSession();if(!session)redirect("/cursos/login");
 const [aluno,matriculas,cursos,{erro}]=await Promise.all([buscarUsuario(session.userId),listarMatriculasDoAluno(session.userId),listarCursosAbertos(),searchParams]);
 if(!aluno.termo_cadastro_aceito_em)redirect("/cursos/contrato");
 const turmasMatriculadas=new Set(matriculas.map(m=>m.turma.id));
 return <main className="cursos-main"><div className="cursos-wrap"><span className="cursos-eyebrow" style={{background:"#f2e8ef",color:"#6d235f"}}>Área da aluna</span><h1 className="cursos-section-title" style={{marginTop:14}}>Olá, {aluno.nome.split(" ")[0]}</h1><p className="cursos-muted">Acompanhe suas formações, materiais e certificados.</p>{erro&&<p className="cursos-alert">{erro}</p>}
  <section className="cursos-section" style={{paddingTop:32}}><h2>Minhas matrículas</h2><div className="cursos-grid">{matriculas.length?matriculas.map(m=><article className="cursos-card cursos-card-accent" key={m.id}><span className="cursos-chip">{statusLabel[m.status]}</span><h2 style={{marginTop:16}}>{m.curso.nome}</h2><p className="cursos-muted"><CalendarDays size={15} style={{verticalAlign:"middle"}}/> {date(m.turma.inicio_em)}<br/><MapPin size={15} style={{verticalAlign:"middle"}}/> {m.turma.local}</p><div className="cursos-progress"><span style={{width:`${m.progresso_percentual}%`}}/></div><p className="cursos-muted">{m.progresso_percentual}% concluído · Frequência {m.frequencia_percentual}%</p><Link className="cursos-button" href={m.status==="pendente"?`/meuscursos/${m.id}/contrato`:`/meuscursos/${m.id}/painel`}>{m.status==="pendente"?"Assinar contrato":"Abrir painel"}</Link></article>):<article className="cursos-card"><BookOpen color="#7a2b69"/><h3 style={{marginTop:14}}>Nenhuma matrícula ainda</h3><p className="cursos-muted">Escolha uma turma abaixo para começar.</p></article>}</div></section>
  <section className="cursos-section"><h2>Turmas disponíveis</h2><div className="cursos-grid">{cursos.flatMap(c=>c.cursos_turmas.filter(t=>!turmasMatriculadas.has(t.id)).map(t=><article className="cursos-card" key={t.id}><h3>{c.nome}</h3><p className="cursos-muted">{c.resumo}</p><p><CalendarDays size={15} style={{verticalAlign:"middle"}}/> {date(t.inicio_em)}<br/><MapPin size={15} style={{verticalAlign:"middle"}}/> {t.local}</p><form action={matricularSe}><input type="hidden" name="turma_id" value={t.id}/><button className="cursos-button">Matricular-se</button></form></article>))}</div></section>
  {matriculas.some(m=>m.status==="concluida")&&<section className="cursos-section"><div className="cursos-card"><Award color="#7a2b69"/><h2>Seus certificados estão disponíveis</h2><p className="cursos-muted">Abra o painel do curso concluído para visualizar, imprimir e validar.</p></div></section>}
 </div></main>;
}
