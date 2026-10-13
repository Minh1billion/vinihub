from pydantic import ValidationError

LIMIT = 5
WIDTH = 220


def summarize(error: ValidationError) -> str:
    parts = []
    for e in error.errors()[:LIMIT]:
        where = ".".join(str(x) for x in e["loc"])
        text = " ".join(str(e["msg"]).split())[:WIDTH]
        parts.append(f"{where}: {text}" if where else text)
    extra = error.error_count() - LIMIT
    if extra > 0:
        parts.append(f"+{extra}")
    return "; ".join(parts)
