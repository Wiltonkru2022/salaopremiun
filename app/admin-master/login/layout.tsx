import AdminMasterLogin from "../clerk-login/page";

export default function AdminMasterLoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  void children;
  return <AdminMasterLogin />;
}
