"use client";

import { useParams } from "next/navigation";
import ClienteForm from "@/components/clientes/ClienteForm";
import ClienteAppMigrationCard from "@/components/clientes/ClienteAppMigrationCard";

export default function EditarClientePage() {
  const params = useParams();
  const clienteId = typeof params?.id === "string" ? params.id : "";

  return (
    <div className="space-y-4">
      {clienteId ? <ClienteAppMigrationCard clienteId={clienteId} /> : null}
      <ClienteForm modo="editar" />
    </div>
  );
}
