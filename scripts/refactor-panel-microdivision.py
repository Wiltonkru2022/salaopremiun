from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def export_declarations(block: str) -> tuple[str, list[str], list[str]]:
    block = re.sub(
        r"(?m)^(?!export\s)(async\s+function|function|const|type)\s+",
        lambda m: f"export {m.group(1)} ",
        block,
    )
    type_names = re.findall(r"(?m)^export\s+type\s+([A-Za-z_][A-Za-z0-9_]*)", block)
    value_names = re.findall(
        r"(?m)^export\s+(?:async\s+function|function|const)\s+([A-Za-z_][A-Za-z0-9_]*)",
        block,
    )
    return block, type_names, value_names


def import_lines(module_path: str, type_names: list[str], value_names: list[str]) -> str:
    chunks: list[str] = []
    if type_names:
        chunks.append(f'import type {{ {", ".join(type_names)} }} from "{module_path}";')
    if value_names:
        chunks.append(f'import {{ {", ".join(value_names)} }} from "{module_path}";')
    return "\n".join(chunks) + "\n\n"


def extract_block(
    *,
    source: str,
    start_marker: str,
    end_marker: str,
    target: str,
    module_path: str,
    prelude: str = "",
    postprocess=None,
) -> None:
    source_path = ROOT / source
    target_path = ROOT / target
    text = source_path.read_text(encoding="utf-8-sig")

    start = text.find(start_marker)
    end = text.find(end_marker, start)
    if start < 0 or end < 0:
        raise RuntimeError(f"Marcadores não encontrados em {source}")

    block = text[start:end].rstrip() + "\n"
    exported, type_names, value_names = export_declarations(block)
    target_path.parent.mkdir(parents=True, exist_ok=True)
    target_path.write_text(prelude + exported, encoding="utf-8")

    replacement = import_lines(module_path, type_names, value_names)
    updated = text[:start] + replacement + text[end:]
    if postprocess:
        updated = postprocess(updated)
    source_path.write_text(updated, encoding="utf-8")


def profile_cleanup(text: str) -> str:
    text = text.replace(",\n  type ReactNode,", ",")
    return text


def finance_cleanup(text: str) -> str:
    if text.count("parseComboDisplayMeta") == 1:
        text = text.replace('import { parseComboDisplayMeta } from "@/lib/combo/display";\n', "")
    return text


def comissoes_cleanup(text: str) -> str:
    if text.count("parseComboDisplayMeta") == 1:
        text = text.replace(
            'import { groupComboTotals, parseComboDisplayMeta } from "@/lib/combo/display";',
            'import { groupComboTotals } from "@/lib/combo/display";',
        )
    return text


def main() -> None:
    extract_block(
        source="app/(painel)/perfil-salao/internal/PerfilSalaoWorkspaceCore.tsx",
        start_marker="type PasswordForm = {",
        end_marker="export default function PerfilSalaoPage() {",
        target="app/(painel)/perfil-salao/internal/perfil-salao-support.tsx",
        module_path="./perfil-salao-support",
        prelude='"use client";\n\nimport type { ReactNode } from "react";\nimport type { SalaoForm } from "@/components/configuracoes/types";\n\n',
        postprocess=profile_cleanup,
    )

    extract_block(
        source="app/(painel)/relatorio-financeiro/internal/RelatorioFinanceiroWorkspaceCore.tsx",
        start_marker="type ClienteJoin = {",
        end_marker="export default function RelatorioFinanceiroPage() {",
        target="app/(painel)/relatorio-financeiro/internal/relatorio-financeiro-support.tsx",
        module_path="./relatorio-financeiro-support",
        prelude='"use client";\n\nimport type React from "react";\nimport { parseComboDisplayMeta } from "@/lib/combo/display";\n\n',
        postprocess=finance_cleanup,
    )

    extract_block(
        source="app/(painel)/agenda/internal/AgendaWorkspaceCore.tsx",
        start_marker='const AGENDA_WORKSPACE_STATE_KEY = "salaopremium:painel:agenda:workspace:v1";',
        end_marker="export default function AgendaPage() {",
        target="app/(painel)/agenda/internal/agenda-workspace-support.ts",
        module_path="./agenda-workspace-support",
        prelude='import { normalizeTimeString } from "@/lib/utils/agenda";\n\n',
    )

    extract_block(
        source="components/configuracoes/internal/ConfiguracoesWorkspaceCore.tsx",
        start_marker="export type ConfiguracoesSecao =",
        end_marker="export default function ConfiguracoesPageClient({",
        target="components/configuracoes/internal/configuracoes-workspace-support.ts",
        module_path="./configuracoes-workspace-support",
        prelude='import type { RateioConfig } from "@/components/configuracoes/types";\n\n',
    )

    extract_block(
        source="app/(painel)/vendas/internal/VendasWorkspaceCore.tsx",
        start_marker="const VENDAS_PAGE_SIZE = 10;",
        end_marker="export default function VendasPage() {",
        target="app/(painel)/vendas/internal/vendas-workspace-support.ts",
        module_path="./vendas-workspace-support",
        prelude='import type { ComandaVenda, SalaoInfo } from "@/components/vendas/types";\n\n',
    )

    extract_block(
        source="app/(painel)/comissoes/internal/ComissoesWorkspaceCore.tsx",
        start_marker="function formatCurrency(value: number | null | undefined) {",
        end_marker="export default function ComissoesPage() {",
        target="app/(painel)/comissoes/internal/comissoes-workspace-support.tsx",
        module_path="./comissoes-workspace-support",
        prelude='"use client";\n\nimport { parseComboDisplayMeta } from "@/lib/combo/display";\n\n',
        postprocess=comissoes_cleanup,
    )

    extract_block(
        source="components/profissionais/internal/ProfissionalFormCoreImpl.tsx",
        start_marker="type Servico = {",
        end_marker="export default function ProfissionalForm({",
        target="components/profissionais/internal/profissional-form-support.ts",
        module_path="./profissional-form-support",
    )


if __name__ == "__main__":
    main()
