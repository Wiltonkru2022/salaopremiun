import { Clock, HelpCircle, KeyRound, ShieldCheck, Smartphone, UserRound } from "lucide-react";
import { FormEvent, useState } from "react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Field, Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import type { Profissional } from "../types/database";

export function PerfilPage({
  profissional,
  goTo,
  onChangePassword
}: {
  profissional: Profissional;
  goTo: (view: "configuracoes" | "suporte" | "duvidas" | "instalar" | "privacidade") => void;
  onChangePassword?: (senha: string) => Promise<void>;
}) {
  const [passwordOpen, setPasswordOpen] = useState(false);

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-950 text-white">
        <div className="grid h-16 w-16 place-items-center rounded-3xl bg-amber-400 text-zinc-950">
          <UserRound size={30} />
        </div>
        <h2 className="mt-5 text-3xl font-black tracking-[-0.06em]">{profissional.nome_exibicao || profissional.nome}</h2>
        <p className="mt-1 text-sm font-bold text-zinc-400">{profissional.cargo || profissional.categoria || "Profissional"}</p>
      </Card>

      <Card>
        <h3 className="text-xl font-black tracking-[-0.04em]">Informações</h3>
        <div className="mt-4 grid gap-2">
          <Info label="Telefone" value={profissional.telefone || profissional.whatsapp || "Não informado"} />
          <Info label="Email" value={profissional.email || "Não informado"} />
          <Info label="CPF" value={profissional.cpf || "Não informado"} />
          <Info label="Pix" value={profissional.pix_chave || profissional.sinal_pix_recebedor || "Não informado"} />
          <Info label="Intervalo agenda" value={`${profissional.intervalo_agenda_minutos || 30} minutos`} />
        </div>
      </Card>

      <div className="grid gap-3">
        <ProfileAction icon={<Clock size={21} />} title="Ajustar horários" text="Expediente e intervalo da agenda" onClick={() => goTo("configuracoes")} />
        <ProfileAction icon={<KeyRound size={21} />} title="Trocar senha" text="Senha do app profissional" onClick={() => setPasswordOpen(true)} />
        <ProfileAction icon={<Smartphone size={21} />} title="Instalar app" text="PWA na tela inicial" onClick={() => goTo("instalar")} />
        <ProfileAction icon={<HelpCircle size={21} />} title="Suporte e dúvidas" text="Ajuda rápida do profissional" onClick={() => goTo("suporte")} />
        <ProfileAction icon={<ShieldCheck size={21} />} title="Privacidade" text="Termos e regras de uso" onClick={() => goTo("privacidade")} />
      </div>

      <Modal title="Trocar senha" open={passwordOpen} onClose={() => setPasswordOpen(false)}>
        <PasswordForm
          onSubmit={async (senha) => {
            await onChangePassword?.(senha);
            setPasswordOpen(false);
          }}
        />
      </Modal>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-zinc-50 p-3">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">{label}</div>
      <div className="mt-1 break-words text-sm font-black text-zinc-900">{value}</div>
    </div>
  );
}

function PasswordForm({ onSubmit }: { onSubmit: (senha: string) => Promise<void> }) {
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setErro("");
    if (senha.length < 6) return setErro("A senha precisa ter pelo menos 6 caracteres.");
    if (senha !== confirmar) return setErro("As senhas não conferem.");
    setLoading(true);
    await onSubmit(senha);
    setLoading(false);
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <Field label="Nova senha"><Input type="password" value={senha} onChange={(event) => setSenha(event.target.value)} /></Field>
      <Field label="Confirmar senha"><Input type="password" value={confirmar} onChange={(event) => setConfirmar(event.target.value)} /></Field>
      {erro ? <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{erro}</div> : null}
      <Button loading={loading}>Salvar nova senha</Button>
    </form>
  );
}

function ProfileAction({ icon, title, text, onClick }: { icon: React.ReactNode; title: string; text: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 rounded-[1.25rem] border border-zinc-200 bg-white p-4 text-left shadow-sm active:bg-zinc-50">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-zinc-100 text-zinc-900">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-black tracking-[-0.03em]">{title}</div>
        <div className="truncate text-sm font-bold text-zinc-500">{text}</div>
      </div>
    </button>
  );
}
