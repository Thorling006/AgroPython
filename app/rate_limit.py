import time
from collections import defaultdict, deque

from fastapi import Depends, HTTPException, Request
from redis.asyncio import Redis

from app.config import Settings, get_settings

_memory: dict[str, deque[float]] = defaultdict(deque)


async def enforce_rate_limit(request: Request, settings: Settings, scope: str, limit: int, subject: str | None = None, window: int = 60) -> None:
    identity = subject or (request.client.host if request.client else "unknown")
    key = f"agropython:rate:{scope}:{identity}"
    if settings.redis_url:
        redis = Redis.from_url(settings.redis_url, encoding="utf-8", decode_responses=True)
        try:
            async with redis.pipeline(transaction=True) as pipe:
                pipe.incr(key)
                pipe.expire(key, window, nx=True)
                count, _ = await pipe.execute()
        except Exception as exc:
            if settings.app_env in {"staging", "production"}:
                raise HTTPException(status_code=503, detail="Protección de tráfico no disponible") from exc
            count = 1
        finally:
            await redis.aclose()
    else:
        if settings.app_env in {"staging", "production"}:
            raise HTTPException(status_code=503, detail="REDIS_URL es obligatorio en este entorno")
        now = time.monotonic()
        bucket = _memory[key]
        while bucket and bucket[0] <= now - window:
            bucket.popleft()
        bucket.append(now)
        count = len(bucket)
    if int(count) > limit:
        raise HTTPException(status_code=429, detail="Demasiadas solicitudes; intenta nuevamente en un minuto")


async def enforce_api_rate_limit(request: Request, settings: Settings = Depends(get_settings)) -> None:
    await enforce_rate_limit(request, settings, "api", settings.rate_limit_api)
