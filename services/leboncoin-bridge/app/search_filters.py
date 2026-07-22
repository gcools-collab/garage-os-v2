from __future__ import annotations

import unicodedata

FUEL_CODES: dict[str, str] = {
    "essence": "1",
    "diesel": "2",
    "gazole": "2",
    "hybride": "3",
    "electrique": "4",
}

GEARBOX_CODES: dict[str, str] = {
    "manuelle": "1",
    "manuel": "1",
    "manual": "1",
    "automatique": "2",
    "automatic": "2",
}


def _normalize(value: str) -> str:
    decomposed = unicodedata.normalize("NFD", value.strip().lower())
    return "".join(character for character in decomposed if not unicodedata.combining(character))


def map_fuel(value: str | None) -> str | None:
    if not value or not value.strip():
        return None
    return FUEL_CODES.get(_normalize(value))


def map_gearbox(value: str | None) -> str | None:
    if not value or not value.strip():
        return None
    return GEARBOX_CODES.get(_normalize(value))


def build_enum_filters(fuel: str | None, gearbox: str | None) -> dict[str, list[str]]:
    filters: dict[str, list[str]] = {}
    mapped_fuel = map_fuel(fuel)
    mapped_gearbox = map_gearbox(gearbox)
    if mapped_fuel is not None:
        filters["fuel"] = [mapped_fuel]
    if mapped_gearbox is not None:
        filters["gearbox"] = [mapped_gearbox]
    return filters
