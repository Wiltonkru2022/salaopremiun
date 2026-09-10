import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { readCursoSession } from "@/lib/cursos/session";
import { sairCursos } from "@/app/cursos/actions";

export default async function CursosPortalHeader(){
 const session=await readCursoSession();
 return <header className="cursos-header"><div className="cursos-wrap cursos-header-inner"><Link href="/cursos" className="cursos-brand"><span className="cursos-brand-mark"><GraduationCap size={22}/></span><span>SalãoPremium <small style={{display:"block",fontWeight:700,color:"#8a7584"}}>Cursos</small></span></Link><nav className="cursos-nav"><Link href="/cursos">Formações</Link>{session&&<><Link href="/meuscursos">Meus cursos</Link>{(session.role==="admin"||session.role==="professor")&&<Link href="/admin-cursos">Administração</Link>}<form action={sairCursos}><button>Sair</button></form></>}</nav></div></header>;
}
