from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.config import Settings
from app.rate_limit import enforce_rate_limit


class FakePipeline:
    count = 0

    async def __aenter__(self): return self
    async def __aexit__(self, *args): return None
    def incr(self, _key): return self
    def expire(self, _key, _window, nx=True): return self
    async def execute(self):
        FakePipeline.count += 1
        return [FakePipeline.count, True]


class FakeRedis:
    def pipeline(self, transaction=True): return FakePipeline()
    async def aclose(self): return None


@pytest.mark.asyncio
async def test_redis_rate_limit_is_shared_and_returns_429(monkeypatch):
    FakePipeline.count = 0
    monkeypatch.setattr("app.rate_limit.Redis.from_url", lambda *args, **kwargs: FakeRedis())
    request = SimpleNamespace(client=SimpleNamespace(host="203.0.113.10"))
    settings = Settings(app_env="staging", redis_url="redis://shared")
    await enforce_rate_limit(request, settings, "login", 2)
    await enforce_rate_limit(request, settings, "login", 2)
    with pytest.raises(HTTPException) as error:
        await enforce_rate_limit(request, settings, "login", 2)
    assert error.value.status_code == 429

