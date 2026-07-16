from __future__ import annotations

import re
from typing import Protocol, cast

import lbc

from app.mapper import AdLike
from app.models import SearchCriteria


class UpstreamError(RuntimeError):
    """The upstream client failed or returned an unusable response."""


class LeboncoinGateway(Protocol):
    def search(self, criteria: SearchCriteria) -> list[AdLike]: ...

    def get_listing(self, url: str) -> AdLike: ...


class LbcGateway:
    def __init__(self, timeout_seconds: float) -> None:
        self._client = lbc.Client(timeout=timeout_seconds, max_retries=1, proxy=None)

    def search(self, criteria: SearchCriteria) -> list[AdLike]:
        filters: dict[str, object] = {}
        if criteria.min_price is not None or criteria.max_price is not None:
            filters["price"] = [criteria.min_price or 0, criteria.max_price or 999_999_999]
        if criteria.min_mileage is not None or criteria.max_mileage is not None:
            filters["mileage"] = [
                criteria.min_mileage or 0,
                criteria.max_mileage or 9_999_999,
            ]
        if criteria.min_year is not None or criteria.max_year is not None:
            filters["regdate"] = [criteria.min_year or 1886, criteria.max_year or 9999]
        if criteria.fuel:
            filters["fuel"] = criteria.fuel
        if criteria.gearbox:
            filters["gearbox"] = criteria.gearbox

        try:
            result = self._client.search(
                text=f"{criteria.brand} {criteria.model}",
                page=1,
                limit=criteria.limit,
                sort=lbc.Sort.NEWEST,
                ad_type=lbc.AdType.OFFER,
                category=lbc.Category.VEHICULES_VOITURES,
                **filters,
            )
        except Exception as error:
            raise UpstreamError("Leboncoin search failed") from error
        return cast(list[AdLike], result.ads)

    def get_listing(self, url: str) -> AdLike:
        match = re.search(r"/(?:[^/?]+/)*(\d{6,})(?:[/?#]|$)", url)
        if match is None:
            raise ValueError("the Leboncoin URL does not contain a listing id")
        try:
            return cast(AdLike, self._client.get_ad(int(match.group(1))))
        except Exception as error:
            raise UpstreamError("Leboncoin listing retrieval failed") from error
