import Sidebar from "./Sidebar";
import Header from "./Header";

type Permissoes = Record<string, boolean>;

type Props = {
  children: React.ReactNode;
  userName?: string;
  userEmail?: string;
  permissoes: Permissoes;
  nivel: string;
};

export default function AppShell({
  children,
  userName,
  userEmail,
  permissoes,
  nivel,
}: Props) {
  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      <Sidebar permissoes={permissoes} nivel={nivel} />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-zinc-200 bg-zinc-50 px-6">
          <Header
            userName={userName}
            userEmail={userEmail}
            nivel={nivel}
            permissoes={permissoes}
          />
        </div>

        <div className="scroll-premium min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}