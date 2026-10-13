import asyncio
import sys
import time
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.config import settings

ATTEMPTS = 30


async def wait_for_db() -> None:
    engine = create_async_engine(settings.database_url)
    for attempt in range(1, ATTEMPTS + 1):
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            await engine.dispose()
            return
        except Exception as e:
            if attempt == ATTEMPTS:
                raise
            print(f"database not ready ({attempt}/{ATTEMPTS}): {e}", flush=True)
            time.sleep(2)


def main() -> None:
    asyncio.run(wait_for_db())
    cfg = Config(str(ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(ROOT / "migrations"))
    command.upgrade(cfg, "head")


if __name__ == "__main__":
    main()