class GatewayError(Exception):
    def __init__(self, message: str = "", *, retryable: bool = False) -> None:
        super().__init__(message)
        self.retryable = retryable


class MailError(Exception):
    pass


class RetryableError(Exception):
    pass


class PermanentError(Exception):
    pass
