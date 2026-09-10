import CursosPortalHeader from "@/components/cursos/CursosPortalHeader";
import "../cursos/cursos.css";
export const metadata={title:"Administração de cursos"};
export default function AdminCursosLayout({children}:{children:React.ReactNode}){return <div className="cursos-shell"><CursosPortalHeader/>{children}</div>}
