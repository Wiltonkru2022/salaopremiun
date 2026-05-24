import ClientAppPageSkeleton from "@/components/client-app/ClientAppPageSkeleton";

export default function ClienteSalaoDetalhesLoading() {
  return (
    <ClientAppPageSkeleton
      title="Detalhes"
      subtitle="Carregando informações do salão."
      panels={3}
      dark
    />
  );
}
