from __future__ import annotations

from dataclasses import dataclass, field

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from app.mapper import AdLike
from app.models import SearchCriteria

API_KEY = "test-internal-key"
HEADERS = {"X-Internal-Api-Key": API_KEY}


@dataclass
class FakeLocation:
    city: str | None = "Paris"
    city_label: str | None = "Paris (75000)"
    zipcode: str | None = "75000"
    department_name: str | None = "Paris"
    region_name: str | None = "Île-de-France"


@dataclass
class FakeAd:
    id: int | str = 1234567890
    subject: str = "Peugeot 308"
    body: str | None = "Annonce de test"
    brand: str | None = "PEUGEOT"
    url: str = "https://www.leboncoin.fr/ad/voitures/1234567890"
    price: float | int | None = 12_500
    images: list[str] = field(default_factory=lambda: ["https://img.example.test/car.jpg"])
    attributes: dict = field(default_factory=dict)
    location: FakeLocation | None = field(default_factory=FakeLocation)
    first_publication_date: str | None = "2026-01-01 10:00:00"
    favorites: int | None = 12


class FakeGateway:
    def search(self, criteria: SearchCriteria) -> list[AdLike]:
        return [FakeAd()]

    def get_listing(self, url: str) -> AdLike:
        return FakeAd(url=url)


def make_client() -> TestClient:
    app = create_app(
        settings=Settings(internal_api_key=API_KEY, request_timeout_seconds=2),
        gateway=FakeGateway(),
    )
    return TestClient(app)


def test_health() -> None:
    response = make_client().get("/health", headers=HEADERS)

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "provider": "lbc"}


def test_health_requires_internal_api_key() -> None:
    response = make_client().get("/health")

    assert response.status_code == 401


def test_search_rejects_invalid_range() -> None:
    response = make_client().post(
        "/search",
        headers=HEADERS,
        json={
            "brand": "Peugeot",
            "model": "308",
            "min_price": 20_000,
            "max_price": 5_000,
        },
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_search_returns_typescript_compatible_shape() -> None:
    response = make_client().post(
        "/search",
        headers=HEADERS,
        json={"brand": "Peugeot", "model": "308", "max_mileage": 120_000},
    )

    assert response.status_code == 200
    assert response.json()[0]["ownerType"] == "unknown"
    assert response.json()[0]["firstPublicationDate"] == "2026-01-01 10:00:00"
    assert response.json()[0]["favoriteCount"] == 12


def test_listing_rejects_non_leboncoin_url() -> None:
    response = make_client().post(
        "/listing",
        headers=HEADERS,
        json={"url": "https://example.com/ad/1234567890"},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_listing_preserves_marketplace_public_fields() -> None:
    response = make_client().post(
        "/listing",
        headers=HEADERS,
        json={"url": "https://www.leboncoin.fr/ad/voitures/1710970399"},
    )

    assert response.status_code == 200
    listing = response.json()
    assert listing["price"] == 12_500
    assert listing["favoriteCount"] == 12
    assert listing["firstPublicationDate"] == "2026-01-01 10:00:00"
