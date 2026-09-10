import CursosPortalHeader from "@/components/cursos/CursosPortalHeader";
import "../cursos/cursos.css";
export default function MeusCursosLayout({children}:{children:React.ReactNode}){return <div className="cursos-shell"><CursosPortalHeader/>{children}</div>}
