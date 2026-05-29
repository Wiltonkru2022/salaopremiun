import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { runAdminOperation } from "@/lib/supabase/admin-ops";
import ServicoProfissionalForm from "../ServicoProfissionalForm";

type CategoriaOption = {
  id: string;
  nome: string | null;
};

export default async function NovoServicoProfissionalPage() {
  const session = await requireProfissionalAppContext();

  const categorias = await runAdminOperation({
    action: "app_profissional_servico_categorias_novo",
    actorId: session.idProfissional,
    idSalao: session.idSalao,
    run: async (supabase) => {
      const { data, error } = await supabase
        .from("servicos_categorias")
        .select("id, nome")
        .eq("id_salao", session.idSalao)
        .eq("ativo", true)
        .order("nome", { ascending: true });

      if (error) throw new Error(error.message);
      return (data || []) as CategoriaOption[];
    },
  });

  return (
    <ProfissionalShell title="Novo servico" subtitle="Cadastro do profissional">
      <ServicoProfissionalForm categorias={categorias} />
    </ProfissionalShell>
  );
}
