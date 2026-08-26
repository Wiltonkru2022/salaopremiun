import { redirect } from "next/navigation";

export default function AtualizarSenhaPage() {
  redirect(
    "https://login.salaopremiun.com.br/login-clerk?mode=recovery&next=%2Fdashboard"
  );
}
