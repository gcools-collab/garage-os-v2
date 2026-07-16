from __future__ import annotations

import asyncio
import logging
import secrets
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool

from app.config import Settings
from app.gateway import LbcGateway, LeboncoinGateway, UpstreamError
from app.mapper import map_listing
from app.models import (
    ErrorResponse,
    HealthResponse,
    LeboncoinListing,
    ListingRequest,
    SearchCriteria,
)

logger = logging.getLogger("leboncoin_bridge")


def create_app(
    settings: Settings | None = None,
    gateway: LeboncoinGateway | None = None,
) -> FastAPI:
    resolved_settings = settings or Settings.from_environment()
    resolved_gateway = gateway or LbcGateway(resolved_settings.request_timeout_seconds)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

    app = FastAPI(title="Garage OS Leboncoin Bridge", version="0.1.0")

    def authenticate(
        api_key: Annotated[str | None, Header(alias="X-Internal-Api-Key")] = None,
    ) -> None:
        expected = resolved_settings.internal_api_key.get_secret_value()
        if api_key is None or not secrets.compare_digest(api_key, expected):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    auth = Depends(authenticate)

    @app.exception_handler(HTTPException)
    async def handle_http_error(request: Request, error: HTTPException) -> JSONResponse:
        logger.info("HTTP %d on %s", error.status_code, request.url.path)
        return JSONResponse(
            status_code=error.status_code,
            content={"error": {"code": "request_error", "message": str(error.detail)}},
            headers=error.headers,
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        request: Request, error: RequestValidationError
    ) -> JSONResponse:
        logger.info("Validation failure on %s: %s", request.url.path, error)
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content={
                "error": {
                    "code": "validation_error",
                    "message": "Request validation failed",
                }
            },
        )

    @app.exception_handler(UpstreamError)
    async def handle_upstream_error(request: Request, error: UpstreamError) -> JSONResponse:
        logger.warning("Upstream failure on %s: %s", request.url.path, error)
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content={"error": {"code": "upstream_error", "message": str(error)}},
        )

    @app.get("/health", response_model=HealthResponse, dependencies=[auth])
    async def health() -> HealthResponse:
        return HealthResponse()

    @app.post(
        "/search",
        response_model=list[LeboncoinListing],
        responses={502: {"model": ErrorResponse}},
        dependencies=[auth],
    )
    async def search(criteria: SearchCriteria) -> list[LeboncoinListing]:
        try:
            ads = await asyncio.wait_for(
                run_in_threadpool(resolved_gateway.search, criteria),
                timeout=resolved_settings.request_timeout_seconds + 1,
            )
        except TimeoutError as error:
            raise UpstreamError("Leboncoin search timed out") from error
        logger.info("Search returned %d listing(s)", len(ads))
        return [map_listing(ad) for ad in ads]

    @app.post(
        "/listing",
        response_model=LeboncoinListing,
        responses={502: {"model": ErrorResponse}},
        dependencies=[auth],
    )
    async def listing(payload: ListingRequest) -> LeboncoinListing:
        try:
            ad = await asyncio.wait_for(
                run_in_threadpool(resolved_gateway.get_listing, str(payload.url)),
                timeout=resolved_settings.request_timeout_seconds + 1,
            )
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
        except TimeoutError as error:
            raise UpstreamError("Leboncoin listing retrieval timed out") from error
        return map_listing(ad)

    return app
