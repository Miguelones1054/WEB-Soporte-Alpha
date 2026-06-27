#!/usr/bin/env python3
"""Migra createPortal legacy a RetroModal en managers."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    ROOT / "src/app/admin-panel/nequi_manager/NequiManagerContent.tsx",
    ROOT / "src/app/admin-panel/bancolombia_manager/BancolombiaManagerContent.tsx",
]

PORTAL_OPEN = re.compile(
    r"(?P<indent>[ \t]*)\{(?P<conds>[\s\S]*?)\s+typeof document !== 'undefined' &&\s+createPortal\(\s*"
    r"<div\s+className=\{MODAL_ROOT_(?P<zlayer>EDIT|STACK|PROGRESS)_PORTAL\}\s*"
    r"(?P<attrs>[^>]*)>\s*"
    r"<div className=\{MODAL_BACKDROP\}(?P<backdrop>[^/]*)/>\s*"
    r"<div\s+className=\{`\$\{MODAL_PANEL_BASE\}[^`]*`\}\s*>",
    re.MULTILINE,
)

PORTAL_CLOSE = re.compile(
    r"</div>\s*</div>\s*,\s*document\.body,\s*\)\}",
    re.MULTILINE,
)


def strip_modal_title(content: str) -> str:
    """Quita h3 visible duplicado si el título va en la titlebar."""
    return re.sub(
        r'\s*<h3[^>]*className="[^"]*text-xl[^"]*"[^>]*>\s*[^<]+\s*</h3>\s*',
        "\n",
        content,
        count=1,
    )


def migrate_file(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    original = text

    # Imports
    if "RetroModal" not in text:
        text = text.replace(
            "import { createPortal } from 'react-dom';\n",
            "",
        )
        if "RetroLoadingOverlay" in text:
            text = text.replace(
                "import { RetroLoadingOverlay } from '../../../components/retro';\n",
                "import { RetroLoadingOverlay } from '../../../components/retro';\n"
                "import {\n"
                "  RetroModal,\n"
                "  RetroManagerProgressModal,\n"
                "  RetroManagerConfirmModal,\n"
                "} from '../../../components/retro/admin';\n",
            )
        else:
            text = text.replace(
                "import { API_BASE_URL } from '../../../lib/constants';\n",
                "import { API_BASE_URL } from '../../../lib/constants';\n"
                "import {\n"
                "  RetroModal,\n"
                "  RetroManagerProgressModal,\n"
                "  RetroManagerConfirmModal,\n"
                "} from '../../../components/retro/admin';\n",
            )

    # Quitar constantes MODAL_*
    text = re.sub(
        r"/\*\* Portal[\s\S]*?const MODAL_PANEL_BASE =[^\n]+\n\n",
        "",
        text,
        count=1,
    )

    # Progress bar (Nequi/Bancolombia)
    text = re.sub(
        r"\{/\* Progress Bar[\s\S]*?createPortal\([\s\S]*?document\.body,\s*\)\}",
        "<RetroManagerProgressModal open={showProgressBar} />",
        text,
        count=1,
    )

    # Confirmation modal genérico
    text = re.sub(
        r"\{/\* Modal de Confirmación[\s\S]*?createPortal\([\s\S]*?document\.body,\s*\)\}",
        """{showConfirmationModal && (
        <RetroManagerConfirmModal
          open={showConfirmationModal}
          type={confirmationType}
          message={confirmationMessage}
          onClose={() => setShowConfirmationModal(false)}
        />
      )}""",
        text,
        count=1,
    )

    # Reemplazos manuales de apertura/cierre para portales restantes
    def portal_replacer(match: re.Match[str]) -> str:
        indent = match.group("indent")
        conds = match.group("conds").strip()
        zlayer = match.group("zlayer")
        attrs = match.group("attrs")
        backdrop = match.group("backdrop")

        z_index = {"EDIT": 100, "STACK": 110, "PROGRESS": 120}[zlayer]

        on_close = ""
        if "onClick=" in backdrop:
            m = re.search(r"onClick=\{([^}]+)\}", backdrop)
            if m:
                on_close = m.group(1)

        title = "Ventana"
        if 'aria-labelledby="' in attrs:
            pass

        width = "md"
        if "max-w-lg" in match.group(0):
            width = "lg"
        elif "max-w-sm" in match.group(0):
            width = "sm"

        role = "dialog"
        if 'role="alertdialog"' in attrs:
            role = "alertdialog"

        aria = ""
        m = re.search(r'aria-labelledby="([^"]+)"', attrs)
        if m:
            aria = f'\n{indent}  ariaLabelledBy="{m.group(1)}"'

        return (
            f"{indent}{{{conds} && (\n"
            f"{indent}  <RetroModal\n"
            f"{indent}    open\n"
            f"{indent}    title=\"{title}\"\n"
            f"{indent}    onClose={{{on_close}}}\n"
            f"{indent}    zIndex={{{z_index}}}\n"
            f"{indent}    width=\"{width}\"\n"
            f"{indent}    role=\"{role}\""
            f"{aria}\n"
            f"{indent}    bodyClassName=\"retro-manager-modal__body\"\n"
            f"{indent}  >"
        )

    # Too fragile for auto - skip generic replacer

    if text == original:
        print(f"Sin cambios automáticos adicionales: {path.name}")
    else:
        path.write_text(text, encoding="utf-8")
        print(f"Migrado parcialmente: {path.name}")


def main() -> int:
    for f in FILES:
        if f.exists():
            migrate_file(f)
        else:
            print(f"No encontrado: {f}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
