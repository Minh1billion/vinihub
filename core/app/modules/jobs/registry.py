import logging
import uuid
from dataclasses import dataclass
from typing import Awaitable, Callable

from app.modules.jobs.models import Job

log = logging.getLogger("vinihub.jobs")


@dataclass(frozen=True)
class JobContext:
    job_id: uuid.UUID
    workspace_id: uuid.UUID | None
    user_id: uuid.UUID | None
    attempt: int
    max_attempts: int
    lang: str

    @property
    def is_last_attempt(self) -> bool:
        return self.attempt >= self.max_attempts


Handler = Callable[[dict, JobContext], Awaitable[dict | None]]
FailureHook = Callable[[dict, JobContext, str], Awaitable[None]]


@dataclass(frozen=True)
class JobSpec:
    kind: str
    fn: Handler
    concurrency: int
    per_workspace: int
    max_attempts: int
    timeout: float
    on_failure: FailureHook | None


_SPECS: dict[str, JobSpec] = {}


def job_handler(kind: str, *, concurrency: int = 2, per_workspace: int = 0, max_attempts: int = 3,
                timeout: float = 900.0, on_failure: FailureHook | None = None) -> Callable[[Handler], Handler]:
    def register(fn: Handler) -> Handler:
        if kind in _SPECS:
            raise RuntimeError(f"job kind already registered: {kind}")
        _SPECS[kind] = JobSpec(kind, fn, concurrency, per_workspace, max_attempts, timeout, on_failure)
        return fn
    return register


def spec(kind: str) -> JobSpec:
    found = _SPECS.get(kind)
    if found is None:
        raise ValueError(f"unknown job kind: {kind}")
    return found


def specs() -> dict[str, JobSpec]:
    return dict(_SPECS)


def context_of(job: Job) -> JobContext:
    return JobContext(job_id=job.id, workspace_id=job.workspace_id, user_id=job.user_id,
                      attempt=job.attempts, max_attempts=job.max_attempts, lang=job.lang)


async def notify_failure(job: Job, message: str) -> None:
    found = _SPECS.get(job.kind)
    if found is None or found.on_failure is None:
        return
    try:
        await found.on_failure(job.payload, context_of(job), message)
    except Exception:
        log.exception("failure hook crashed for job %s (%s)", job.id, job.kind)
