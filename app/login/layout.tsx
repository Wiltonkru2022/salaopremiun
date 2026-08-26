import { redirect } from "next/navigation";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  void children;
  redirect("/login-clerk");
}
