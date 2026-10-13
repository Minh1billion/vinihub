import secrets

ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
PREFIXES = {"template": "TPL"}


def new_code(kind: str) -> str:
    body = "".join(secrets.choice(ALPHABET) for _ in range(8))
    return f"{PREFIXES[kind]}-{body[:4]}-{body[4:]}"
