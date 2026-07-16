from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator, model_validator


class SearchCriteria(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    brand: str = Field(min_length=1, max_length=80)
    model: str = Field(min_length=1, max_length=80)
    min_price: int | None = Field(default=None, ge=0)
    max_price: int | None = Field(default=None, ge=0)
    min_year: int | None = Field(default=None, ge=1886)
    max_year: int | None = Field(default=None, ge=1886)
    min_mileage: int | None = Field(default=None, ge=0)
    max_mileage: int | None = Field(default=None, ge=0)
    fuel: str | None = Field(default=None, max_length=50)
    gearbox: str | None = Field(default=None, max_length=50)
    limit: int = Field(default=20, ge=1, le=35)

    @model_validator(mode="after")
    def validate_ranges(self) -> "SearchCriteria":
        current_year = date.today().year
        if self.min_year is not None and self.min_year > current_year + 1:
            raise ValueError("min_year cannot be later than next year")
        if self.max_year is not None and self.max_year > current_year + 1:
            raise ValueError("max_year cannot be later than next year")
        for minimum, maximum, label in (
            (self.min_price, self.max_price, "price"),
            (self.min_year, self.max_year, "year"),
            (self.min_mileage, self.max_mileage, "mileage"),
        ):
            if minimum is not None and maximum is not None and minimum > maximum:
                raise ValueError(f"min_{label} cannot exceed max_{label}")
        return self


class ListingRequest(BaseModel):
    url: HttpUrl

    @field_validator("url")
    @classmethod
    def require_leboncoin_url(cls, value: HttpUrl) -> HttpUrl:
        host = (value.host or "").lower()
        if host != "leboncoin.fr" and not host.endswith(".leboncoin.fr"):
            raise ValueError("url must target leboncoin.fr")
        return value


class LeboncoinAttribute(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    key: str
    key_label: str | None = Field(default=None, alias="keyLabel")
    value: str | int | float | bool | None = None
    value_label: str | None = Field(default=None, alias="valueLabel")
    values: list[str] = Field(default_factory=list)
    values_label: list[str] = Field(default_factory=list, alias="valuesLabel")


class LeboncoinLocation(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    city: str | None = None
    city_label: str | None = Field(default=None, alias="cityLabel")
    zipcode: str | None = None
    department_name: str | None = Field(default=None, alias="departmentName")
    region_name: str | None = Field(default=None, alias="regionName")


class LeboncoinListing(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    subject: str
    body: str | None = None
    brand: str | None = None
    url: str
    price: float | None = Field(default=None, ge=0)
    images: list[str] = Field(default_factory=list)
    attributes: dict[str, LeboncoinAttribute] = Field(default_factory=dict)
    location: LeboncoinLocation | None = None
    owner_type: Literal["professional", "private", "unknown"] = Field(
        default="unknown", alias="ownerType"
    )
    first_publication_date: str | None = Field(default=None, alias="firstPublicationDate")
    favorite_count: int | None = Field(default=None, ge=0, alias="favoriteCount")


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    provider: Literal["lbc"] = "lbc"


class ErrorBody(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorBody
