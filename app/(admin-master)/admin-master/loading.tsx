import AppLoading from "@/components/ui/AppLoading";

export default function AdminMasterLoading() {
  return (
    <AppLoading
      title="Carregando Admin Master"
      message="Aguarde enquanto sincronizamos indicadores, operacao e modulos administrativos."
      theme="admin"
      fullHeight={false}
    />
  );
}
