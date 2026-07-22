from __future__ import annotations

from dataclasses import dataclass, field
import pytest

import app.gateway as gateway_module
from app.gateway import LbcGateway
from app.models import SearchCriteria


@dataclass
class FakeSearchResult:
    ads: list[object] = field(default_factory=list)


class RecordingClient:
    def __init__(self) -> None:
        self.search_arguments: dict[str, object] = {}

    def search(self, **kwargs: object) -> FakeSearchResult:
        self.search_arguments = kwargs
        return FakeSearchResult()


def run_search(
    monkeypatch: pytest.MonkeyPatch,
    *,
    fuel: str | None = None,
    gearbox: str | None = None,
) -> dict[str, object]:
    client = RecordingClient()
    monkeypatch.setattr(gateway_module.lbc, "Client", lambda **_kwargs: client)
    gateway = LbcGateway(timeout_seconds=2)
    result = gateway.search(
        SearchCriteria(brand="Peugeot", model="308", fuel=fuel, gearbox=gearbox)
    )
    assert result == []
    return client.search_arguments


def test_fuel_is_mapped_and_sent_as_a_list(monkeypatch: pytest.MonkeyPatch) -> None:
    arguments = run_search(monkeypatch, fuel="Essence")
    assert arguments["fuel"] == ["1"]
    assert "gearbox" not in arguments


def test_gearbox_is_mapped_and_sent_as_a_list(monkeypatch: pytest.MonkeyPatch) -> None:
    arguments = run_search(monkeypatch, gearbox="Manuelle")
    assert arguments["gearbox"] == ["1"]
    assert "fuel" not in arguments


def test_fuel_and_gearbox_are_sent_together(monkeypatch: pytest.MonkeyPatch) -> None:
    arguments = run_search(monkeypatch, fuel="Diesel", gearbox="Automatique")
    assert arguments["fuel"] == ["2"]
    assert arguments["gearbox"] == ["2"]


def test_unknown_enum_values_are_ignored(monkeypatch: pytest.MonkeyPatch) -> None:
    arguments = run_search(monkeypatch, fuel="Hydrogène", gearbox="Séquentielle")
    assert "fuel" not in arguments
    assert "gearbox" not in arguments


def test_absent_enum_filters_are_not_sent(monkeypatch: pytest.MonkeyPatch) -> None:
    arguments = run_search(monkeypatch, fuel=" ", gearbox=None)
    assert "fuel" not in arguments
    assert "gearbox" not in arguments


def test_mapping_is_case_and_accent_insensitive(monkeypatch: pytest.MonkeyPatch) -> None:
    arguments = run_search(monkeypatch, fuel="ÉLECTRIQUE", gearbox="AUTOMATIC")
    assert arguments["fuel"] == ["4"]
    assert arguments["gearbox"] == ["2"]
