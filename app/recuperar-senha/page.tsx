import { redirect } from "next/navigation";

export default function RecuperarSenhaPage() {
  redirect("https://login.salaopremiun.com.br/login-clerk?motivo=recuperar_senha");
}
