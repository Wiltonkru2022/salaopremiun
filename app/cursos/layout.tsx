import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { readCursoSession } from "@/lib/cursos/session";
import { sairCursos } from "./actions";
import "./cursos.css";

export const metadata: Metadata = {
  title: "Cursos presenciais",
  description: "Cursos presenciais, materiais, acompanhamento e certificados do SalãoPremium.",
};

export default async function CursosLayout({ children }: { children: React.ReactNode }) {
  const session = await readCursoSession();
  return <div className="cursos-shell">
    <header className="cursos-header"><div className="cursos-wrap cursos-header-inner">
      <Link href="/cursos" className="cursos-brand"><span className="cursos-brand-mark"><GraduationCap size={22}/></span><span>SalãoPremium <small style={{display:"block",fontWeight:700,color:"#8a7584"}}>Cursos</small></span></Link>
      <nav className="cursos-nav"><Link href="/cursos">Formações</Link>{session ? <><Link href="/meuscursos">Meus cursos</Link>{(session.role === "admin" || session.role === "professor") && <Link href="/admin-cursos">Administração</Link>}<form action={sairCursos}><button type="submit">Sair</button></form></> : <><Link href="/cursos/login">Entrar</Link><Link href="/cursos/cadastro">Criar conta</Link></>}</nav>
    </div></header>
    {children}
    <footer className="cursos-footer"><div className="cursos-wrap">© {new Date().getFullYear()} SalãoPremium Cursos · Formação presencial com acompanhamento profissional.</div></footer>
  </div>;
}
