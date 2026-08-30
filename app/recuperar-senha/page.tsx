import { redirect } from "next/navigation";
import { getLoginUrl } from "@/lib/site-urls";

export default function RecuperarSenhaPage() {
  redirect(getLoginUrl("/login?motivo=recuperar_senha"));
}
