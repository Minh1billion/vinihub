import html

from app.container import mailer
from app.i18n import t
from app.modules.invites.tokens import INVITE_TTL
from app.shared.errors import MailError


def _one_line(s: str) -> str:
    return " ".join(s.split())


async def send_invite_email(to: str, workspace: str, inviter: str, link: str) -> str | None:
    workspace, inviter = _one_line(workspace), _one_line(inviter)
    days = INVITE_TTL.days
    subject = t("email.invite.subject", inviter=inviter, workspace=workspace)
    text = t("email.invite.text", inviter=inviter, workspace=workspace, to=to, link=link, days=days)
    inviter_h, workspace_h, to_h = html.escape(inviter), html.escape(workspace), html.escape(to)
    page = f"""\
<div style="font-family:system-ui,sans-serif;color:#241e19;max-width:480px">
  <p style="font-size:18px;margin:0 0 12px">{t("email.invite.html_intro", inviter=inviter_h, workspace=workspace_h)}</p>
  <p style="margin:0 0 20px">{t("email.invite.html_signin", to=to_h)}</p>
  <p style="margin:0 0 20px"><a href="{html.escape(link)}" style="display:inline-block;padding:10px 18px;background:#ff6a13;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">{t("email.invite.html_button")}</a></p>
  <p style="color:#7a6f66;font-size:13px;margin:0">{t("email.invite.html_footer", days=days)}</p>
</div>"""
    try:
        await mailer.send(to, subject, text, page)
    except MailError as e:
        return str(e)
    return None
