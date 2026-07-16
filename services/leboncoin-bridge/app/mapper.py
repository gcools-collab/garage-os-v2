from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Protocol

from app.models import LeboncoinAttribute, LeboncoinListing, LeboncoinLocation


Scalar = str | int | float | bool | None


class AttributeLike(Protocol):
    key: str
    key_label: str | None
    value: Scalar
    value_label: str | None
    values: Sequence[str] | None
    values_label: Sequence[str] | None


class LocationLike(Protocol):
    city: str | None
    city_label: str | None
    zipcode: str | None
    department_name: str | None
    region_name: str | None


class AdLike(Protocol):
    id: int | str
    subject: str
    body: str | None
    brand: str | None
    url: str
    price: float | int | None
    images: Sequence[str]
    attributes: Mapping[str, AttributeLike]
    location: LocationLike | None
    first_publication_date: str | None
    favorites: int | None


def map_listing(ad: AdLike) -> LeboncoinListing:
    attributes = {
        name: LeboncoinAttribute(
            key=attribute.key,
            key_label=attribute.key_label,
            value=attribute.value,
            value_label=attribute.value_label,
            values=list(attribute.values or []),
            values_label=list(attribute.values_label or []),
        )
        for name, attribute in ad.attributes.items()
    }
    location = None
    if ad.location is not None:
        location = LeboncoinLocation(
            city=ad.location.city,
            city_label=ad.location.city_label,
            zipcode=ad.location.zipcode,
            department_name=ad.location.department_name,
            region_name=ad.location.region_name,
        )

    return LeboncoinListing(
        id=str(ad.id),
        subject=ad.subject,
        body=ad.body,
        brand=ad.brand,
        url=ad.url,
        price=float(ad.price) if ad.price is not None else None,
        images=list(ad.images),
        attributes=attributes,
        location=location,
        owner_type="unknown",
        first_publication_date=ad.first_publication_date,
        favorite_count=ad.favorites,
    )
