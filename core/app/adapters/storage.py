import asyncio
import io
from datetime import timedelta

from minio import Minio

from app.config import settings as s


class MinioStorage:
    def __init__(self) -> None:
        self._c = Minio(s.minio_endpoint, s.minio_access_key, s.minio_secret_key, secure=s.minio_secure)
        self._pub = Minio(
            s.minio_public_endpoint, s.minio_access_key, s.minio_secret_key,
            secure=s.minio_public_secure, region="us-east-1",
        )

    async def ensure_bucket(self) -> None:
        def run():
            if not self._c.bucket_exists(s.minio_bucket):
                self._c.make_bucket(s.minio_bucket)
        await asyncio.to_thread(run)

    async def put(self, key: str, data: bytes, mime: str) -> None:
        await asyncio.to_thread(
            self._c.put_object, s.minio_bucket, key, io.BytesIO(data), len(data), content_type=mime
        )

    async def get(self, key: str) -> bytes:
        def run():
            r = self._c.get_object(s.minio_bucket, key)
            try:
                return r.read()
            finally:
                r.close()
                r.release_conn()
        return await asyncio.to_thread(run)

    async def delete(self, key: str) -> None:
        await asyncio.to_thread(self._c.remove_object, s.minio_bucket, key)

    def url(self, key: str, expires: int = 3600) -> str:
        return self._pub.presigned_get_object(s.minio_bucket, key, expires=timedelta(seconds=expires))
