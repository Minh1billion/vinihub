import asyncio
import logging
from email.message import EmailMessage

import aiosmtplib

from app.config import settings
from app.shared.errors import MailError
from app.i18n import t

log = logging.getLogger(__name__)


def _reason(exc: Exception) -> str:
    where = f"{settings.smtp_host}:{settings.smtp_port}"
    if isinstance(exc, aiosmtplib.SMTPAuthenticationError):
        return t("mail.auth_failed")
    if "AUTH extension" in str(exc):
        return t("mail.no_auth_ext")
    if isinstance(exc, aiosmtplib.SMTPSenderRefused):
        return t("mail.sender_refused")
    if isinstance(exc, aiosmtplib.SMTPRecipientsRefused):
        return t("mail.recipient_refused")
    if isinstance(exc, (aiosmtplib.SMTPConnectError, aiosmtplib.SMTPServerDisconnected,
                        asyncio.TimeoutError, OSError)):
        return t("mail.connect", where=where)
    return t("mail.generic", detail=str(exc)[:150])


class SmtpMailer:
    async def send(self, to: str, subject: str, text: str, html: str | None = None) -> None:
        if not settings.smtp_host:
            raise MailError(t("mail.not_configured"))
        msg = EmailMessage()
        msg["From"] = settings.smtp_from
        msg["To"] = to
        msg["Subject"] = subject
        msg.set_content(text)
        if html:
            msg.add_alternative(html, subtype="html")
        security = settings.smtp_security.lower()
        try:
            await aiosmtplib.send(
                msg,
                hostname=settings.smtp_host,
                port=settings.smtp_port,
                username=settings.smtp_user or None,
                password=settings.smtp_password or None,
                start_tls=security == "starttls",
                use_tls=security == "ssl",
                timeout=15,
            )
        except Exception as exc:
            log.exception("Gửi email tới %s thất bại", to)
            raise MailError(_reason(exc)) from exc
