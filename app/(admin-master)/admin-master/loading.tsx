import AppLoading from "@/components/ui/AppLoading";

export default function AdminMasterLoading() {
  return (
    <AppLoading
      title="Carregando Admin Master"
      message="Aguarde enquanto sincronizamos indicadores, operação e módulos administrativos."
      theme="admin"
      fullHeight={false}
    />
  );
}
