import ClientAppPageSkeleton from "@/components/client-app/ClientAppPageSkeleton";

export default function ClienteSalaoLoading() {
  return (
    <ClientAppPageSkeleton
      title="Salão"
      subtitle="Preparando serviços, equipe e horários."
      panels={4}
    />
  );
}
