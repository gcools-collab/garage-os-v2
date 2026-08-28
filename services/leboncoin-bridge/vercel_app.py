from app.config import Settings
from app.gateway import LbcGateway, LeboncoinGateway
from app.mapper import AdLike
from app.models import SearchCriteria
from app.main import create_app


class LazyLeboncoinGateway(LeboncoinGateway):
    def __init__(self, timeout_seconds: float) -> None:
        self._timeout_seconds = timeout_seconds
        self._gateway: LbcGateway | None = None

    def _resolve(self) -> LbcGateway:
        if self._gateway is None:
            self._gateway = LbcGateway(self._timeout_seconds)
        return self._gateway

    def search(self, criteria: SearchCriteria) -> list[AdLike]:
        return self._resolve().search(criteria)

    def get_listing(self, url: str) -> AdLike:
        return self._resolve().get_listing(url)


settings = Settings.from_environment()
app = create_app(
    settings=settings,
    gateway=LazyLeboncoinGateway(settings.request_timeout_seconds),
)
