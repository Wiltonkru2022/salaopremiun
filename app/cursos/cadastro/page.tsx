import CadastroForm from "./CadastroForm";
export default async function CadastroPage({searchParams}:{searchParams:Promise<{erro?:string}>}){const {erro}=await searchParams;return <main className="cursos-main"><div className="cursos-wrap cursos-form-shell">{erro&&<p className="cursos-alert">{erro}</p>}<CadastroForm/></div></main>}
