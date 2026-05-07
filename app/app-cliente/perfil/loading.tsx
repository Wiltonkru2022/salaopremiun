import ClientAppPageSkeleton from "@/components/client-app/ClientAppPageSkeleton";

export default function ClientePerfilLoading() {
  return (
    <ClientAppPageSkeleton
      title="Perfil"
      subtitle="Carregando seus dados com seguranca."
      panels={2}
    />
  );
}
