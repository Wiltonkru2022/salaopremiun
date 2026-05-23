import ClientAppPageSkeleton from "@/components/client-app/ClientAppPageSkeleton";

export default function ClienteInicioLoading() {
  return (
    <ClientAppPageSkeleton
      title="Explorar"
      subtitle="Carregando salões próximos para você."
      panels={2}
      dark
    />
  );
}
