import Link from "next/link";
import { Award, CheckCircle2, Printer } from "lucide-react";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

type CertificateRecord = {
  codigo: string; emitido_em: string; revogado_em: string | null;
  matricula: { aluno: { nome: string }; curso: { nome: string; carga_horaria: number } };
};

export default async function Certificado({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const db = getSupabaseAdmin() as any;
  const { data } = await db.from("cursos_certificados")
    .select("codigo,emitido_em,revogado_em,matricula:cursos_matriculas(aluno:cursos_usuarios(nome),curso:cursos_catalogo(nome,carga_horaria))")
    .eq("codigo", codigo.toUpperCase()).maybeSingle();
  if (!data) notFound();
  const cert = data as CertificateRecord;
  const m = cert.matricula;
  const valido = !cert.revogado_em;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://salaopremiun.com.br";
  const qrCode = await QRCode.toDataURL(`${baseUrl}/certificados/verificar/${cert.codigo}`, { width: 180, margin: 1 });
  return <main className="cursos-main"><div className="cursos-wrap cursos-contract">
    <div className="no-print" style={{display:"flex",justifyContent:"space-between",marginBottom:20}}><Link href="/cursos">← SalãoPremium Cursos</Link><span className="cursos-chip">{valido?"Certificado válido":"Certificado revogado"}</span></div>
    <article className="cursos-contract-paper" style={{textAlign:"center",border:"8px double #7a2b69"}}><Award size={70} color="#7a2b69" style={{margin:"0 auto"}}/><p style={{letterSpacing:".18em",textTransform:"uppercase",fontWeight:900,color:"#7a2b69"}}>Certificado de conclusão</p><h1 style={{fontSize:"clamp(34px,6vw,60px)",color:"#3d1537"}}>{m.aluno.nome}</h1><p>Concluiu com aproveitamento o curso presencial</p><h2 style={{fontSize:"clamp(26px,4vw,42px)"}}>{m.curso.nome}</h2><p>com carga horária de <strong>{m.curso.carga_horaria} horas</strong>.</p><p>Emitido em {new Intl.DateTimeFormat("pt-BR",{dateStyle:"long"}).format(new Date(cert.emitido_em))}</p><div style={{margin:"40px auto 10px",maxWidth:360,borderTop:"1px solid #51434d",paddingTop:8}}>SalãoPremium Cursos<br/><small>Responsável pela formação</small></div><img src={qrCode} width="110" height="110" alt="QR Code para validar o certificado" style={{margin:"26px auto 8px"}}/><p style={{fontSize:12,color:"#756873"}}>Código de autenticidade: <strong>{cert.codigo}</strong></p>{valido?<p style={{color:"#287151",fontWeight:900}}><CheckCircle2 size={17} style={{verticalAlign:"middle"}}/> Documento autêntico</p>:<p className="cursos-alert">Este certificado foi revogado.</p>}</article>
    <div className="cursos-actions no-print" style={{justifyContent:"center"}}><span className="cursos-button"><Printer size={17}/> Use Ctrl+P para imprimir ou salvar em PDF</span></div>
  </div></main>;
}
