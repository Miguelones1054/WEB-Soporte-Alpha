#!/usr/bin/env python3
"""Copia y categoriza iconos Windows 98 (.ico) al proyecto."""

from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parents[1] / "windows98-icons" / "ico"
ASSETS = ROOT / "src/assets/icons/win98"
PUBLIC = ROOT / "public/icons/win98"
REGISTRY = ROOT / "src/assets/icons/win98/registry.ts"
MANIFEST = ROOT / "src/assets/icons/win98/manifest.json"

# Orden importa: la primera categoría que coincida gana.
CATEGORY_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("accessibility", ("accessibility", "access_", "access_wheelchair")),
    ("search", ("search_",)),
    ("help", ("help_",)),
    ("users", ("address_book", "user_")),
    ("communication", (
        "envelope", "mail", "phone", "fax", "message_", "msg_", "newspaper",
        "outlook", "mailbox", "conn_dialup_recbin_phone",
    )),
    ("security", ("certificate", "padlock", "key_", "keys.", "encrypt", "_lock")),
    ("games", ("game_", "pinball", "solitaire", "freecell", "hearts", "minesweeper")),
    ("network", (
        "network", "conn_", "dial-up", "dialup", "globe", "internet",
        "entire_network", "web", "download",
    )),
    ("hardware", (
        "printer", "mouse", "keyboard", "monitor", "hard_", "floppy",
        "battery", "cable", "scanner", "card_reader", "cd_drive", "ups",
        "laptop", "display_", "joystick", "microphone", "overlay_", "wia_",
        "modem", "tape_drive",
    )),
    ("media", (
        "cd_audio", "audio_", "video_", "midi_", "cassette", "camera",
        "sound", "Sound", "Roland", "loudspeaker", "mixer_", "paint_",
        "graphedit", "media_", "volume_", "wave", "active_movie", "netshow",
        "amplify", "soundgrn", "soundpu", "soundpur", "soundtel", "soundvor", "soundyel",
    )),
    ("navigation", (
        "homepage", "computer_explorer", "program_manager", "connected_world",
        "world_", "computer_win",
    )),
    ("office", (
        "notepad", "write_", "calendar", "calculator", "chart", "bar_graph",
        "appwizard", "pie_chart", "document",
    )),
    ("files", (
        "directory_", "file_", "briefcase", "cardfile", "recycle", "folder",
        "cabinet", "template", "catalog",
    )),
    ("system", (
        "windows_", "shell_", "application_", "appwiz", "gears", "settings_",
        "regedit", "hourglass", "shut_down", "start_menu", "winrep", "computer",
        "msinfo", "tune-up", "control_", "executable_", "installer_", "font_",
        "defrag", "backup_", "no.", "no2", "clock", "ac_plug", "c-clamp",
    )),
]

CATEGORIES = [c[0] for c in CATEGORY_RULES] + ["misc"]


def categorize(name: str) -> str:
    lower = name.lower()
    for category, prefixes in CATEGORY_RULES:
        for prefix in prefixes:
            if lower.startswith(prefix) or prefix in lower:
                return category
    return "misc"


def slug(name: str) -> str:
    return re.sub(r"[^a-z0-9._-]+", "_", name.lower()).strip("_")


def main() -> None:
    if not SOURCE.is_dir():
        raise SystemExit(f"No se encontró la carpeta de iconos: {SOURCE}")

    # Limpiar destinos anteriores
    for base in (ASSETS, PUBLIC):
        if base.exists():
            shutil.rmtree(base)
        base.mkdir(parents=True)

    icons: dict[str, str] = {}
    counts: dict[str, int] = {}

    for src in sorted(SOURCE.glob("*.ico")):
        stem = src.stem
        category = categorize(stem)
        counts[category] = counts.get(category, 0) + 1
        rel = f"{category}/{stem}"
        icons[rel] = f"/icons/win98/{category}/{stem}.ico"

        dest_dir_assets = ASSETS / category
        dest_dir_public = PUBLIC / category
        dest_dir_assets.mkdir(parents=True, exist_ok=True)
        dest_dir_public.mkdir(parents=True, exist_ok=True)

        shutil.copy2(src, dest_dir_assets / f"{stem}.ico")
        shutil.copy2(src, dest_dir_public / f"{stem}.ico")

    category_union = " | ".join(f"'{c}'" for c in CATEGORIES)

    registry_ts = f"""// Generado por scripts/migrate-win98-icons.py — no editar a mano
export const WIN98_ICON_CATEGORIES = [
  {", ".join(f"'{c}'" for c in CATEGORIES)}
] as const;

export type Win98IconCategory = (typeof WIN98_ICON_CATEGORIES)[number];

/** Ruta lógica: categoría/nombre_sin_ext (ej. navigation/homepage) */
export type RetroIconName = `${{Win98IconCategory}}/${{string}}`;

const ICON_BASE = '/icons/win98';

export function getRetroIconSrc(name: RetroIconName | string): string {{
  const normalized = name.endsWith('.ico') ? name[:-4] if False else name
  return `${{ICON_BASE}}/${{name}}.ico`;
}}

export function isWin98IconCategory(value: string): value is Win98IconCategory {{
  return (WIN98_ICON_CATEGORIES as readonly string[]).includes(value);
}}

export const RETRO_ICON_MANIFEST = {{
  source: 'windows98-icons/ico',
  total: {len(icons)},
  categories: {json.dumps(counts, indent=2)},
}} as const;
"""

    # Fix the broken template in registry - I made a typo. Let me fix in write
    registry_ts = f"""// Generado por scripts/migrate-win98-icons.py — no editar a mano
export const WIN98_ICON_CATEGORIES = [
  {", ".join(f"'{c}'" for c in CATEGORIES)}
] as const;

export type Win98IconCategory = (typeof WIN98_ICON_CATEGORIES)[number];

/** Ruta lógica: categoría/nombre_sin_ext (ej. navigation/homepage) */
export type RetroIconName = `${{Win98IconCategory}}/${{string}}`;

const ICON_BASE = '/icons/win98';

export function getRetroIconSrc(name: RetroIconName | string): string {{
  return `${{ICON_BASE}}/${{name}}.ico`;
}}

export function isWin98IconCategory(value: string): value is Win98IconCategory {{
  return (WIN98_ICON_CATEGORIES as readonly string[]).includes(value);
}}

export const RETRO_ICON_MANIFEST = {{
  source: 'windows98-icons/ico',
  total: {len(icons)},
  categories: {json.dumps(counts, indent=2)},
}} as const;
"""

    REGISTRY.write_text(registry_ts, encoding="utf-8")

    manifest = {
        "source": "windows98-icons/ico",
        "format": "ico",
        "total": len(icons),
        "categories": counts,
        "icons": icons,
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"Migrados {len(icons)} iconos .ico")
    for cat in CATEGORIES:
        if counts.get(cat):
            print(f"  {cat}: {counts[cat]}")


if __name__ == "__main__":
    main()
