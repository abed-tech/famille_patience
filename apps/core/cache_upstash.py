"""Backend de cache Django via l'API REST Upstash (sans URL Redis native)."""
import os
import pickle
from typing import Any

from django.core.cache.backends.base import BaseCache, DEFAULT_TIMEOUT


class UpstashRedisCache(BaseCache):
    """Cache Django utilisant upstash-redis (HTTP). Secrets via variables d'environnement."""

    def __init__(self, location, params):
        super().__init__(params)
        self._client = None

    def _get_client(self):
        if self._client is None:
            from upstash_redis import Redis

            url = os.getenv("UPSTASH_REDIS_REST_URL", "").strip()
            token = os.getenv("UPSTASH_REDIS_REST_TOKEN", "").strip()
            if not url or not token:
                raise RuntimeError(
                    "UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN sont requis "
                    "pour le backend de cache Upstash."
                )
            self._client = Redis(url=url, token=token)
        return self._client

    def make_key(self, key, version=None):
        return super().make_key(key, version=version)

    def get(self, key, default=None, version=None):
        full_key = self.make_key(key, version=version)
        try:
            raw = self._get_client().get(full_key)
        except Exception:
            return default
        if raw is None:
            return default
        try:
            return pickle.loads(raw.encode("latin1") if isinstance(raw, str) else raw)
        except Exception:
            return default

    def set(self, key, value, timeout=DEFAULT_TIMEOUT, version=None):
        full_key = self.make_key(key, version=version)
        payload = pickle.dumps(value, pickle.HIGHEST_PROTOCOL).decode("latin1")
        ex = int(timeout) if timeout is not None and timeout != DEFAULT_TIMEOUT else None
        try:
            if ex:
                self._get_client().set(full_key, payload, ex=ex)
            else:
                self._get_client().set(full_key, payload)
        except Exception:
            return False
        return True

    def delete(self, key, version=None):
        full_key = self.make_key(key, version=version)
        try:
            self._get_client().delete(full_key)
        except Exception:
            return False
        return True

    def clear(self):
        # Upstash REST : pas de FLUSHDB sûr en multi-tenant — no-op documenté
        return

    def has_key(self, key, version=None):
        return self.get(key, default=None, version=version) is not None

    def incr(self, key, delta=1, version=None):
        full_key = self.make_key(key, version=version)
        return int(self._get_client().incrby(full_key, delta))

    def decr(self, key, delta=1, version=None):
        return self.incr(key, -delta, version=version)

    def get_many(self, keys, version=None):
        return {k: self.get(k, version=version) for k in keys}

    def set_many(self, data, timeout=DEFAULT_TIMEOUT, version=None):
        return all(self.set(k, v, timeout=timeout, version=version) for k, v in data.items())

    def delete_many(self, keys, version=None):
        return all(self.delete(k, version=version) for k in keys)
