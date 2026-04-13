import AppShell from "@/components/layout/AppShell";
import { getUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const userName =
    user?.user_metadata?.nome ||
    user?.email?.split("@")[0] ||
    "Usuário";

  const { data: usuario, error: usuarioError } = await supabase
    .from("usuarios")
    .select("id, id_salao, nivel, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (usuarioError || !usuario) {
    return (
      <div className="p-6 text-red-600">
        Erro ao carregar usuário do sistema.
      </div>
    );
  }

  if (usuario.status !== "ativo") {
    return (
      <div className="p-6 text-red-600">
        Usuário inativo.
      </div>
    );
  }

  const { data: permissoes } = await supabase
    .from("usuarios_permissoes")
    .select("*")
    .eq("id_usuario", usuario.id)
    .eq("id_salao", usuario.id_salao)
    .maybeSingle();

  const permissoesFinal =
    permissoes || {
      dashboard_ver: true,
      agenda_ver: true,
      clientes_ver: true,
      profissionais_ver: true,
      servicos_ver: true,
      produtos_ver: true,
      estoque_ver: true,
      comandas_ver: true,
      vendas_ver: true,
      caixa_ver: true,
      comissoes_ver: true,
      relatorios_ver: true,
      marketing_ver: true,
      configuracoes_ver: usuario.nivel === "admin",
      assinatura_ver: usuario.nivel === "admin",
    };

  return (
    <AppShell
      userName={userName}
      userEmail={user?.email || ""}
      permissoes={permissoesFinal}
      nivel={usuario.nivel}
    >
      {children}
    </AppShell>
  );
}