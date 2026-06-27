#!/usr/bin/env python3
"""Reemplaza clases legacy de modales por clases retro en managers."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    ROOT / "src/app/admin-panel/nequi_manager/NequiManagerContent.tsx",
    ROOT / "src/app/admin-panel/bancolombia_manager/BancolombiaManagerContent.tsx",
]

REPLACEMENTS = [
    ('className="flex space-x-3"', 'className="retro-manager-modal__actions"'),
    ('className="flex justify-center mt-6"', 'className="retro-manager-modal__actions retro-manager-modal__actions--center"'),
    ('className="text-center mb-6"', 'className="retro-manager-modal__intro"'),
    ('className="text-center mb-4"', 'className="retro-manager-modal__intro retro-manager-modal__intro--compact"'),
    ('className="space-y-4"', 'className="retro-manager-modal__form"'),
    ('className="block text-sm font-medium text-gray-300 mb-2"', 'className="retro-manager-modal__label"'),
    (
        'className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"',
        'className="retro-manager-modal__input"',
    ),
    (
        'className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"',
        'className="retro-manager-modal__input"',
    ),
    (
        'className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"',
        'className="retro-manager-modal__textarea"',
    ),
    (
        'className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors font-medium"',
        'className="retro-manager-btn retro-manager-btn--secondary retro-manager-btn--block"',
    ),
    (
        'className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md transition-colors font-medium"',
        'className="retro-manager-btn retro-manager-btn--secondary retro-manager-btn--block"',
    ),
    (
        'className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors font-medium"',
        'className="retro-manager-btn retro-manager-btn--secondary retro-manager-btn--block"',
    ),
    (
        'className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors font-medium"',
        'className="retro-manager-btn retro-manager-btn--primary retro-manager-btn--block"',
    ),
    (
        'className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md transition-colors font-medium"',
        'className="retro-manager-btn retro-manager-btn--primary retro-manager-btn--block"',
    ),
    (
        'className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg transition-colors font-medium"',
        'className="retro-manager-btn retro-manager-btn--primary retro-manager-btn--block"',
    ),
    (
        'className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg transition-colors font-medium"',
        'className="retro-manager-btn retro-manager-btn--primary retro-manager-btn--block"',
    ),
    (
        'className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"',
        'className="retro-manager-btn retro-manager-btn--primary"',
    ),
    (
        'className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors font-medium"',
        'className="retro-manager-btn retro-manager-btn--primary"',
    ),
    (
        'className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"',
        'className="retro-manager-btn retro-manager-btn--primary"',
    ),
    (
        'className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors font-medium"',
        'className="retro-manager-btn retro-manager-btn--secondary retro-manager-btn--block"',
    ),
    (
        'className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors font-medium"',
        'className="retro-manager-btn retro-manager-btn--primary retro-manager-btn--block"',
    ),
    (
        'className="flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors font-medium"',
        'className="retro-manager-btn retro-manager-btn--primary retro-manager-btn--block"',
    ),
    (
        'className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-md transition-colors font-medium"',
        'className="retro-manager-btn retro-manager-btn--secondary retro-manager-btn--block"',
    ),
    (
        'className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md transition-colors font-medium"',
        'className="retro-manager-btn retro-manager-btn--secondary retro-manager-btn--block"',
    ),
    (
        'className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md transition-colors font-medium"',
        'className="retro-manager-btn retro-manager-btn--primary retro-manager-btn--block"',
    ),
    (
        'className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-md transition-colors font-medium"',
        'className="retro-manager-btn retro-manager-btn--primary retro-manager-btn--block"',
    ),
    (
        'className="w-10 h-10 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-xl font-bold transition-colors"',
        'className="retro-manager-modal__step-btn"',
    ),
    (
        'className="w-10 h-10 bg-green-600 hover:bg-green-700 text-white rounded-full flex items-center justify-center text-xl font-bold transition-colors"',
        'className="retro-manager-modal__step-btn"',
    ),
    ('className="flex items-center gap-3"', 'className="retro-manager-modal__step-row"'),
    (
        'className="flex-1 text-center"',
        'className="retro-manager-modal__step-value"',
    ),
    ('className="mb-6"', 'className="retro-manager-modal__field-wrap"'),
    ('className="text-gray-300 mb-2"', 'className="retro-manager-modal__text"'),
    ('className="text-gray-300"', 'className="retro-manager-modal__text"'),
    ('className="text-gray-400 text-sm"', 'className="retro-manager-modal__text retro-manager-modal__text--muted"'),
    (
        'className="text-red-400 font-semibold text-lg mb-2"',
        'className="retro-manager-modal__highlight"',
    ),
    (
        'className="text-yellow-400 font-semibold text-lg mb-2"',
        'className="retro-manager-modal__highlight"',
    ),
    (
        'className="text-orange-400 font-semibold text-lg mb-2"',
        'className="retro-manager-modal__highlight"',
    ),
    (
        'className="text-left px-3 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-gray-300 hover:text-white text-sm transition-colors"',
        'className="retro-manager-modal__reason-btn"',
    ),
    (
        'className="grid grid-cols-1 gap-2 mb-4"',
        'className="retro-manager-modal__reason-list"',
    ),
    (
        'className="grid grid-cols-2 gap-3"',
        'className="retro-manager-modal__amount-grid"',
    ),
]

def main() -> None:
    for path in FILES:
        text = path.read_text(encoding="utf-8")
        original = text
        for old, new in REPLACEMENTS:
            text = text.replace(old, new)
        if text != original:
            path.write_text(text, encoding="utf-8")
            print(f"Actualizado: {path.name}")
        else:
            print(f"Sin cambios: {path.name}")


if __name__ == "__main__":
    main()
