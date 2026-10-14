import asyncio
import importlib
import logging
import os
import signal
import socket
import uuid

from app.config import settings
from app.modules.jobs.runner import Runner
from app.shared.db import engine

importlib.import_module("app.models")
importlib.import_module("app.packages.jobs")


async def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    worker_id = f"{socket.gethostname()}-{os.getpid()}-{uuid.uuid4().hex[:6]}"
    kinds = {k.strip() for k in settings.worker_kinds.split(",") if k.strip()} or None
    runner = Runner(
        worker_id,
        poll=settings.worker_poll_seconds,
        lease=settings.job_lease_seconds,
        sweep=settings.job_sweep_seconds,
        retention_days=settings.job_retention_days,
        grace=settings.worker_grace_seconds,
        kinds=kinds,
    )
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, runner.stop)
    try:
        await runner.run()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
