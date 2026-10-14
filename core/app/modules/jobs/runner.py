import asyncio
import logging
import random

from app.i18n import use
from app.modules.jobs import registry, service
from app.modules.jobs.models import Job
from app.modules.jobs.registry import JobSpec
from app.shared.errors import RetryableError

log = logging.getLogger("vinihub.jobs")

BACKOFF_BASE = 15.0
BACKOFF_CAP = 600.0
PURGE_EVERY = 3600.0


def backoff(attempt: int) -> float:
    base = min(BACKOFF_CAP, BACKOFF_BASE * 2 ** max(0, attempt - 1))
    return base * random.uniform(0.8, 1.2)


def is_retryable(exc: BaseException) -> bool:
    return isinstance(exc, (RetryableError, TimeoutError)) or bool(getattr(exc, "retryable", False))


class Runner:
    def __init__(self, worker_id: str, *, poll: float = 1.0, lease: float = 60.0, sweep: float = 30.0,
                 retention_days: int = 7, grace: float = 30.0, kinds: set[str] | None = None) -> None:
        self.worker_id = worker_id
        self.poll = poll
        self.lease = lease
        self.sweep = sweep
        self.retention_days = retention_days
        self.grace = grace
        self.kinds = kinds
        self._tasks: set[asyncio.Task] = set()
        self._stop = asyncio.Event()

    def stop(self) -> None:
        self._stop.set()

    def _specs(self) -> dict[str, JobSpec]:
        found = registry.specs()
        return {k: v for k, v in found.items() if self.kinds is None or k in self.kinds}

    async def run(self) -> None:
        specs = self._specs()
        slots = {kind: asyncio.Semaphore(s.concurrency) for kind, s in specs.items()}
        loop = asyncio.get_running_loop()
        next_sweep = 0.0
        next_purge = loop.time() + PURGE_EVERY
        log.info("worker %s started: %s", self.worker_id,
                 ", ".join(f"{k}x{s.concurrency}" for k, s in specs.items()))
        while not self._stop.is_set():
            now = loop.time()
            if now >= next_sweep:
                await self._sweep()
                next_sweep = now + self.sweep
            if now >= next_purge:
                await self._purge()
                next_purge = now + PURGE_EVERY
            claimed = await self._fill(specs, slots)
            if not claimed:
                try:
                    await asyncio.wait_for(self._stop.wait(), self.poll)
                except asyncio.TimeoutError:
                    pass
        await self._drain()

    async def _fill(self, specs: dict[str, JobSpec], slots: dict[str, asyncio.Semaphore]) -> bool:
        claimed = False
        for kind, spec in specs.items():
            slot = slots[kind]
            while not slot.locked() and not self._stop.is_set():
                try:
                    job = await service.claim(kind, self.worker_id, self.lease, spec.per_workspace)
                except Exception:
                    log.exception("claim failed for %s", kind)
                    break
                if job is None:
                    break
                await slot.acquire()
                task = asyncio.create_task(self._execute(job, spec, slot))
                self._tasks.add(task)
                task.add_done_callback(self._tasks.discard)
                claimed = True
        return claimed

    async def _drain(self) -> None:
        if not self._tasks:
            return
        log.info("draining %d running job(s)", len(self._tasks))
        _, pending = await asyncio.wait(set(self._tasks), timeout=self.grace)
        for task in pending:
            task.cancel()
        if pending:
            await asyncio.gather(*pending, return_exceptions=True)

    async def _sweep(self) -> None:
        try:
            exhausted = await service.reclaim_expired()
        except Exception:
            log.exception("lease sweep failed")
            return
        for job in exhausted:
            await registry.notify_failure(job, "lease expired")

    async def _purge(self) -> None:
        try:
            await service.purge_finished(self.retention_days)
        except Exception:
            log.exception("purge failed")

    async def _invoke(self, job: Job, spec: JobSpec) -> dict | None:
        use(job.lang)
        return await asyncio.wait_for(spec.fn(job.payload, registry.context_of(job)), spec.timeout)

    async def _heartbeat(self, job: Job, work: asyncio.Task, lost: asyncio.Event) -> None:
        while True:
            await asyncio.sleep(self.lease / 3)
            try:
                alive = await service.extend(job.id, self.worker_id, self.lease)
            except Exception:
                log.exception("heartbeat failed for job %s", job.id)
                continue
            if not alive:
                lost.set()
                work.cancel()
                return

    async def _execute(self, job: Job, spec: JobSpec, slot: asyncio.Semaphore) -> None:
        lost = asyncio.Event()
        work = asyncio.create_task(self._invoke(job, spec))
        beat = asyncio.create_task(self._heartbeat(job, work, lost))
        try:
            result = await work
        except asyncio.CancelledError:
            if lost.is_set():
                log.warning("job %s (%s) lost its lease or was cancelled", job.id, job.kind)
                return
            work.cancel()
            await asyncio.shield(service.release(job.id, self.worker_id))
            raise
        except Exception as exc:
            await self._failed(job, spec, exc)
        else:
            if not await service.succeed(job.id, self.worker_id, result):
                log.warning("job %s (%s) finished but its lease was gone", job.id, job.kind)
        finally:
            beat.cancel()
            slot.release()

    async def _failed(self, job: Job, spec: JobSpec, exc: BaseException) -> None:
        message = (str(exc) or exc.__class__.__name__)[:500]
        try:
            if is_retryable(exc) and job.attempts < job.max_attempts:
                delay = backoff(job.attempts)
                log.warning("job %s (%s) attempt %d/%d failed, retry in %.0fs: %s",
                            job.id, job.kind, job.attempts, job.max_attempts, delay, message)
                await service.retry(job.id, self.worker_id, delay, message)
                return
            log.error("job %s (%s) failed: %s", job.id, job.kind, message, exc_info=exc)
            if await service.fail(job.id, self.worker_id, message):
                await registry.notify_failure(job, message)
        except Exception:
            log.exception("could not record failure of job %s", job.id)
